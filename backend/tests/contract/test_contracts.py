# tests/contract/test_contracts.py

import pytest
import httpx
from pytest_httpserver import HTTPServer

# 定義 API 的基礎 URL
BASE_URL = "http://localhost:8000"

# 定義一個有效的 API 金鑰用於測試
VALID_API_KEY = "test_api_key"

# --- GET /quote/{symbol} 的測試 ---

def test_get_quote_success(httpserver: HTTPServer):
    symbol = "2330"
    httpserver.expect_request(f"/quote/{symbol}").respond_with_json({
        "symbol": symbol,
        "timestamp": "2025-09-10T10:00:00Z",
        "open": 100.0,
        "close": 101.0,
        "bid_price": 100.9,
        "ask_price": 101.1,
        "bid_volume": 10,
        "ask_volume": 12,
        "avg_price": 100.5,
        "underlying_price": None
    })

    headers = {"X-API-KEY": VALID_API_KEY}
    response = httpx.get(httpserver.url_for(f"/quote/{symbol}"), headers=headers)

    assert response.status_code == 200
    # 在真實情境中，我們會根據 OpenAPI 綱要來驗證回應
    # 目前，我們只檢查幾個欄位
    assert response.json()["symbol"] == symbol

def test_get_quote_unauthorized(httpserver: HTTPServer):
    symbol = "2330"
    httpserver.expect_request(f"/quote/{symbol}").respond_with_data(status=401)

    response = httpx.get(httpserver.url_for(f"/quote/{symbol}")) # 沒有 API 金鑰
    assert response.status_code == 401

def test_get_quote_not_found(httpserver: HTTPServer):
    symbol = "invalid_symbol"
    httpserver.expect_request(f"/quote/{symbol}").respond_with_data(status=404)

    headers = {"X-API-KEY": VALID_API_KEY}
    response = httpx.get(httpserver.url_for(f"/quote/{symbol}"), headers=headers)
    assert response.status_code == 404

# --- POST /order 的測試 ---

def test_place_order_success(httpserver: HTTPServer):
    order_request = {
        "instrument_symbol": "2330",
        "action": "Buy",
        "price": 100.0,
        "quantity": 1,
        "order_type": "LMT",
        "time_in_force": "ROD"
    }
    httpserver.expect_request("/order", method="POST", json=order_request).respond_with_json({
        "id": "some_order_id",
        "user_id": "test_user",
        "instrument_symbol": "2330",
        "action": "Buy",
        "price": 100.0,
        "quantity": 1,
        "order_type": "LMT",
        "time_in_force": "ROD",
        "status": "Pending",
        "created_at": "2025-09-10T10:00:00Z"
    }, status=201)

    headers = {"X-API-KEY": VALID_API_KEY}
    response = httpx.post(httpserver.url_for("/order"), json=order_request, headers=headers)

    assert response.status_code == 201
    assert response.json()["status"] == "Pending"

def test_place_order_bad_request(httpserver: HTTPServer):
    invalid_order_request = {
        "instrument_symbol": "2330",
        # 缺少必要欄位
    }
    httpserver.expect_request("/order", method="POST").respond_with_data(status=400)

    headers = {"X-API-KEY": VALID_API_KEY}
    response = httpx.post(httpserver.url_for("/order"), json=invalid_order_request, headers=headers)
    assert response.status_code == 400

def test_place_order_forbidden_for_viewer(httpserver: HTTPServer):
    # 這個測試需要更複雜的設定來模擬不同的使用者角色
    # 目前，我們假設伺服器可以根據 API 金鑰來區分角色
    order_request = {
        "instrument_symbol": "2330",
        "action": "Buy",
        "price": 100.0,
        "quantity": 1,
        "order_type": "LMT",
        "time_in_force": "ROD"
    }
    httpserver.expect_request("/order", method="POST").respond_with_data(status=403) # 禁止

    # 假設這個金鑰屬於一個 'viewer'
    headers = {"X-API-KEY": "viewer_api_key"} 
    response = httpx.post(httpserver.url_for("/order"), json=order_request, headers=headers)
    assert response.status_code == 403