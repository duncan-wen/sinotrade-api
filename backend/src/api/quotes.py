# src/api/quotes.py

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from loguru import logger

from src.models.domain import APIUser, Quote
from src.models.technical_indicators import ChartDataResponse
from src.services.auth_service import get_current_user
from src.services.cache_service import get_cached_quote
from src.services.polars_technical_analysis_service import (
    polars_technical_analysis_service,
)
from src.services.shioaji_service import shioaji_service
from src.services.technical_analysis_service import technical_analysis_service

router = APIRouter()


@router.get("/quote/{symbol}", response_model=Quote)
def get_quote(symbol: str, user: APIUser = Depends(get_current_user)) -> Quote:
    """
    Fetches a real-time quote for a given financial instrument symbol.
    It first checks the cache, and if not found, subscribes to the quote stream.
    """
    cached_quote = get_cached_quote(symbol)
    if cached_quote:
        return cached_quote

    # If not in cache, subscribe to the quote.
    # The actual quote will be put into the cache by the service's callback.
    def quote_callback(quote_data: Any) -> None:
        pass

    shioaji_service.subscribe_quote(symbol, quote_callback)

    # Returning a dummy quote for now, as the real data is handled by a callback.
    # A better approach would be to wait for the first tick, but that would
    # block the request. WebSockets are the best solution for this.
    dummy_quote = Quote(
        symbol=symbol,
        timestamp=datetime.fromisoformat("2025-09-10T12:00:00+00:00"),
        open=0,
        close=0,
        bid_price=0,
        ask_price=0,
        bid_volume=0,
        ask_volume=0,
        volume=0,
        avg_price=0,
    )
    return dummy_quote


@router.get("/klines/{symbol}")
def get_historical_klines(
    symbol: str,
    interval: str = Query(
        default="1m", description="K線間隔 (1m, 5m, 15m, 1h, 1d, 1w, 1M)"
    ),
    limit: int = Query(default=100, description="返回的K線數量", ge=1, le=1000),
    use_kbar_api: bool = Query(
        default=False, description="是否使用官方KBar API (僅日線)"
    ),
    ma_periods: str = Query(
        default="", description="均線週期,逗號分隔 (如: '5,20,60')"
    ),
    user: APIUser = Depends(get_current_user),
) -> dict[str, Any]:
    """
    獲取歷史 K 線資料

    - **symbol**: 股票代號 (如: 2330, TSE2330, TXF, TXO等)
    - **interval**: K線間隔 (1m=1分鐘, 5m=5分鐘, 15m=15分鐘, 1h=1小時, 1d=1日, 1w=周線, 1M=月線)
    - **limit**: 返回的K線數量 (1-1000根)
    - **ma_periods**: 均線週期 (如: '5,20,60' 會自動獲取額外數據供均線計算)
    """
    try:
        # 解析均線週期參數
        ma_periods_list = None
        if ma_periods.strip():
            try:
                ma_periods_list = [
                    int(p.strip()) for p in ma_periods.split(",") if p.strip()
                ]
            except ValueError:
                return {
                    "error": "Invalid ma_periods format. Use comma-separated integers like '5,20,60'",
                    "symbol": symbol,
                    "data": [],
                    "count": 0,
                }

        klines = shioaji_service.get_historical_klines(
            symbol, interval, limit, use_kbar_api, ma_periods_list
        )
        return {
            "symbol": symbol,
            "interval": interval,
            "data": klines,
            "count": len(klines),
            "source": _get_data_source(interval, use_kbar_api),
        }
    except Exception as e:
        return {"error": str(e), "symbol": symbol, "data": [], "count": 0}


