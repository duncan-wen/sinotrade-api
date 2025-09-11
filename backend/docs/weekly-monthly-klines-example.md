# 周線和月線 K 線圖實作指南

## 🎯 **支援的時間間隔**

| 間隔     | 代碼  | 說明     | 資料來源      | 效能  |
| -------- | ----- | -------- | ------------- | ----- |
| 1分鐘    | `1m`  | 分鐘線   | Ticks 聚合    | ⭐⭐⭐   |
| 5分鐘    | `5m`  | 5分鐘線  | Ticks 聚合    | ⭐⭐⭐   |
| 15分鐘   | `15m` | 15分鐘線 | Ticks 聚合    | ⭐⭐⭐   |
| 1小時    | `1h`  | 小時線   | Ticks 聚合    | ⭐⭐⭐   |
| 日線     | `1d`  | 日線     | 官方 KBar API | ⭐⭐⭐⭐⭐ |
| **周線** | `1w`  | 週線     | 日線聚合      | ⭐⭐⭐⭐  |
| **月線** | `1M`  | 月線     | 日線聚合      | ⭐⭐⭐⭐  |

---

## 🚀 **API 使用範例**

### 1. 周線資料
```bash
# 獲取台積電最近 52 周的周線資料
curl "http://localhost:8000/api/klines/2330?interval=1w&limit=52"

# 獲取台指期貨最近 26 周的周線資料
curl "http://localhost:8000/api/klines/TXF?interval=1w&limit=26"
```

### 2. 月線資料
```bash
# 獲取台積電最近 24 個月的月線資料
curl "http://localhost:8000/api/klines/2330?interval=1M&limit=24"

# 獲取元大台灣50最近 12 個月的月線資料
curl "http://localhost:8000/api/klines/0050?interval=1M&limit=12"
```

### 3. 回應格式
```json
{
    "symbol": "2330",
    "interval": "1w",
    "data": [
        {
            "timestamp": "2025-09-07T00:00:00",
            "open": 580.0,
            "high": 590.0,
            "low": 575.0,
            "close": 585.0,
            "volume": 125000000
        }
    ],
    "count": 52,
    "source": "daily_aggregated"
}
```

---

## 📊 **前端實作範例**

### HTML 多時間間隔切換
```html
<div class="interval-buttons">
    <button onclick="chart.changeInterval('1m')">1分鐘</button>
    <button onclick="chart.changeInterval('5m')">5分鐘</button>
    <button onclick="chart.changeInterval('15m')">15分鐘</button>
    <button onclick="chart.changeInterval('1h')">1小時</button>
    <button onclick="chart.changeInterval('1d')">日線</button>
    <button onclick="chart.changeInterval('1w')" class="weekly-btn">周線</button>
    <button onclick="chart.changeInterval('1M')" class="monthly-btn">月線</button>
</div>
```

### JavaScript 實作
```javascript
class MultiTimeframeKlineChart {
    constructor(canvasId, symbol) {
        this.canvas = document.getElementById(canvasId);
        this.symbol = symbol;
        this.interval = '1d';  // 預設日線
        this.chart = null;
        this.klineData = [];
        
        this.initChart();
        this.loadData();
    }

    async changeInterval(newInterval) {
        this.interval = newInterval;
        
        // 根據時間間隔調整資料量和圖表設定
        const config = this.getIntervalConfig(newInterval);
        
        // 更新圖表設定
        this.updateChartConfig(config);
        
        // 載入新資料
        await this.loadData();
        
        // 更新按鈕狀態
        this.updateButtonStates(newInterval);
    }

    getIntervalConfig(interval) {
        const configs = {
            '1m': { 
                limit: 200, 
                title: '1分鐘線',
                timeUnit: 'minute',
                displayFormat: 'HH:mm'
            },
            '5m': { 
                limit: 200, 
                title: '5分鐘線',
                timeUnit: 'minute',
                displayFormat: 'HH:mm'
            },
            '15m': { 
                limit: 150, 
                title: '15分鐘線',
                timeUnit: 'minute',
                displayFormat: 'HH:mm'
            },
            '1h': { 
                limit: 120, 
                title: '1小時線',
                timeUnit: 'hour',
                displayFormat: 'MM/dd HH:mm'
            },
            '1d': { 
                limit: 100, 
                title: '日線',
                timeUnit: 'day',
                displayFormat: 'MM/dd'
            },
            '1w': { 
                limit: 52, 
                title: '周線',
                timeUnit: 'week',
                displayFormat: 'yyyy/MM/dd'
            },
            '1M': { 
                limit: 24, 
                title: '月線',
                timeUnit: 'month',
                displayFormat: 'yyyy/MM'
            }
        };
        
        return configs[interval] || configs['1d'];
    }

    updateChartConfig(config) {
        // 更新圖表標題
        this.chart.options.plugins.title.text = `${this.symbol} ${config.title}`;
        
        // 更新時間軸設定
        this.chart.options.scales.x.time.unit = config.timeUnit;
        this.chart.options.scales.x.time.displayFormats[config.timeUnit] = config.displayFormat;
        
        this.chart.update('none');
    }

    async loadData() {
        try {
            const config = this.getIntervalConfig(this.interval);
            
            const response = await fetch(
                `/api/klines/${this.symbol}?interval=${this.interval}&limit=${config.limit}`
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
            
            // 顯示資料來源資訊
            this.updateDataSourceInfo(result.source, result.count);
            
        } catch (error) {
            console.error('載入資料失敗:', error);
        }
    }

    updateDataSourceInfo(source, count) {
        const sourceTexts = {
            'official_kbar': '官方日線 API',
            'daily_aggregated': '日線聚合',
            'ticks_aggregated': 'Tick 聚合'
        };
        
        const sourceText = sourceTexts[source] || '未知來源';
        document.getElementById('data-info').textContent = 
            `資料來源: ${sourceText} | 共 ${count} 根 K 線`;
    }

    updateButtonStates(activeInterval) {
        // 移除所有按鈕的 active 類別
        document.querySelectorAll('.interval-buttons button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 為當前間隔按鈕添加 active 類別
        document.querySelector(`button[onclick="chart.changeInterval('${activeInterval}')"]`)
            ?.classList.add('active');
    }
}
```

