# Tick vs Quote 用於 K 線圖比較

本文檔分析使用 Tick 或 Quote 建構 K 線圖的差異,並提供最佳實作建議。

## 🔍 Tick vs Quote 差異分析

### 📊 資料內容比較

#### Tick（逐筆成交）
```python
TickSTKv1(
    code='2330',                                    # 股票代碼
    datetime=datetime(2021, 7, 2, 13, 16, 35, 92970),  # 精確到毫秒
    close=Decimal('590'),                           # 成交價
    volume=1,                                       # 成交量（張）
    total_volume=14498,                            # 累計成交量
    amount=Decimal('590000'),                      # 成交金額
    open=Decimal('590'),                           # 開盤價
    high=Decimal('593'),                           # 最高價
    low=Decimal('587'),                            # 最低價
    avg_price=Decimal('589.05'),                   # 平均價
    tick_type=1,                                   # 成交類型
)
```

#### Quote（綜合報價）
```python
QuoteSTKv1(
    code='2330',
    datetime=datetime(2022, 7, 1, 10, 43, 15),
    close=Decimal('461'),                          # 最新成交價
    open=Decimal('471.5'),                         # 開盤價
    high=Decimal('474'),                           # 最高價
    low=Decimal('461'),                            # 最低價
    volume=1,                                      # 最新成交量
    total_volume=25292,                           # 總成交量

    # 五檔資訊
    bid_price=[Decimal('461'), ...],              # 買方五檔
    ask_price=[Decimal('461.5'), ...],            # 賣方五檔
    bid_volume=[220, 140, ...],                   # 買量
    ask_volume=[115, 101, ...],                   # 賣量

    # 其他資訊
    avail_borrowing=9579699,                      # 可借券餘額
    suspend=0,                                    # 暫停交易
)
```

---

## 🏆 建議:使用 Tick 建構 K 線圖

### ✅ 為什麼選擇 Tick？

#### 1. **資料純度**
- **真實成交**:每筆 Tick 都代表實際發生的交易
- **時間精確**:毫秒級時間戳,可精確聚合
- **無雜訊**:不包含掛單等非成交資料

#### 2. **K 線圖本質**
```
K 線圖 = 時間區間內的成交統計
- 開盤價:第一筆成交價
- 最高價:區間內最高成交價
- 最低價:區間內最低成交價
- 收盤價:最後一筆成交價
- 成交量:所有成交量總和
```

#### 3. **即時性**
- Tick 頻率更高,可以看到每筆交易
- Quote 更新較慢,可能錯過重要價格變動

### ❌ 為什麼不用 Quote？

#### 1. **資料冗餘**
- 包含五檔掛單資訊（K 線不需要）
- 包含借券餘額等額外資訊

#### 2. **更新頻率**
- Quote 更新間隔較長
- 可能漏掉重要的價格跳動

#### 3. **複雜度**
- 資料結構複雜,處理成本高
- 不是為 K 線圖設計的資料格式

---

## 🔧 實作架構

### 後端:Tick 到 K 線的聚合

```python
class KlineAggregator:
    """將 Tick 資料聚合成 K 線"""

    def __init__(self):
        self.current_klines = {}  # symbol -> {timestamp -> kline}

    async def process_tick(self, tick_data: Quote):
        """處理每筆 Tick 並更新 K 線"""
        symbol = tick_data.symbol
        minute_time = self.get_minute_timestamp(tick_data.timestamp)
        price = float(tick_data.close)
        volume = tick_data.volume

        # 獲取或創建該分鐘的 K 線
        if symbol not in self.current_klines:
            self.current_klines[symbol] = {}

        if minute_time not in self.current_klines[symbol]:
            # 新的 K 線 - 第一筆成交
            kline = {
                "symbol": symbol,
                "timestamp": minute_time.isoformat(),
                "open": price,      # 開盤價 = 第一筆成交價
                "high": price,      # 最高價 = 第一筆成交價
                "low": price,       # 最低價 = 第一筆成交價
                "close": price,     # 收盤價 = 第一筆成交價
                "volume": volume,   # 成交量
                "trades": 1         # 成交筆數
            }
            self.current_klines[symbol][minute_time] = kline

            # 廣播新 K 線
            await self.broadcast_new_kline(symbol, kline)
        else:
            # 更新現有 K 線
            kline = self.current_klines[symbol][minute_time]
            kline["high"] = max(kline["high"], price)      # 更新最高價
            kline["low"] = min(kline["low"], price)        # 更新最低價
            kline["close"] = price                         # 更新收盤價
            kline["volume"] += volume                      # 累加成交量
            kline["trades"] += 1                           # 累加成交筆數

            # 廣播 K 線更新
            await self.broadcast_kline_update(symbol, kline)

    def get_minute_timestamp(self, timestamp: datetime) -> datetime:
        """將時間戳對齊到分鐘（去除秒和毫秒）"""
        return timestamp.replace(second=0, microsecond=0)

    async def broadcast_new_kline(self, symbol: str, kline: dict):
        """廣播新的 K 線"""
        await ws_manager.send_kline_update(symbol, kline)

    async def broadcast_kline_update(self, symbol: str, kline: dict):
        """廣播 K 線更新"""
        await ws_manager.send_kline_update(symbol, kline)
```

### 前端:即時 K 線圖更新

