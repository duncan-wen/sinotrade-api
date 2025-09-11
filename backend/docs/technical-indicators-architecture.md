# 技術指標架構設計指南

本文檔分析前端 vs 後端計算技術指標（KD、MACD、RSI）的優缺點,並提供最佳實作建議。

## 🤔 核心問題

### 技術指標計算應該在哪裡進行？
1. **前端計算**:使用 JavaScript 圖表庫（如 TradingView、Chart.js）
2. **後端計算**:Python 計算後傳送結果給前端
3. **混合方案**:結合兩者優點

---

## 📊 方案比較分析

### 方案一:前端計算

#### ✅ 優點
- **即時響應**:指標參數調整立即生效
- **高互動性**:用戶可自由調整週期、平滑參數等
- **減少API請求**:降低後端負載
- **離線分析**:數據下載後可離線使用

#### ❌ 缺點
- **瀏覽器效能**:大量數據計算可能造成卡頓
- **重複計算**:每個用戶重新計算相同指標
- **程式複雜度**:需實作技術指標演算法
- **數據傳輸量**:需完整 K 線歷史數據

#### 適用場景
- 專業交易平台
- 需要高度客製化的分析工具
- 用戶數量不多但需求多樣

---

### 方案二:後端計算

#### ✅ 優點
- **計算效能**:服務器計算能力強
- **快取優化**:可快取常用指標結果
- **數據一致性**:所有用戶看到相同結果
- **傳輸效率**:只傳送指標數值,數據量小

#### ❌ 缺點
- **響應延遲**:參數調整需重新請求 API
- **服務器負載**:大量計算請求壓力
- **快取複雜**:不同參數組合的快取管理

#### 適用場景
- 大眾投資平台
- 標準化指標需求
- 高併發用戶場景

---

## 🎯 推薦方案:漸進式混合架構

### 階段一:後端主導 + 前端快取

#### 後端負責
```python
# 預計算常用指標組合
def get_technical_indicators(symbol: str, indicators: List[str], period: int = 14):
    """
    計算技術指標
    indicators: ['RSI', 'MACD', 'KD', 'SMA', 'EMA']
    """
    klines = get_kline_data(symbol)
    results = {}

    if 'RSI' in indicators:
        results['RSI'] = calculate_rsi(klines, period)
    if 'MACD' in indicators:
        results['MACD'] = calculate_macd(klines)
    if 'KD' in indicators:
        results['KD'] = calculate_stoch(klines)

    return results
```

#### 前端負責
```javascript
// 快取指標數據,減少重複請求
class IndicatorCache {
    constructor() {
        this.cache = new Map();
    }

    async getIndicators(symbol, indicators, period) {
        const key = `${symbol}-${indicators.join(',')}-${period}`;

        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        const data = await api.get(`/quotes/${symbol}/indicators`, {
            indicators: indicators.join(','),
            period
        });

        this.cache.set(key, data);
        return data;
    }
}
```

### 階段二:前端計算能力擴展

#### 添加前端計算庫
```javascript
// 使用專業技術分析庫
import { RSI, MACD, Stochastic } from 'technicalindicators';

class TechnicalAnalysis {
    static calculateRSI(prices, period = 14) {
        return RSI.calculate({
            values: prices,
            period: period
        });
    }

    static calculateMACD(prices) {
        return MACD.calculate({
            values: prices,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9
        });
    }

    static calculateKD(high, low, close, period = 14) {
        return Stochastic.calculate({
            high: high,
            low: low,
            close: close,
            period: period,
            signalPeriod: 3
        });
    }
}
```

---

## 🔧 實作架構

### 後端實作（Python + TA-Lib）

#### 1. 安裝技術分析庫
```bash
pip install TA-Lib pandas numpy
```

