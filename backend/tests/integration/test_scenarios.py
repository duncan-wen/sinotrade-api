# tests/integration/test_scenarios.py

import httpx
import pytest

# 定義 API 的基礎 URL
BASE_URL = "http://localhost:8000"

# 為不同角色定義 API 金鑰
VIEWER_API_KEY = "viewer_api_key"
TRADER_API_KEY = "trader_api_key"

# 這是一個實際 API 客戶端的佔位符
# 在真實情境中,我們會有一個與執行中服務互動的客戶端
# 目前,我們假設伺服器正在運行,並且我們可以向其發出請求。

@pytest.mark.integration
def test_viewer_can_get_quote():
    """測試 'viewer' 角色的主要使用者情境。"""
    symbol = "2330"
    headers = {"X-API-KEY": VIEWER_API_KEY}

    # 假設服務正在 BASE_URL 上運行
    try:
        response = httpx.get(f"{BASE_URL}/quote/{symbol}", headers=headers)
        assert response.status_code == 200
        quote = response.json()
        assert quote["symbol"] == symbol
    except httpx.ConnectError:
        pytest.skip("API 服務未運行。跳過整合測試。")

@pytest.mark.integration
def test_trader_can_get_quote_and_place_order():
    """測試 'trader' 角色的主要使用者情境。"""
    symbol = "2884"
    headers = {"X-API-KEY": TRADER_API_KEY}

    try:
        # 1. 交易員獲取報價
        response_quote = httpx.get(f"{BASE_URL}/quote/{symbol}", headers=headers)
        assert response_quote.status_code == 200
        quote = response_quote.json()
        assert quote["symbol"] == symbol

        # 2. 交易員根據報價下單
        order_request = {
            "instrument_symbol": symbol,
            "action": "Buy",
            "price": quote["ask_price"], # 以賣出價買入
            "quantity": 10,
            "order_type": "LMT",
            "time_in_force": "ROD"
        }
        response_order = httpx.post(f"{BASE_URL}/order", json=order_request, headers=headers)
        assert response_order.status_code == 201
        order = response_order.json()
        assert order["status"] == "Pending"
        assert order["instrument_symbol"] == symbol

    except httpx.ConnectError:
        pytest.skip("API 服務未運行。跳過整合測試。")

@pytest.mark.integration
def test_viewer_cannot_place_order():
    """測試 'viewer' 無法下單。"""
    headers = {"X-API-KEY": VIEWER_API_KEY}
    order_request = {
        "instrument_symbol": "2330",
        "action": "Buy",
        "price": 100.0,
        "quantity": 1,
        "order_type": "LMT",
        "time_in_force": "ROD"
    }

    try:
        response = httpx.post(f"{BASE_URL}/order", json=order_request, headers=headers)
        assert response.status_code == 403 # 禁止
    except httpx.ConnectError:
        pytest.skip("API 服務未運行。跳過整合測試。")