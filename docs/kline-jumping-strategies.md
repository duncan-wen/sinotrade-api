# 🚀 K 線跳轉策略優化方案

## 📊 **當前問題分析**

### **現狀痛點**

- ✅ Tick 數據到達時間不規律
- ✅ 時間邊界判斷複雜
- ✅ 前端計算負擔重
- ✅ 長期間隔處理不一致
- ✅ 跨時區問題

---

## 🎯 **方案一:後端主導式 (推薦)**

### **核心理念**

> 後端負責時間邊界判斷,前端只負責渲染

### **後端實現**

```python
# backend/src/services/kline_manager.py
class KlineManager:
    def __init__(self):
        self.active_klines = {}  # {symbol_interval: current_kline}
        self.time_boundaries = self._init_time_boundaries()

    def process_tick(self, tick_data: TickData) -> KlineEvent:
        """處理tick並返回K線事件"""
        symbol = tick_data.symbol
        intervals = ['1m', '5m', '15m', '1h', '1d']

        events = []
        for interval in intervals:
            event = self._process_interval(symbol, interval, tick_data)
            if event:
                events.append(event)

        return events

    def _process_interval(self, symbol: str, interval: str, tick: TickData) -> KlineEvent:
        key = f"{symbol}_{interval}"
        current_kline = self.active_klines.get(key)

        # 計算時間邊界
        boundary = self._get_time_boundary(tick.timestamp, interval)

        if not current_kline or current_kline.start_time != boundary.start:
            # 需要跳到新K線
            if current_kline:
                # 發送完成事件
                yield KlineEvent(
                    type='kline_complete',
                    symbol=symbol,
                    interval=interval,
                    kline=current_kline
                )

            # 創建新K線
            new_kline = self._create_new_kline(boundary, tick)
            self.active_klines[key] = new_kline

            return KlineEvent(
                type='kline_new',
                symbol=symbol,
                interval=interval,
                kline=new_kline
            )
        else:
            # 更新現有K線
            updated_kline = self._update_kline(current_kline, tick)
            self.active_klines[key] = updated_kline

            return KlineEvent(
                type='kline_update',
                symbol=symbol,
                interval=interval,
                kline=updated_kline
            )

    def _get_time_boundary(self, timestamp: datetime, interval: str) -> TimeBoundary:
        """精確計算時間邊界"""
        if interval == '1m':
            start = timestamp.replace(second=0, microsecond=0)
            end = start + timedelta(minutes=1)
        elif interval == '5m':
            minutes = (timestamp.minute // 5) * 5
            start = timestamp.replace(minute=minutes, second=0, microsecond=0)
            end = start + timedelta(minutes=5)
        elif interval == '15m':
            minutes = (timestamp.minute // 15) * 15
            start = timestamp.replace(minute=minutes, second=0, microsecond=0)
            end = start + timedelta(minutes=15)
        elif interval == '1h':
            start = timestamp.replace(minute=0, second=0, microsecond=0)
            end = start + timedelta(hours=1)
        elif interval == '1d':
            # 使用交易所時區
            start = timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)

        return TimeBoundary(start=start, end=end)

# WebSocket推送
@websocket_manager.on_tick
async def handle_tick(tick_data: TickData):
    events = kline_manager.process_tick(tick_data)

    for event in events:
        await websocket_manager.broadcast(
            f"kline_{event.symbol}_{event.interval}",
            {
                'type': event.type,
                'symbol': event.symbol,
                'interval': event.interval,
                'kline': event.kline.to_dict(),
                'timestamp': time.time()
            }
        )
```

### **前端實現**

```typescript
// frontend/src/hooks/useKlineManager.ts
export const useKlineManager = (symbol: string, interval: string) => {
  const [klineData, setKlineData] = useState<KlineData[]>([]);

  useEffect(() => {
    const handleKlineEvent = (event: KlineEvent) => {
      switch (event.type) {
        case "kline_new":
          setKlineData((prev) => [...prev, event.kline].slice(-200));
          break;

        case "kline_update":
          setKlineData((prev) => {
            const newData = [...prev];
            newData[newData.length - 1] = event.kline;
            return newData;
          });
          break;

        case "kline_complete":
          // K線完成,可以計算技術指標
          calculateTechnicalIndicators(event.kline);
          break;
      }
    };

    // 訂閱WebSocket事件
    websocket.subscribe(`kline_${symbol}_${interval}`, handleKlineEvent);

    return () => {
      websocket.unsubscribe(`kline_${symbol}_${interval}`, handleKlineEvent);
    };
  }, [symbol, interval]);

  return { klineData };
};
```

---

## 🎯 **方案二:混合式 (靈活)**

### **核心理念**

> 短期間隔前端處理,長期間隔後端處理

### **分工策略**

