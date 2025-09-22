# 🚀 性能優化實施指南

## 📋 **立即可執行的優化方案**

基於您當前的架構,我推薦按以下順序實施:

---

## 🔥 **Phase 1: 快速勝利 (本週可完成)**

### **1.1 前端緩存優化**

#### **安裝依賴**

```bash
cd frontend
pnpm add react-window react-window-infinite-loader
pnpm add @tanstack/react-query-persist-client-core
```

#### **集成智能緩存**

```typescript
// frontend/src/lib/queryClient.ts (修改現有文件)
import {
  createOptimizedQueryClient,
  setupPersistence,
} from "./cache-strategies";

export const queryClient = createOptimizedQueryClient();

// 在 app 初始化時設置持久化
if (typeof window !== "undefined") {
  setupPersistence(queryClient);
}
```

#### **在圖表組件中使用**

```typescript
// frontend/src/components/chart/TradingChart.tsx
import { useSmartPreload, DataCompressor } from "@/lib/cache-strategies";

export function TradingChart({ symbol, interval }: TradingChartProps) {
  // 添加智能預載入
  useSmartPreload(symbol);

  // 在 API 調用中使用數據壓縮
  const { data: klineData } = useQuery({
    queryKey: ["klines", symbol, interval],
    queryFn: async () => {
      const response = await fetch(
        `/api/klines/${symbol}?interval=${interval}`
      );
      const compressed = await response.json();

      // 解壓縮數據
      if (compressed.compressed) {
        return DataCompressor.decompressKlines(compressed);
      }
      return compressed;
    },
    select: (data) => data?.slice(-200), // 只保留最近200根K線
  });

  // ... 其他邏輯
}
```

### **1.2 後端緩存優化**

#### **安裝 Redis**

```bash
# Docker 方式 (推薦)
docker run -d --name redis -p 6379:6379 redis:alpine

# 或者本地安裝
# Windows: 下載 Redis for Windows
# macOS: brew install redis
# Ubuntu: sudo apt install redis-server
```

#### **安裝 Python 依賴**

```bash
cd backend
pip install redis aioredis cachetools polars
```

#### **集成智能緩存**

```python
# backend/src/api/klines.py (修改現有API)
from src.services.smart_cache_service import smart_cache, get_klines_cached

@router.get("/klines/{symbol}")
async def get_klines(
    symbol: str,
    interval: str = "1d",
    limit: int = 100
):
    """高性能K線數據API"""

    # 使用緩存版本
    klines_data = await get_klines_cached(symbol, interval, limit)

    # 數據壓縮
    if len(klines_data) > 50:  # 超過50根K線才壓縮
        compressed = compress_klines_data(klines_data)
        return {
            "compressed": True,
            "data": compressed,
            "symbol": symbol,
            "interval": interval
        }

    return {
        "compressed": False,
        "data": klines_data,
        "symbol": symbol,
        "interval": interval
    }

def compress_klines_data(klines: List[Dict]) -> Dict:
    """後端數據壓縮"""
    # 實現與前端對應的壓縮邏輯
    pass
```

### **1.3 WebSocket 優化**

#### **集成 WebSocket 管理器**

```python
# backend/src/api/websocket.py (新建或修改)
from fastapi import WebSocket, WebSocketDisconnect
from src.services.websocket_optimizer import websocket_manager, SubscriptionData

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """優化的 WebSocket 端點"""

    if not await websocket_manager.connect_client(websocket, client_id):
        return

    try:
        while True:
            # 接收客戶端消息
            message = await websocket.receive_json()

            if message['type'] == 'subscribe':
                subscription = SubscriptionData(
                    symbol=message['symbol'],
                    data_type=message['data_type'],
                    interval=message.get('interval')
                )
                await websocket_manager.subscribe(client_id, subscription)

            elif message['type'] == 'unsubscribe':
                subscription = SubscriptionData(
                    symbol=message['symbol'],
                    data_type=message['data_type'],
                    interval=message.get('interval')
                )
                await websocket_manager.unsubscribe(client_id, subscription)

    except WebSocketDisconnect:
        await websocket_manager.disconnect_client(client_id)
```

---

## 🚀 **Phase 2: 中期優化 (2-3 週)**

### **2.1 數據庫優化**

#### **添加索引**

```sql
-- backend/migrations/add_performance_indexes.sql
CREATE INDEX IF NOT EXISTS idx_klines_symbol_time ON klines (symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ticks_symbol_time ON ticks (symbol, timestamp DESC);

-- 復合索引 for 查詢優化
CREATE INDEX IF NOT EXISTS idx_klines_symbol_interval_time
ON klines (symbol, interval, timestamp DESC);
```

#### **數據清理策略**

```python
# backend/src/tasks/data_cleanup.py
async def cleanup_old_data():
    """定期清理舊數據"""

    # 保留策略
    retention_policy = {
        'tick_data': 7,      # 7天
        'kline_1m': 30,      # 30天
        'kline_5m': 90,      # 90天
        'kline_1d': 365 * 2, # 2年
    }

    for data_type, days in retention_policy.items():
        cutoff_date = datetime.now() - timedelta(days=days)

        # 執行清理
        await db.execute(
            f"DELETE FROM {data_type} WHERE timestamp < :cutoff",
            {"cutoff": cutoff_date}
        )
```

