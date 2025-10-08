# 台指選擇權 API 使用指南

## 概述

基於[台灣期貨交易所](https://www.taifex.com.tw/cht/2/tXO)的台指選擇權交易規格,本 API 提供完整的台指選擇權報價、歷史數據和合約資訊功能。

## 支援的選擇權類型

| 代碼 | 名稱             | 描述                 | 最後交易日                    |
| ---- | ---------------- | -------------------- | ----------------------------- |
| TXO  | 月到期選擇權     | 各月份第三週到期合約 | 各該契約交割月份第 3 個星期三 |
| TX1  | 第一週選擇權     | 第一週週三到期合約   | 交易當月第 1 個星期三         |
| TX2  | 第二週選擇權     | 第二週週三到期合約   | 交易當月第 2 個星期三         |
| TX4  | 第四週選擇權     | 第四週週三到期合約   | 交易當月第 4 個星期三         |
| TX5  | 第五週選擇權     | 第五週週三到期合約   | 交易當月第 5 個星期三         |
| TXU  | 第一週週五選擇權 | 第一週週五到期合約   | 交易當月第 1 個星期五         |
| TXV  | 第二週週五選擇權 | 第二週週五到期合約   | 交易當月第 2 個星期五         |
| TXX  | 第三週週五選擇權 | 第三週週五到期合約   | 交易當月第 3 個星期五         |
| TXY  | 第四週週五選擇權 | 第四週週五到期合約   | 交易當月第 4 個星期五         |
| TXZ  | 第五週週五選擇權 | 第五週週五到期合約   | 交易當月第 5 個星期五         |

## API 端點

### 1. 獲取可用合約

```http
GET /api/options/contracts
```

**回應範例:**

```json
{
  "success": true,
  "message": "成功獲取選擇權合約列表",
  "contracts": {
    "TX1": {
      "name": "第一週選擇權",
      "available": true,
      "contract_count": 168,
      "sample_contracts": [
        "TX120251025250C",
        "TX120251026450P",
        "TX120251022800C"
      ]
    },
    "TXU": {
      "name": "遠期週五選擇權",
      "available": true,
      "contract_count": 156,
      "sample_contracts": [
        "TXU20251025250C",
        "TXU20251025950C",
        "TXU20251026550P"
      ]
    }
  }
}
```

### 2. 獲取合約詳細資訊

```http
GET /api/options/contract/{option_type}/{contract_symbol}
```

**參數:**

- `option_type`: 選擇權類型 (TXO, TX1, TX2, TX4, TX5, TXU, TXV, TXX, TXY, TXZ)
- `contract_symbol`: 合約代號 (如: TX120251025250C)

**回應範例:**

```json
{
  "success": true,
  "option_type": "TX1",
  "contract_symbol": "TX120251025250C",
  "contract": {
    "code": "TX125250J5",
    "symbol": "TX120251025250C",
    "name": "臺指選擇權F510W1月25250C",
    "category": "TX1",
    "delivery_month": "202510",
    "delivery_date": "2025/10/01",
    "strike_price": 25250.0,
    "option_right": "Call",
    "underlying_kind": "I",
    "unit": 1,
    "limit_up": 3670.0,
    "limit_down": 0.1,
    "reference": 1050.0,
    "update_date": "2025/09/24",
    "is_call": true,
    "is_put": false,
    "moneyness": "OTM"
  }
}
```

### 3. 獲取履約價清單

```http
GET /api/options/strikes/{option_type}?call_put=C&limit=20
```

**參數:**

- `option_type`: 選擇權類型 (TXO, TX1, TX2, TX4, TX5, TXU, TXV, TXX, TXY, TXZ)
- `call_put`: 買權(C/call) 或 賣權(P/put)
- `limit`: 返回數量限制 (1-100)

**回應範例:**

```json
{
  "success": true,
  "option_type": "TXO",
  "call_put": "C",
  "strikes": [
    {
      "code": "TXO20241218020000C",
      "symbol": "TXO20241218020000C",
      "strike_price": 20000,
      "delivery_date": "2024-12-18",
      "call_put": "C"
    }
  ],
  "count": 1
}
```

### 4. 訂閱即時報價

```http
POST /api/options/subscribe?option_code=TXO20241218020000C&option_type=TXO
```

**回應範例:**

```json
{
  "success": true,
  "message": "成功訂閱選擇權: TXO20241218020000C",
  "option_type": "TXO",
  "contract_code": "TXO20241218020000C",
  "active_subscriptions": 1
}
```

### 5. 取消訂閱

```http
DELETE /api/options/unsubscribe?option_code=TXO20241218020000C
```

### 6. 獲取歷史數據

```http
GET /api/options/historical/{option_code}?option_type=TXO&interval=1d&limit=100
```

**參數:**

- `option_code`: 選擇權合約代碼
- `option_type`: 選擇權類型
- `interval`: 時間間隔 (1m, 5m, 15m, 1h, 1d)
- `limit`: 數據量限制 (1-1000)

### 7. 獲取訂閱狀態

```http
GET /api/options/status
```

## 使用範例

### Python 客戶端範例

```python
import requests

# 1. 獲取可用合約
response = requests.get("http://localhost:8000/api/options/contracts")
contracts = response.json()

# 2. 獲取合約詳細資訊 (基於 notebook 用法)
contract_symbol = "TX120251025250C"
response = requests.get(f"http://localhost:8000/api/options/contract/TX1/{contract_symbol}")
contract_details = response.json()

# 3. 獲取 TXO 買權履約價
response = requests.get(
    "http://localhost:8000/api/options/strikes/TXO",
    params={"call_put": "C", "limit": 10}
)
strikes = response.json()

# 4. 訂閱第一個合約
if strikes["strikes"]:
    option_code = strikes["strikes"][0]["symbol"]  # 使用 symbol 而不是 code
    response = requests.post(
        "http://localhost:8000/api/options/subscribe",
        params={"option_code": option_code, "option_type": "TXO"}
    )

# 5. 獲取歷史數據
response = requests.get(
    f"http://localhost:8000/api/options/historical/{option_code}",
    params={"option_type": "TXO", "interval": "1h", "limit": 24}
)
historical_data = response.json()
```

### JavaScript/TypeScript 範例

```typescript
// 獲取合約並訂閱
async function subscribeToOptions() {
  // 1. 獲取可用合約
  const contractsRes = await fetch("/api/options/contracts");
  const contracts = await contractsRes.json();

  // 2. 獲取特定合約詳細資訊 (模擬 notebook 用法)
  const contractSymbol = "TX120251025250C";
  const contractRes = await fetch(
    `/api/options/contract/TX1/${contractSymbol}`
  );
  const contractDetails = await contractRes.json();

  console.log("合約詳細資訊:", contractDetails.contract);

  // 3. 獲取履約價列表
  const strikesRes = await fetch("/api/options/strikes/TXO?call_put=C&limit=5");
  const strikes = await strikesRes.json();

  if (strikes.strikes.length > 0) {
    const optionCode = strikes.strikes[0].symbol; // 使用 symbol

    // 4. 訂閱報價
    const subscribeRes = await fetch("/api/options/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        option_code: optionCode,
        option_type: "TXO",
      }),
    });

    console.log("訂閱結果:", await subscribeRes.json());
  }
}
```

## 測試功能

執行測試腳本:

```bash
cd backend
python test_options.py
```

## 注意事項

1. **交易時間**: 平日 8:45~13:45, 15:00~05:00 (次日)
2. **合約命名**: 格式為 `TXO + 到期日(YYYYMMDD) + 履約價 + 買賣權(C/P)`
3. **API 限制**: 基於 Shioaji 免費帳號限制
4. **數據更新**: 即時數據需要透過 WebSocket 接收
5. **模擬環境**: 目前使用 Shioaji 模擬環境

## 錯誤處理

常見錯誤碼:

- `503`: Shioaji 服務未登錄
- `400`: 不支援的選擇權類型
- `404`: 找不到指定合約
- `500`: 內部服務錯誤

## 相關連結

- [台灣期貨交易所 - 台指選擇權](https://www.taifex.com.tw/cht/2/tXO)
- [Shioaji 官方文檔](https://sinotrade.github.io/zh_TW/)
- [選擇權理論價格計算](https://www.taifex.com.tw/cht/9/calOptPrice)
