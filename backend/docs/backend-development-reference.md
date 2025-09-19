# SinoTrade 後端開發參考

整合自所有後端文檔的精華內容，專門針對智能交易網站後端開發需求。

## 🚀 快速開發命令

### 主要開發命令
```bash
# 📦 安裝依賴 (Python 3.13.5)
uv sync --extra dev

# 🚀 啟動開發服務器
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# 🔧 程式碼品質檢查
uv run black src/ tests/        # 格式化
uv run ruff check src/ tests/   # 檢查問題
uv run ruff check --fix src/    # 自動修復
uv run mypy src/                # 類型檢查

# 🧪 測試
uv run pytest                   # 運行測試
uv run pytest --cov=src        # 含覆蓋率
```

### 簡化腳本 (推薦)
```bash
cd scripts-windows

scripts install        # 安裝依賴
scripts dev            # 啟動開發服務器
scripts lint format    # 格式化程式碼
scripts lint check     # 檢查程式碼品質
scripts lint mypy      # 類型檢查
```

## 📡 技術指標 API 精華

### 核心端點
```bash
# 單商品技術指標 (推薦使用 Polars 引擎)
GET /api/chart/{symbol}?use_polars=true&indicators=ma,kd,macd,bbands,rsi

# 多商品並行計算 (最多20個商品)
GET /api/chart/multi?symbols=2330,2317,2454&indicators=ma,rsi

# 基礎 K 線數據
GET /api/klines/{symbol}?interval=5m&limit=100
```

### 支援的技術指標
```typescript
interface TechnicalIndicators {
  ma: {
    periods: [5, 10, 20, 60, 120, 240];  // 移動平均線
    usage: "趨勢判斷、支撐阻力";
  };
  kd: {
    params: { k_period: 9, d_period: 3, rsv_period: 9 };
    usage: "超買超賣判斷、背離分析";
  };
  macd: {
    params: { fast: 12, slow: 26, signal: 9 };
    usage: "趨勢轉折、動量分析";
  };
  bbands: {
    params: { period: 20, std_multiplier: 2.0 };
    usage: "波動率分析、支撐阻力";
  };
  rsi: {
    periods: [6, 12, 24];
    usage: "超買超賣判斷、背離分析";
  };
}
```

### 效能優化建議
```bash
# ✅ 高效能配置 (Polars 引擎)
?use_polars=true&indicators=ma,rsi&limit=60

# ⚠️ 避免過度使用 (計算密集)
?indicators=ma,kd,macd,bbands,rsi&limit=500

# 🚀 多商品最佳實踐
?symbols=2330,2317,2454&indicators=ma,rsi  # 3-5個商品 + 輕量指標
```

## 💾 市場數據類型精要

### Shioaji 數據源選擇
```python
# 🎯 用於 K 線圖：Tick (推薦)
from shioaji import TickSTKv1

# 優勢：
# - 真實成交數據，時間精確到毫秒
# - 純成交資料，無雜訊
# - 適合即時 K 線聚合

def on_tick_callback(exchange, tick: TickSTKv1):
    # 聚合成 K 線的關鍵數據
    kline_data = {
        'timestamp': tick.datetime,
        'price': tick.close,      # 成交價
        'volume': tick.volume,    # 成交量
        'open': tick.open,
        'high': tick.high,
        'low': tick.low
    }
```

