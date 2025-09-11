# src/services/auth_service.py

from fastapi import Security, HTTPException
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_401_UNAUTHORIZED

from src.models.domain import APIUser

API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# In a real application, this would be a database of users
# For now, we will use a simple in-memory dictionary
FAKE_USERS_DB = {
    "viewer_api_key": {"id": "viewer01", "api_key": "viewer_api_key", "role": "viewer"},
    "trader_api_key": {"id": "trader01", "api_key": "trader_api_key", "role": "trader"},
}

def get_user(api_key: str) -> APIUser | None:
    if api_key in FAKE_USERS_DB:
        user_dict = FAKE_USERS_DB[api_key]
        return APIUser(**user_dict)
    return None

def get_current_user(api_key: str = Security(api_key_header)) -> APIUser:
    if api_key is None:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="API Key is missing",
        )
    user = get_user(api_key)
    if user is None:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )
    return user
