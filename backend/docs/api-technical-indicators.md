# 技術指標 API 使用指南

## 🚀 快速開始

### 基本使用

```bash
# 獲取台積電日線圖 + 基本技術指標
curl -X GET "http://localhost:8000/api/chart/2330?interval=1d&limit=60&indicators=ma,macd" \
  -H "X-API-KEY: viewer_api_key"
```

### 高效能模式

```bash
# 使用 Polars 引擎 (推薦)
curl -X GET "http://localhost:8000/api/chart/2330?use_polars=true&indicators=ma,kd,macd,bbands,rsi" \
  -H "X-API-KEY: viewer_api_key"
```

## 📡 API 端點詳解

### 1. 單商品技術指標

**端點**: `GET /api/chart/{symbol}`

**路徑參數**:
- `symbol` (string, required): 商品代號
  - 股票: `2330`, `2317`, `2454`
  - 期貨: `TXF`, `TXFR1`
  - 選擇權: `TXO`

**查詢參數**:

| 參數         | 類型    | 預設值                  | 說明                   |
| ------------ | ------- | ----------------------- | ---------------------- |
| `interval`   | string  | `1d`                    | K線間隔                |
| `limit`      | integer | `100`                   | 返回的K線數量 (1-1000) |
| `indicators` | string  | `ma,kd,macd,bbands,rsi` | 技術指標列表           |
| `ma_periods` | string  | `5,10,20,60`            | 均線週期設定           |
| `use_polars` | boolean | `true`                  | 使用 Polars 高效能引擎 |

**支援的時間間隔**:
- `1m` - 1分鐘
- `5m` - 5分鐘
- `15m` - 15分鐘
- `1h` - 1小時
- `1d` - 日線 (推薦)
- `1w` - 週線
- `1M` - 月線

**支援的技術指標**:
- `ma` - 移動平均線
- `kd` - KD隨機指標
- `macd` - MACD指標
- `bbands` - 布林通道
- `rsi` - RSI相對強弱指標

### 2. 多商品並行計算 🆕

**端點**: `GET /api/chart/multi`

**查詢參數**:

| 參數         | 類型    | 預設值    | 說明                      |
| ------------ | ------- | --------- | ------------------------- |
| `symbols`    | string  | -         | 商品代號列表 (逗號分隔)   |
| `interval`   | string  | `1d`      | K線間隔                   |
| `limit`      | integer | `60`      | 每個商品的K線數量 (1-500) |
| `indicators` | string  | `ma,rsi`  | 技術指標 (簡化版)         |
| `ma_periods` | string  | `5,20,60` | 均線週期設定              |

**限制**:
- 最多同時處理 20 個商品
- 建議使用較少的技術指標以提升性能
- 自動使用 Polars 引擎進行並行計算

## 📊 響應格式

### 單商品響應

```json
{
  "symbol": "2330",
  "interval": "1d",
  "data": [
    {
      "timestamp": "2024-09-14T00:00:00",
      "kline": {
        "open": 566.0,
        "high": 572.0,
        "low": 563.0,
        "close": 570.0,
        "volume": 25420000
      },
      "ma": {
        "ma5": 568.2,
        "ma10": 567.1,
        "ma20": 565.8,
        "ma60": 560.1
      },
      "kd": {
        "k": 75.2,
        "d": 72.8,
        "j": 80.0
      },
      "macd": {
        "dif": 2.1,
        "dea": 1.8,
        "macd": 0.3,
        "histogram": 0.6
      },
      "bbands": {
        "upper": 580.5,
        "middle": 570.0,
        "lower": 559.5,
        "bandwidth": 3.8
      },
      "rsi": {
        "rsi6": 65.2,
        "rsi12": 58.7,
        "rsi24": 52.1
      }
    }
  ],
  "count": 60,
  "indicators_config": {
    "ma": {"periods": [5, 10, 20, 60]},
    "kd": {"k_period": 9, "d_period": 3, "rsv_period": 9},
    "macd": {"fast": 12, "slow": 26, "signal": 9},
    "bbands": {"period": 20, "std_multiplier": 2.0},
    "rsi": {"periods": [6, 12, 24]}
  },
  "source": "official_kbar"
}
```

### 多商品響應

```json
{
  "symbols": ["2330", "2317", "2454"],
  "interval": "1d",
  "indicators_config": {
    "ma": {"periods": [5, 20, 60]},
    "rsi": {"periods": [6, 12, 24]}
  },
  "data": {
    "2330": {
      "count": 60,
      "data": [
        {
          "timestamp": "2024-09-14T00:00:00",
          "kline": {...},
          "ma": {...},
          "rsi": {...}
        }
      ]
    },
    "2317": {
      "count": 60,
      "data": [...]
    },
    "2454": {
      "count": 58,
      "data": [...]
    }
  },
  "summary": {
    "total_symbols": 3,
    "successful_symbols": 3,
    "failed_symbols": 0
  }
}
```

## 🎯 使用範例

### 基本技術分析

