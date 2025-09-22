# 智能交易網站 - 技術重點整理

基於項目規格分析,從技術文檔中提取的實用建議和最佳實踐。

## 📊 **立即可用 - 圖表系統優化**

### Lightweight Charts 配置優化

```typescript
// 針對您的K線圖需求的最佳配置
const chartConfig = {
  layout: {
    background: { color: "#ffffff" },
    textColor: "#333",
    attributionLogo: false, // 隱藏TradingView logo(您已實現)
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    // 自適應控制(您已實現)
    shiftVisibleRangeOnNewBar: autoFitEnabled,
    allowShiftVisibleRangeOnWhitespaceReplacement: autoFitEnabled,
  },
  grid: {
    vertLines: { color: "#e1e3e6" },
    horzLines: { color: "#e1e3e6" },
  },
  crosshair: { mode: "normal" },
};

// 台股專用顏色配置
const taiwanStockColors = {
  upColor: "#ef4444", // 上漲紅色
  downColor: "#22c55e", // 下跌綠色
  borderUpColor: "#ef4444",
  borderDownColor: "#22c55e",
  wickUpColor: "#ef4444",
  wickDownColor: "#22c55e",
};
```

### 技術指標實作建議

```typescript
// 基於research.md中確定的指標:MA、KD、MACD、BBands
import {
  SMA,
  StochasticOscillator,
  MACD,
  BollingerBands,
} from "technicalindicators";

const TechnicalIndicators = {
  // 移動平均線
  calculateMA: (data: number[], period = 20) =>
    SMA.calculate({ values: data, period }),

  // KD指標
  calculateKD: (high: number[], low: number[], close: number[]) =>
    StochasticOscillator.calculate({
      high,
      low,
      close,
      period: 14,
      signalPeriod: 3,
    }),

  // MACD
  calculateMACD: (data: number[]) =>
    MACD.calculate({
      values: data,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    }),

  // 布林通道
  calculateBBands: (data: number[], period = 20, stdDev = 2) =>
    BollingerBands.calculate({ values: data, period, stdDev }),
};
```

## 🔄 **Socket.io 即時數據優化**

### 智能訂閱管理(針對您的 WebSocket 需求)

```typescript
class OptimizedKlineSocket {
  private subscriptions = new Map<string, Function>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  subscribe(symbol: string, callback: Function) {
    // 智能切換:自動取消舊訂閱,避免數據混亂
    this.cleanup();
    this.subscriptions.set(symbol, callback);

    if (this.socket?.connected) {
      this.socket.emit("subscribe_kline", { symbol, interval: "5m" });
    }
  }

  private cleanup() {
    // 取消所有現有訂閱
    this.subscriptions.forEach((_, symbol) => {
      if (this.socket?.connected) {
        this.socket.emit("unsubscribe_kline", { symbol });
      }
    });
    this.subscriptions.clear();
  }

  // 指數退避重連(滿足您的500ms即時性要求)
  private reconnectWithBackoff() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 5000);
      setTimeout(() => this.connect(), delay);
      this.reconnectAttempts++;
    }
  }
}
```

## 📋 **TanStack 技術選擇建議**

### 基於您的依賴包分析

```json
// 建議保留(有實際用途)
{
  "@tanstack/react-query": "^5.56.0",         // ✅ API數據管理
  "@tanstack/react-query-devtools": "^5.56.0" // ✅ 開發調試
}

// 建議移除(圖表系統用不到)
{
  "@tanstack/react-table": "^8.20.0",   // ❌ 您的K線圖用不到複雜表格
  "@tanstack/react-virtual": "^3.10.0"  // ❌ 圖表組件無需虛擬化
}
```

### 何時需要重新考慮

```typescript
// 如果您未來要實現這些功能,才需要TanStack Table/Virtual:

// 🔮 未來可能用到 TanStack Table 的場景
interface TradingTableScenarios {
  positionsManagement: "持倉管理表格(排序、篩選、分頁)";
  orderHistory: "訂單歷史(複雜查詢、狀態篩選)";
  strategyResults: "策略回測結果表格(多維度分析)";
  portfolioAnalysis: "投資組合分析報表";
}

// 🔮 未來可能用到 TanStack Virtual 的場景
interface VirtualizationScenarios {
  massiveOrderBook: "超大五檔報價列表(>1000檔)";
  longTradeHistory: "海量交易歷史(>10000筆)";
  realTimeTickData: "即時成交明細大量數據";
}
```

## ⚡ **性能優化(滿足您的 200ms API、3s LCP 目標)**

### API 請求優化

```typescript
// TanStack Query 配置,針對金融數據特性
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000, // K線數據5秒內視為新鮮
      gcTime: 300000, // 5分鐘後清除快取
      retry: 2, // 快速失敗,滿足200ms目標
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

// 智能快取策略
const useKlineData = (symbol: string, interval: string) => {
  return useQuery({
    queryKey: ["klines", symbol, interval],
    queryFn: () => fetchKlineData(symbol, interval),
    staleTime: interval === "1m" ? 1000 : 5000, // 1分鐘線更頻繁更新
    select: (data) => ({
      // 只選擇需要的字段,減少記憶體
      klines: data.klines.slice(-200), // 只保留最近200根K線
      symbol: data.symbol,
      interval: data.interval,
    }),
  });
};
```

