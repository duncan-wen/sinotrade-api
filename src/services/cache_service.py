# src/services/cache_service.py

from cachetools import TTLCache

from src.models.domain import Quote

# Cache with a TTL of 1 second and a max size of 1024
quote_cache = TTLCache(maxsize=1024, ttl=1)

def get_cached_quote(symbol: str) -> Quote | None:
    return quote_cache.get(symbol)

def set_cached_quote(symbol: str, quote: Quote):
    quote_cache[symbol] = quote
