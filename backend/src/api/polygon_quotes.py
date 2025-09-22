# src/api/polygon_quotes.py

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from src.models.domain import Quote
from src.services.polygon_service import polygon_service

router = APIRouter(prefix="/polygon", tags=["Polygon.io"])


@router.get("/quote/{symbol}", response_model=Quote)
def get_polygon_quote(symbol: str) -> Quote | None:
    """
    獲取 Polygon.io 即時報價

    - **symbol**: 美股代號 (如: AAPL, MSFT, TSLA)
    """
    try:
        quote = polygon_service.get_real_time_quote(symbol.upper())
        if quote is None:
            # 返回空報價,避免 None
            from datetime import datetime

            return Quote(
                symbol=symbol.upper(),
                timestamp=datetime.now(),
                open=0,
                close=0,
                bid_price=0,
                ask_price=0,
                bid_volume=0,
                ask_volume=0,
                volume=0,
                avg_price=0,
            )
        return quote
    except Exception as e:
        logger.error(f"獲取 Polygon.io 報價失敗: {e}")
        from datetime import datetime

        return Quote(
            symbol=symbol.upper(),
            timestamp=datetime.now(),
            open=0,
            close=0,
            bid_price=0,
            ask_price=0,
            bid_volume=0,
            ask_volume=0,
            volume=0,
            avg_price=0,
        )


@router.get("/klines/{symbol}")
def get_polygon_klines(
    symbol: str,
    interval: str = Query(
        default="1d", description="時間間隔 (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)"
    ),
    limit: int = Query(
        default=500, description="基礎聚合查詢數量 (影響API資源消耗)", ge=1, le=5000
    ),
    start_date: str | None = Query(default=None, description="開始日期 (YYYY-MM-DD)"),
    end_date: str | None = Query(default=None, description="結束日期 (YYYY-MM-DD)"),
) -> dict[str, Any]:
    """
    獲取 Polygon.io 歷史 K 線數據

    - **symbol**: 美股代號 (如: AAPL, MSFT, TSLA)
    - **interval**: 時間間隔,支援:
      - 分鐘級: 1m, 5m, 15m, 30m
      - 小時級: 1h, 4h
      - 日級: 1d
      - 週級: 1w
      - 月級: 1M
    - **limit**: 返回K線數量 (最多5000根)
    - **start_date**: 開始日期,格式 YYYY-MM-DD
    - **end_date**: 結束日期,格式 YYYY-MM-DD

    優勢:
    - 🚀 **無需聚合**: Polygon.io API 已預聚合,直接返回對應時間周期
    - ⚡ **快速響應**: 不需要後端處理大量1分鐘數據
    - 📊 **豐富數據**: 支援多種時間周期,從1分鐘到月線
    """
    try:
        result = polygon_service.get_historical_klines(
            symbol=symbol.upper(),
            interval=interval,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
        )

        # 驗證返回結果
        if not isinstance(result, dict):
            raise ValueError(f"Polygon 服務返回了無效的數據類型: {type(result)}")

        if "error" in result:
            error_msg = result["error"]
            logger.error(f"Polygon 服務返回錯誤: {error_msg}")
            # 根據錯誤類型返回適當的 HTTP 狀態碼
            if (
                "429" in error_msg
                or "rate limit" in error_msg.lower()
                or "too many" in error_msg.lower()
            ):
                raise HTTPException(
                    status_code=429,
                    detail="API 請求過於頻繁,請稍後再試。免費計劃限制: 每分鐘3次請求。",
                )
            else:
                raise HTTPException(status_code=500, detail=error_msg)

        if not result.get("data"):
            logger.warning(f"沒有找到 {symbol} {interval} 的數據")
            return {
                "symbol": symbol.upper(),
                "interval": interval,
                "data": [],
                "count": 0,
                "message": "無可用數據",
            }

        logger.info(
            f"✅ API 成功返回 {result.get('count', 0)} 筆 {symbol} {interval} 數據"
        )
        return result

    except HTTPException:
        # 重新拋出 HTTP 錯誤
        raise
    except Exception as e:
        logger.error(f"❌ 獲取 Polygon.io K線數據失敗: {e}")
        raise HTTPException(status_code=500, detail=f"獲取 K線數據失敗: {e!s}") from e


@router.get("/market/status")
def get_polygon_market_status() -> dict[str, Any]:
    """
    獲取美股市場狀態

    Returns:
        市場開盤狀態、盤前盤後交易狀態等資訊
    """
    try:
        return polygon_service.get_market_status()
    except Exception as e:
        logger.error(f"獲取市場狀態失敗: {e}")
        return {"error": str(e)}