@router.get("/chart/{symbol}", response_model=ChartDataResponse)
def get_chart_data_with_indicators(
    symbol: str,
    interval: str = Query(
        default="1d", description="K線間隔 (1m, 5m, 15m, 1h, 1d, 1w, 1M)"
    ),
    limit: int = Query(default=100, description="返回的K線數量", ge=1, le=1000),
    use_kbar_api: bool = Query(
        default=True, description="是否使用官方KBar API (僅日線)"
    ),
    indicators: str = Query(
        default="ma,kd,macd,bbands,rsi",
        description="技術指標,逗號分隔 (ma,kd,macd,bbands,rsi)",
    ),
    ma_periods: str = Query(default="5,10,20,60", description="均線週期,逗號分隔"),
    use_polars: bool = Query(
        default=True, description="使用 Polars + polars_talib 高效能計算"
    ),
    user: APIUser = Depends(get_current_user),
) -> ChartDataResponse:
    """
    獲取完整的圖表數據(K線 + 技術指標)

    - **symbol**: 股票代號 (如: 2330, TSE2330)
    - **interval**: K線間隔
    - **limit**: 返回的K線數量
    - **indicators**: 要計算的技術指標 (ma,kd,macd,bbands,rsi)
    - **ma_periods**: 均線週期設定
    """
    try:
        # 解析指標參數
        indicators_list = [ind.strip() for ind in indicators.split(",") if ind.strip()]
        ma_periods_list = [int(p.strip()) for p in ma_periods.split(",") if p.strip()]

        # 構建指標配置
        indicators_config: dict[str, Any] = {}

        if "ma" in indicators_list:
            indicators_config["ma"] = {"periods": ma_periods_list}

        if "kd" in indicators_list:
            indicators_config["kd"] = {"k_period": 9, "d_period": 3, "rsv_period": 9}

        if "macd" in indicators_list:
            indicators_config["macd"] = {"fast": 12, "slow": 26, "signal": 9}

        if "bbands" in indicators_list:
            indicators_config["bbands"] = {"period": 20, "std_multiplier": 2.0}

        if "rsi" in indicators_list:
            indicators_config["rsi"] = {"periods": [6, 12, 24]}

        # 計算需要的額外數據量(考慮技術指標需求)
        max_period = 0
        if "ma" in indicators_config:
            max_period = max(max_period, max(ma_periods_list))
        if "kd" in indicators_config:
            max_period = max(max_period, 9)  # KD需要9期
        if "macd" in indicators_config:
            max_period = max(max_period, 26)  # MACD需要26期
        if "bbands" in indicators_config:
            max_period = max(max_period, 20)  # 布林通道需要20期
        if "rsi" in indicators_config:
            max_period = max(max_period, 24)  # RSI最大需要24期

        # 獲取原始K線數據(包含額外數據供指標計算)
        extended_limit = limit + max_period if max_period > 0 else limit
        klines = shioaji_service.get_historical_klines(
            symbol, interval, extended_limit, use_kbar_api=True
        )

        if not klines:
            return ChartDataResponse(
                symbol=symbol,
                interval=interval,
                data=[],
                count=0,
                indicators_config=indicators_config,
                source="no_data",
            )

        # 計算技術指標 - 選擇計算引擎
        if use_polars:
            logger.info("Using Polars + polars_talib for high-performance calculation")
            technical_data = polars_technical_analysis_service.calculate_all_indicators(
                klines, indicators_config
            )
        else:
            logger.info("Using pandas for technical analysis calculation")
            technical_data = technical_analysis_service.calculate_all_indicators(
                klines, indicators_config
            )

        # 只返回最後 limit 筆數據供顯示
        display_data = (
            technical_data[-limit:] if len(technical_data) > limit else technical_data
        )

        return ChartDataResponse(
            symbol=symbol,
            interval=interval,
            data=display_data,
            count=len(display_data),
            indicators_config=indicators_config,
            source=_get_data_source(interval, True),
        )

    except Exception:
        return ChartDataResponse(
            symbol=symbol,
            interval=interval,
            data=[],
            count=0,
            indicators_config={},
            source="error",
        )