### 連續期貨合約最佳實踐
```python
# ✅ 正確做法：使用官方連續期貨合約 (通用動態方法)
def get_futures_contract_dynamic(symbol: str):
    """動態獲取期貨合約 - 支援所有官方R1/R2連續合約"""
    if symbol.endswith(("R1", "R2")):
        group_name = symbol[:-2]  # 提取群組名 (TXFR1 -> TXF)
        try:
            futures_group = getattr(api.Contracts.Futures, group_name)
            contract = getattr(futures_group, symbol)

            # 顯示target_code資訊
            target_code = getattr(contract, 'target_code', None)
            logger.info(f"連續合約 {symbol} -> 目標: {target_code}")
            return contract
        except AttributeError as e:
            logger.error(f"期貨群組 {group_name} 不存在: {e}")
            return None

# 🎯 支援的連續期貨合約實例
examples = {
    "TXFR1": "api.Contracts.Futures.TXF.TXFR1",  # 大台指近月
    "TXFR2": "api.Contracts.Futures.TXF.TXFR2",  # 大台指次月
    "MXFR1": "api.Contracts.Futures.MXF.MXFR1",  # 小台指近月
    "MXFR2": "api.Contracts.Futures.MXF.MXFR2",  # 小台指次月
    "CDFR1": "api.Contracts.Futures.CDF.CDFR1",  # 台積電期貨近月
    "CDFR2": "api.Contracts.Futures.CDF.CDFR2",  # 台積電期貨次月
    # ... 其他期貨群組的R1/R2合約
}

# 🚀 獲取連續歷史數據
kbars = api.kbars(
    contract=api.Contracts.Futures.TXF.TXFR1,
    start="2023-01-15",
    end="2023-01-16"
)

# 📋 連續合約資訊查看
contract = api.Contracts.Futures.TXF.TXFR1
print(f"合約代碼: {contract.code}")
print(f"目標合約: {contract.target_code}")  # 指向實際月份合約
print(f"交割日期: {contract.delivery_date}")

# ❌ 避免：手動計算結算日和合約切換
# 官方連續合約會自動處理這些邏輯，包含target_code自動對應
```

### 數據類型使用場景
| 類型       | 用途             | 更新頻率 | 適用場景   |
| ---------- | ---------------- | -------- | ---------- |
| **Tick**   | K線圖、成交分析  | 每筆成交 | ✅ 即時圖表 |
| **BidAsk** | 五檔報價、流動性 | 掛單變動 | ✅ 訂單簿   |
| **Quote**  | 完整行情顯示     | 綜合更新 | ✅ 報價面板 |

## ⚡ Polars 高效能指標計算

### 為什麼選擇 Polars？
```python
# 性能對比實測
pandas_version = "45.2秒 (8.2GB記憶體)"
polars_version = "4.8秒 (1.6GB記憶體)"  # 🚀 9.4x 加速
```

### 核心優化技巧
```python
import polars as pl
import polars_talib as plta

# ✅ 高效能寫法：懶惰求值 + 批量計算
def calculate_indicators_optimized(df: pl.DataFrame):
    return (
        df.lazy()  # 🚀 開啟懶惰模式
        .with_columns([
            # 一次性計算所有指標
            pl.col("close").rolling_mean(20).alias("ma20"),
            plta.rsi(pl.col("close"), 14).alias("rsi"),
            plta.macd(pl.col("close"), 12, 26, 9).struct.field("macd").alias("macd")
        ])
        .collect(streaming=True)  # 🚀 流式處理
    )

# ✅ 多商品並行計算
def multi_symbol_calculation(data: dict):
    df = pl.DataFrame(flatten_symbol_data(data))
    return df.with_columns([
        plta.sma(pl.col("close"), 20).over("symbol").alias("ma20"),  # 🚀 關鍵：over("symbol")
        plta.rsi(pl.col("close"), 14).over("symbol").alias("rsi"),
    ])
```

### 記憶體優化
```python
# 🚀 優化數據類型節省記憶體
optimized_schema = {
    "timestamp": pl.Datetime,
    "open": pl.Float32,      # 使用 Float32 而非 Float64
    "high": pl.Float32,
    "low": pl.Float32,
    "close": pl.Float32,
    "volume": pl.UInt32,     # 成交量使用無符號整數
    "symbol": pl.Categorical  # 商品代號使用分類類型
}
```

## 🔄 即時數據處理架構

### WebSocket 即時推送
```python
# 後端：Tick 到 K 線聚合
class KlineAggregator:
    def __init__(self):
        self.current_klines = {}  # symbol -> {timestamp -> kline}

    async def process_tick(self, tick_data: Quote):
        symbol = tick_data.symbol
        minute_time = self.get_minute_timestamp(tick_data.timestamp)

        if minute_time not in self.current_klines.get(symbol, {}):
            # 新 K 線：第一筆成交
            kline = {
                "timestamp": minute_time.isoformat(),
                "open": tick_data.close,
                "high": tick_data.close,
                "low": tick_data.close,
                "close": tick_data.close,
                "volume": tick_data.volume
            }
            await self.broadcast_new_kline(symbol, kline)
        else:
            # 更新現有 K 線
            kline = self.current_klines[symbol][minute_time]
            kline["high"] = max(kline["high"], tick_data.close)
            kline["low"] = min(kline["low"], tick_data.close)
            kline["close"] = tick_data.close
            kline["volume"] += tick_data.volume
            await self.broadcast_kline_update(symbol, kline)
```