### CSS 樣式
```css
.interval-buttons {
    margin: 20px 0;
    text-align: center;
}

.interval-buttons button {
    margin: 0 5px;
    padding: 8px 16px;
    border: 1px solid #ddd;
    background: #f5f5f5;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
}

.interval-buttons button:hover {
    background: #e0e0e0;
}

.interval-buttons button.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
}

.weekly-btn {
    background: #28a745 !important;
    color: white;
}

.monthly-btn {
    background: #dc3545 !important;
    color: white;
}

#data-info {
    text-align: center;
    color: #666;
    font-size: 14px;
    margin: 10px 0;
}
```

---

## 🔧 **技術實作細節**

### 1. 周線聚合邏輯
```python
# 周線：從週一到週日聚合
resampler = df.resample('W-SUN')  # 週日結束

agg_data = resampler.agg({
    'open': 'first',    # 週一開盤價
    'high': 'max',      # 一周最高價
    'low': 'min',       # 一周最低價
    'close': 'last',    # 週五收盤價
    'volume': 'sum'     # 一周總成交量
})
```

### 2. 月線聚合邏輯
```python
# 月線：月末結束
resampler = df.resample('M')  # 月末結束

agg_data = resampler.agg({
    'open': 'first',    # 月初開盤價
    'high': 'max',      # 當月最高價
    'low': 'min',       # 當月最低價
    'close': 'last',    # 月末收盤價
    'volume': 'sum'     # 當月總成交量
})
```

### 3. 資料來源優化
- **分鐘線/小時線**: 從 Ticks 聚合 (最高精確度)
- **日線**: 使用官方 KBar API (最佳效能)
- **周線/月線**: 從日線聚合 (平衡效能與準確性)

---

## 📈 **常見使用場景**

### 1. 技術分析
```javascript
// 載入多時間間隔進行技術分析
const timeframes = ['1d', '1w', '1M'];
const analysisData = {};

for (const tf of timeframes) {
    const response = await fetch(`/api/klines/2330?interval=${tf}&limit=100`);
    analysisData[tf] = await response.json();
}

// 進行多時間框架分析
analyzeTrends(analysisData);
```

### 2. 長期投資追蹤
```javascript
// 月線圖表適合長期投資追蹤
const monthlyChart = new MultiTimeframeKlineChart('monthly-chart', '0050');
monthlyChart.changeInterval('1M');  // 切換到月線
```

### 3. 波段操作
```javascript
// 周線圖表適合波段操作
const weeklyChart = new MultiTimeframeKlineChart('weekly-chart', '2330');
weeklyChart.changeInterval('1w');   // 切換到周線
```

---

## 💡 **最佳實踐**

### 1. 資料快取
```javascript
class DataCache {
    constructor() {
        this.cache = new Map();
        this.maxAge = 5 * 60 * 1000;  // 5分鐘
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (item && (Date.now() - item.timestamp) < this.maxAge) {
            return item.data;
        }
        return null;
    }
    
    set(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
}
```

### 2. 智能載入
```javascript
// 根據時間間隔調整載入策略
getOptimalLimit(interval) {
    const limits = {
        '1m': 200,   // 3小時20分鐘
        '5m': 200,   // 16小時40分鐘
        '15m': 150,  // 37.5小時
        '1h': 120,   // 5天
        '1d': 100,   // 100天
        '1w': 52,    // 1年
        '1M': 24     // 2年
    };
    return limits[interval] || 100;
}
```

這樣你就有了完整的多時間間隔 K 線圖系統，支援從 1分鐘到月線的所有常用週期！🎉
