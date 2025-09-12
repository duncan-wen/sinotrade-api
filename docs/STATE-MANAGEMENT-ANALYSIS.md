# 🔄 狀態管理技術分析

詳解 TanStack Query vs Zustand 的分工與最佳實踐

## 📋 目錄

- [技術分工原則](#技術分工原則)
- [使用場景對比](#使用場景對比)
- [整合最佳實踐](#整合最佳實踐)
- [性能考量](#性能考量)
- [決策建議](#決策建議)

---

## 🎯 技術分工原則

### 📊 **狀態管理分層架構**

```
┌─────────────────────────────────────────────────────────────────┐
│                        React 組件層                              │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐ │
│  │    Local State      │  │        Component State              │ │
│  │  • useState         │  │      • 表單輸入                      │ │
│  │  • useReducer       │  │      • 臨時 UI 狀態                  │ │
│  │  • useRef           │  │      • 動畫狀態                      │ │
│  └─────────────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Zustand 客戶端狀態層                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Global Client State                     │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │   UI State  │  │ User Prefs  │  │  Connection State   │ │ │
│  │  │ • 主題配置   │  │ • 用戶偏好   │  │  • Socket 狀態      │ │ │
│  │  │ • 頁面狀態   │  │ • 版面設定   │  │  • 訂閱管理         │ │ │
│  │  │ • 通知系統   │  │ • 個人化     │  │  • 連接監控         │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                    TanStack Query 伺服器狀態層                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Server State Management                  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │ │
│  │  │ API Cache   │  │ Real-time   │  │   Optimistic        │ │ │
│  │  │ • 數據快取   │  │ • 即時同步   │  │  • 樂觀更新         │ │ │
│  │  │ • 背景更新   │  │ • Socket 整合 │  │  • 回滾機制         │ │ │
│  │  │ • 錯誤重試   │  │ • 數據推送   │  │  • 衝突解決         │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### ⚖️ **職責分工表**

| 狀態類型     | TanStack Query | Zustand    | React State | 選擇理由                         |
| ------------ | -------------- | ---------- | ----------- | -------------------------------- |
| **API 數據** | ✅ 專責         | ❌ 避免     | ❌ 避免      | 快取、同步、錯誤處理             |
| **即時數據** | ✅ 配合 Socket  | ✅ 連接狀態 | ❌ 避免      | Query 管理數據，Zustand 管理連接 |
| **用戶偏好** | ❌ 不適用       | ✅ 專責     | ❌ 避免      | 需要持久化和全域存取             |
| **UI 狀態**  | ❌ 不適用       | ✅ 全域 UI  | ✅ 局部 UI   | 根據作用域選擇                   |
| **表單狀態** | ❌ 不適用       | ✅ 複雜表單 | ✅ 簡單表單  | 根據複雜度選擇                   |
| **路由狀態** | ❌ 不適用       | ❌ 避免     | ❌ 避免      | Next.js Router 專責              |

---

## 🎯 使用場景對比

### 1️⃣ **TanStack Query 適用場景**

#### ✅ **強項場景**
```typescript
// 🎯 API 數據管理
const { data: positions } = useQuery({
  queryKey: ['positions'],
  queryFn: fetchPositions,
  staleTime: 30000,
  refetchInterval: 60000,
});

// 🎯 即時數據同步
const useMarketData = (symbol: string) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const unsubscribe = socketService.subscribe(symbol, {
      onQuote: (quote) => {
        queryClient.setQueryData(['quote', symbol], quote);
      }
    });
    return unsubscribe;
  }, [symbol]);
  
  return useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => fetchQuote(symbol),
  });
};

// 🎯 樂觀更新
const { mutate: placeOrder } = useMutation({
  mutationFn: placeOrder,
  onMutate: async (newOrder) => {
    // 樂觀更新
    await queryClient.cancelQueries(['orders']);
    const previousOrders = queryClient.getQueryData(['orders']);
    queryClient.setQueryData(['orders'], old => [...old, newOrder]);
    return { previousOrders };
  },
  onError: (err, newOrder, context) => {
    // 錯誤回滾
    queryClient.setQueryData(['orders'], context.previousOrders);
  },
});
```

#### ❌ **不適用場景**
```typescript
// ❌ 不要用於 UI 狀態
const { data: theme } = useQuery({
  queryKey: ['theme'],
  queryFn: () => Promise.resolve('dark'), // 錯誤用法
});

// ❌ 不要用於用戶偏好
const { data: sidebarCollapsed } = useQuery({
  queryKey: ['sidebar'],
  queryFn: () => Promise.resolve(false), // 錯誤用法
});
```

### 2️⃣ **Zustand 適用場景**

#### ✅ **強項場景**
```typescript
// 🎯 全域 UI 狀態
interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  activeModal: string | null;
  notifications: Notification[];
}

// 🎯 用戶偏好設定
interface UserPreferences {
  chartTimeframe: string;
  defaultSymbol: string;
  alertSettings: AlertSettings;
  layoutConfig: LayoutConfig;
}

