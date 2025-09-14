# src/services/cache_service.py


from cachetools import TTLCache  # type: ignore

from src.models.domain import Quote

# Cache with a TTL of 1 second and a max size of 1024
quote_cache = TTLCache(maxsize=1024, ttl=1)


def get_cached_quote(symbol: str) -> Quote | None:
    result = quote_cache.get(symbol)
    return result if isinstance(result, Quote) else None


def set_cached_quote(symbol: str, quote: Quote) -> None:
    quote_cache[symbol] = quote