### 資料流程
```
Shioaji Tick → 後端聚合器 → WebSocket → 前端圖表
   (50ms)     → (100ms)    → (10ms)  → (即時更新)
```

## 🕐 多時間框架支援

### 支援的時間間隔
```python
SUPPORTED_INTERVALS = {
    '1m': {'limit': 200, 'source': 'ticks_aggregated'},
    '5m': {'limit': 200, 'source': 'ticks_aggregated'},
    '15m': {'limit': 150, 'source': 'ticks_aggregated'},
    '1h': {'limit': 120, 'source': 'ticks_aggregated'},
    '1d': {'limit': 100, 'source': 'official_kbar'},     # 官方 API
    '1w': {'limit': 52, 'source': 'daily_aggregated'},   # 日線聚合
    '1M': {'limit': 24, 'source': 'daily_aggregated'}    # 日線聚合
}
```

### 聚合邏輯
```python
# 周線：週一到週日
weekly_agg = df.resample('W-SUN').agg({
    'open': 'first',   # 週一開盤
    'high': 'max',     # 一週最高
    'low': 'min',      # 一週最低
    'close': 'last',   # 週五收盤
    'volume': 'sum'    # 一週總量
})

# 月線：月初到月末
monthly_agg = df.resample('M').agg({
    'open': 'first',   # 月初開盤
    'high': 'max',     # 當月最高
    'low': 'min',      # 當月最低
    'close': 'last',   # 月末收盤
    'volume': 'sum'    # 當月總量
})
```

## 🔧 Python 開發環境

### Python 3.13.5 特性
```python
# ✅ 新的泛型語法
type Point = tuple[float, float]
type Points = list[Point]

# ✅ 更好的錯誤處理
def process_data(data: list) -> dict:
    try:
        return {"result": data}
    except Exception as e:
        # Python 3.13 提供更好的錯誤上下文
        raise RuntimeError(f"Processing failed: {e}") from e

# ✅ 改進的異步支援
async def async_data_stream() -> AsyncGenerator[dict, None]:
    async with asyncio.TaskGroup() as tg:
        for i in range(5):
            tg.create_task(process_item(i))
```

### 程式碼品質配置
```toml
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py313']

[tool.ruff]
target-version = "py313"
select = ["E", "W", "F", "I", "B", "C4", "UP"]
ignore = ["E501", "B008", "C901"]

[tool.mypy]
python_version = "3.13"
strict = true
```

## 🎯 效能監控與調優

### API 響應時間目標
```python
# 效能目標
PERFORMANCE_TARGETS = {
    'api_p95_response': '< 200ms',
    'realtime_data_delay': '< 500ms',
    'concurrent_users': '1000',
    'page_load_lcp': '< 3s'
}

# 監控代碼
@contextmanager
def performance_monitor(operation_name: str):
    start_time = time.time()
    start_memory = psutil.Process().memory_info().rss / 1024 / 1024

    try:
        yield
    finally:
        duration = time.time() - start_time
        memory_delta = psutil.Process().memory_info().rss / 1024 / 1024 - start_memory
        logger.info(f"{operation_name}: {duration:.2f}s, {memory_delta:+.1f}MB")
```

### 快取策略
```python
# Redis 快取設計
CACHE_STRATEGIES = {
    'historical_data': '5分鐘TTL',
    'technical_indicators': '1分鐘TTL',
    'realtime_quotes': '30秒TTL',
    'market_status': '10分鐘TTL'
}

# 實作範例
from functools import lru_cache
import time

@lru_cache(maxsize=100)
def get_cached_chart_data(symbol: str, cache_key: str):
    return calculate_technical_indicators(symbol)

# 使用時間戳作為快取鍵
cache_key = str(int(time.time() // 300))  # 5分鐘更新
data = get_cached_chart_data("2330", cache_key)
```

## 🔍 錯誤處理與調試