```bash
# 獲取台積電 60 天日線 + MA5,20,60
curl -X GET "http://localhost:8000/api/chart/2330?limit=60&indicators=ma&ma_periods=5,20,60" \
  -H "X-API-KEY: viewer_api_key"
```

### 完整技術指標

```bash
# 獲取所有支援的技術指標
curl -X GET "http://localhost:8000/api/chart/2330?indicators=ma,kd,macd,bbands,rsi" \
  -H "X-API-KEY: viewer_api_key"
```

### 短線交易指標

```bash
# 5分鐘線 + 快速指標
curl -X GET "http://localhost:8000/api/chart/2330?interval=5m&limit=200&indicators=ma,kd&ma_periods=5,10,20" \
  -H "X-API-KEY: viewer_api_key"
```

### 多商品監控

```bash
# 同時監控多檔股票
curl -X GET "http://localhost:8000/api/chart/multi?symbols=2330,2317,2454,2382,2412&indicators=ma,rsi" \
  -H "X-API-KEY: viewer_api_key"
```

### 期貨分析

```bash
# 台指期貨技術分析
curl -X GET "http://localhost:8000/api/chart/TXFR1?interval=1h&limit=100&indicators=ma,macd" \
  -H "X-API-KEY: viewer_api_key"
```

## ⚡ 性能優化建議

### 1. 引擎選擇

```bash
# 🚀 生產環境 - 使用 Polars (預設)
?use_polars=true

# 🐌 開發測試 - 使用 pandas
?use_polars=false
```

### 2. 指標選擇

```bash
# ✅ 高效能組合
?indicators=ma,rsi

# ⚠️ 計算密集組合
?indicators=ma,kd,macd,bbands,rsi
```

### 3. 數據量控制

```bash
# ✅ 適中數據量
?limit=60

# ⚠️ 大量數據 (較慢)
?limit=500
```

### 4. 多商品優化

```bash
# ✅ 合理商品數量
?symbols=2330,2317,2454

# ⚠️ 過多商品 (可能超時)
?symbols=2330,2317,2454,2382,2412,2881,2891,2892,2886,2002
```

## 🔍 錯誤處理

### 常見錯誤碼

| HTTP 狀態碼 | 錯誤類型              | 說明           |
| ----------- | --------------------- | -------------- |
| `400`       | Bad Request           | 參數錯誤       |
| `401`       | Unauthorized          | API Key 無效   |
| `404`       | Not Found             | 商品代號不存在 |
| `429`       | Too Many Requests     | 請求頻率過高   |
| `500`       | Internal Server Error | 伺服器內部錯誤 |

### 錯誤響應格式

```json
{
  "error": "Invalid ma_periods format. Use comma-separated integers like '5,20,60'",
  "symbol": "2330",
  "data": [],
  "count": 0
}
```

### 部分成功響應 (多商品)

```json
{
  "symbols": ["2330", "INVALID", "2317"],
  "data": {
    "2330": {...},
    "2317": {...}
  },
  "summary": {
    "total_symbols": 3,
    "successful_symbols": 2,
    "failed_symbols": 1
  }
}
```

## 🛠️ 開發工具

### cURL 測試腳本

```bash
#!/bin/bash
# test_technical_indicators.sh

API_BASE="http://localhost:8000/api"
API_KEY="viewer_api_key"

echo "🧪 測試單商品技術指標..."
curl -X GET "${API_BASE}/chart/2330?limit=10&indicators=ma" \
  -H "X-API-KEY: ${API_KEY}" | jq '.data[0]'

echo "🧪 測試多商品並行計算..."
curl -X GET "${API_BASE}/chart/multi?symbols=2330,2317&limit=5&indicators=ma" \
  -H "X-API-KEY: ${API_KEY}" | jq '.summary'

echo "🧪 測試性能比較..."
time curl -X GET "${API_BASE}/chart/2330?use_polars=true&indicators=ma,macd" \
  -H "X-API-KEY: ${API_KEY}" > /dev/null

time curl -X GET "${API_BASE}/chart/2330?use_polars=false&indicators=ma,macd" \
  -H "X-API-KEY: ${API_KEY}" > /dev/null
```

### Python 客戶端範例

