# 技術指標架構文檔

## 📊 概述

本系統提供了完整的技術指標計算服務，支援 K 線圖和多種技術指標的高效能計算。採用雙引擎架構，可選擇 pandas 或 Polars + polars_talib 進行計算。

## 🏗️ 架構設計

### 系統架構圖

```
原始數據 → 數據預處理 → 技術指標計算 → 結構化輸出 → API 響應
    ↓           ↓            ↓           ↓         ↓
Shioaji → DataFrame → 雙引擎計算 → Pydantic → JSON
                        ↓
                   ┌─────────┴─────────┐
                   │                   │
              pandas 引擎        Polars 引擎
              (相容性好)        (高效能)
```

### 核心組件

1. **數據模型** (`technical_indicators.py`)
2. **計算引擎** (`technical_analysis_service.py` + `polars_technical_analysis_service.py`)
3. **API 端點** (`quotes.py`)
4. **數據轉換** (前端 `chartDataConverter.ts`)

## 🔧 支援的技術指標

### 移動平均線 (Moving Average - MA)

**計算方式**: 簡單移動平均
**支援週期**: 5, 10, 20, 60, 120, 240
**用途**: 趨勢判斷、支撐阻力

```python
# Pandas 版本
df[f'ma{period}'] = df['close'].rolling(window=period).mean()

# Polars 版本
pl.col("close").rolling_mean(window_size=period).alias(f"ma{period}")
```

### KD 隨機指標 (Stochastic Oscillator)

**參數**:
- RSV 週期: 9 (預設)
- K 週期: 9 (預設)
- D 週期: 3 (預設)

**計算公式**:
```
RSV = (收盤價 - N日最低價) / (N日最高價 - N日最低價) × 100
K值 = RSV的移動平均
D值 = K值的移動平均
J值 = 3K - 2D
```

**用途**: 超買超賣判斷、背離分析

### MACD 指標 (Moving Average Convergence Divergence)

**參數**:
- 快線 EMA: 12 (預設)
- 慢線 EMA: 26 (預設)
- 信號線: 9 (預設)

**計算公式**:
```
DIF = EMA(12) - EMA(26)
DEA = EMA(DIF, 9)
MACD = DIF - DEA
Histogram = (DIF - DEA) × 2
```

**用途**: 趨勢轉折、動量分析

### 布林通道 (Bollinger Bands)

**參數**:
- 週期: 20 (預設)
- 標準差倍數: 2.0 (預設)

**計算公式**:
```
中軌 = MA(20)
上軌 = 中軌 + 2 × 標準差
下軌 = 中軌 - 2 × 標準差
通道寬度 = (上軌 - 下軌) / 中軌 × 100
```

**用途**: 波動率分析、支撐阻力

### RSI 相對強弱指標 (Relative Strength Index)

**支援週期**: 6, 12, 24
**計算公式**:
```
RS = 平均上漲幅度 / 平均下跌幅度
RSI = 100 - (100 / (1 + RS))
```

**用途**: 超買超賣判斷、背離分析

## ⚡ 雙引擎架構

### Pandas 引擎 (傳統)

**優勢**:
- 成熟穩定
- 生態系統完整
- 除錯容易

**適用場景**:
- 開發測試
- 小量數據
- 相容性要求高

### Polars + polars_talib 引擎 (推薦)

**優勢**:
- 3-10x 計算速度提升
- 50-80% 記憶體節省
- 自動多核心並行
- 內建 TA-Lib 指標

**適用場景**:
- 生產環境
- 大量數據
- 多商品並行計算
- 即時計算需求

## 📡 API 端點

### 單商品技術指標

```http
GET /api/chart/{symbol}?interval=1d&limit=60&indicators=ma,kd,macd,bbands,rsi&use_polars=true
```

**參數說明**:
- `symbol`: 商品代號 (如: 2330)
- `interval`: K線間隔 (1m, 5m, 15m, 1h, 1d, 1w, 1M)
- `limit`: 返回的K線數量 (1-1000)
- `indicators`: 技術指標列表
- `ma_periods`: 均線週期設定
- `use_polars`: 是否使用 Polars 引擎 (預設: true)