@router.get("/chart/multi")
def get_multi_symbol_chart_data(
    symbols: str = Query(description="商品代號,逗號分隔 (如: '2330,2317,2454')"),
    interval: str = Query(
        default="1d", description="K線間隔 (1m, 5m, 15m, 1h, 1d, 1w, 1M)"
    ),
    limit: int = Query(default=60, description="每個商品返回的K線數量", ge=1, le=500),
    indicators: str = Query(
        default="ma,kd,macd,bbands",
        description="技術指標,逗號分隔 (ma,kd,macd,bbands) - 多商品模式支援較少指標",
    ),
    ma_periods: str = Query(default="5,20,60", description="均線週期,逗號分隔"),
    user: APIUser = Depends(get_current_user),
) -> dict[str, Any]:
    """
    🚀 多商品並行技術指標計算 (使用 Polars 高效能引擎)

    - **symbols**: 商品代號列表,逗號分隔
    - **interval**: K線間隔
    - **limit**: 每個商品的K線數量
    - **indicators**: 技術指標 (多商品模式優化版)
    - **ma_periods**: 均線週期設定
    - **use_kbar_api**: 是否使用官方KBar API (僅日線)

    優勢:
    - 並行計算多個商品
    - 自動多核心處理
    - 記憶體效率優化
    """
    try:
        # 解析商品列表
        symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
        if not symbol_list:
            return {"error": "No symbols provided", "data": {}}

        if len(symbol_list) > 20:  # 限制最多20個商品
            return {"error": "Too many symbols (max 20)", "data": {}}

        # 解析指標參數
        indicators_list = [ind.strip() for ind in indicators.split(",") if ind.strip()]
        ma_periods_list = [int(p.strip()) for p in ma_periods.split(",") if p.strip()]

        # 構建指標配置(多商品模式簡化版)
        indicators_config: dict[str, Any] = {}

        if "ma" in indicators_list:
            indicators_config["ma"] = {"periods": ma_periods_list}

        if "macd" in indicators_list:
            indicators_config["macd"] = {"fast": 12, "slow": 26, "signal": 9}

        if "rsi" in indicators_list:
            indicators_config["rsi"] = {"periods": [6, 12, 24]}

        # 獲取所有商品的K線數據
        multi_symbol_data = {}
        max_period = max(ma_periods_list) if ma_periods_list else 20
        extended_limit = limit + max_period

        for symbol in symbol_list:
            try:
                klines = shioaji_service.get_historical_klines(
                    symbol, interval, extended_limit, use_kbar_api=True
                )
                if klines:
                    multi_symbol_data[symbol] = klines
                    logger.info(f"Fetched {len(klines)} data points for {symbol}")
            except Exception as e:
                logger.error(f"Failed to fetch data for {symbol}: {e}")
                continue

        if not multi_symbol_data:
            return {"error": "No data available for any symbol", "data": {}}

        # 🚀 使用 Polars 並行計算多商品技術指標
        logger.info(
            f"Starting parallel calculation for {len(multi_symbol_data)} symbols"
        )
        technical_results = (
            polars_technical_analysis_service.calculate_multi_symbol_indicators(
                multi_symbol_data, indicators_config
            )
        )

        # 格式化返回結果
        result: dict[str, Any] = {
            "symbols": symbol_list,
            "interval": interval,
            "indicators_config": indicators_config,
            "data": {},
            "summary": {
                "total_symbols": len(symbol_list),
                "successful_symbols": len(technical_results),
                "failed_symbols": len(symbol_list) - len(technical_results),
            },
        }

        # 只返回最後 limit 筆數據
        for symbol, indicators_data in technical_results.items():
            display_data = (
                indicators_data[-limit:]
                if len(indicators_data) > limit
                else indicators_data
            )
            result["data"][symbol] = {
                "count": len(display_data),
                "data": [indicator.dict() for indicator in display_data],
            }

        logger.info(f"Multi-symbol calculation completed: {result['summary']}")
        return result

    except Exception as e:
        logger.error(f"Multi-symbol chart data error: {e}")
        return {"error": str(e), "data": {}}


def _get_data_source(interval: str, use_kbar_api: bool) -> str:
    """確定資料來源類型"""
    if use_kbar_api and interval == "1d":
        return "official_kbar"
    elif interval in ["1w", "1M"]:
        return "daily_aggregated"
    else:
        return "ticks_aggregated"