// 🎯 連接狀態管理
interface ConnectionState {
  socketConnected: boolean;
  reconnectAttempts: number;
  subscribedSymbols: Set<string>;
  connectionError: string | null;
}

// 🎯 複雜表單狀態
interface OrderFormState {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  validationErrors: Record<string, string>;
}
```

#### ❌ **不適用場景**
```typescript
// ❌ 不要用於 API 數據
interface BadStore {
  positions: Position[]; // 應該用 TanStack Query
  marketData: MarketData[]; // 應該用 TanStack Query
  tradingHistory: Trade[]; // 應該用 TanStack Query
}

// ❌ 不要重複 HTTP 請求邏輯
const badStore = create((set) => ({
  data: null,
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true });
    try {
      const data = await api.getData();
      set({ data, loading: false });
    } catch (error) {
      set({ error, loading: false });
    }
  },
}));
```

### 3️⃣ **React State 適用場景**

#### ✅ **強項場景**
```typescript
// 🎯 組件內部狀態
const OrderForm = () => {
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // 🎯 動畫狀態
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 🎯 臨時 UI 狀態
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
};

// 🎯 列表選擇狀態
const DataTable = () => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
};
```

---

## 🔧 整合最佳實踐

### 1️⃣ **完美協作範例**

```typescript
// hooks/useTradingDashboard.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useTradingUIStore from '@/store/useTradingUIStore';
import useSocketStore from '@/store/useSocketStore';

export const useTradingDashboard = () => {
  const queryClient = useQueryClient();
  
  // TanStack Query - 伺服器數據
  const positionsQuery = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    refetchInterval: 30000,
  });
  
  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    refetchInterval: 10000,
  });
  
  // Zustand - UI 狀態
  const {
    selectedSymbol,
    setSelectedSymbol,
    activeTab,
    setActiveTab,
    addNotification,
  } = useTradingUIStore();
  
  // Zustand - 連接狀態
  const {
    connected,
    subscribedSymbols,
    connect,
    disconnect,
    addSubscription,
  } = useSocketStore();
  
  // 協作邏輯
  const handleSymbolChange = useCallback((symbol: string) => {
    // 1. 更新 UI 狀態
    setSelectedSymbol(symbol);
    
    // 2. 預取數據
    queryClient.prefetchQuery({
      queryKey: ['quote', symbol],
      queryFn: () => fetchQuote(symbol),
    });
    
    // 3. 管理訂閱
    if (connected && !subscribedSymbols.has(symbol)) {
      addSubscription(symbol);
      addNotification({
        type: 'info',
        message: `已訂閱 ${symbol} 即時數據`,
      });
    }
  }, [connected, subscribedSymbols, setSelectedSymbol, addSubscription, addNotification]);
  
  return {
    // 數據
    positions: positionsQuery.data,
    orders: ordersQuery.data,
    isLoading: positionsQuery.isLoading || ordersQuery.isLoading,
    
    // UI 狀態
    selectedSymbol,
    activeTab,
    connected,
    
    // 動作
    handleSymbolChange,
    setActiveTab,
    connect,
    disconnect,
  };
};
```

### 2️⃣ **數據同步模式**

```typescript
// hooks/useRealtimeSync.ts
export const useRealtimeSync = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useTradingUIStore();
  const { 
    connected, 
    setConnected, 
    addSubscription, 
    updateSyncTime 
  } = useSocketStore();
  
  useEffect(() => {
    if (!connected) return;
    
    // Socket 事件處理
    const handleQuoteUpdate = (data: QuoteUpdate) => {
      // 更新 TanStack Query 快取
      queryClient.setQueryData(['quote', data.symbol], data.quote);
      
      // 更新 Zustand 同步時間
      updateSyncTime(data.symbol);
      
      // 觸發相關查詢的重新驗證
      queryClient.invalidateQueries({
        queryKey: ['positions'],
        exact: false,
      });
    };
    
    const handleConnectionLost = () => {
      setConnected(false);
      addNotification({
        type: 'error',
        message: '即時數據連接中斷，正在重新連接...',
      });
    };
    
    socketService.on('quote', handleQuoteUpdate);
    socketService.on('disconnect', handleConnectionLost);
    
    return () => {
      socketService.off('quote', handleQuoteUpdate);
      socketService.off('disconnect', handleConnectionLost);
    };
  }, [connected]);
};
```

### 3️⃣ **錯誤處理整合**

```typescript
// hooks/useErrorHandler.ts
export const useErrorHandler = () => {
  const { addNotification } = useTradingUIStore();
  const { setError: setSocketError } = useSocketStore();
  
  // TanStack Query 全域錯誤處理
  const queryClient = useQueryClient();
  
  useEffect(() => {
    queryClient.setMutationDefaults(['order'], {
      onError: (error: ApiError) => {
        addNotification({
          type: 'error',
          message: `交易失敗: ${error.message}`,
        });
      },
    });
    
    queryClient.setQueryDefaults(['market-data'], {
      onError: (error: ApiError) => {
        if (error.code === 'RATE_LIMIT') {
          addNotification({
            type: 'warning',
            message: '請求過於頻繁，請稍後再試',
          });
        }
      },
    });
  }, []);
  
  // Socket 錯誤處理
  const handleSocketError = useCallback((error: SocketError) => {
    setSocketError(error.message);
    addNotification({
      type: 'error',
      message: `連接錯誤: ${error.message}`,
    });
  }, [setSocketError, addNotification]);
  
  return { handleSocketError };
};
```

---

## ⚡ 性能考量

### 📊 **性能比較**

| 指標           | TanStack Query | Zustand  | React State |
| -------------- | -------------- | -------- | ----------- |
| **包大小**     | ~40KB          | ~2.5KB   | 0KB (內建)  |
| **記憶體使用** | 中等           | 極低     | 極低        |
| **更新性能**   | 智能優化       | 精確更新 | 組件重渲染  |
| **開發體驗**   | 優秀           | 優秀     | 基本        |
| **學習曲線**   | 中等           | 簡單     | 簡單        |

### 🎯 **性能優化策略**

```typescript
// 1. 選擇性訂閱 (Zustand)
const useTradingUIStore = create<TradingUIState>()(
  subscribeWithSelector((set, get) => ({
    // ... state
  }))
);

