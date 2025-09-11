# src/api/quotes.py

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query

from src.models.domain import APIUser, Quote
from src.services.auth_service import get_current_user
from src.services.cache_service import get_cached_quote
from src.services.shioaji_service import shioaji_service

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
    user: APIUser = Depends(get_current_user),
) -> dict[str, Any]:
    """
    獲取歷史 K 線資料

    - **symbol**: 股票代號 (如: 2330, TSE2330, TXF, TXO等)
    - **interval**: K線間隔 (1m=1分鐘, 5m=5分鐘, 15m=15分鐘, 1h=1小時, 1d=1日, 1w=周線, 1M=月線)
    - **limit**: 返回的K線數量 (1-1000根)
    """
    try:
        klines = shioaji_service.get_historical_klines(
            symbol, interval, limit, use_kbar_api
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


def _get_data_source(interval: str, use_kbar_api: bool) -> str:
    """確定資料來源類型"""
    if use_kbar_api and interval == "1d":
        return "official_kbar"
    elif interval in ["1w", "1M"]:
        return "daily_aggregated"
    else:
        return "ticks_aggregated"