```python
import requests
import json
from typing import Dict, Any

class TechnicalIndicatorClient:
    def __init__(self, base_url: str = "http://localhost:8000", api_key: str = "viewer_api_key"):
        self.base_url = base_url
        self.headers = {"X-API-KEY": api_key}

    def get_single_chart(self, symbol: str, **kwargs) -> Dict[str, Any]:
        """獲取單商品技術指標"""
        params = {
            "interval": kwargs.get("interval", "1d"),
            "limit": kwargs.get("limit", 60),
            "indicators": kwargs.get("indicators", "ma,macd"),
            "use_polars": kwargs.get("use_polars", True)
        }

        response = requests.get(
            f"{self.base_url}/api/chart/{symbol}",
            params=params,
            headers=self.headers
        )
        return response.json()

    def get_multi_chart(self, symbols: list, **kwargs) -> Dict[str, Any]:
        """獲取多商品技術指標"""
        params = {
            "symbols": ",".join(symbols),
            "interval": kwargs.get("interval", "1d"),
            "limit": kwargs.get("limit", 60),
            "indicators": kwargs.get("indicators", "ma,rsi")
        }

        response = requests.get(
            f"{self.base_url}/api/chart/multi",
            params=params,
            headers=self.headers
        )
        return response.json()

# 使用範例
client = TechnicalIndicatorClient()

# 單商品
tsmc_data = client.get_single_chart("2330", indicators="ma,macd,rsi")
print(f"台積電數據點數: {tsmc_data['count']}")

# 多商品
multi_data = client.get_multi_chart(["2330", "2317", "2454"])
print(f"成功處理商品數: {multi_data['summary']['successful_symbols']}")
```

### JavaScript/TypeScript 客戶端

```typescript
interface TechnicalIndicatorAPI {
  getSingleChart(symbol: string, options?: ChartOptions): Promise<ChartDataResponse>;
  getMultiChart(symbols: string[], options?: MultiChartOptions): Promise<MultiChartResponse>;
}

class TechnicalIndicatorClient implements TechnicalIndicatorAPI {
  constructor(
    private baseUrl: string = 'http://localhost:8000',
    private apiKey: string = 'viewer_api_key'
  ) {}

  async getSingleChart(symbol: string, options: ChartOptions = {}): Promise<ChartDataResponse> {
    const params = new URLSearchParams({
      interval: options.interval || '1d',
      limit: (options.limit || 60).toString(),
      indicators: options.indicators || 'ma,macd',
      use_polars: (options.usePolars !== false).toString()
    });

    const response = await fetch(`${this.baseUrl}/api/chart/${symbol}?${params}`, {
      headers: { 'X-API-KEY': this.apiKey }
    });

    return response.json();
  }

  async getMultiChart(symbols: string[], options: MultiChartOptions = {}): Promise<MultiChartResponse> {
    const params = new URLSearchParams({
      symbols: symbols.join(','),
      interval: options.interval || '1d',
      limit: (options.limit || 60).toString(),
      indicators: options.indicators || 'ma,rsi'
    });

    const response = await fetch(`${this.baseUrl}/api/chart/multi?${params}`, {
      headers: { 'X-API-KEY': this.apiKey }
    });

    return response.json();
  }
}

// 使用範例
const client = new TechnicalIndicatorClient();

// 獲取台積電技術指標
const tsmcData = await client.getSingleChart('2330', {
  indicators: 'ma,kd,macd',
  limit: 100
});

// 多商品監控
const multiData = await client.getMultiChart(['2330', '2317', '2454'], {
  indicators: 'ma,rsi'
});
```

## 📈 最佳實踐

### 1. API 呼叫頻率

```bash
# ✅ 合理頻率 (每分鐘)
* * * * * curl -X GET "api/chart/2330" -H "X-API-KEY: key"

# ⚠️ 過於頻繁 (每秒) - 可能被限制
while true; do curl -X GET "api/chart/2330"; sleep 1; done
```

### 2. 快取策略

```python
import time
from functools import lru_cache

@lru_cache(maxsize=100)
def get_cached_chart_data(symbol: str, cache_key: str):
    """簡單的記憶體快取"""
    return client.get_single_chart(symbol)

# 使用時間戳作為快取鍵 (5分鐘更新一次)
cache_key = str(int(time.time() // 300))
data = get_cached_chart_data("2330", cache_key)
```

### 3. 錯誤重試

```python
import time
from typing import Optional

def get_chart_with_retry(symbol: str, max_retries: int = 3) -> Optional[Dict]:
    """帶重試機制的 API 呼叫"""
    for attempt in range(max_retries):
        try:
            return client.get_single_chart(symbol)
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"最終失敗: {e}")
                return None

            wait_time = 2 ** attempt  # 指數退避
            print(f"重試 {attempt + 1}/{max_retries},等待 {wait_time} 秒...")
            time.sleep(wait_time)

    return None
```

### 4. 批次處理

```python
def process_watchlist(symbols: list, batch_size: int = 5):
    """分批處理大量商品"""
    results = {}

    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i + batch_size]
        print(f"處理批次: {batch}")

        try:
            batch_result = client.get_multi_chart(batch)
            results.update(batch_result['data'])

            # 避免 API 限制
            time.sleep(1)

        except Exception as e:
            print(f"批次處理失敗: {e}")
            continue

    return results
```

## 🔗 相關資源

- [技術指標架構文檔](./technical-indicators-architecture.md)
- [Shioaji API 文檔](https://sinotrade.github.io/zh/)
- [Polars 性能指南](https://pola-rs.github.io/polars/)
- [Lightweight Charts 整合](https://tradingview.github.io/lightweight-charts/)

---

*最後更新: 2024-09-14*
*版本: 1.0.0*