```javascript
class RealtimeKlineChart {
    constructor(canvasId, symbol) {
        this.canvas = document.getElementById(canvasId);
        this.symbol = symbol;
        this.chart = null;
        this.klineData = [];
        this.currentKline = null;

        this.initChart();
        this.connectWebSocket();
    }

    connectWebSocket() {
        this.ws = new WebSocket(`ws://localhost:8000/ws/klines/${this.clientId}`);

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'tick':
                    this.processTick(message.data);
                    break;
                case 'kline':
                    this.updateKline(message.data);
                    break;
                case 'historical_klines':
                    this.loadHistoricalKlines(message.data);
                    break;
            }
        };
    }

    processTick(tickData) {
        /**
         * 處理 Tick 資料,即時更新 K 線
         * 這是前端實作版本（也可以完全依賴後端聚合）
         */
        const timestamp = new Date(tickData.timestamp);
        const price = tickData.price;
        const volume = tickData.volume;

        // 對齊到分鐘
        const minuteTime = new Date(
            timestamp.getFullYear(),
            timestamp.getMonth(),
            timestamp.getDate(),
            timestamp.getHours(),
            timestamp.getMinutes(),
            0, 0
        );

        // 檢查是否需要新的 K 線
        if (!this.currentKline || this.currentKline.x.getTime() !== minuteTime.getTime()) {
            // 新的分鐘 K 線
            this.currentKline = {
                x: minuteTime,
                o: price,    // 開盤價
                h: price,    // 最高價
                l: price,    // 最低價
                c: price,    // 收盤價
                v: volume    // 成交量
            };

            this.klineData.push(this.currentKline);

            // 限制資料點數量
            if (this.klineData.length > 200) {
                this.klineData.shift();
            }
        } else {
            // 更新當前 K 線
            this.currentKline.h = Math.max(this.currentKline.h, price);  // 更新最高價
            this.currentKline.l = Math.min(this.currentKline.l, price);  // 更新最低價
            this.currentKline.c = price;                                 // 更新收盤價
            this.currentKline.v += volume;                               // 累加成交量
        }

        // 更新圖表
        this.updateChart();
    }

    updateKline(klineData) {
        /**
         * 直接接收後端聚合的 K 線資料
         * 這是推薦的方式
         */
        const timestamp = new Date(klineData.timestamp);

        // 查找或創建對應的 K 線
        let existingKline = this.klineData.find(k => k.x.getTime() === timestamp.getTime());

        if (!existingKline) {
            // 新的 K 線
            const newKline = {
                x: timestamp,
                o: klineData.open,
                h: klineData.high,
                l: klineData.low,
                c: klineData.close,
                v: klineData.volume
            };

            this.klineData.push(newKline);
            this.currentKline = newKline;

            // 限制資料點數量
            if (this.klineData.length > 200) {
                this.klineData.shift();
            }
        } else {
            // 更新現有 K 線
            existingKline.h = klineData.high;
            existingKline.l = klineData.low;
            existingKline.c = klineData.close;
            existingKline.v = klineData.volume;
        }

        this.updateChart();
    }

    updateChart() {
        // 使用防抖機制避免過度更新
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        this.updateTimeout = setTimeout(() => {
            this.chart.data.datasets[0].data = this.klineData;
            this.chart.update('none');  // 不使用動畫提高效能
        }, 50);  // 最多每50ms更新一次
    }
}
```

---

## 📊 效能比較

### Tick 方案
| 指標           | 表現  | 說明               |
| -------------- | ----- | ------------------ |
| **資料準確性** | ⭐⭐⭐⭐⭐ | 100% 真實成交資料  |
| **時間精確度** | ⭐⭐⭐⭐⭐ | 毫秒級精度         |
| **更新頻率**   | ⭐⭐⭐⭐⭐ | 每筆成交都更新     |
| **資料純度**   | ⭐⭐⭐⭐⭐ | 純成交資料,無雜訊 |
| **處理複雜度** | ⭐⭐⭐   | 需要聚合處理       |

### Quote 方案
| 指標           | 表現 | 說明               |
| -------------- | ---- | ------------------ |
| **資料準確性** | ⭐⭐⭐  | 包含非成交資料     |
| **時間精確度** | ⭐⭐⭐  | 更新間隔較長       |
| **更新頻率**   | ⭐⭐   | 較低頻率更新       |
| **資料純度**   | ⭐⭐   | 包含五檔等額外資訊 |
| **處理複雜度** | ⭐⭐⭐⭐ | 資料結構複雜       |

---

## 🎯 最終建議

### 推薦架構:**Tick + 後端聚合**

1. **Shioaji 提供 Tick 資料**
2. **後端即時聚合成 K 線**
3. **WebSocket 推送聚合後的 K 線**
4. **前端直接顯示 K 線圖**

### 資料流程
```
Shioaji Tick → 後端聚合器 → WebSocket → 前端圖表
   (50ms)      → (100ms)    → (10ms)  → (即時更新)
```

### 程式碼重點
```python
# 後端:使用 Tick 聚合 K 線
shioaji_service.add_quote_callback(tick_broadcast_callback)

# 前端:接收聚合好的 K 線
ws.onmessage = (event) => {
    if (message.type === 'kline') {
        chart.updateKline(message.data);
    }
}
```

這樣可以確保:
- ✅ **最高精確度**:基於真實成交
- ✅ **最佳效能**:後端聚合,前端輕量
- ✅ **即時更新**:每筆成交都會反映在 K 線上

---

## 🔗 相關程式碼

- `src/api/websocket_quotes.py` - WebSocket 和 K 線聚合
- `docs/realtime-chart-implementation.md` - 完整前端實作
- `src/services/shioaji_service.py` - Shioaji Tick 處理

---

*最後更新: 2025年9月*
