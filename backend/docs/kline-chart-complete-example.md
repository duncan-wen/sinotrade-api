# 完整實時 K 線圖實作範例

## 🎯 **系統架構總覽**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Shioaji API   │ -> │   後端處理       │ -> │   前端圖表       │
│                 │    │                 │    │                 │
│ • Tick 資料      │    │ • 歷史K線載入    │    │ • Chart.js      │
│ • 歷史資料       │    │ • 即時聚合       │    │ • WebSocket     │
│                 │    │ • WebSocket推送  │    │ • 即時更新       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 **使用流程**

### 1. 載入歷史 K 線
```javascript
// 步驟1: 載入歷史資料
const response = await fetch('/api/klines/2330?interval=1m&limit=100');
const historicalData = await response.json();
```

### 2. 建立 WebSocket 連接
```javascript
// 步驟2: 建立 WebSocket 實時更新
const ws = new WebSocket('ws://localhost:8000/ws/klines/client123');
```

### 3. 結合歷史 + 實時資料
```javascript
// 步驟3: 組合完整 K 線圖
chart.setData(historicalData.data);  // 載入歷史
ws.onmessage = (event) => {          // 實時更新
    chart.updateKline(JSON.parse(event.data));
};
```

---

## 📊 **完整前端實作範例**

### HTML 結構
```html
<!DOCTYPE html>
<html>
<head>
    <title>即時 K 線圖</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-chart-financial"></script>
</head>
<body>
    <div style="width: 1200px; margin: 0 auto;">
        <h1>台積電 (2330) 即時 K 線圖</h1>
        <div style="margin: 20px 0;">
            <button onclick="klineChart.changeInterval('1m')">1分鐘</button>
            <button onclick="klineChart.changeInterval('5m')">5分鐘</button>
            <button onclick="klineChart.changeInterval('15m')">15分鐘</button>
            <button onclick="klineChart.changeInterval('1h')">1小時</button>
            <button onclick="klineChart.changeInterval('1d')">日線</button>
        </div>
        <canvas id="klineChart" width="1200" height="600"></canvas>
        <div id="status">正在載入...</div>
    </div>

    <script src="kline-chart.js"></script>
    <script>
        // 初始化圖表
        const klineChart = new RealtimeKlineChart('klineChart', '2330');
    </script>
</body>
</html>
```