#### 2. 創建指標計算服務
```python
# src/services/technical_analysis_service.py

import talib
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from src.models.domain import Quote

class TechnicalAnalysisService:

    @staticmethod
    def prepare_data(quotes: List[Quote]) -> pd.DataFrame:
        """將 Quote 數據轉換為 DataFrame"""
        df = pd.DataFrame([
            {
                'datetime': q.timestamp,
                'open': float(q.open),
                'high': float(q.high),
                'low': float(q.low),
                'close': float(q.close),
                'volume': float(q.volume)
            }
            for q in quotes
        ])
        return df.sort_values('datetime')

    @staticmethod
    def calculate_rsi(df: pd.DataFrame, period: int = 14) -> List[float]:
        """計算 RSI"""
        rsi = talib.RSI(df['close'], timeperiod=period)
        return rsi.fillna(0).tolist()

    @staticmethod
    def calculate_macd(df: pd.DataFrame) -> Dict[str, List[float]]:
        """計算 MACD"""
        macd, signal, histogram = talib.MACD(
            df['close'],
            fastperiod=12,
            slowperiod=26,
            signalperiod=9
        )

        return {
            'macd': macd.fillna(0).tolist(),
            'signal': signal.fillna(0).tolist(),
            'histogram': histogram.fillna(0).tolist()
        }

    @staticmethod
    def calculate_stoch(df: pd.DataFrame, period: int = 14) -> Dict[str, List[float]]:
        """計算 KD 隨機指標"""
        k, d = talib.STOCH(
            df['high'],
            df['low'],
            df['close'],
            fastk_period=period,
            slowk_period=3,
            slowd_period=3
        )

        return {
            'k': k.fillna(0).tolist(),
            'd': d.fillna(0).tolist()
        }

    def get_all_indicators(
        self,
        quotes: List[Quote],
        indicators: List[str] = None
    ) -> Dict[str, any]:
        """計算所有指標"""
        if not indicators:
            indicators = ['RSI', 'MACD', 'KD']

        df = self.prepare_data(quotes)
        results = {}

        if 'RSI' in indicators:
            results['RSI'] = self.calculate_rsi(df)

        if 'MACD' in indicators:
            results['MACD'] = self.calculate_macd(df)

        if 'KD' in indicators:
            results['KD'] = self.calculate_stoch(df)

        return results
```

#### 3. 添加 API 端點
```python
# src/api/technical_analysis.py

from fastapi import APIRouter, Query
from typing import List, Optional
from src.services.technical_analysis_service import TechnicalAnalysisService
from src.services.cache_service import get_cached_quotes

router = APIRouter(prefix="/api/technical-analysis", tags=["technical-analysis"])

@router.get("/{symbol}/indicators")
async def get_indicators(
    symbol: str,
    indicators: Optional[str] = Query("RSI,MACD,KD", description="指標列表,逗號分隔"),
    period: Optional[int] = Query(14, description="計算週期"),
    limit: Optional[int] = Query(100, description="數據筆數")
):
    """取得技術指標"""

    # 從快取獲取歷史數據
    quotes = get_cached_quotes(symbol, limit)
    if not quotes:
        return {"error": "No data available"}

    # 解析指標參數
    indicator_list = [i.strip().upper() for i in indicators.split(',')]

    # 計算指標
    ta_service = TechnicalAnalysisService()
    results = ta_service.get_all_indicators(quotes, indicator_list)

    return {
        "symbol": symbol,
        "indicators": results,
        "period": period,
        "data_points": len(quotes)
    }

@router.get("/{symbol}/rsi")
async def get_rsi(
    symbol: str,
    period: int = Query(14, description="RSI 週期"),
    limit: int = Query(100, description="數據筆數")
):
    """取得 RSI 指標"""
    quotes = get_cached_quotes(symbol, limit)
    if not quotes:
        return {"error": "No data available"}

    ta_service = TechnicalAnalysisService()
    df = ta_service.prepare_data(quotes)
    rsi = ta_service.calculate_rsi(df, period)

    return {
        "symbol": symbol,
        "indicator": "RSI",
        "period": period,
        "values": rsi
    }
```

### 前端實作（JavaScript + Chart.js）

#### 1. 指標數據獲取
```javascript
// src/services/technicalAnalysisApi.js

class TechnicalAnalysisApi {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.cache = new Map();
    }

    async getIndicators(symbol, indicators = ['RSI', 'MACD', 'KD'], period = 14) {
        const cacheKey = `${symbol}-${indicators.join(',')}-${period}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/technical-analysis/${symbol}/indicators?` +
                new URLSearchParams({
                    indicators: indicators.join(','),
                    period: period
                })
            );

            const data = await response.json();
            this.cache.set(cacheKey, data);

            return data;
        } catch (error) {
            console.error('Failed to fetch indicators:', error);
            throw error;
        }
    }

    async getRSI(symbol, period = 14) {
        try {
            const response = await fetch(
                `${this.baseUrl}/technical-analysis/${symbol}/rsi?period=${period}`
            );
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch RSI:', error);
            throw error;
        }
    }
}
```