@router.get("/search")
def search_polygon_tickers(
    query: str = Query(description="搜尋關鍵字 (公司名稱或股票代號)"),
    limit: int = Query(default=10, description="返回結果數量", ge=1, le=100),
) -> list[dict[str, Any]]:
    """
    搜尋美股股票代號

    - **query**: 搜尋關鍵字,可以是公司名稱或股票代號
    - **limit**: 返回結果數量限制

    Examples:
    - 搜尋 "Apple" → 找到 AAPL
    - 搜尋 "TSLA" → 找到 Tesla Inc.
    - 搜尋 "Microsoft" → 找到 MSFT
    """
    try:
        results = polygon_service.search_tickers(query, limit)
        return results
    except Exception as e:
        logger.error(f"搜尋股票失敗: {e}")
        return []


@router.get("/tickers/popular")
def get_popular_tickers() -> list[dict[str, str]]:
    """
    獲取熱門美股代號清單

    Returns:
        常用的美股代號和公司名稱
    """
    popular_stocks = [
        {"ticker": "AAPL", "name": "Apple Inc.", "sector": "Technology"},
        {"ticker": "MSFT", "name": "Microsoft Corporation", "sector": "Technology"},
        {"ticker": "GOOGL", "name": "Alphabet Inc. (Class A)", "sector": "Technology"},
        {
            "ticker": "AMZN",
            "name": "Amazon.com Inc.",
            "sector": "Consumer Discretionary",
        },
        {"ticker": "TSLA", "name": "Tesla Inc.", "sector": "Consumer Discretionary"},
        {"ticker": "META", "name": "Meta Platforms Inc.", "sector": "Technology"},
        {"ticker": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology"},
        {"ticker": "NFLX", "name": "Netflix Inc.", "sector": "Communication Services"},
        {
            "ticker": "DIS",
            "name": "The Walt Disney Company",
            "sector": "Communication Services",
        },
        {"ticker": "V", "name": "Visa Inc.", "sector": "Financial Services"},
        {
            "ticker": "JPM",
            "name": "JPMorgan Chase & Co.",
            "sector": "Financial Services",
        },
        {"ticker": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare"},
        {"ticker": "WMT", "name": "Walmart Inc.", "sector": "Consumer Staples"},
        {
            "ticker": "PG",
            "name": "Procter & Gamble Company",
            "sector": "Consumer Staples",
        },
        {"ticker": "UNH", "name": "UnitedHealth Group Inc.", "sector": "Healthcare"},
        {
            "ticker": "HD",
            "name": "The Home Depot Inc.",
            "sector": "Consumer Discretionary",
        },
        {
            "ticker": "BAC",
            "name": "Bank of America Corporation",
            "sector": "Financial Services",
        },
        {"ticker": "ADBE", "name": "Adobe Inc.", "sector": "Technology"},
        {"ticker": "CRM", "name": "Salesforce Inc.", "sector": "Technology"},
        {"ticker": "KO", "name": "The Coca-Cola Company", "sector": "Consumer Staples"},
    ]

    return popular_stocks


@router.get("/info")
def get_polygon_api_info() -> dict[str, Any]:
    """
    獲取 Polygon.io API 服務資訊

    Returns:
        API 狀態、支援功能等資訊
    """
    return {
        "service": "Polygon.io",
        "status": "active" if polygon_service.client else "inactive",
        "features": {
            "real_time_quotes": True,
            "historical_data": True,
            "multiple_timeframes": True,
            "pre_aggregated": True,
            "no_backend_aggregation_needed": True,
        },
        "supported_intervals": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "market": "US Stocks",
        "data_coverage": "Real-time and historical US equity data",
        "advantages": [
            "🚀 直接支援多種時間周期",
            "⚡ API 已預聚合,無需後端處理",
            "📊 豐富的歷史數據",
            "🔄 即時數據更新",
            "💾 節省頻寬和計算資源",
        ],
    }


@router.get("/api-usage")
async def get_api_usage():
    """
    獲取 Polygon.io API 使用狀態

    Returns:
        當前 API 使用狀態
    """
    try:
        usage_status = polygon_service.get_api_usage_status()

        return {
            "status": "success",
            "data": usage_status,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"❌ 獲取 API 使用狀態失敗: {e}")
        raise HTTPException(
            status_code=500, detail=f"獲取 API 使用狀態失敗: {e!s}"
        ) from e
