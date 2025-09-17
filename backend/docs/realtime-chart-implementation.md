# 即時 K 線圖實作指南

本文檔詳細說明如何建立即時 K 線圖系統,包含 WebSocket 傳輸和前端圖表整合。

## 🔄 資料傳輸架構

```
Shioaji API → 後端處理 → WebSocket → 前端圖表
     ↓             ↓           ↓          ↓
  即時 Tick     聚合 K 線    推送更新    更新圖表
```

---

## 🚀 WebSocket 傳輸方案

### 為什麼選擇 WebSocket？

| 方案                   | 延遲     | 效率 | 複雜度 | 適用場景       |
| ---------------------- | -------- | ---- | ------ | -------------- |
| **WebSocket**          | 10-50ms  | 高   | 中等   | 即時交易 ⭐⭐⭐⭐⭐ |
| **Server-Sent Events** | 50-100ms | 中   | 低     | 單向推送 ⭐⭐⭐⭐  |
| **Polling**            | 1-5秒    | 低   | 低     | 非即時 ⭐⭐      |

---

## 🔧 前端 WebSocket 客戶端

### 1. 基本 WebSocket 連接

```javascript
// src/services/websocket.js

class RealtimeQuoteClient {
    constructor(baseUrl = 'ws://localhost:8000') {
        this.baseUrl = baseUrl;
        this.ws = null;
        this.clientId = this.generateClientId();
        this.subscribers = new Map(); // symbol -> callback functions
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(`${this.baseUrl}/ws/quotes/${this.clientId}`);

                this.ws.onopen = () => {
                    console.log('WebSocket 連接成功');
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };

                this.ws.onclose = () => {
                    console.log('WebSocket 連接關閉');
                    this.handleReconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket 錯誤:', error);
                    reject(error);
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    handleMessage(message) {
        switch (message.type) {
            case 'quote':
                this.handleQuote(message.data);
                break;
            case 'kline':
                this.handleKline(message.data);
                break;
            case 'subscription_confirmed':
                console.log(`訂閱確認: ${message.symbol}`);
                break;
            default:
                console.log('未知消息類型:', message);
        }
    }

    handleQuote(quoteData) {
        const symbol = quoteData.symbol;
        if (this.subscribers.has(symbol)) {
            this.subscribers.get(symbol).forEach(callback => {
                try {
                    callback(quoteData);
                } catch (error) {
                    console.error('處理報價回調時出錯:', error);
                }
            });
        }
    }

    handleKline(klineData) {
        // 處理 K 線數據
        console.log('收到 K 線更新:', klineData);
    }

    subscribe(symbol, callback) {
        // 添加回調函數
        if (!this.subscribers.has(symbol)) {
            this.subscribers.set(symbol, []);
        }
        this.subscribers.get(symbol).push(callback);

        // 發送訂閱請求
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                symbol: symbol
            }));
        }
    }

    unsubscribe(symbol, callback = null) {
        if (callback && this.subscribers.has(symbol)) {
            const callbacks = this.subscribers.get(symbol);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        } else {
            this.subscribers.delete(symbol);
        }

        // 如果沒有回調函數了,取消訂閱
        if (!this.subscribers.has(symbol) || this.subscribers.get(symbol).length === 0) {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'unsubscribe',
                    symbol: symbol
                }));
            }
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`嘗試重新連接... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                this.connect().then(() => {
                    // 重新訂閱所有股票
                    this.resubscribeAll();
                }).catch(error => {
                    console.error('重新連接失敗:', error);
                });
            }, this.reconnectDelay * this.reconnectAttempts);
        }
    }

    resubscribeAll() {
        this.subscribers.forEach((callbacks, symbol) => {
            if (callbacks.length > 0) {
                this.ws.send(JSON.stringify({
                    type: 'subscribe',
                    symbol: symbol
                }));
            }
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// 全局實例
const realtimeClient = new RealtimeQuoteClient();
export default realtimeClient;
```

### 2. K 線圖表整合

```javascript
// src/components/RealtimeChart.js

import Chart from 'chart.js/auto';
import realtimeClient from '../services/websocket.js';

class RealtimeChart {
    constructor(canvasId, symbol) {
        this.canvas = document.getElementById(canvasId);
        this.symbol = symbol;
        this.chart = null;
        this.klineData = [];
        this.currentKline = null;

        this.initChart();
        this.connectWebSocket();
    }

    initChart() {
        const ctx = this.canvas.getContext('2d');

        this.chart = new Chart(ctx, {
            type: 'candlestick', // 需要 chartjs-chart-financial 插件
            data: {
                datasets: [{
                    label: this.symbol,
                    data: this.klineData
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute'
                        }
                    },
                    y: {
                        beginAtZero: false
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: function(context) {
                                return new Date(context[0].parsed.x).toLocaleString();
                            },
                            body: function(context) {
                                const data = context[0].raw;
                                return [
                                    `開: ${data.o}`,
                                    `高: ${data.h}`,
                                    `低: ${data.l}`,
                                    `收: ${data.c}`,
                                    `量: ${data.v}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    async connectWebSocket() {
        try {
            await realtimeClient.connect();

            // 訂閱即時報價
            realtimeClient.subscribe(this.symbol, (quote) => {
                this.updateCurrentKline(quote);
            });

            // 載入歷史 K 線數據
            await this.loadHistoricalData();

        } catch (error) {
            console.error('連接 WebSocket 失敗:', error);
        }
    }

    async loadHistoricalData() {
        try {
            const response = await fetch(`/api/klines/${this.symbol}?limit=100&interval=1m`);
            const historicalData = await response.json();

            this.klineData = historicalData.map(kline => ({
                x: new Date(kline.timestamp),
                o: kline.open,    // 開盤價
                h: kline.high,    // 最高價
                l: kline.low,     // 最低價
                c: kline.close,   // 收盤價
                v: kline.volume   // 成交量
            }));

            this.chart.data.datasets[0].data = this.klineData;
            this.chart.update('none'); // 不使用動畫以提高效能

        } catch (error) {
            console.error('載入歷史數據失敗:', error);
        }
    }

    updateCurrentKline(quote) {
        const timestamp = new Date(quote.timestamp);
        const currentMinute = new Date(
            timestamp.getFullYear(),
            timestamp.getMonth(),
            timestamp.getDate(),
            timestamp.getHours(),
            timestamp.getMinutes(),
            0,
            0
        );

        // 檢查是否需要新的 K 線
        if (!this.currentKline || this.currentKline.x.getTime() !== currentMinute.getTime()) {
            // 新的 K 線
            this.currentKline = {
                x: currentMinute,
                o: quote.close,  // 開盤價等於第一筆成交價
                h: quote.close,  // 最高價
                l: quote.close,  // 最低價
                c: quote.close,  // 收盤價
                v: quote.volume  // 成交量
            };

            this.klineData.push(this.currentKline);

            // 限制數據點數量,避免記憶體過度使用
            if (this.klineData.length > 200) {
                this.klineData.shift();
            }
        } else {
            // 更新當前 K 線
            this.currentKline.h = Math.max(this.currentKline.h, quote.close);
            this.currentKline.l = Math.min(this.currentKline.l, quote.close);
            this.currentKline.c = quote.close;
            this.currentKline.v += quote.volume;
        }

        // 更新圖表
        this.chart.data.datasets[0].data = this.klineData;
        this.chart.update('none'); // 即時更新不使用動畫
    }

    destroy() {
        realtimeClient.unsubscribe(this.symbol);
        if (this.chart) {
            this.chart.destroy();
        }
    }
}

export default RealtimeChart;
```

### 3. HTML 整合範例

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>即時 K 線圖</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-chart-financial"></script>
</head>
<body>
    <div style="width: 800px; height: 400px; margin: 20px auto;">
        <canvas id="realtimeChart"></canvas>
    </div>

    <div style="text-align: center; margin: 20px;">
        <select id="symbolSelect">
            <option value="2330">台積電 (2330)</option>
            <option value="2317">鴻海 (2317)</option>
            <option value="3008">大立光 (3008)</option>
        </select>
        <button id="connectBtn">連接</button>
        <button id="disconnectBtn">斷開</button>
    </div>

    <script type="module">
        import RealtimeChart from './src/components/RealtimeChart.js';

        let currentChart = null;

        const symbolSelect = document.getElementById('symbolSelect');
        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');

        connectBtn.addEventListener('click', () => {
            const symbol = symbolSelect.value;

            if (currentChart) {
                currentChart.destroy();
            }

            currentChart = new RealtimeChart('realtimeChart', symbol);
        });

        disconnectBtn.addEventListener('click', () => {
            if (currentChart) {
                currentChart.destroy();
                currentChart = null;
            }
        });

        // 默認載入台積電
        currentChart = new RealtimeChart('realtimeChart', '2330');
    </script>
</body>
</html>
```

---

## 🔧 後端整合 ShioajiService

### 修改 ShioajiService 支援 WebSocket

```python
# 在 src/services/shioaji_service.py 中添加

from typing import List, Callable
import asyncio

class ShioajiService:
    def __init__(self):
        # ... 原有初始化程式碼
        self.quote_callbacks: List[Callable] = []

    def add_quote_callback(self, callback: Callable):
        """添加報價回調函數"""
        self.quote_callbacks.append(callback)

    def _on_stock_tick(self, exchange: Exchange, tick: TickSTKv1):
        """處理股票 tick 資料並廣播"""
        quote = Quote(
            symbol=tick.code,
            timestamp=tick.datetime,
            open=tick.open,
            close=tick.close,
            high=tick.high,
            low=tick.low,
            volume=tick.volume,
            bid_price=tick.bid_price[0] if tick.bid_price else 0,
            ask_price=tick.ask_price[0] if tick.ask_price else 0,
            bid_volume=tick.bid_volume[0] if tick.bid_volume else 0,
            ask_volume=tick.ask_volume[0] if tick.ask_volume else 0,
            avg_price=getattr(tick, "avg_price", None),
            underlying_price=None,
        )

        # 存儲到快取
        set_cached_quote(quote.symbol, quote)

        # 廣播給所有回調函數
        for callback in self.quote_callbacks:
            try:
                # 在新的 asyncio task 中執行 async callback
                if asyncio.iscoroutinefunction(callback):
                    asyncio.create_task(callback(quote))
                else:
                    callback(quote)
            except Exception as e:
                logger.error(f"執行報價回調失敗: {e}")
```

### 在 main.py 中註冊 WebSocket

```python
# src/main.py

from fastapi import FastAPI
from src.api.websocket_quotes import router as websocket_router, ws_manager
from src.services.shioaji_service import shioaji_service

app = FastAPI(title="Sinotrade API")

# 註冊 WebSocket 路由
app.include_router(websocket_router)

# 註冊 WebSocket 廣播回調
async def websocket_quote_callback(quote):
    await ws_manager.broadcast_quote(quote)

shioaji_service.add_quote_callback(websocket_quote_callback)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 📊 效能優化建議

### 1. 前端優化

```javascript
// 使用 RequestAnimationFrame 限制更新頻率
class OptimizedChart extends RealtimeChart {
    constructor(canvasId, symbol) {
        super(canvasId, symbol);
        this.updatePending = false;
        this.lastUpdateTime = 0;
        this.updateInterval = 50; // 最多每 50ms 更新一次
    }

    updateCurrentKline(quote) {
        super.updateCurrentKline(quote);

        // 限制更新頻率
        const now = Date.now();
        if (!this.updatePending && now - this.lastUpdateTime > this.updateInterval) {
            this.updatePending = true;
            requestAnimationFrame(() => {
                this.chart.update('none');
                this.updatePending = false;
                this.lastUpdateTime = Date.now();
            });
        }
    }
}
```

### 2. 後端優化

```python
# 添加數據聚合和緩存
class KlineAggregator:
    def __init__(self):
        self.current_klines = {}  # symbol -> current kline

    def update_kline(self, quote: Quote):
        symbol = quote.symbol
        minute_timestamp = self.get_minute_timestamp(quote.timestamp)

        if symbol not in self.current_klines:
            self.current_klines[symbol] = {}

        if minute_timestamp not in self.current_klines[symbol]:
            # 新的 K 線
            self.current_klines[symbol][minute_timestamp] = {
                "timestamp": minute_timestamp,
                "open": quote.close,
                "high": quote.close,
                "low": quote.close,
                "close": quote.close,
                "volume": quote.volume
            }
        else:
            # 更新現有 K 線
            kline = self.current_klines[symbol][minute_timestamp]
            kline["high"] = max(kline["high"], quote.close)
            kline["low"] = min(kline["low"], quote.close)
            kline["close"] = quote.close
            kline["volume"] += quote.volume

        return self.current_klines[symbol][minute_timestamp]
```

---

## 🎯 總結建議

### 對於你的專案,我建議:

1. **第一階段**:實作 WebSocket 基本功能
   - 即時報價推送
   - 簡單的價格圖表

2. **第二階段**:添加 K 線圖功能
   - 分鐘 K 線聚合
   - 歷史數據載入

3. **第三階段**:效能優化
   - 數據壓縮
   - 更新頻率控制
   - 連接管理優化

### 技術選型:
- **後端**:FastAPI + WebSocket
- **前端**:Chart.js + WebSocket API
- **數據格式**:JSON
- **連接管理**:自動重連 + 訂閱管理

這樣的架構可以提供低延遲(10-50ms)的即時 K 線圖體驗！

---

## 🔗 相關資源

- [FastAPI WebSocket 文檔](https://fastapi.tiangolo.com/advanced/websockets/)
- [Chart.js Financial Charts](https://chartjs-chart-financial.pages.dev/)
- [WebSocket API 標準](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

*最後更新: 2025年9月*