### 金融數據特有錯誤
```python
class TradingErrorHandler:
    @staticmethod
    def handle_market_errors(error_code: str) -> str:
        error_messages = {
            'MARKET_CLOSED': '市場已休市，顯示最後收盤價',
            'SYMBOL_NOT_FOUND': '找不到該股票代號',
            'INSUFFICIENT_DATA': '歷史數據不足，無法計算指標',
            'RATE_LIMIT': '請求過於頻繁，請稍後再試',
            'CALCULATION_ERROR': '技術指標計算失敗'
        }
        return error_messages.get(error_code, '未知錯誤')

# 重試機制
def api_call_with_retry(func, max_retries: int = 3):
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** attempt
            time.sleep(wait_time)
```

### 日誌配置
```python
import logging

# 金融系統日誌配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)s | %(levelname)s | %(message)s',
    handlers=[
        logging.FileHandler('logs/trading_system.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# 使用範例
logger.info(f"📊 計算技術指標: {symbol}, 指標: {indicators}")
logger.warning(f"⚠️ 數據不足: {symbol}, 需要: {required}, 實際: {actual}")
logger.error(f"❌ API調用失敗: {error}")
```

## 🧪 測試策略

### 關鍵測試場景
```python
import pytest
from unittest.mock import patch

# 技術指標計算測試
def test_technical_indicators_calculation():
    # 準備測試數據
    kline_data = generate_test_kline_data(100)

    # 測試 Polars 引擎
    result = polars_service.calculate_indicators(kline_data, {
        "ma": {"periods": [20]},
        "rsi": {"periods": [14]}
    })

    assert len(result) > 0
    assert 'ma20' in result[0]
    assert 'rsi14' in result[0]

# API 效能測試
def test_api_performance():
    start_time = time.time()
    response = client.get("/api/chart/2330?use_polars=true")
    duration = time.time() - start_time

    assert response.status_code == 200
    assert duration < 0.2  # 200ms 目標

# WebSocket 連接測試
async def test_websocket_kline_updates():
    with client.websocket_connect("/ws/klines/test") as websocket:
        # 模擬 tick 數據
        await simulate_tick_data("2330")

        # 驗證 K 線更新
        data = websocket.receive_json()
        assert data["type"] == "kline"
        assert data["symbol"] == "2330"
```

## 📋 部署檢查清單

### 生產環境配置
```bash
# 環境變數檢查
export SHIOAJI_API_KEY="your_api_key"
export REDIS_URL="redis://localhost:6379"
export LOG_LEVEL="INFO"
export USE_POLARS="true"

# 效能配置
export UVICORN_WORKERS=4
export MAX_CONCURRENT_REQUESTS=1000
export CACHE_TTL=300

# 安全配置
export API_KEY_HEADER="X-API-KEY"
export CORS_ORIGINS="https://yourdomain.com"
```

### 健康檢查端點
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "services": {
            "shioaji": await check_shioaji_connection(),
            "redis": await check_redis_connection(),
            "database": await check_database_connection()
        }
    }
```

## 🔗 常用開發資源

### API 測試
```bash
# 本地開發 API
curl "http://localhost:8000/api/chart/2330?indicators=ma,rsi" \
  -H "X-API-KEY: viewer_api_key"

# 健康檢查
curl "http://localhost:8000/health"

# WebSocket 測試 (使用 wscat)
wscat -c ws://localhost:8000/ws/klines/test
```

### 常用除錯指令
```bash
# 查看日誌
tail -f logs/trading_system.log

# 效能分析
uv run python -m cProfile -o profile.out src/main.py

# 記憶體分析
uv run python -m memory_profiler src/services/technical_analysis.py
```

### 相關文檔連結
- [Shioaji 官方文檔](https://sinotrade.github.io/zh/)
- [Polars 效能指南](https://pola-rs.github.io/polars/user-guide/performance/)
- [FastAPI WebSocket](https://fastapi.tiangolo.com/advanced/websockets/)
- [Python 3.13 新特性](https://docs.python.org/3.13/whatsnew/3.13.html)

---

*此文檔整合了所有後端開發文檔的精華內容，專門針對 SinoTrade 智能交易網站的開發需求。*
*移除原始文檔前，請確保此參考文檔涵蓋了您需要的所有重要內容。*