**響應格式**:
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
  "indicators_config": {...},
  "source": "official_kbar"
}
```

### 多商品並行計算 🆕

```http
GET /api/chart/multi?symbols=2330,2317,2454&interval=1d&limit=60&indicators=ma,rsi
```

**特色**:
- 同時處理多個商品
- 自動並行計算
- 最多支援 20 個商品
- 記憶體效率優化

**響應格式**:
```json
{
  "symbols": ["2330", "2317", "2454"],
  "interval": "1d",
  "data": {
    "2330": {
      "count": 60,
      "data": [...]
    },
    "2317": {
      "count": 60,
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

## 🎯 性能優化

### 數據量計算

系統會自動計算技術指標所需的額外數據量：

```python
# 範例：顯示 60 天 + MA60 指標
display_days = 60
ma_periods = [60]
actual_needed = 60 + 60 - 1 = 119 天數據

# 確保 MA60 的前 59 天都有足夠數據計算
```

### 並行計算策略

**單商品模式**:
- 向量化計算所有指標
- 記憶體預分配
- 懶惰求值 (Polars)

**多商品模式**:
```python
# 使用 over("symbol") 實現真正並行
pl.col("close").rolling_mean(window_size=period)
.over("symbol")  # 🚀 按商品分組並行
.alias(f"ma{period}")
```

### 記憶體管理

1. **流式處理**: 避免載入過多歷史數據
2. **數據類型優化**: 使用適當的數值精度
3. **垃圾回收**: 及時釋放中間計算結果
4. **分批處理**: 大量商品分批計算

## 🔍 使用範例

### Python 後端

```python
# 使用 Polars 引擎計算單商品指標
indicators_config = {
    "ma": {"periods": [5, 20, 60]},
    "macd": {"fast": 12, "slow": 26, "signal": 9},
    "rsi": {"periods": [6, 12, 24]}
}

result = polars_technical_analysis_service.calculate_all_indicators(
    kline_data, indicators_config
)

# 多商品並行計算
multi_result = polars_technical_analysis_service.calculate_multi_symbol_indicators(
    {"2330": kline_data_2330, "2317": kline_data_2317},
    indicators_config
)
```

### 前端 TypeScript

```typescript
// 獲取單商品數據
const response = await fetch('/api/chart/2330?use_polars=true&indicators=ma,macd');
const chartData: ChartDataResponse = await response.json();

// 轉換為圖表格式
const lightweightData = convertToLightweightChartsData(chartData.data);

// 設置到 Lightweight Charts
candlestickSeries.setData(lightweightData.candlestick);
ma20Series.setData(lightweightData.ma['20']);
macdSeries.setData(lightweightData.macd.histogram);
```

## 🚀 最佳實踐

### 1. 引擎選擇

- **開發環境**: 使用 pandas 引擎 (`use_polars=false`)
- **生產環境**: 使用 Polars 引擎 (`use_polars=true`)
- **多商品場景**: 強烈建議使用 Polars 引擎

### 2. 參數調優

```python
# 均線設定建議
ma_periods = [5, 10, 20, 60]  # 短中長期組合

# MACD 參數 (適合台股)
macd_config = {"fast": 12, "slow": 26, "signal": 9}

# RSI 參數
rsi_periods = [6, 12, 24]  # 短中長期組合
```

### 3. 錯誤處理

- 數據不足時自動降級
- 指標計算失敗時返回 null
- 網路異常時提供重試機制
- 詳細的日誌記錄

### 4. 快取策略

- 歷史數據快取 (Redis)
- 計算結果快取 (短期)
- 增量更新機制
- 過期自動清理

## 📈 擴展指南

### 添加新指標

1. **更新數據模型**:
```python
class NewIndicatorData(BaseModel):
    timestamp: str
    value: float | None = None
```

2. **實作計算邏輯**:
```python
# Pandas 版本
def calculate_new_indicator(df: pd.DataFrame) -> pd.DataFrame:
    df['new_indicator'] = custom_calculation(df['close'])
    return df

# Polars 版本
pl.col("close").map_elements(custom_calculation).alias("new_indicator")
```

3. **更新 API 響應**:
```python
new_indicator_data = NewIndicatorData(
    timestamp=row['timestamp'],
    value=float(row.get('new_indicator')) if row.get('new_indicator') is not None else None
)
```

### 自定義指標參數

```python
# 在 indicators_config 中添加新配置
"custom_indicator": {
    "period": 14,
    "multiplier": 2.0,
    "smoothing": "ema"
}
```

## 🔧 故障排除

### 常見問題

1. **計算結果為 null**
   - 檢查數據量是否足夠
   - 確認指標參數設定
   - 查看日誌錯誤訊息

2. **性能問題**
   - 使用 Polars 引擎
   - 減少指標數量
   - 降低數據量

3. **記憶體不足**
   - 分批處理多商品
   - 減少歷史數據範圍
   - 檢查記憶體洩漏

### 監控指標

- API 響應時間
- 記憶體使用量
- CPU 使用率
- 錯誤率統計

## 📚 相關文檔

- [Shioaji 官方文檔](https://sinotrade.github.io/zh/)
- [Polars 文檔](https://pola-rs.github.io/polars/)
- [polars_talib 文檔](https://github.com/wukan1986/polars_ta)
- [Lightweight Charts 文檔](https://tradingview.github.io/lightweight-charts/)

---

*最後更新: 2024-09-14*
*版本: 1.0.0*
