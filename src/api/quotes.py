# src/api/quotes.py

from fastapi import APIRouter, Depends
from src.models.domain import Quote
from src.services.shioaji_service import shioaji_service
from src.services.auth_service import get_current_user
from src.services.cache_service import get_cached_quote

router = APIRouter()

@router.get("/quote/{symbol}", response_model=Quote)
def get_quote(symbol: str, user = Depends(get_current_user)):
    """
    Fetches a real-time quote for a given financial instrument symbol.
    It first checks the cache, and if not found, subscribes to the quote stream.
    """
    cached_quote = get_cached_quote(symbol)
    if cached_quote:
        return cached_quote

    # If not in cache, subscribe to the quote.
    # The actual quote will be put into the cache by the service's callback.
    def quote_callback(quote_data):
        pass

    shioaji_service.subscribe_quote(symbol, quote_callback)

    # Returning a dummy quote for now, as the real data is handled by a callback.
    # A better approach would be to wait for the first tick, but that would
    # block the request. WebSockets are the best solution for this.
    dummy_quote = Quote(
        symbol=symbol,
        timestamp="2025-09-10T12:00:00Z",
        open=0, close=0, bid_price=0, ask_price=0,
        bid_volume=0, ask_volume=0, avg_price=0
    )
    return dummy_quote