```typescript
const INTERVAL_STRATEGY = {
  // 前端處理:實時性要求高
  frontend: ["1m", "5m", "15m", "1h"],

  // 後端處理:準確性要求高
  backend: ["1d", "1w", "1M", "1Q", "1Y"],
};
```

### **前端優化實現**

```typescript
// frontend/src/services/KlineProcessor.ts
class OptimizedKlineProcessor {
  private timeCache = new Map<string, number>(); // 緩存邊界時間
  private workerPool: Worker[] = []; // Web Worker池

  constructor() {
    this.initWorkerPool();
  }

  async processTick(tick: TickData, interval: string): Promise<KlineAction> {
    // 🚀 優化1:使用緩存避免重複計算
    const cacheKey = `${interval}_${Math.floor(tick.timestamp / 60000)}`;
    let boundaryTime = this.timeCache.get(cacheKey);

    if (!boundaryTime) {
      boundaryTime = this.calculateBoundary(tick.timestamp, interval);
      this.timeCache.set(cacheKey, boundaryTime);
    }

    // 🚀 優化2:使用Web Worker避免主線程阻塞
    if (this.shouldUseWorker(interval)) {
      return await this.processInWorker(tick, interval, boundaryTime);
    }

    return this.processInMainThread(tick, interval, boundaryTime);
  }

  private calculateBoundary(timestamp: number, interval: string): number {
    const date = new Date(timestamp);

    switch (interval) {
      case "1m":
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          date.getMinutes()
        ).getTime();
      case "5m":
        const minutes5 = Math.floor(date.getMinutes() / 5) * 5;
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          minutes5
        ).getTime();
      // ... 其他間隔
    }
  }

  // 🚀 優化3:預測式K線創建
  predictNextKline(currentKline: KlineData, interval: string): KlineData {
    const nextBoundary = this.getNextBoundary(currentKline.time, interval);

    return {
      time: new Date(nextBoundary).toISOString(),
      open: currentKline.close, // 預測開盤價
      high: currentKline.close,
      low: currentKline.close,
      close: currentKline.close,
      volume: 0,
      predicted: true, // 標記為預測K線
    };
  }
}
```

---

## 🎯 **方案三:時間驅動式 (最精準)**

### **核心理念**

> 使用定時器而非數據驅動,確保時間邊界準確

### **實現方式**

```typescript
// frontend/src/services/TimeDrivenKlineManager.ts
class TimeDrivenKlineManager {
  private timers = new Map<string, NodeJS.Timeout>();
  private activeKlines = new Map<string, KlineData>();

  startInterval(symbol: string, interval: string) {
    const key = `${symbol}_${interval}`;

    // 計算到下一個邊界的時間
    const nextBoundary = this.getNextBoundary(interval);
    const delayMs = nextBoundary - Date.now();

    // 設置精確定時器
    const timer = setTimeout(() => {
      this.onTimeBoundary(symbol, interval);
      this.startRepeatingTimer(symbol, interval);
    }, delayMs);

    this.timers.set(key, timer);
  }

  private onTimeBoundary(symbol: string, interval: string) {
    const key = `${symbol}_${interval}`;
    const currentKline = this.activeKlines.get(key);

    if (currentKline) {
      // 完成當前K線
      this.emit("kline_complete", currentKline);

      // 創建新K線
      const newKline = this.createNewKline(symbol, interval);
      this.activeKlines.set(key, newKline);
      this.emit("kline_new", newKline);
    }
  }

  private startRepeatingTimer(symbol: string, interval: string) {
    const intervalMs = this.getIntervalMs(interval);
    const key = `${symbol}_${interval}`;

    const timer = setInterval(() => {
      this.onTimeBoundary(symbol, interval);
    }, intervalMs);

    this.timers.set(key, timer);
  }

  // 當收到tick時,只更新當前K線
  updateWithTick(tick: TickData, symbol: string, interval: string) {
    const key = `${symbol}_${interval}`;
    const currentKline = this.activeKlines.get(key);

    if (currentKline) {
      const updatedKline = {
        ...currentKline,
        high: Math.max(currentKline.high, tick.price),
        low: Math.min(currentKline.low, tick.price),
        close: tick.price,
        volume: currentKline.volume + (tick.volume || 0),
      };

      this.activeKlines.set(key, updatedKline);
      this.emit("kline_update", updatedKline);
    }
  }
}
```

---

## 🎯 **方案四:智能預載入 (性能最佳)**

### **核心理念**

> 預先計算未來的 K 線邊界,零延遲跳轉

### **實現策略**