### 圖表渲染優化

```typescript
// 針對您的即時更新需求
const ChartComponent = ({ symbol, interval }) => {
  // 防抖更新,避免過度渲染
  const debouncedUpdate = useMemo(
    () =>
      debounce((newData) => {
        if (chartRef.current) {
          chartRef.current.setData(newData);
        }
      }, 100), // 100ms防抖,滿足500ms即時性
    []
  );

  // 使用 React.memo 避免不必要重渲染
  return React.memo(() => (
    <div ref={chartContainerRef} style={{ height: "400px" }} />
  ));
};
```

## 🎯 **狀態管理建議(基於您的 Zustand 選擇)**

### UI 狀態管理

```typescript
// 針對您的交易界面需求
interface TradingUIState {
  // 圖表狀態
  selectedSymbol: string;
  chartTimeframe: "1m" | "5m" | "15m" | "1h" | "1d" | "1w";
  selectedIndicators: ("MA" | "KD" | "MACD" | "BBands")[];
  autoFitEnabled: boolean;

  // 交易狀態
  virtualAccountMode: boolean;
  selectedOrderType: "market" | "limit";

  // UI狀態
  sidebarCollapsed: boolean;
  activeTab: "chart" | "orderbook" | "portfolio" | "strategy";

  // 動作
  setSelectedSymbol: (symbol: string) => void;
  setChartTimeframe: (timeframe: string) => void;
  toggleIndicator: (indicator: string) => void;
  toggleAutoFit: () => void;
}

const useTradingStore = create<TradingUIState>()(
  persist(
    (set, get) => ({
      // 初始狀態
      selectedSymbol: "2330",
      chartTimeframe: "5m",
      selectedIndicators: ["MA"],
      autoFitEnabled: true,
      virtualAccountMode: true,
      // ... 其他狀態和動作
    }),
    {
      name: "trading-ui-settings",
      partialize: (state) => ({
        // 只持久化用戶偏好
        chartTimeframe: state.chartTimeframe,
        selectedIndicators: state.selectedIndicators,
        autoFitEnabled: state.autoFitEnabled,
      }),
    }
  )
);
```

## 🛡️ **錯誤處理(金融應用特殊需求)**

### 交易系統錯誤處理

```typescript
// 針對您的虛擬交易和策略分析需求
const TradingErrorHandler = {
  // 數據連接錯誤
  handleDataError: (error: ApiError) => {
    if (error.code === "MARKET_CLOSED") {
      return "市場已休市,顯示最後收盤價";
    }
    if (error.code === "SYMBOL_NOT_FOUND") {
      return "找不到該股票代號";
    }
    if (error.code === "RATE_LIMIT") {
      return "請求過於頻繁,請稍後再試";
    }
  },

  // 交易錯誤
  handleTradingError: (error: TradingError) => {
    if (error.code === "INSUFFICIENT_BALANCE") {
      return "虛擬帳戶餘額不足";
    }
    if (error.code === "INVALID_QUANTITY") {
      return "交易數量不符合規定";
    }
  },

  // 策略分析錯誤
  handleStrategyError: (error: StrategyError) => {
    if (error.code === "INSUFFICIENT_DATA") {
      return "歷史數據不足,無法進行回測";
    }
  },
};
```

## 📊 **測試策略(符合您的 Jest + Playwright 選擇)**

### 關鍵測試場景

```typescript
// 基於您的acceptance scenarios
describe("K線圖核心功能", () => {
  // 測試即時數據更新(滿足500ms要求)
  test("should update chart within 500ms when receiving new data", async () => {
    const startTime = Date.now();
    // 模擬WebSocket數據推送
    await waitFor(() => {
      expect(chartComponent).toHaveBeenUpdated();
      expect(Date.now() - startTime).toBeLessThan(500);
    });
  });

  // 測試技術指標切換
  test("should add/remove technical indicators correctly", async () => {
    await user.click(screen.getByText("MA"));
    expect(chartRef.current.series).toContainIndicator("MA");

    await user.click(screen.getByText("MACD"));
    expect(chartRef.current.series).toContainIndicator("MACD");
  });

  // 測試虛擬交易
  test("should execute virtual trades correctly", async () => {
    await user.type(screen.getByLabelText("數量"), "1000");
    await user.click(screen.getByText("買進"));

    expect(virtualAccount.balance).toHaveChanged();
    expect(virtualAccount.positions).toContain("2330");
  });
});
```

## 🎯 **總結建議**

### 立即行動項

1. **移除不必要的包**:`@tanstack/react-table`、`@tanstack/react-virtual`
2. **優化 Socket.io**:實現智能訂閱切換
3. **增強技術指標**:實作 MA、KD、MACD、BBands
4. **改善錯誤處理**:金融數據特有的錯誤場景

### 未來考慮項

- 如需複雜報表功能 → 重新引入 TanStack Table
- 如需大量數據展示 → 重新引入 TanStack Virtual
- 策略回測結果需要複雜表格時 → 評估表格組件需求

### 性能監控重點

- API 響應時間 < 200ms
- 即時數據延遲 < 500ms
- 圖表載入時間 < 3s
- 支援 1000 併發用戶

這份整理專注於您當前項目的實際需求,避免了過度設計,符合您的技術棧選擇。