const Component = () => {
  // 只訂閱需要的狀態
  const theme = useTradingUIStore(state => state.theme);
  const setTheme = useTradingUIStore(state => state.setTheme);
  
  // 避免訂閱整個 store
  // const store = useTradingUIStore(); // ❌
};

// 2. 智能快取 (TanStack Query)
const useOptimizedMarketData = (symbol: string) => {
  return useQuery({
    queryKey: ['market-data', symbol],
    queryFn: () => fetchMarketData(symbol),
    staleTime: 5000, // 5秒內認為數據新鮮
    gcTime: 300000, // 5分鐘後清除快取
    select: (data) => ({
      // 只選擇需要的字段
      price: data.price,
      change: data.change,
      volume: data.volume,
    }),
  });
};

// 3. 批量更新 (組合模式)
const useBatchedUpdates = () => {
  const [updates, setUpdates] = useState<Update[]>([]);
  
  const batchUpdate = useCallback((update: Update) => {
    setUpdates(prev => [...prev, update]);
  }, []);
  
  // 批量處理更新
  useEffect(() => {
    if (updates.length === 0) return;
    
    const timer = setTimeout(() => {
      // 批量應用更新
      processBatchedUpdates(updates);
      setUpdates([]);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [updates]);
  
  return { batchUpdate };
};
```

---

## 💡 決策建議

### 🎯 **選擇決策樹**

```
需要狀態管理？
├─ 是伺服器數據？
│  ├─ 是 → 使用 TanStack Query
│  └─ 否 → 繼續判斷
├─ 需要跨組件共享？
│  ├─ 是 → 使用 Zustand
│  └─ 否 → 使用 React State
└─ 需要持久化？
   ├─ 是 → 使用 Zustand + persist
   └─ 否 → 使用 React State
```

### 📋 **實施檢查清單**

#### ✅ **TanStack Query 使用檢查**
- [ ] 是否為 API 數據？
- [ ] 需要快取機制？
- [ ] 需要背景更新？
- [ ] 需要錯誤重試？
- [ ] 需要樂觀更新？

#### ✅ **Zustand 使用檢查**
- [ ] 是否為 UI 狀態？
- [ ] 需要跨組件共享？
- [ ] 需要持久化存儲？
- [ ] 需要訂閱機制？
- [ ] 狀態邏輯複雜？

#### ✅ **React State 使用檢查**
- [ ] 僅限單一組件？
- [ ] 狀態邏輯簡單？
- [ ] 不需要持久化？
- [ ] 生命週期較短？
- [ ] 與組件綁定？

### 🎖️ **最終建議**

| 場景             | 推薦方案                     | 理由                    |
| ---------------- | ---------------------------- | ----------------------- |
| **金融交易平台** | TanStack Query + Zustand     | 複雜 UI + 大量 API 數據 |
| **簡單儀表板**   | TanStack Query + React State | 數據展示為主            |
| **靜態網站**     | React State only             | 無伺服器狀態需求        |
| **複雜企業應用** | 全技術棧                     | 涵蓋所有場景            |

### 🚀 **遷移策略**

如果需要從現有方案遷移：

```typescript
// 階段 1: 引入 TanStack Query (伺服器狀態)
// 將 API 請求邏輯遷移到 TanStack Query

// 階段 2: 評估 Zustand 需求
// 分析現有全域狀態，決定是否需要 Zustand

// 階段 3: 優化 React State
// 簡化組件內部狀態管理

// 階段 4: 整合優化
// 確保三者協作順暢，消除冗餘
```

透過這樣的分析和實施，您可以建立一個高效、可維護的狀態管理架構！