```typescript
// frontend/src/services/SmartKlinePreloader.ts
class SmartKlinePreloader {
  private futureBoundaries = new Map<string, number[]>();

  constructor() {
    this.preloadBoundaries();

    // 每小時更新一次邊界
    setInterval(() => this.preloadBoundaries(), 3600000);
  }

  private preloadBoundaries() {
    const now = Date.now();
    const intervals = ["1m", "5m", "15m", "1h"];

    intervals.forEach((interval) => {
      const boundaries = this.calculateFutureBoundaries(now, interval, 1000);
      this.futureBoundaries.set(interval, boundaries);
    });
  }

  private calculateFutureBoundaries(
    startTime: number,
    interval: string,
    count: number
  ): number[] {
    const boundaries: number[] = [];
    const intervalMs = this.getIntervalMs(interval);

    let current = this.alignToInterval(startTime, interval);

    for (let i = 0; i < count; i++) {
      boundaries.push(current);
      current += intervalMs;
    }

    return boundaries;
  }

  // 🚀 零延遲查找
  findBoundary(timestamp: number, interval: string): number {
    const boundaries = this.futureBoundaries.get(interval) || [];

    // 二分查找
    let left = 0,
      right = boundaries.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const boundary = boundaries[mid];

      if (
        timestamp >= boundary &&
        timestamp < boundary + this.getIntervalMs(interval)
      ) {
        return boundary;
      } else if (timestamp < boundary) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // 如果沒找到,動態計算
    return this.alignToInterval(timestamp, interval);
  }
}
```

---

## 📊 **方案比較**

| 方案           | 優點               | 缺點             | 適用場景                 |
| -------------- | ------------------ | ---------------- | ------------------------ |
| **後端主導**   | 準確性高、前端簡單 | 網路延遲影響     | 生產環境、多客戶端       |
| **混合式**     | 靈活性高、性能平衡 | 複雜度中等       | 大多數應用               |
| **時間驅動**   | 時間精確、邏輯清晰 | 需要精確時鐘同步 | 專業交易軟體             |
| **智能預載入** | 性能最佳、零延遲   | 記憶體使用較高   | 高頻交易、實時性要求極高 |

---

## 🏆 **推薦實施方案**

### **第一階段:混合式 + 智能預載入**

```typescript
// 綜合方案實現
class HybridKlineManager {
  private preloader = new SmartKlinePreloader();
  private timeDriven = new TimeDrivenKlineManager();

  constructor() {
    this.setupStrategy();
  }

  private setupStrategy() {
    // 短期間隔:前端處理 + 智能預載入
    ["1m", "5m", "15m"]
      .forEach((interval) => {
        this.timeDriven.startInterval(symbol, interval);
      })

      [
        // 長期間隔:後端處理
        ("1d", "1w", "1M")
      ].forEach((interval) => {
        this.subscribeBackendKlines(symbol, interval);
      });
  }

  processTick(tick: TickData, symbol: string, interval: string) {
    if (["1m", "5m", "15m"].includes(interval)) {
      // 使用預載入邊界
      const boundary = this.preloader.findBoundary(tick.timestamp, interval);
      return this.processWithBoundary(tick, symbol, interval, boundary);
    } else {
      // 交給後端處理
      this.sendToBackend(tick, symbol, interval);
    }
  }
}
```

### **第二階段:後端主導 (生產優化)**

- 實施完整的後端 K 線管理
- 前端專注於渲染和用戶交互
- 加入 Redis 緩存和持久化

---

## 💡 **額外優化建議**

### **1. 時區處理**

```typescript
// 統一時區處理
const TRADING_TIMEZONE = "Asia/Taipei";

function getMarketTime(timestamp: number): Date {
  return new Date(timestamp).toLocaleString("en-US", {
    timeZone: TRADING_TIMEZONE,
  });
}
```

### **2. 錯誤恢復**

```typescript
// K線數據修復機制
class KlineRecovery {
  async repairMissingKlines(
    symbol: string,
    interval: string,
    from: Date,
    to: Date
  ) {
    const missing = this.findMissingKlines(from, to, interval);

    for (const missingTime of missing) {
      const reconstructed = await this.reconstructKline(
        symbol,
        interval,
        missingTime
      );
      this.insertKline(reconstructed);
    }
  }
}
```

### **3. 性能監控**

```typescript
// K線性能追蹤
class KlinePerformanceMonitor {
  trackJumpLatency(interval: string, latency: number) {
    this.metrics.record("kline_jump_latency", latency, { interval });
  }

  trackMissedJumps(interval: string) {
    this.metrics.increment("kline_missed_jumps", { interval });
  }
}
```

---

## 🎯 **立即可實施的優化**

1. **添加智能預載入**:減少邊界計算時間
2. **實施混合策略**:短期前端、長期後端
3. **加入性能監控**:追蹤跳轉準確性
4. **時區統一處理**:避免時間錯亂

**您覺得哪個方案最適合您的需求？我可以為您詳細實施任何一個方案!** 🚀