### JavaScript 實作 (kline-chart.js)
```javascript
class RealtimeKlineChart {
    constructor(canvasId, symbol) {
        this.canvas = document.getElementById(canvasId);
        this.symbol = symbol;
        this.interval = '1m';
        this.chart = null;
        this.ws = null;
        this.clientId = 'client_' + Math.random().toString(36).substr(2, 9);
        this.klineData = [];

        this.initChart();
        this.loadHistoricalData();
    }

    initChart() {
        const ctx = this.canvas.getContext('2d');

        this.chart = new Chart(ctx, {
            type: 'candlestick',
            data: {
                datasets: [{
                    label: `${this.symbol} K線`,
                    data: [],
                    borderColor: {
                        up: '#26a69a',    // 上漲 - 綠色
                        down: '#ef5350',  // 下跌 - 紅色
                        unchanged: '#666'
                    },
                    backgroundColor: {
                        up: '#26a69a',
                        down: '#ef5350',
                        unchanged: '#666'
                    }
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            displayFormats: {
                                minute: 'HH:mm',
                                hour: 'HH:mm',
                                day: 'MM/dd'
                            }
                        },
                        title: {
                            display: true,
                            text: '時間'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '價格'
                        },
                        position: 'right'
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${this.symbol} 即時 K 線圖 (${this.interval})`
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async loadHistoricalData() {
        try {
            this.updateStatus('載入歷史資料...');

            const response = await fetch(
                `/api/klines/${this.symbol}?interval=${this.interval}&limit=100`
            );
            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            // 轉換資料格式
            this.klineData = result.data.map(kline => ({
                x: new Date(kline.timestamp),
                o: kline.open,
                h: kline.high,
                l: kline.low,
                c: kline.close,
                v: kline.volume
            }));

            // 更新圖表
            this.chart.data.datasets[0].data = this.klineData;
            this.chart.update('none');

            this.updateStatus(`已載入 ${this.klineData.length} 根歷史 K 線`);

            // 載入完歷史資料後,建立 WebSocket 連接
            this.connectWebSocket();

        } catch (error) {
            console.error('載入歷史資料失敗:', error);
            this.updateStatus(`載入失敗: ${error.message}`);
        }
    }

    connectWebSocket() {
        if (this.ws) {
            this.ws.close();
        }

        this.updateStatus('建立即時連接...');

        this.ws = new WebSocket(`ws://localhost:8000/ws/klines/${this.clientId}`);

        this.ws.onopen = () => {
            this.updateStatus('即時連接已建立');

            // 訂閱 K 線更新
            this.ws.send(JSON.stringify({
                type: 'subscribe_kline',
                symbol: this.symbol,
                interval: this.interval
            }));
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'historical_klines':
                    // 如果需要,可以在這裡處理歷史資料
                    break;

                case 'kline':
                    this.updateKline(message.data);
                    break;

                case 'tick':
                    // 也可以在前端直接處理 tick 資料
                    this.updateFromTick(message.data);
                    break;
            }
        };

        this.ws.onclose = () => {
            this.updateStatus('連接已斷開,嘗試重新連接...');
            setTimeout(() => this.connectWebSocket(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket 錯誤:', error);
            this.updateStatus('連接錯誤');
        };
    }

    updateKline(klineData) {
        const newKline = {
            x: new Date(klineData.timestamp),
            o: klineData.open,
            h: klineData.high,
            l: klineData.low,
            c: klineData.close,
            v: klineData.volume
        };

        // 檢查是否是更新現有 K 線還是新增
        const lastKline = this.klineData[this.klineData.length - 1];

        if (lastKline && lastKline.x.getTime() === newKline.x.getTime()) {
            // 更新現有 K 線
            this.klineData[this.klineData.length - 1] = newKline;
        } else {
            // 新增 K 線
            this.klineData.push(newKline);

            // 限制資料點數量
            if (this.klineData.length > 200) {
                this.klineData.shift();
            }
        }

        // 更新圖表
        this.chart.data.datasets[0].data = this.klineData;
        this.chart.update('none');

        this.updateStatus(`最新價格: ${newKline.c} (${new Date().toLocaleTimeString()})`);
    }

    updateFromTick(tickData) {
        // 如果需要從 tick 資料直接更新（前端聚合）
        const timestamp = new Date(tickData.timestamp);
        const price = tickData.price;

        // 對齊到分鐘
        const minuteTime = new Date(
            timestamp.getFullYear(),
            timestamp.getMonth(),
            timestamp.getDate(),
            timestamp.getHours(),
            timestamp.getMinutes(),
            0, 0
        );

        const lastKline = this.klineData[this.klineData.length - 1];

        if (!lastKline || lastKline.x.getTime() !== minuteTime.getTime()) {
            // 新的分鐘 K 線
            const newKline = {
                x: minuteTime,
                o: price,
                h: price,
                l: price,
                c: price,
                v: tickData.volume
            };

            this.klineData.push(newKline);

            if (this.klineData.length > 200) {
                this.klineData.shift();
            }
        } else {
            // 更新當前 K 線
            lastKline.h = Math.max(lastKline.h, price);
            lastKline.l = Math.min(lastKline.l, price);
            lastKline.c = price;
            lastKline.v += tickData.volume;
        }

        this.chart.data.datasets[0].data = this.klineData;
        this.chart.update('none');
    }

    changeInterval(newInterval) {
        this.interval = newInterval;
        this.klineData = [];
        this.chart.data.datasets[0].data = [];
        this.chart.update('none');

        // 重新載入資料
        this.loadHistoricalData();

        // 更新標題
        this.chart.options.plugins.title.text = `${this.symbol} 即時 K 線圖 (${this.interval})`;
        this.chart.update('none');
    }

    updateStatus(message) {
        document.getElementById('status').textContent = message;
    }

    destroy() {
        if (this.ws) {
            this.ws.close();
        }
        if (this.chart) {
            this.chart.destroy();
        }
    }
}
```

---

## 🔧 **後端 API 使用範例**

### 1. 獲取歷史 K 線
```bash
# 獲取台積電 1分鐘 K 線,最近 100 根
curl "http://localhost:8000/api/klines/2330?interval=1m&limit=100"

# 獲取台指期貨 5分鐘 K 線,最近 50 根
curl "http://localhost:8000/api/klines/TXF?interval=5m&limit=50"
```

### 2. WebSocket 即時連接
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/klines/my-client-id');

// 訂閱股票 K 線
ws.send(JSON.stringify({
    type: 'subscribe_kline',
    symbol: '2330',
    interval: '1m'
}));
```

---

## 📈 **資料格式說明**

### 歷史 K 線 API 回應
```json
{
    "symbol": "2330",
    "interval": "1m",
    "data": [
        {
            "timestamp": "2025-09-11T09:00:00",
            "open": 580.0,
            "high": 585.0,
            "low": 575.0,
            "close": 582.0,
            "volume": 1000
        }
    ],
    "count": 100
}
```

### WebSocket K 線更新
```json
{
    "type": "kline",
    "data": {
        "symbol": "2330",
        "timestamp": "2025-09-11T09:01:00",
        "open": 582.0,
        "high": 586.0,
        "low": 580.0,
        "close": 584.0,
        "volume": 1200
    }
}
```

---

## 🎯 **最佳實踐建議**

### 1. **效能優化**
- 限制顯示的 K 線數量（建議 200 根以內）
- 使用 `chart.update('none')` 避免動畫延遲
- 批量更新資料而不是單筆更新

### 2. **錯誤處理**
- WebSocket 自動重連機制
- API 請求失敗處理
- 資料格式驗證

### 3. **使用者體驗**
- 載入狀態顯示
- 即時價格更新提示
- 多時間間隔切換

### 4. **資料管理**
- 合理的歷史資料數量
- 記憶體使用控制
- 快取機制

這個完整的實作提供了從後端到前端的完整解決方案,確保了 K 線圖的準確性和即時性！