### **2.2 前端渲染優化**

#### **虛擬化長列表**

```typescript
// frontend/src/components/VirtualizedOrderBook.tsx
import { FixedSizeList as List } from "react-window";

interface OrderBookProps {
  orders: Order[];
  height: number;
}

export const VirtualizedOrderBook: React.FC<OrderBookProps> = ({
  orders,
  height,
}) => {
  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => (
    <div style={style}>
      <OrderRow order={orders[index]} />
    </div>
  );

  return (
    <List
      height={height}
      itemCount={orders.length}
      itemSize={24}
      overscanCount={10} // 預渲染10行
    >
      {Row}
    </List>
  );
};
```

#### **防抖更新**

```typescript
// frontend/src/hooks/useThrottledUpdate.ts
import { useCallback, useRef } from "react";

export const useThrottledUpdate = <T>(
  callback: (value: T) => void,
  delay: number = 100
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (value: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(value);
      }, delay);
    },
    [callback, delay]
  );
};

// 在 TradingChart 中使用
const throttledUpdateChart = useThrottledUpdate((newData) => {
  if (chartRef.current) {
    chartRef.current.setData(newData);
  }
}, 100); // 100ms 防抖
```

---

## 🎖️ **Phase 3: 高級優化 (1-2 月)**

### **3.1 微服務拆分**

#### **Market Data Service**

```python
# services/market-data/main.py
from fastapi import FastAPI
from src.services.smart_cache_service import smart_cache

app = FastAPI(title="Market Data Service")

@app.on_event("startup")
async def startup():
    await smart_cache.initialize()

@app.get("/market-data/{symbol}")
async def get_market_data(symbol: str):
    """專門的市場數據服務"""
    return await get_cached_market_data(symbol)
```

#### **Chart Service**

```python
# services/chart-service/main.py
from fastapi import FastAPI
from src.calculators.technical_indicators import TechnicalIndicatorCalculator

app = FastAPI(title="Chart Service")

@app.post("/calculate/indicators")
async def calculate_indicators(request: IndicatorRequest):
    """專門的圖表計算服務"""
    calculator = TechnicalIndicatorCalculator()
    return await calculator.calculate_batch(request.data, request.indicators)
```

### **3.2 監控與告警**

#### **性能監控面板**

```python
# backend/src/api/monitoring.py
@router.get("/metrics")
async def get_metrics():
    """系統性能指標"""

    cache_stats = smart_cache.get_stats()
    ws_stats = websocket_manager.get_stats()

    return {
        "cache": cache_stats,
        "websocket": ws_stats,
        "system": {
            "memory_usage": get_memory_usage(),
            "cpu_usage": get_cpu_usage(),
            "active_connections": len(websocket_manager.clients),
        },
        "timestamp": datetime.now().isoformat()
    }
```

#### **前端性能面板**

```typescript
// frontend/src/components/PerformanceMonitor.tsx
export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>();

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch("/api/metrics");
      const data = await response.json();
      setMetrics(data);
    }, 5000); // 每5秒更新

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="performance-monitor">
      <div>緩存命中率: {metrics?.cache?.hit_rate}</div>
      <div>活躍連接: {metrics?.websocket?.active_connections}</div>
      <div>記憶體使用: {metrics?.system?.memory_usage}MB</div>
    </div>
  );
};
```

---

## 📊 **效果測量**

### **性能基準測試**

```bash
# 安裝測試工具
npm install -g lighthouse artillery

# 前端性能測試
lighthouse http://localhost:3000/test-multi-timeframe --output json

# API 壓力測試
artillery quick --count 100 --num 10 http://localhost:8000/api/klines/TXFR1
```

### **監控指標**

```typescript
// 關鍵性能指標 (KPI)
const performanceTargets = {
  "API 響應時間": "< 200ms",
  首屏載入時間: "< 2s",
  緩存命中率: "> 80%",
  "WebSocket 延遲": "< 50ms",
  記憶體使用: "< 300MB",
  並發用戶: "> 100",
};
```

---

## 🎯 **實施建議**

### **本週就可以開始:**

1. ✅ **安裝 Redis** - 立即提升 API 響應速度
2. ✅ **前端緩存優化** - 減少重複 API 調用
3. ✅ **數據壓縮** - 降低網路傳輸量

### **2 週內完成:**

4. ✅ **WebSocket 優化** - 提升實時數據性能
5. ✅ **虛擬化渲染** - 支援大數據集顯示

### **1 月內完成:**

6. ✅ **監控系統** - 掌握系統性能狀況
7. ✅ **自動化測試** - 確保優化效果

---

## 💡 **快速開始**

想要立即看到效果？執行以下命令:

```bash
# 1. 啟動 Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# 2. 前端優化
cd frontend
pnpm add @tanstack/react-query-persist-client-core
# 然後集成 cache-strategies.ts

# 3. 後端優化
cd backend
pip install redis aioredis
# 然後集成 smart_cache_service.py

# 4. 測試效果
# 訪問 http://localhost:3000/test-multi-timeframe
# 觀察 Network 面板的響應時間變化
```

您想從哪個部分開始？我可以幫您詳細實施任何一個優化方案!
