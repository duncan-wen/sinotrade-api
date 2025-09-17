# 🚀 Sinotrade API - 前端技術棧指南

針對金融交易網站的 React 技術選型和架構設計

## 📋 目錄

- [技術棧概覽](#技術棧概覽)
- [圖表庫選型](#圖表庫選型)
- [即時數據處理](#即時數據處理)
- [大量數據處理](#大量數據處理)
- [表格數據管理](#表格數據管理)
- [API 請求管理](#api-請求管理)
- [UI 框架與組件](#ui-框架與組件)
- [專案架構](#專案架構)
- [安裝與設置](#安裝與設置)
- [實作範例](#實作範例)

---

## 🎯 技術棧概覽

### 核心技術選型

| 類別           | 技術選擇           | 版本    | 用途                              |
| -------------- | ------------------ | ------- | --------------------------------- |
| **框架**       | Next.js            | ^15.0.0 | React 全端框架 (最新版)           |
| **語言**       | TypeScript         | ^5.6.0  | 類型安全 (最新版)                 |
| **UI 庫**      | Gluestack UI       | ^3.0.0  | 現代化組件庫                      |
| **圖表**       | Lightweight Charts | ^4.2.0  | 金融圖表 (最新版)                 |
| **客戶端狀態** | Zustand            | ^5.0.0  | UI 狀態管理 (配合 TanStack Query) |
| **API 管理**   | TanStack Query     | ^5.56.0 | 伺服器狀態管理 (最新版)           |
| **虛擬化**     | TanStack Virtual   | ^3.10.0 | 大量數據渲染 (最新版)             |
| **表格處理**   | TanStack Table     | ^8.20.0 | 複雜表格管理 (最新版)             |
| **即時通訊**   | Socket.io          | ^4.8.0  | 即時數據推送 (企業級)             |

### 效能優化技術

- **虛擬化渲染** - 處理數千筆五檔報價
- **智慧快取** - 減少 API 重複請求
- **即時數據** - WebSocket 推送
- **懶加載** - 圖表和組件按需載入

---

## 📊 圖表庫選型

### 1️⃣ TradingView Charting Library (推薦 ⭐⭐⭐⭐⭐)

**適用場景**: 預算充足,需要專業級圖表

```javascript
import { widget } from 'charting_library';

const TradingViewChart = ({ symbol }) => {
  useEffect(() => {
    const tradingViewWidget = new widget({
      symbol: symbol,
      interval: "1m",
      container_id: "tradingview_chart",
      library_path: "/charting_library/",
      locale: "zh_TW",
      timezone: "Asia/Taipei",
      theme: "light",
      style: "1", // K線圖
      studies: [
        'MACD@tv-basicstudies',
        'RSI@tv-basicstudies',
        'StochasticRSI@tv-basicstudies'
      ],
      datafeed: {
        onReady: (callback) => callback(configurationData),
        searchSymbols: searchSymbolsImpl,
        resolveSymbol: resolveSymbolImpl,
        getBars: getBarsImpl,
        subscribeBars: subscribeToStreaming,
        unsubscribeBars: unsubscribeFromStreaming,
      },
    });
  }, [symbol]);

  return <div id="tradingview_chart" style={{ height: '500px' }} />;
};
```

**優點:**
- ✅ 業界標準,功能最完整
- ✅ 內建所有技術指標 (100+ 種)
- ✅ 完整畫線工具
- ✅ 多時間框架
- ✅ 即時數據饋送
- ✅ 繁體中文支援

**缺點:**
- ❌ 商業授權,需要付費
- ❌ 檔案較大 (~2MB)

### 2️⃣ Lightweight Charts (開源選擇 ⭐⭐⭐⭐)

**適用場景**: 開源優先,基本圖表需求

```javascript
import { createChart } from 'lightweight-charts';

const LightweightChart = ({ data }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();

  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: 800,
      height: 400,
      layout: {
        backgroundColor: '#ffffff',
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e1e3e6' },
        horzLines: { color: '#e1e3e6' },
      },
      crosshair: {
        mode: 'normal',
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#d1d4dc',
      },
      watermark: {
        color: 'rgba(11, 94, 29, 0.4)',
        visible: true,
        text: 'Sinotrade',
        fontSize: 24,
        horzAlign: 'left',
        vertAlign: 'bottom',
      },
    });

    // 添加 K線圖
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#e91e63',
      downColor: '#4caf50',
      borderUpColor: '#e91e63',
      borderDownColor: '#4caf50',
      wickUpColor: '#e91e63',
      wickDownColor: '#4caf50',
    });

    // 添加成交量
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    candlestickSeries.setData(data.klines);
    volumeSeries.setData(data.volumes);

    chartRef.current = chart;

    return () => chart.remove();
  }, []);

  // 即時更新數據
  useEffect(() => {
    if (chartRef.current && data.newCandle) {
      const candlestickSeries = chartRef.current.series[0];
      candlestickSeries.update(data.newCandle);
    }
  }, [data.newCandle]);

  return <div ref={chartContainerRef} />;
};
```

**優點:**
- ✅ 免費開源
- ✅ 輕量化,效能優秀
- ✅ TypeScript 原生支援
- ✅ 即時數據更新
- ✅ 可客製化樣式

**缺點:**
- ❌ 技術指標需自行實作
- ❌ 畫線工具有限

### 3️⃣ 技術指標實作 (配合 Lightweight Charts)

```javascript
// 技術指標計算庫
import { SMA, EMA, RSI, MACD, BollingerBands } from 'technicalindicators';

const TechnicalIndicators = {
  // 移動平均線
  calculateSMA: (data, period = 20) => {
    return SMA.calculate({ values: data, period });
  },

  // RSI 指標
  calculateRSI: (data, period = 14) => {
    return RSI.calculate({ values: data, period });
  },

  // MACD 指標
  calculateMACD: (data) => {
    return MACD.calculate({
      values: data,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
  },

  // 布林通道
  calculateBB: (data, period = 20, stdDev = 2) => {
    return BollingerBands.calculate({
      values: data,
      period,
      stdDev
    });
  }
};

// 技術指標圖表組件
const TechnicalChart = ({ klineData }) => {
  const [indicators, setIndicators] = useState({
    sma20: [],
    rsi: [],
    macd: []
  });

  useEffect(() => {
    const closePrices = klineData.map(k => k.close);

    setIndicators({
      sma20: TechnicalIndicators.calculateSMA(closePrices, 20),
      rsi: TechnicalIndicators.calculateRSI(closePrices, 14),
      macd: TechnicalIndicators.calculateMACD(closePrices)
    });
  }, [klineData]);

  return (
    <div>
      <LightweightChart
        data={{
          klines: klineData,
          indicators: indicators
        }}
      />
      <RSIChart data={indicators.rsi} />
      <MACDChart data={indicators.macd} />
    </div>
  );
};
```

---

## ⚡ 即時數據處理 (Socket.io)

### Socket.io 服務

```typescript
// services/socketService.ts
import { io, Socket } from 'socket.io-client';
import type { MarketData, Quote, OrderBook, Trade, KlineData } from '@/types/market';

interface SocketCallbacks {
  onQuote?: (quote: Quote) => void;
  onOrderBook?: (orderBook: OrderBook) => void;
  onTrade?: (trade: Trade) => void;
  onKline?: (kline: KlineData) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private subscribers = new Map<string, SocketCallbacks>();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;

  constructor() {
    this.connect();
  }

  connect(): void {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      autoConnect: true,
      forceNew: false,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // 連接事件
    this.socket.on('connect', () => {
      console.log('✅ Socket.io 連接成功', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 Socket.io 連接斷開:', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Socket.io 連接錯誤:', error);
      this.reconnectAttempts++;
    });

    // 市場數據事件
    this.socket.on('quote', (data: { symbol: string; quote: Quote }) => {
      const callbacks = this.subscribers.get(data.symbol);
      callbacks?.onQuote?.(data.quote);
    });

    this.socket.on('orderbook', (data: { symbol: string; orderBook: OrderBook }) => {
      const callbacks = this.subscribers.get(data.symbol);
      callbacks?.onOrderBook?.(data.orderBook);
    });

    this.socket.on('trade', (data: { symbol: string; trade: Trade }) => {
      const callbacks = this.subscribers.get(data.symbol);
      callbacks?.onTrade?.(data.trade);
    });

    this.socket.on('kline', (data: { symbol: string; kline: KlineData }) => {
      const callbacks = this.subscribers.get(data.symbol);
      callbacks?.onKline?.(data.kline);
    });

    // 錯誤處理
    this.socket.on('error', (error: any) => {
      console.error('❌ Socket.io 錯誤:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.subscribers.clear();
  }

  subscribe(symbol: string, callbacks: SocketCallbacks): void {
    this.subscribers.set(symbol, callbacks);

    if (this.socket?.connected) {
      this.socket.emit('subscribe', {
        symbol,
        channels: ['quote', 'orderbook', 'trades', 'klines']
      });
    }
  }

  unsubscribe(symbol: string): void {
    this.subscribers.delete(symbol);

    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', { symbol });
    }
  }

  // 手動重連
  reconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.connect();
  }

  // 獲取連接狀態
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // 發送自定義事件
  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // 監聽自定義事件
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  // 移除事件監聽
  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }
}

// 單例實例
export const socketService = new SocketService();

// React Hook 封裝
export const useSocket = () => {
  return {
    socket: socketService,
    isConnected: socketService.isConnected(),
    subscribe: socketService.subscribe.bind(socketService),
    unsubscribe: socketService.unsubscribe.bind(socketService),
    emit: socketService.emit.bind(socketService),
  };
};
```

### Zustand 客戶端狀態管理 (v5)

#### 🎯 **使用場景分工**

| 狀態類型         | TanStack Query   | Zustand    | 推薦使用                     |
| ---------------- | ---------------- | ---------- | ---------------------------- |
| **伺服器數據**   | ✅ 專長領域       | ❌ 避免     | **TanStack Query**           |
| **即時數據同步** | ✅ 配合 Socket.io | ✅ 連接狀態 | **TanStack Query + Zustand** |
| **UI 狀態**      | ❌ 不適用         | ✅ 專長領域 | **Zustand**                  |
| **用戶偏好**     | ❌ 不適用         | ✅ 本地存儲 | **Zustand**                  |
| **表單狀態**     | ❌ 不適用         | ✅ 適用     | **Zustand**                  |

#### 🏗️ **UI 狀態管理範例**

```typescript
// store/useTradingUIStore.ts - UI 狀態專用
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TradingUIState {
  // UI 狀態
  selectedSymbol: string;
  sidebarCollapsed: boolean;
  activeTab: 'positions' | 'orders' | 'trades';
  chartTimeframe: '1m' | '5m' | '15m' | '1h' | '1d';
  orderPanelOpen: boolean;
  watchlistVisible: boolean;
  theme: 'light' | 'dark';

  // 通知系統
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: number;
  }>;

  // 動作
  setSelectedSymbol: (symbol: string) => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: TradingUIState['activeTab']) => void;
  setChartTimeframe: (timeframe: TradingUIState['chartTimeframe']) => void;
  toggleOrderPanel: () => void;
  toggleWatchlist: () => void;
  toggleTheme: () => void;
  addNotification: (notification: Omit<TradingUIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const useTradingUIStore = create<TradingUIState>()(
  persist(
    (set, get) => ({
      // 初始狀態
      selectedSymbol: 'TSE:2330',
      sidebarCollapsed: false,
      activeTab: 'positions',
      chartTimeframe: '15m',
      orderPanelOpen: false,
      watchlistVisible: true,
      theme: 'light',
      notifications: [],

      // UI 動作
      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setChartTimeframe: (timeframe) => set({ chartTimeframe: timeframe }),

      toggleOrderPanel: () => set((state) => ({
        orderPanelOpen: !state.orderPanelOpen
      })),

      toggleWatchlist: () => set((state) => ({
        watchlistVisible: !state.watchlistVisible
      })),

      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),

      addNotification: (notification) => set((state) => ({
        notifications: [
          ...state.notifications,
          {
            ...notification,
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
          },
        ],
      })),

      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id),
      })),

      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'trading-ui-settings', // localStorage 鍵名
      partialize: (state) => ({
        // 只持久化用戶偏好,不保存通知
        selectedSymbol: state.selectedSymbol,
        sidebarCollapsed: state.sidebarCollapsed,
        chartTimeframe: state.chartTimeframe,
        watchlistVisible: state.watchlistVisible,
        theme: state.theme,
      }),
    }
  )
);

export default useTradingUIStore;
```

#### 🔌 **Socket 連接狀態管理**

```typescript
// store/useSocketStore.ts - Socket 連接狀態專用
import { create } from 'zustand';
import { socketService } from '../services/socketService';

interface SocketState {
  // 連接狀態
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
  subscribedSymbols: Set<string>;
  lastHeartbeat: number | null;
  connectionAttempts: number;

  // 動作
  connect: () => void;
  disconnect: () => void;
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  setError: (error: string | null) => void;
  addSubscription: (symbol: string) => void;
  removeSubscription: (symbol: string) => void;
  updateHeartbeat: () => void;
  incrementConnectionAttempts: () => void;
  resetConnectionAttempts: () => void;
}

const useSocketStore = create<SocketState>((set, get) => ({
  // 初始狀態
  connected: false,
  reconnecting: false,
  error: null,
  subscribedSymbols: new Set<string>(),
  lastHeartbeat: null,
  connectionAttempts: 0,

  // 動作
  connect: () => {
    socketService.connect();
    set({ reconnecting: true, error: null });
  },

  disconnect: () => {
    socketService.disconnect();
    set({
      connected: false,
      reconnecting: false,
      subscribedSymbols: new Set<string>(),
      error: null,
    });
  },

  setConnected: (connected) => set({
    connected,
    reconnecting: false,
    connectionAttempts: connected ? 0 : get().connectionAttempts
  }),

  setReconnecting: (reconnecting) => set({ reconnecting }),

  setError: (error) => set({ error, reconnecting: false }),

  addSubscription: (symbol) => set((state) => ({
    subscribedSymbols: new Set(state.subscribedSymbols).add(symbol)
  })),

  removeSubscription: (symbol) => set((state) => {
    const newSet = new Set(state.subscribedSymbols);
    newSet.delete(symbol);
    return { subscribedSymbols: newSet };
  }),

  updateHeartbeat: () => set({ lastHeartbeat: Date.now() }),

  incrementConnectionAttempts: () => set((state) => ({
    connectionAttempts: state.connectionAttempts + 1
  })),

  resetConnectionAttempts: () => set({ connectionAttempts: 0 }),
}));

export default useSocketStore;
```

#### 🎛️ **組合使用範例**

```typescript
// components/TradingDashboard.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useTradingUIStore from '@/store/useTradingUIStore';
import useSocketStore from '@/store/useSocketStore';
import { Card, VStack, HStack, Button, Text } from '@gluestack-ui/themed';

const TradingDashboard = () => {
  // TanStack Query - 伺服器數據
  const { data: positions } = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    refetchInterval: 30000,
  });

  // Zustand - UI 狀態
  const {
    selectedSymbol,
    setSelectedSymbol,
    sidebarCollapsed,
    toggleSidebar,
    activeTab,
    setActiveTab,
    addNotification,
  } = useTradingUIStore();

  // Zustand - Socket 狀態
  const {
    connected,
    subscribedSymbols,
    addSubscription,
  } = useSocketStore();

  // 組合邏輯
  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    if (connected && !subscribedSymbols.has(symbol)) {
      addSubscription(symbol);
      addNotification({
        type: 'info',
        message: `已訂閱 ${symbol} 即時數據`,
      });
    }
  };

  return (
    <div className={`dashboard ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <HStack className="p-4 border-b">
        <Button onPress={toggleSidebar}>
          {sidebarCollapsed ? '展開' : '收合'}
        </Button>
        <Text className="ml-4">連接狀態: {connected ? '已連接' : '未連接'}</Text>
      </HStack>

      <VStack className="flex-1">
        <SymbolSelector
          selected={selectedSymbol}
          onChange={handleSymbolChange}
        />

        <TabNavigation
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'positions' && (
          <PositionsTable data={positions} />
        )}
      </VStack>
    </div>
  );
};
```

#### 💡 **最佳實踐原則**

```typescript
// ✅ 好的做法 - 分工明確
const GoodComponent = () => {
  // TanStack Query 處理伺服器狀態
  const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData });

  // Zustand 處理 UI 狀態
  const { theme, toggleTheme } = useTradingUIStore();

  return (
    <Card className={theme === 'dark' ? 'dark' : 'light'}>
      <Button onPress={toggleTheme}>切換主題</Button>
    </Card>
  );
};

// ❌ 避免的做法 - 職責混淆
const BadComponent = () => {
  // 不要用 Zustand 存儲伺服器數據
  const { serverData, fetchServerData } = useMarketDataStore(); // ❌

  // 不要用 TanStack Query 管理 UI 狀態
  const { data: uiState } = useQuery({ // ❌
    queryKey: ['ui-state'],
    queryFn: () => Promise.resolve({ theme: 'light' })
  });
};
```

#### 🔄 **與 TanStack Query 整合**

```typescript
// hooks/useMarketData.ts - 結合兩者優勢
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useSocketStore from '@/store/useSocketStore';
import useTradingUIStore from '@/store/useTradingUIStore';

export const useMarketData = (symbol: string) => {
  const queryClient = useQueryClient();
  const { connected, addSubscription } = useSocketStore();
  const { addNotification } = useTradingUIStore();

  // TanStack Query 管理數據
  const query = useQuery({
    queryKey: ['market-data', symbol],
    queryFn: () => fetchMarketData(symbol),
    staleTime: 5000,
    enabled: !!symbol,
  });

  // Socket 即時更新數據
  useEffect(() => {
    if (connected && symbol) {
      const unsubscribe = socketService.subscribe(symbol, {
        onQuote: (quote) => {
          // 更新 TanStack Query 快取
          queryClient.setQueryData(['market-data', symbol], (old) => ({
            ...old,
            quote,
            lastUpdate: Date.now(),
          }));
        },
        onError: (error) => {
          // 使用 Zustand 顯示通知
          addNotification({
            type: 'error',
            message: `${symbol} 數據連接錯誤: ${error.message}`,
          });
        },
      });

      // 更新 Zustand 訂閱狀態
      addSubscription(symbol);

      return unsubscribe;
    }
  }, [connected, symbol]);

  return query;
};
```

### 🎯 **狀態管理總結**

| 技術               | 負責範圍   | 典型使用場景                   |
| ------------------ | ---------- | ------------------------------ |
| **TanStack Query** | 伺服器狀態 | API 數據、快取、同步、錯誤處理 |
| **Zustand**        | 客戶端狀態 | UI 配置、用戶偏好、通知、表單  |
| **React State**    | 組件狀態   | 臨時狀態、輸入值、動畫狀態     |

透過這樣的分工,您可以獲得:
- 🎯 **明確職責** - 每個工具專注自己的強項
- 🚀 **最佳性能** - 避免不必要的重新渲染
- 🛠️ **易於維護** - 狀態邏輯分離,降低複雜度
- 📦 **適當包大小** - 只用需要的功能

```typescript
// store/useMarketData.ts - 重構為 Socket 整合
import { create } from 'zustand';
import { socketService } from '../services/socketService';

// 改為專注於即時數據同步的輔助狀態
interface MarketDataSyncState {
  // 同步狀態 (不存儲實際數據)
  connected: boolean;
  subscribedSymbols: Set<string>;
  lastSyncTime: Record<string, number>;
  syncErrors: Record<string, string>;

  // 同步動作
  connect: () => void;
  disconnect: () => void;
  subscribeSymbol: (symbol: string) => void;
  unsubscribeSymbol: (symbol: string) => void;
  updateSyncTime: (symbol: string) => void;
  setSyncError: (symbol: string, error: string) => void;
  clearSyncError: (symbol: string) => void;
}

const useMarketDataSync = create<MarketDataSyncState>()(
  (set, get) => ({
    // 狀態
    connected: false,
    subscribedSymbols: new Set<string>(),
    lastSyncTime: {},
    syncErrors: {},

    // 動作
    connect: () => {
      socketService.connect();
      set({ connected: true });
    },

    disconnect: () => {
      socketService.disconnect();
      set({
        connected: false,
        subscribedSymbols: new Set<string>(),
        lastSyncTime: {},
        syncErrors: {},
      });
    },

    subscribeSymbol: (symbol: string) => {
      const { subscribedSymbols } = get();
      if (!subscribedSymbols.has(symbol)) {
        socketService.subscribe(symbol, {
          onQuote: (quote: Quote) => get().updateQuote(symbol, quote),
          onOrderBook: (orderBook: OrderBook) => get().updateOrderBook(symbol, orderBook),
          onTrade: (trade: Trade) => get().updateTrade(symbol, trade),
          onKline: (kline: KlineData) => get().updateKline(symbol, kline),
        });

        set({
          subscribedSymbols: new Set([...subscribedSymbols, symbol])
        });
      }
    },

    unsubscribeSymbol: (symbol: string) => {
      const { subscribedSymbols } = get();
      if (subscribedSymbols.has(symbol)) {
        socketService.unsubscribe(symbol);

        const newSet = new Set(subscribedSymbols);
        newSet.delete(symbol);
        set({ subscribedSymbols: newSet });
      }
    },

    updateQuote: (symbol: string, quote: Quote) => set((state) => ({
      quotes: {
        ...state.quotes,
        [symbol]: {
          ...state.quotes[symbol],
          ...quote,
          timestamp: Date.now()
        }
      }
    })),

    updateOrderBook: (symbol: string, orderBook: OrderBook) => set((state) => ({
      orderBooks: {
        ...state.orderBooks,
        [symbol]: orderBook
      }
    })),

    updateTrade: (symbol: string, trade: Trade) => set((state) => ({
      trades: {
        ...state.trades,
        [symbol]: [
          ...(state.trades[symbol] || []).slice(-99), // 保留最近100筆
          trade
        ]
      }
    })),

    updateKline: (symbol: string, kline: KlineData) => set((state) => ({
      klines: {
        ...state.klines,
        [symbol]: {
          ...state.klines[symbol],
          current: kline,
          history: [...(state.klines[symbol]?.history || []), kline].slice(-1000) // 保留最近1000筆歷史數據
        }
      }
    })),

    clearData: () => set({
      quotes: {},
      orderBooks: {},
      trades: {},
      klines: {},
    }),
  }))
);

export default useMarketDataStore;
```

---

## 📊 大量數據處理 (TanStack Virtual v3)

### 五檔報價虛擬化

```typescript
// components/OrderBook.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, VStack, HStack, Text, Card } from '@gluestack-ui/themed';
import { useRef, useMemo } from 'react';
import useMarketDataStore from '@/store/useMarketData';
import type { OrderBookEntry } from '@/types/market';

interface OrderBookProps {
  symbol: string;
}

const OrderBook: React.FC<OrderBookProps> = ({ symbol }) => {
  const orderBook = useMarketDataStore(state => state.orderBooks[symbol]);
  const parentRef = useRef<HTMLDivElement>(null);

  // 合併買賣單數據
  const combinedOrders = useMemo(() => {
    if (!orderBook) return [];

    const asks = orderBook.asks.map(ask => ({ ...ask, type: 'ask' as const }));
    const bids = orderBook.bids.map(bid => ({ ...bid, type: 'bid' as const }));

    return [...asks.reverse(), ...bids];
  }, [orderBook]);

  // 虛擬化配置
  const rowVirtualizer = useVirtualizer({
    count: combinedOrders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // 每行32px高度
    overscan: 10, // 預渲染前後10行
  });

  if (!orderBook) {
    return (
      <Card className="p-4">
        <Text className="text-center text-gray-500">載入中...</Text>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* 標題 */}
      <HStack className="justify-between p-3 bg-gray-100 border-b">
        <Text className="font-semibold text-sm">價格</Text>
        <Text className="font-semibold text-sm">數量</Text>
        <Text className="font-semibold text-sm">筆數</Text>
      </HStack>

      {/* 虛擬化列表 */}
      <Box
        ref={parentRef}
        className="h-96 overflow-auto"
      >
        <Box
          className="relative"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const order = combinedOrders[virtualRow.index];
            const isAsk = order.type === 'ask';

            return (
              <HStack
                key={virtualRow.key}
                className={`absolute inset-x-0 justify-between px-3 py-1 border-b border-gray-100 hover:opacity-80 transition-opacity ${
                  isAsk
                    ? 'bg-red-50 hover:bg-red-100'
                    : 'bg-green-50 hover:bg-green-100'
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <Text
                  className={`font-medium text-sm ${
                    isAsk ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {order.price.toFixed(2)}
                </Text>
                <Text className="text-sm">
                  {order.volume.toLocaleString()}
                </Text>
                <Text className="text-xs text-gray-600">
                  {order.count}
                </Text>
              </HStack>
            );
          })}
        </Box>
      </Box>
    </Card>
  );
};

export default OrderBook;
```

### 交易歷史虛擬化

```javascript
// components/TradeHistory.jsx
const TradeHistory = ({ symbol }) => {
  const trades = useMarketDataStore(state => state.trades[symbol] || []);
  const parentRef = useRef();

  const rowVirtualizer = useVirtualizer({
    count: trades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 15,
  });

  return (
    <Box>
      <Flex justify="space-between" p={2} fontWeight="bold" bg="gray.100">
        <Text>時間</Text>
        <Text>價格</Text>
        <Text>數量</Text>
        <Text>類型</Text>
      </Flex>

      <Box ref={parentRef} h="300px" overflow="auto">
        <Box h={`${rowVirtualizer.getTotalSize()}px`} position="relative">
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const trade = trades[virtualRow.index];
            const isBuy = trade.side === 'buy';

            return (
              <Flex
                key={virtualRow.key}
                position="absolute"
                top={0}
                left={0}
                w="100%"
                h={`${virtualRow.size}px`}
                transform={`translateY(${virtualRow.start}px)`}
                align="center"
                justify="space-between"
                px={2}
                fontSize="sm"
              >
                <Text>{new Date(trade.timestamp).toLocaleTimeString()}</Text>
                <Text color={isBuy ? 'red.600' : 'green.600'}>
                  {trade.price.toFixed(2)}
                </Text>
                <Text>{trade.volume.toLocaleString()}</Text>
                <Text color={isBuy ? 'red.600' : 'green.600'}>
                  {isBuy ? '買' : '賣'}
                </Text>
              </Flex>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};
```

---

## 📋 表格數據管理 (TanStack Table v8)

### 為什麼需要 TanStack Table？

在金融交易平台中,許多功能需要複雜的表格展示和操作:

| 功能場景     | 是否需要 TanStack Table | 原因                     |
| ------------ | ----------------------- | ------------------------ |
| **持倉管理** | ✅ 必需                  | 需要排序、篩選、計算     |
| **訂單歷史** | ✅ 必需                  | 需要分頁、搜尋、狀態篩選 |
| **交易記錄** | ✅ 必需                  | 需要日期範圍、金額排序   |
| **風控報表** | ✅ 必需                  | 需要多維度分析           |
| **五檔報價** | ❌ 不需要                | 使用 Virtual 即可        |
| **即時成交** | ❌ 不需要                | 簡單列表展示             |

### 持倉管理表格

```typescript
// components/PositionsTable.tsx
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import { Card, Text, Button } from '@gluestack-ui/themed';
import { useMemo, useState } from 'react';
import { usePositions } from '@/hooks/useQueries';
import type { Position } from '@/types/market';

const columnHelper = createColumnHelper<Position>();

const PositionsTable = () => {
  const { data: positions = [], isLoading } = usePositions();
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(
    () => [
      columnHelper.accessor('symbol', {
        header: '股票代號',
        cell: (info) => (
          <Text className="font-medium text-blue-600">
            {info.getValue()}
          </Text>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      }),
      columnHelper.accessor('quantity', {
        header: '持股數量',
        cell: (info) => (
          <Text className="text-right">
            {info.getValue().toLocaleString()}
          </Text>
        ),
        enableSorting: true,
      }),
      columnHelper.accessor('avgPrice', {
        header: '平均成本',
        cell: (info) => (
          <Text className="text-right">
            ${info.getValue().toFixed(2)}
          </Text>
        ),
        enableSorting: true,
      }),
      columnHelper.accessor('currentPrice', {
        header: '現價',
        cell: (info) => {
          const current = info.getValue();
          const avg = info.row.original.avgPrice;
          const isProfit = current > avg;

          return (
            <Text
              className={`text-right font-medium ${
                isProfit ? 'text-red-600' : 'text-green-600'
              }`}
            >
              ${current.toFixed(2)}
            </Text>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor('unrealizedPnL', {
        header: '未實現損益',
        cell: (info) => {
          const pnl = info.getValue();
          const isProfit = pnl > 0;

          return (
            <Text
              className={`text-right font-medium ${
                isProfit ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {isProfit ? '+' : ''}${pnl.toFixed(2)}
            </Text>
          );
        },
        enableSorting: true,
      }),
      columnHelper.accessor('marketValue', {
        header: '市值',
        cell: (info) => (
          <Text className="text-right font-medium">
            ${info.getValue().toLocaleString()}
          </Text>
        ),
        enableSorting: true,
      }),
      columnHelper.display({
        id: 'actions',
        header: '操作',
        cell: (info) => (
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onPress={() => handleSell(info.row.original)}
            >
              賣出
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => handleViewDetails(info.row.original)}
            >
              詳情
            </Button>
          </div>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: positions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: 20,
      },
      sorting: [
        {
          id: 'marketValue',
          desc: true, // 預設按市值降序排列
        },
      ],
    },
  });

  const handleSell = (position: Position) => {
    console.log('賣出:', position.symbol);
  };

  const handleViewDetails = (position: Position) => {
    console.log('查看詳情:', position.symbol);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <Text className="text-center">載入中...</Text>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <Text className="text-xl font-bold">持倉管理</Text>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="搜尋股票代號..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <Text className="text-sm text-gray-500">
            共 {table.getFilteredRowModel().rows.length} 筆
          </Text>
        </div>
      </div>

      {/* 表格渲染代碼... */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-gray-700 bg-gray-50"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center space-x-1 ${
                          header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>
                        {header.column.getCanSort() && (
                          <span className="text-gray-400">
                            {{
                              asc: ' 🔼',
                              desc: ' 🔽',
                            }[header.column.getIsSorted() as string] ?? ' ↕️'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default PositionsTable;
```

### TanStack Table 核心功能

```typescript
// 1. 排序功能
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  // 多欄位排序
  enableMultiSort: true,
  maxMultiSortColCount: 3,
});

// 2. 篩選功能
const table = useReactTable({
  data,
  columns,
  getFilteredRowModel: getFilteredRowModel(),
  // 全域搜尋
  globalFilterFn: 'includesString',
  // 欄位篩選
  columnFilterFns: {
    fuzzy: (row, columnId, value, addMeta) => {
      // 自定義模糊搜尋
      return value.toLowerCase().split(' ').every(term =>
        row.getValue(columnId).toString().toLowerCase().includes(term)
      );
    },
  },
});

// 3. 分頁功能
const table = useReactTable({
  data,
  columns,
  getPaginationRowModel: getPaginationRowModel(),
  state: {
    pagination: {
      pageIndex: 0,
      pageSize: 20,
    },
  },
  onPaginationChange: setPagination,
});

// 4. 選擇功能
const [rowSelection, setRowSelection] = useState({});

const table = useReactTable({
  data,
  columns,
  getRowSelectionModel: () => rowSelection,
  onRowSelectionChange: setRowSelection,
  enableRowSelection: true,
  // 或者條件式選擇
  enableRowSelection: (row) => row.original.age > 18,
});
```

---

## 🌐 API 請求管理 (TanStack Query v5)

### Query 設置和提供者

```javascript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,        // 1分鐘數據視為新鮮
      retry: 2,                    // 失敗重試2次
      refetchOnWindowFocus: false, // 視窗聚焦時不重新獲取
      refetchOnReconnect: true,    // 網路重連時重新獲取
      gcTime: 1000 * 60 * 5,      // 5分鐘垃圾回收時間
    },
    mutations: {
      retry: 1,
      gcTime: 1000 * 60 * 5,
    },
  },
});

// app/layout.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@/config/gluestack-ui.config';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          <GluestackUIProvider config={config}>
            {children}
          </GluestackUIProvider>
          {/* React Query DevTools - 只在開發環境顯示 */}
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools
              initialIsOpen={false}
              position="bottom"
              toggleButtonProps={{
                style: {
                  marginLeft: '5px',
                  transform: undefined,
                  width: '30px',
                  height: '30px',
                },
              }}
            />
          )}
        </QueryClientProvider>
      </body>
    </html>
  );
}

// hooks/useReactQueryDevtools.ts
import { useEffect } from 'react';

// 開發工具的自定義 Hook
export const useReactQueryDevtools = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // 可以在這裡添加自定義的開發工具邏輯
      console.log('🔧 React Query DevTools 已啟用');

      // 添加快捷鍵來切換 DevTools
      const handleKeyPress = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
          // Ctrl+Shift+Q 切換 DevTools
          const devtools = document.querySelector('[data-testid="react-query-devtools-btn"]');
          if (devtools instanceof HTMLElement) {
            devtools.click();
          }
        }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, []);
};
```

### API 服務層

```javascript
// services/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY,
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // 股票報價
  getQuote(symbol) {
    return this.request(`/api/quote/${symbol}`);
  }

  // 歷史K線
  getKlines(symbol, interval = '1m', limit = 100) {
    return this.request(`/api/klines/${symbol}?interval=${interval}&limit=${limit}`);
  }

  // 下單
  placeOrder(orderData) {
    return this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  // 查詢持倉
  getPositions() {
    return this.request('/api/positions');
  }

  // 查詢訂單
  getOrders() {
    return this.request('/api/orders');
  }

  // 交易歷史
  getTradeHistory(limit = 100) {
    return this.request(`/api/trades?limit=${limit}`);
  }
}

export const apiService = new ApiService();
```

### React Query Hooks

```javascript
// hooks/useQueries.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

// 股票報價查詢
export const useStockQuote = (symbol) => {
  return useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => apiService.getQuote(symbol),
    enabled: !!symbol,
    staleTime: 1000,           // 1秒內數據視為新鮮
    refetchInterval: 5000,     // 每5秒重新獲取
  });
};

// K線數據查詢
export const useKlineData = (symbol, interval, limit) => {
  return useQuery({
    queryKey: ['klines', symbol, interval, limit],
    queryFn: () => apiService.getKlines(symbol, interval, limit),
    enabled: !!symbol,
    staleTime: 1000 * 60,      // K線數據1分鐘內視為新鮮
  });
};

// 持倉查詢
export const usePositions = () => {
  return useQuery({
    queryKey: ['positions'],
    queryFn: apiService.getPositions,
    staleTime: 1000 * 30,      // 30秒內視為新鮮
  });
};

// 訂單查詢
export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: apiService.getOrders,
    staleTime: 1000 * 30,
  });
};

// 下單 Mutation
export const usePlaceOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData) => apiService.placeOrder(orderData),
    onSuccess: () => {
      // 下單成功後刷新相關數據
      queryClient.invalidateQueries(['positions']);
      queryClient.invalidateQueries(['orders']);
    },
    onError: (error) => {
      console.error('下單失敗:', error);
    },
  });
};

// 交易歷史查詢
export const useTradeHistory = (limit) => {
  return useQuery({
    queryKey: ['tradeHistory', limit],
    queryFn: () => apiService.getTradeHistory(limit),
    staleTime: 1000 * 60,      // 1分鐘內視為新鮮
  });
};
```

### 組件中使用

```javascript
// components/StockQuote.jsx
import { useStockQuote } from '../hooks/useQueries';

const StockQuote = ({ symbol }) => {
  const {
    data: quote,
    isLoading,
    error,
    isStale,
    dataUpdatedAt
  } = useStockQuote(symbol);

  if (isLoading) return <Spinner />;
  if (error) return <Alert status="error">載入失敗: {error.message}</Alert>;

  return (
    <Box
      p={4}
      border="1px solid"
      borderColor="gray.200"
      bg={isStale ? 'gray.50' : 'white'}
    >
      <Flex justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <Text fontSize="lg" fontWeight="bold">{symbol}</Text>
          <Text fontSize="2xl" color={quote.change >= 0 ? 'red.600' : 'green.600'}>
            {quote.price.toFixed(2)}
          </Text>
        </VStack>

        <VStack align="end" spacing={1}>
          <Text
            fontSize="md"
            color={quote.change >= 0 ? 'red.600' : 'green.600'}
          >
            {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}
          </Text>
          <Text fontSize="sm" color="gray.500">
            更新: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </Text>
        </VStack>
      </Flex>
    </Box>
  );
};
```

```javascript
// components/OrderForm.jsx
import { usePlaceOrder } from '../hooks/useQueries';

const OrderForm = () => {
  const [orderData, setOrderData] = useState({
    symbol: '',
    action: 'Buy',
    orderType: 'LMT',
    price: '',
    quantity: '',
  });

  const placeOrder = usePlaceOrder();

  const handleSubmit = (e) => {
    e.preventDefault();

    placeOrder.mutate(orderData, {
      onSuccess: () => {
        toast.success('下單成功！');
        setOrderData({ ...orderData, price: '', quantity: '' });
      },
      onError: (error) => {
        toast.error(`下單失敗: ${error.message}`);
      },
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} p={4}>
      <VStack spacing={4}>
        <FormControl>
          <FormLabel>股票代號</FormLabel>
          <Input
            value={orderData.symbol}
            onChange={(e) => setOrderData({...orderData, symbol: e.target.value})}
            placeholder="例如: 2330"
          />
        </FormControl>

        <FormControl>
          <FormLabel>買賣別</FormLabel>
          <Select
            value={orderData.action}
            onChange={(e) => setOrderData({...orderData, action: e.target.value})}
          >
            <option value="Buy">買進</option>
            <option value="Sell">賣出</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>價格</FormLabel>
          <Input
            type="number"
            step="0.01"
            value={orderData.price}
            onChange={(e) => setOrderData({...orderData, price: e.target.value})}
            placeholder="0.00"
          />
        </FormControl>

        <FormControl>
          <FormLabel>數量</FormLabel>
          <Input
            type="number"
            value={orderData.quantity}
            onChange={(e) => setOrderData({...orderData, quantity: e.target.value})}
            placeholder="1000"
          />
        </FormControl>

        <Button
          type="submit"
          colorScheme={orderData.action === 'Buy' ? 'red' : 'green'}
          isLoading={placeOrder.isPending}
          loadingText="下單中..."
          w="100%"
        >
          {placeOrder.isPending ? '下單中...' : '確認下單'}
        </Button>
      </VStack>
    </Box>
  );
};
```

---

## 🎨 UI 框架與組件 (Gluestack UI v3)

### 主題配置

```typescript
// config/gluestack-ui.config.ts
import { config } from '@gluestack-ui/config';
import { createConfig } from '@gluestack-ui/themed';

const customConfig = createConfig({
  ...config,
  tokens: {
    ...config.tokens,
  colors: {
      ...config.tokens.colors,
      // 交易專用顏色
      tradingBuy: '#ef4444',     // 紅色 (買進)
      tradingSell: '#22c55e',    // 綠色 (賣出)
      tradingUp: '#ef4444',      // 上漲
      tradingDown: '#22c55e',    // 下跌
      // 品牌顏色
      brand50: '#eff6ff',
      brand100: '#dbeafe',
      brand500: '#3b82f6',
      brand600: '#2563eb',
      brand900: '#1e3a8a',
  },
  fonts: {
      heading: 'Noto Sans TC, Inter, system-ui, sans-serif',
      body: 'Noto Sans TC, Inter, system-ui, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
    },
    space: {
      ...config.tokens.space,
      'trading-padding': 12,
      'chart-margin': 16,
    },
  },
  components: {
    Button: {
      theme: {
      variants: {
        trading: {
            bg: '$brand500',
            _hover: {
              bg: '$brand600',
            },
            _pressed: {
              bg: '$brand700',
            },
          },
          buy: {
            bg: '$tradingBuy',
            _hover: {
              bg: '$red600',
            },
          },
          sell: {
            bg: '$tradingSell',
            _hover: {
              bg: '$green600',
            },
          },
        },
      },
    },
  },
});

export default customConfig;
```

### 交易儀表板布局

```typescript
// components/TradingDashboard.tsx
import {
  Box,
  VStack,
  HStack,
  Card,
  Text,
} from '@gluestack-ui/themed';
import { useState } from 'react';

const TradingDashboard = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('2330');
  const [activeTab, setActiveTab] = useState('kline');

  return (
    <Box className="h-screen p-4 bg-gray-50">
      {/* 頂部工具列 */}
      <Card className="mb-4 p-4">
        <SymbolSelector
          value={selectedSymbol}
          onChange={setSelectedSymbol}
        />
      </Card>

      {/* 主要內容區域 */}
      <Box className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-120px)]">
        {/* 主圖表區 - 佔 3/4 */}
        <Card className="lg:col-span-3 p-0 overflow-hidden">
          {/* 圖表標籤 */}
          <Box className="flex border-b border-gray-200">
            {[
              { id: 'kline', label: 'K線圖' },
              { id: 'time', label: '分時圖' },
              { id: 'technical', label: '技術指標' },
            ].map((tab) => (
              <Box
                key={tab.id}
                className={`px-4 py-2 cursor-pointer border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-transparent hover:bg-gray-50'
                }`}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text className="font-medium">{tab.label}</Text>
        </Box>
            ))}
          </Box>

          {/* 圖表內容 */}
          <Box className="flex-1 p-0">
            {activeTab === 'kline' && <LightweightChart symbol={selectedSymbol} />}
            {activeTab === 'time' && <TimeChart symbol={selectedSymbol} />}
            {activeTab === 'technical' && <TechnicalChart symbol={selectedSymbol} />}
          </Box>
        </Card>

        {/* 右側面板 - 佔 1/4 */}
        <VStack space="md" className="h-full">
          {/* 即時報價 */}
          <Card className="w-full">
            <StockQuote symbol={selectedSymbol} />
          </Card>

          {/* 五檔報價 */}
          <Card className="w-full flex-1 min-h-0">
            <OrderBook symbol={selectedSymbol} />
          </Card>

          {/* 下單面板 */}
          <Card className="w-full">
            <OrderForm defaultSymbol={selectedSymbol} />
          </Card>
        </VStack>
      </Box>
    </Box>
  );
};

export default TradingDashboard;
```

### 股票選擇器

```javascript
// components/SymbolSelector.jsx
import {
  HStack,
  Select,
  InputGroup,
  InputLeftElement,
  Input,
  IconButton,
  Flex,
  Badge,
} from '@chakra-ui/react';
import { SearchIcon, StarIcon } from '@chakra-ui/icons';

const SymbolSelector = ({ value, onChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState(['2330', '0050', 'TSMC']);

  const popularStocks = [
    { symbol: '2330', name: '台積電' },
    { symbol: '2317', name: '鴻海' },
    { symbol: '2454', name: '聯發科' },
    { symbol: '0050', name: '元大台灣50' },
    { symbol: '00878', name: '國泰永續高股息' },
  ];

  return (
    <Flex align="center" justify="space-between" p={4} bg="white" borderRadius="md" shadow="sm">
      <HStack spacing={4}>
        {/* 股票搜尋 */}
        <InputGroup w="300px">
          <InputLeftElement>
            <SearchIcon color="gray.500" />
          </InputLeftElement>
          <Input
            placeholder="輸入股票代號或名稱"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        {/* 熱門股票 */}
        <HStack spacing={2}>
          {popularStocks.map((stock) => (
            <Badge
              key={stock.symbol}
              variant={value === stock.symbol ? 'solid' : 'outline'}
              colorScheme={value === stock.symbol ? 'blue' : 'gray'}
              cursor="pointer"
              onClick={() => onChange(stock.symbol)}
              px={3}
              py={1}
            >
              {stock.symbol}
            </Badge>
          ))}
        </HStack>
      </HStack>

      {/* 我的最愛 */}
      <HStack spacing={2}>
        {favorites.map((symbol) => (
          <IconButton
            key={symbol}
            icon={<StarIcon />}
            size="sm"
            variant={value === symbol ? 'solid' : 'outline'}
            colorScheme="yellow"
            onClick={() => onChange(symbol)}
            aria-label={`切換到 ${symbol}`}
          />
        ))}
      </HStack>
    </Flex>
  );
};
```

---

## 🏗️ 專案架構

### 目錄結構

```
frontend/
├── app/                          # Next.js 13+ App Router
│   ├── layout.tsx               # 根布局
│   ├── page.tsx                 # 首頁
│   ├── trading/                 # 交易頁面
│   │   └── page.tsx
│   └── globals.css              # 全域樣式
├── components/                   # UI 組件
│   ├── charts/                  # 圖表組件
│   │   ├── LightweightChart.tsx
│   │   ├── TechnicalChart.tsx
│   │   └── TimeChart.tsx
│   ├── trading/                 # 交易組件
│   │   ├── OrderBook.tsx
│   │   ├── OrderForm.tsx
│   │   ├── QuotePanel.tsx
│   │   └── TradeHistory.tsx
│   ├── layout/                  # 布局組件
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── TradingDashboard.tsx
│   └── common/                  # 通用組件
│       ├── Loading.tsx
│       ├── ErrorBoundary.tsx
│       └── Toast.tsx
├── hooks/                       # 自定義 Hooks
│   ├── useQueries.js           # React Query hooks
│   ├── useWebSocket.js         # WebSocket hook
│   └── useLocalStorage.js      # 本地儲存 hook
├── services/                    # 服務層
│   ├── api.js                  # API 服務
│   ├── websocket.js            # WebSocket 服務
│   └── calculations.js         # 技術指標計算
├── store/                       # 狀態管理
│   ├── useMarketData.js        # 市場數據 store
│   ├── useUserSettings.js      # 用戶設定 store
│   └── useAuth.js              # 認證 store
├── lib/                         # 工具庫
│   ├── queryClient.js          # React Query 配置
│   ├── utils.js                # 工具函數
│   └── constants.js            # 常量定義
├── theme/                       # Chakra UI 主題
│   ├── index.js                # 主題配置
│   └── components.js           # 組件樣式
├── types/                       # TypeScript 類型
│   ├── api.ts                  # API 類型
│   ├── market.ts               # 市場數據類型
│   └── user.ts                 # 用戶類型
└── package.json
```

### 環境變數配置

```bash
# .env.local
# API 配置
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=your-api-key-here

# Socket.io 配置
NEXT_PUBLIC_SOCKET_PATH=/socket.io/
NEXT_PUBLIC_SOCKET_TIMEOUT=5000
NEXT_PUBLIC_SOCKET_RECONNECTION_ATTEMPTS=5

# UI 主題
NEXT_PUBLIC_DEFAULT_THEME=light
NEXT_PUBLIC_COLOR_MODE=light

# 圖表配置
NEXT_PUBLIC_CHART_PROVIDER=lightweight-charts
NEXT_PUBLIC_TRADINGVIEW_LIBRARY_PATH=/charting_library/
NEXT_PUBLIC_CHART_HEIGHT=500

# 功能開關
NEXT_PUBLIC_ENABLE_TRADING=true
NEXT_PUBLIC_ENABLE_TECHNICAL_ANALYSIS=true
NEXT_PUBLIC_ENABLE_ORDERBOOK=true
NEXT_PUBLIC_ENABLE_REALTIME_DATA=true

# 效能配置
NEXT_PUBLIC_VIRTUAL_LIST_OVERSCAN=10
NEXT_PUBLIC_MAX_TRADE_HISTORY=1000
NEXT_PUBLIC_ORDERBOOK_LEVELS=20

# 開發工具
NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS=true
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=false
```

---

## 📦 安裝與設置

### 1. 建立 Next.js 專案

```bash
# 在專案根目錄建立前端
cd sinotrade-api
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd frontend
```

### 2. 安裝依賴套件

```bash
# UI 框架 - Gluestack UI v3
npm install @gluestack-ui/themed @gluestack-ui/config lucide-react-native

# 或者使用 NativeWind + Gluestack
npm install @gluestack-ui/nativewind-utils nativewind tailwindcss

# 圖表庫 (最新版)
npm install lightweight-charts@^4.2.0 technicalindicators@^3.1.0

# 客戶端狀態管理 (Zustand v5) - UI 狀態專用
npm install zustand@^5.0.0

# API 管理 (TanStack Query v5)
npm install @tanstack/react-query@^5.56.0 @tanstack/react-query-devtools@^5.56.0

# 虛擬化 (TanStack Virtual v3)
npm install @tanstack/react-virtual@^3.10.0

# 表格處理 (TanStack Table v8)
npm install @tanstack/react-table@^8.20.0

# Socket.io 即時通訊
npm install socket.io-client@^4.8.0

# 工具庫 (最新版)
npm install date-fns@^4.0.0 numeral@^2.0.6 lucide-react@^0.453.0

# TypeScript 類型定義
npm install -D @types/numeral@^2.0.5 @types/node@^22.0.0
```

### 3. 設置 package.json

```json
{
  "name": "sinotrade-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "analyze": "cross-env ANALYZE=true next build"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "next": "^15.0.0",
    "typescript": "^5.6.0",
    "@gluestack-ui/themed": "^3.0.0",
    "@gluestack-ui/config": "^3.0.0",
    "@gluestack-ui/nativewind-utils": "^3.0.0",
    "nativewind": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "lightweight-charts": "^4.2.0",
    "technicalindicators": "^3.1.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.56.0",
    "@tanstack/react-query-devtools": "^5.56.0",
    "@tanstack/react-virtual": "^3.10.0",
    "@tanstack/react-table": "^8.20.0",
    "socket.io-client": "^4.8.0",
    "date-fns": "^4.0.0",
    "numeral": "^2.0.6",
    "lucide-react": "^0.453.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/numeral": "^2.0.5",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "cross-env": "^7.0.3",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### 4. TypeScript 配置 (v5.6)

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/services/*": ["./src/services/*"],
      "@/store/*": ["./src/store/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/config/*": ["./src/config/*"]
    },
    "verbatimModuleSyntax": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 💡 實作範例

### 完整的交易頁面

```typescript
// app/trading/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import TradingDashboard from '@/components/layout/TradingDashboard';
import useMarketDataStore from '@/store/useMarketData';
import theme from '@/theme';

export default function TradingPage() {
  const { connect, disconnect } = useMarketDataStore();

  useEffect(() => {
    // 頁面載入時連接 WebSocket
    connect();

    // 清理函數
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <ChakraProvider theme={theme}>
      <TradingDashboard />
    </ChakraProvider>
  );
}
```

### 錯誤邊界

```typescript
// components/common/ErrorBoundary.tsx
'use client';

import React from 'react';
import { Alert, AlertIcon, AlertTitle, AlertDescription, Button, VStack } from '@chakra-ui/react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('錯誤邊界捕獲錯誤:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <VStack spacing={4} p={8}>
          <Alert status="error">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <AlertTitle>應用程式發生錯誤！</AlertTitle>
              <AlertDescription>
                {this.state.error?.message || '未知錯誤'}
              </AlertDescription>
            </VStack>
          </Alert>
          <Button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            colorScheme="blue"
          >
            重新載入
          </Button>
        </VStack>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### 性能監控

```typescript
// hooks/usePerformance.ts
import { useEffect, useRef } from 'react';

export const usePerformanceMonitor = (componentName: string) => {
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;

    if (renderTime > 100) {
      console.warn(`⚠️ ${componentName} 渲染時間過長: ${renderTime}ms`);
    }

    // 記錄到監控系統
    if (process.env.NODE_ENV === 'production') {
      // analytics.track('component_render_time', {
      //   component: componentName,
      //   duration: renderTime
      // });
    }
  });

  useEffect(() => {
    startTime.current = Date.now();
  });
};
```

---

## 📊 效能優化建議

### 1. 代碼分割
```typescript
// 懶加載圖表組件
const TradingViewChart = dynamic(() => import('@/components/charts/TradingViewChart'), {
  loading: () => <Spinner />,
  ssr: false,
});

const TechnicalAnalysis = dynamic(() => import('@/components/charts/TechnicalAnalysis'), {
  loading: () => <Spinner />,
});
```

### 2. 記憶化
```typescript
// 記憶化昂貴的計算
const technicalIndicators = useMemo(() => {
  return calculateAllIndicators(klineData);
}, [klineData]);

// 記憶化回調函數
const handleOrderSubmit = useCallback((orderData) => {
  placeOrder.mutate(orderData);
}, [placeOrder]);
```

### 3. 虛擬化最佳實踐
```typescript
// 使用 React.memo 避免不必要的重新渲染
const OrderBookRow = React.memo(({ order, type }) => {
  return (
    <Flex justify="space-between" bg={type === 'ask' ? 'red.50' : 'green.50'}>
      <Text>{order.price}</Text>
      <Text>{order.volume}</Text>
    </Flex>
  );
});
```

### 4. WebSocket 優化
```typescript
// 節流處理高頻數據更新
import { throttle } from 'lodash';

const throttledUpdate = throttle((data) => {
  updateOrderBook(data);
}, 100); // 每100ms最多更新一次
```

---

## 🔒 安全考量

### 1. API 金鑰保護
```typescript
// 只在伺服器端使用敏感 API 金鑰
// 前端只使用公開的 API 端點
const publicApiKey = process.env.NEXT_PUBLIC_API_KEY; // 可以在瀏覽器中使用
const privateApiKey = process.env.API_PRIVATE_KEY;    // 只能在伺服器端使用
```

### 2. 輸入驗證
```typescript
// 下單前驗證
const validateOrder = (orderData) => {
  if (!orderData.symbol || orderData.symbol.length === 0) {
    throw new Error('股票代號不能為空');
  }

  if (orderData.quantity <= 0) {
    throw new Error('數量必須大於0');
  }

  if (orderData.price <= 0) {
    throw new Error('價格必須大於0');
  }
};
```

### 3. 錯誤處理
```typescript
// 全域錯誤處理
const handleApiError = (error) => {
  if (error.status === 401) {
    // 未授權,重新導向登入
    router.push('/login');
  } else if (error.status === 429) {
    // 請求過於頻繁
    toast.error('請求過於頻繁,請稍後再試');
  } else {
    toast.error(error.message || '發生未知錯誤');
  }
};
```

---

## 📈 部署與監控

### 1. 建置優化
```bash
# 建置生產版本
npm run build

# 分析包大小
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

### 2. 環境變數
```bash
# 生產環境變數
NEXT_PUBLIC_API_URL=https://api.sinotrade.com
NEXT_PUBLIC_WS_URL=wss://api.sinotrade.com
NODE_ENV=production
```

### 3. 監控設置
```typescript
// 效能監控
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

---

## 🎯 總結

這個現代化的技術棧專為 2025 年金融交易網站設計,具備以下優勢:

### ✨ 技術優勢
✅ **最新技術**: Next.js 15 + TypeScript 5.6 + Socket.io 4.8
✅ **現代 UI**: Gluestack UI v3 + NativeWind + Tailwind CSS
✅ **高效能**: TanStack Virtual v3 處理數萬筆數據
✅ **即時性**: Socket.io 企業級即時通訊
✅ **專業性**: 完整的技術分析圖表系統

### 🚀 開發體驗
✅ **類型安全**: 完整的 TypeScript 支援
✅ **開發效率**: Turbo 模式 + Hot Reload
✅ **可維護**: 清晰的架構和組件分離
✅ **可擴展**: 模組化設計,易於擴展功能

### 🎨 用戶體驗
✅ **響應式**: 支援所有裝置尺寸
✅ **流暢動畫**: 原生級動畫效果
✅ **無障礙**: 符合 WCAG 標準
✅ **效能優化**: 懶加載 + 虛擬化 + 智能快取

### 📊 金融特化
✅ **即時報價**: 毫秒級數據更新
✅ **深度交易**: 五檔報價 + 逼價分析
✅ **技術分析**: 20+ 種技術指標
✅ **風控管理**: 實時監控 + 自動停損

透過這個前端技術棧,您可以建構出專業級的金融交易平台前端界面！

### 🔗 更多資源
- [Next.js 15 文檔](https://nextjs.org/docs)
- [Gluestack UI v3 文檔](https://ui.gluestack.io/)
- [Socket.io 文檔](https://socket.io/docs/)
- [TanStack Query v5 文檔](https://tanstack.com/query/latest)
- [Lightweight Charts 文檔](https://tradingview.github.io/lightweight-charts/)
