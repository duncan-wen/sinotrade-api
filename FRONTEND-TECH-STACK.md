# 🚀 Sinotrade API - 前端技術棧指南

針對金融交易網站的 React 技術選型和架構設計

## 📋 目錄

- [技術棧概覽](#技術棧概覽)
- [圖表庫選型](#圖表庫選型)
- [即時數據處理](#即時數據處理)
- [大量數據處理](#大量數據處理)
- [API 請求管理](#api-請求管理)
- [UI 框架與組件](#ui-框架與組件)
- [專案架構](#專案架構)
- [安裝與設置](#安裝與設置)
- [實作範例](#實作範例)

---

## 🎯 技術棧概覽

### 核心技術選型

| 類別 | 技術選擇 | 版本 | 用途 |
|------|----------|------|------|
| **框架** | Next.js | ^14.0.0 | React 全端框架 |
| **語言** | TypeScript | ^5.0.0 | 類型安全 |
| **UI 庫** | Chakra UI v3 | ^3.0.0 | 組件庫 (符合專案規範) |
| **圖表** | Lightweight Charts | ^4.1.0 | 金融圖表 |
| **狀態管理** | Zustand | ^4.4.0 | 輕量狀態管理 |
| **API 管理** | TanStack Query | ^5.0.0 | 伺服器狀態管理 |
| **虛擬化** | TanStack Virtual | ^3.0.0 | 大量數據渲染 |
| **即時通訊** | WebSocket | 原生 | 即時數據推送 |

### 效能優化技術

- **虛擬化渲染** - 處理數千筆五檔報價
- **智慧快取** - 減少 API 重複請求
- **即時數據** - WebSocket 推送
- **懶加載** - 圖表和組件按需載入

---

## 📊 圖表庫選型

### 1️⃣ TradingView Charting Library (推薦 ⭐⭐⭐⭐⭐)

**適用場景**: 預算充足，需要專業級圖表

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
- ✅ 業界標準，功能最完整
- ✅ 內建所有技術指標 (100+ 種)
- ✅ 完整畫線工具
- ✅ 多時間框架
- ✅ 即時數據饋送
- ✅ 繁體中文支援

**缺點:**
- ❌ 商業授權，需要付費
- ❌ 檔案較大 (~2MB)

### 2️⃣ Lightweight Charts (開源選擇 ⭐⭐⭐⭐)

**適用場景**: 開源優先，基本圖表需求

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
- ✅ 輕量化，效能優秀
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

## ⚡ 即時數據處理

### WebSocket 服務

```javascript
// services/websocket.js
class WebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
  }

  connect() {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    this.ws = new WebSocket(`${wsUrl}/ws/quotes`);

    this.ws.onopen = () => {
      console.log('✅ WebSocket 連接成功');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('❌ WebSocket 訊息解析錯誤:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket 連接關閉');
      this.stopHeartbeat();
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket 錯誤:', error);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
  }

  subscribe(symbol, callbacks) {
    this.subscribers.set(symbol, callbacks);
    this.send({
      type: 'subscribe',
      symbol: symbol,
      channels: ['quote', 'orderbook', 'trades']
    });
  }

  unsubscribe(symbol) {
    this.subscribers.delete(symbol);
    this.send({
      type: 'unsubscribe',
      symbol: symbol
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  handleMessage(data) {
    const { type, symbol, payload } = data;
    const callbacks = this.subscribers.get(symbol);

    if (callbacks) {
      switch (type) {
        case 'quote':
          callbacks.onQuote?.(payload);
          break;
        case 'orderbook':
          callbacks.onOrderBook?.(payload);
          break;
        case 'trade':
          callbacks.onTrade?.(payload);
          break;
        case 'kline':
          callbacks.onKline?.(payload);
          break;
      }
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 WebSocket 重連嘗試 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      console.error('❌ WebSocket 重連失敗，已達最大嘗試次數');
    }
  }
}

export const wsService = new WebSocketService();
```

### Zustand 狀態管理

```javascript
// store/useMarketData.js
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { wsService } from '../services/websocket';

const useMarketDataStore = create(
  subscribeWithSelector((set, get) => ({
    // 狀態
    quotes: {},           // 即時報價
    orderBooks: {},       // 五檔報價
    trades: {},          // 成交明細
    klines: {},          // K線數據
    connected: false,     // 連接狀態
    subscribedSymbols: new Set(), // 已訂閱的股票

    // 動作
    connect: () => {
      wsService.connect();
      set({ connected: true });
    },

    disconnect: () => {
      wsService.disconnect();
      set({ connected: false, subscribedSymbols: new Set() });
    },

    subscribeSymbol: (symbol) => {
      const { subscribedSymbols } = get();
      if (!subscribedSymbols.has(symbol)) {
        wsService.subscribe(symbol, {
          onQuote: (quote) => get().updateQuote(symbol, quote),
          onOrderBook: (orderBook) => get().updateOrderBook(symbol, orderBook),
          onTrade: (trade) => get().updateTrade(symbol, trade),
          onKline: (kline) => get().updateKline(symbol, kline),
        });

        set({
          subscribedSymbols: new Set([...subscribedSymbols, symbol])
        });
      }
    },

    unsubscribeSymbol: (symbol) => {
      const { subscribedSymbols } = get();
      if (subscribedSymbols.has(symbol)) {
        wsService.unsubscribe(symbol);
        
        const newSet = new Set(subscribedSymbols);
        newSet.delete(symbol);
        set({ subscribedSymbols: newSet });
      }
    },

    updateQuote: (symbol, quote) => set((state) => ({
      quotes: {
        ...state.quotes,
        [symbol]: {
          ...state.quotes[symbol],
          ...quote,
          timestamp: Date.now()
        }
      }
    })),

    updateOrderBook: (symbol, orderBook) => set((state) => ({
      orderBooks: {
        ...state.orderBooks,
        [symbol]: orderBook
      }
    })),

    updateTrade: (symbol, trade) => set((state) => ({
      trades: {
        ...state.trades,
        [symbol]: [
          ...(state.trades[symbol] || []).slice(-99), // 保留最近100筆
          trade
        ]
      }
    })),

    updateKline: (symbol, kline) => set((state) => ({
      klines: {
        ...state.klines,
        [symbol]: {
          ...state.klines[symbol],
          current: kline
        }
      }
    }))
  }))
);

export default useMarketDataStore;
```

---

## 📊 大量數據處理 (React Virtual)

### 五檔報價虛擬化

```javascript
// components/OrderBook.jsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Flex, Text } from '@chakra-ui/react';

const OrderBook = ({ symbol }) => {
  const orderBook = useMarketDataStore(state => state.orderBooks[symbol]);
  const parentRef = useRef();

  // 合併買賣單數據
  const combinedOrders = useMemo(() => {
    if (!orderBook) return [];
    
    const asks = orderBook.asks.map(ask => ({ ...ask, type: 'ask' }));
    const bids = orderBook.bids.map(bid => ({ ...bid, type: 'bid' }));
    
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
    return <Box>載入中...</Box>;
  }

  return (
    <Box>
      <Flex justify="space-between" p={2} fontWeight="bold" bg="gray.100">
        <Text>價格</Text>
        <Text>數量</Text>
        <Text>筆數</Text>
      </Flex>
      
      <Box
        ref={parentRef}
        h="400px"
        overflow="auto"
        border="1px solid"
        borderColor="gray.200"
      >
        <Box h={`${rowVirtualizer.getTotalSize()}px`} position="relative">
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const order = combinedOrders[virtualRow.index];
            const isAsk = order.type === 'ask';
            
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
                bg={isAsk ? 'red.50' : 'green.50'}
                borderBottom="1px solid"
                borderColor="gray.100"
                _hover={{ bg: isAsk ? 'red.100' : 'green.100' }}
              >
                <Text 
                  color={isAsk ? 'red.600' : 'green.600'}
                  fontWeight="medium"
                >
                  {order.price.toFixed(2)}
                </Text>
                <Text>{order.volume.toLocaleString()}</Text>
                <Text fontSize="sm" color="gray.600">
                  {order.count}
                </Text>
              </Flex>
            );
          })}
        </Box>
      </Box>
    </Box>
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

## 🌐 API 請求管理 (TanStack Query)

### Query 設置和提供者

```javascript
// lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,        // 1分鐘數據視為新鮮
      retry: 2,                    // 失敗重試2次
      refetchOnWindowFocus: false, // 視窗聚焦時不重新獲取
    },
    mutations: {
      retry: 1,
    },
  },
});

// app/layout.jsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          <ChakraProvider>
            {children}
          </ChakraProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}
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

## 🎨 UI 框架與組件 (Chakra UI v3)

### 主題配置

```javascript
// theme/index.js
import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  colors: {
    brand: {
      50: '#e3f2fd',
      100: '#bbdefb',
      500: '#2196f3',
      600: '#1976d2',
      900: '#0d47a1',
    },
    trading: {
      buy: '#f44336',    // 紅色 (買進)
      sell: '#4caf50',   // 綠色 (賣出)
      up: '#f44336',     // 上漲
      down: '#4caf50',   // 下跌
    }
  },
  fonts: {
    heading: 'Noto Sans TC, system-ui, sans-serif',
    body: 'Noto Sans TC, system-ui, sans-serif',
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
    Table: {
      variants: {
        trading: {
          th: {
            bg: 'gray.100',
            borderColor: 'gray.200',
            fontSize: 'sm',
            fontWeight: 'bold',
          },
          td: {
            borderColor: 'gray.200',
            fontSize: 'sm',
          },
        },
      },
    },
  },
});

export default theme;
```

### 交易儀表板布局

```javascript
// components/TradingDashboard.jsx
import {
  Grid,
  GridItem,
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';

const TradingDashboard = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('2330');

  return (
    <Grid
      templateRows="60px 1fr"
      templateColumns="1fr 350px"
      gap={4}
      h="100vh"
      p={4}
    >
      {/* 頂部工具列 */}
      <GridItem colSpan={2}>
        <SymbolSelector 
          value={selectedSymbol}
          onChange={setSelectedSymbol}
        />
      </GridItem>

      {/* 主圖表區 */}
      <GridItem>
        <Box h="100%" border="1px solid" borderColor="gray.200" borderRadius="md">
          <Tabs variant="enclosed" h="100%">
            <TabList>
              <Tab>K線圖</Tab>
              <Tab>分時圖</Tab>
              <Tab>技術指標</Tab>
            </TabList>
            <TabPanels h="calc(100% - 40px)">
              <TabPanel p={0} h="100%">
                <LightweightChart symbol={selectedSymbol} />
              </TabPanel>
              <TabPanel p={0} h="100%">
                <TimeChart symbol={selectedSymbol} />
              </TabPanel>
              <TabPanel p={0} h="100%">
                <TechnicalChart symbol={selectedSymbol} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </GridItem>

      {/* 右側面板 */}
      <GridItem>
        <VStack spacing={4} h="100%">
          {/* 即時報價 */}
          <Box w="100%">
            <StockQuote symbol={selectedSymbol} />
          </Box>

          {/* 五檔報價 */}
          <Box w="100%" flex="1">
            <OrderBook symbol={selectedSymbol} />
          </Box>

          {/* 下單面板 */}
          <Box w="100%">
            <OrderForm defaultSymbol={selectedSymbol} />
          </Box>
        </VStack>
      </GridItem>
    </Grid>
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
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_API_KEY=your-api-key-here

# Chakra UI 主題
NEXT_PUBLIC_DEFAULT_THEME=light

# 圖表配置
NEXT_PUBLIC_CHART_PROVIDER=lightweight-charts
NEXT_PUBLIC_TRADINGVIEW_LIBRARY_PATH=/charting_library/

# 功能開關
NEXT_PUBLIC_ENABLE_TRADING=true
NEXT_PUBLIC_ENABLE_TECHNICAL_ANALYSIS=true
NEXT_PUBLIC_ENABLE_ORDERBOOK=true

# 開發工具
NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS=true
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
# UI 框架
npm install @chakra-ui/react @chakra-ui/next-js @emotion/react @emotion/styled framer-motion

# 圖表庫
npm install lightweight-charts technicalindicators

# 狀態管理
npm install zustand

# API 管理
npm install @tanstack/react-query @tanstack/react-query-devtools

# 虛擬化
npm install @tanstack/react-virtual @tanstack/react-table

# 工具庫
npm install date-fns numeral react-icons

# 開發工具
npm install -D @types/numeral
```

### 3. 設置 package.json

```json
{
  "name": "sinotrade-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.0",
    "typescript": "^5.0.0",
    "@chakra-ui/react": "^3.0.0",
    "@chakra-ui/next-js": "^3.0.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "framer-motion": "^10.16.0",
    "lightweight-charts": "^4.1.0",
    "technicalindicators": "^3.1.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-virtual": "^3.0.0",
    "@tanstack/react-table": "^8.10.0",
    "date-fns": "^2.30.0",
    "numeral": "^2.0.6",
    "react-icons": "^4.12.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/numeral": "^2.0.5",
    "@tanstack/react-query-devtools": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0"
  }
}
```

### 4. TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
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
      "@/types/*": ["./src/types/*"]
    }
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
    // 未授權，重新導向登入
    router.push('/login');
  } else if (error.status === 429) {
    // 請求過於頻繁
    toast.error('請求過於頻繁，請稍後再試');
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

這個技術棧專為金融交易網站設計，具備以下特點：

✅ **高效能**: 虛擬化處理大量數據
✅ **即時性**: WebSocket 推送即時報價
✅ **專業性**: 完整的技術分析圖表
✅ **可維護**: 清晰的架構和組件分離
✅ **可擴展**: 模組化設計，易於擴展功能
✅ **類型安全**: 完整的 TypeScript 支援
✅ **用戶體驗**: 響應式設計和流暢動畫

透過這個技術棧，您可以建構出專業級的金融交易平台前端界面！