#### 2. 圖表整合
```javascript
// src/components/TechnicalChart.js

class TechnicalChart {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.chart = null;
        this.taApi = new TechnicalAnalysisApi('/api');
    }

    async renderChart(symbol) {
        // 獲取價格和指標數據
        const [priceData, indicators] = await Promise.all([
            this.getPriceData(symbol),
            this.taApi.getIndicators(symbol)
        ]);

        // 配置圖表
        const chartConfig = {
            type: 'line',
            data: {
                labels: priceData.timestamps,
                datasets: [
                    {
                        label: '收盤價',
                        data: priceData.closes,
                        borderColor: 'rgb(75, 192, 192)',
                        yAxisID: 'price'
                    },
                    {
                        label: 'RSI',
                        data: indicators.RSI,
                        borderColor: 'rgb(255, 99, 132)',
                        yAxisID: 'rsi'
                    }
                ]
            },
            options: {
                scales: {
                    price: {
                        type: 'linear',
                        position: 'left',
                    },
                    rsi: {
                        type: 'linear',
                        position: 'right',
                        min: 0,
                        max: 100
                    }
                }
            }
        };

        this.chart = new Chart(this.container, chartConfig);
    }

    async updateIndicators(symbol, newPeriod) {
        const indicators = await this.taApi.getIndicators(symbol, ['RSI'], newPeriod);

        // 更新圖表數據
        this.chart.data.datasets[1].data = indicators.RSI;
        this.chart.update();
    }
}
```

---

## 📈 效能優化策略

### 後端優化

#### 1. Redis 快取策略
```python
# 快取常用指標結果
@cache_result(expire=300)  # 5 分鐘快取
def get_cached_indicators(symbol: str, indicators: str, period: int):
    return calculate_indicators(symbol, indicators, period)
```

#### 2. 批量計算
```python
# 預計算熱門股票的指標
async def precompute_popular_indicators():
    popular_symbols = ['2330', '2317', '3008']  # 熱門股票
    indicators = ['RSI', 'MACD', 'KD']

    for symbol in popular_symbols:
        for indicator in indicators:
            await compute_and_cache_indicator(symbol, indicator)
```

### 前端優化

#### 1. 資料分頁載入
```javascript
class ChartDataManager {
    constructor() {
        this.pageSize = 100;
        this.loadedData = [];
    }

    async loadMoreData(symbol, page = 0) {
        const data = await api.getKlines(symbol, {
            offset: page * this.pageSize,
            limit: this.pageSize
        });

        this.loadedData = [...this.loadedData, ...data];
        return this.loadedData;
    }
}
```

#### 2. Web Workers 計算
```javascript
// worker.js - 在背景執行緒計算指標
self.onmessage = function(e) {
    const { prices, period } = e.data;
    const rsi = calculateRSI(prices, period);
    self.postMessage({ rsi });
};

// 主執行緒
const worker = new Worker('worker.js');
worker.postMessage({ prices: priceData, period: 14 });
worker.onmessage = function(e) {
    updateChart(e.data.rsi);
};
```

---

## 🎯 最終建議

### 對於你的 sinotrade-api 專案:

#### 第一階段（建議現在實作）
1. **後端計算為主**:使用 Python + TA-Lib
2. **提供標準指標**:RSI、MACD、KD、移動平均線
3. **Redis 快取**:常用指標結果快取 5-10 分鐘
4. **RESTful API**:簡單的指標查詢端點

#### 第二階段（未來擴展）
1. **前端計算能力**:添加 JavaScript 技術分析庫
2. **即時參數調整**:用戶可調整指標參數
3. **混合架構**:常用指標後端計算,客製化指標前端計算

#### 技術選型建議
- **後端**:Python + TA-Lib + Redis
- **前端**:Chart.js 或 TradingView Charting Library
- **快取策略**:Redis + 分層快取
- **API設計**:RESTful + WebSocket（即時更新）

這樣的架構可以確保效能、擴展性和用戶體驗的平衡！

---

## 🔗 參考資料

- [TA-Lib Python 文檔](https://ta-lib.org/)
- [Chart.js 技術指標插件](https://www.chartjs.org/docs/latest/)
- [TradingView Charting Library](https://www.tradingview.com/charting-library/)

---

*最後更新: 2025年9月*
