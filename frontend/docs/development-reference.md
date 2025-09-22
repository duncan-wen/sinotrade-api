# SinoTrade 前端開發參考

整合自所有前端文檔的精華內容,專門針對智能交易網站開發需求。

## 📱 響應式系統

### 斷點配置

```javascript
// tailwind.config.js
screens: {
  'sm': '640px',   // 小平板
  'md': '768px',   // 平板
  'lg': '1024px',  // 桌面 (側邊欄固定顯示)
  'xl': '1280px',  // 大桌面
  '2xl': '1536px', // 超大桌面
}
```

### 常用響應式類別

```css
/* 文字大小 */
text-xs lg:text-sm      /* 小文字 */
text-sm lg:text-base    /* 一般文字 */
text-lg lg:text-2xl     /* 標題 */

/* 間距 */
p-2 lg:p-4              /* 內邊距 */
gap-2 lg:gap-3          /* 網格間距 */
space-y-2 lg:space-y-4  /* 垂直間距 */

/* 顯示控制 */
hidden sm:block         /* 小螢幕以上顯示 */
sm:hidden               /* 小螢幕隱藏 */

/* 網格佈局 */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4  /* 響應式網格 */
```

## 🧩 核心元件使用

### TradingChart 圖表

```tsx
import { TradingChart } from '@/components/chart'

// 基本使用
<TradingChart
  data={klineData}
  symbol="2330"
  height={400}
  showVolume={true}
  interval="5m"
  enableRealtime={true}
  autoFit={false}
  onIntervalChange={setInterval}
/>

// 響應式圖表高度
const { isMobile } = useResponsive()
<TradingChart height={isMobile ? 250 : 400} />
```

### 按鈕元件

```tsx
import { Button, ButtonText } from '@/components/ui/button'

// 時間間隔按鈕 (您的實現)
<Button
  onClick={() => onIntervalChange?.('5m')}
  className={`px-3 py-1 text-xs rounded transition-all ${
    interval === '5m'
      ? 'bg-blue-500 text-white hover:bg-blue-600'
      : 'bg-gray-100 hover:bg-gray-200'
  }`}
>
  5分
</Button>

// 響應式按鈕
<Button className="hidden sm:flex">
  <ButtonText>桌面版完整文字</ButtonText>
</Button>
<Button className="sm:hidden">
  <ButtonText>📱</ButtonText>
</Button>
```

### 市場數據卡片

```tsx
// 標準市場卡片
<View className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200">
  <Text className="text-xs lg:text-sm text-gray-500 mb-1">台積電</Text>
  <Text className="text-lg lg:text-2xl font-bold text-gray-900 mb-2">566.00</Text>
  <Text className="text-xs lg:text-sm text-green-600">+7.00 (+1.25%)</Text>
</View>

// 網格佈局
<View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
  {marketData.map(item => <MarketCard key={item.symbol} {...item} />)}
</View>
```

## 🏗️ 佈局系統

### MainLayout 使用

```tsx
import { MainLayout } from '@/components/layout/MainLayout'

export default function TradingPage() {
  return (
    <MainLayout>
      <View className="space-y-4">
        {/* 您的圖表和交易界面 */}
        <TradingChart />
        <OrderBookSection />
      </View>
    </MainLayout>
  )
}
```

### 側邊欄控制

```tsx
// 側邊欄狀態管理
const [sidebarOpen, setSidebarOpen] = useState(true)

// 響應式側邊欄
<View className={`
  bg-gray-50 border-r border-gray-200 transition-all duration-300
  ${sidebarOpen
    ? 'w-80 lg:relative lg:translate-x-0 absolute z-50'
    : 'w-20 hidden lg:block'
  }
`}>
```

## 🎨 樣式系統

### 色彩配置 (台股專用)

```css
/* 文字顏色 */
text-gray-900       /* 主要文字 */
text-gray-600       /* 次要文字 */
text-red-600        /* 下跌/錯誤 (台股綠色) */
text-green-600      /* 上漲/成功 (台股紅色) */

/* 背景顏色 */
bg-white           /* 卡片背景 */
bg-gray-50         /* 次要背景 */
bg-gray-100        /* 頁面背景 */

/* 邊框與陰影 */
border-gray-200    /* 標準邊框 */
shadow-sm          /* 卡片陰影 */
rounded-lg         /* 標準圓角 */
```

### 台股圖表顏色

```typescript
const taiwanStockColors = {
  upColor: '#ef4444', // 上漲紅色
  downColor: '#22c55e', // 下跌綠色
  borderUpColor: '#ef4444',
  borderDownColor: '#22c55e',
  wickUpColor: '#ef4444',
  wickDownColor: '#22c55e',
}
```

## 🛠️ 開發環境

### 常用指令

```bash
# 開發
pnpm dev                    # 啟動開發伺服器
pnpm build                  # 建構生產版本

# 程式碼品質
pnpm lint                   # ESLint 檢查
pnpm format                # Prettier 格式化
pnpm type-check            # TypeScript 檢查

# 測試
pnpm test                  # 單元測試
pnpm test:e2e             # E2E 測試

# 依賴管理
pnpm add <package>         # 新增依賴
pnpm remove <package>      # 移除依賴
```

### VS Code 設置

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.experimental.classRegex": [
    ["className\\s*=\\s*[\"']([^\"']*)[\"']", "([^\"']*)"]
  ]
}

// 必要擴充套件
- bradlc.vscode-tailwindcss
- esbenp.prettier-vscode
- ms-playwright.playwright
```

## 💻 實用 Hook

### 響應式 Hook

```tsx
import { useState, useEffect } from 'react'

export function useResponsive() {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>(
    'desktop'
  )

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      if (width < 768) setScreenSize('mobile')
      else if (width < 1024) setScreenSize('tablet')
      else setScreenSize('desktop')
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  return {
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
  }
}

// 使用
const { isMobile, isDesktop } = useResponsive()
```

### 側邊欄控制 Hook

```tsx
export function useSidebar() {
  const [isOpen, setIsOpen] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 1024
  })

  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return { isOpen, toggle, open, close }
}
```

## 🔍 常見問題解決

### 1. 圖表響應式問題

```tsx
// 問題:圖表在小螢幕被截斷
// 解決:動態調整圖表尺寸
const [chartHeight, setChartHeight] = useState(400)

useEffect(() => {
  const updateHeight = () => {
    setChartHeight(window.innerWidth < 768 ? 250 : 400)
  }
  updateHeight()
  window.addEventListener('resize', updateHeight)
  return () => window.removeEventListener('resize', updateHeight)
}, [])
```

### 2. 側邊欄手機版問題

```tsx
// 問題:手機版覆蓋層無法關閉側邊欄
// 解決:正確的覆蓋層實作
{
  sidebarOpen && (
    <Pressable
      className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
      onPress={() => setSidebarOpen(false)}
    />
  )
}
```

### 3. 自適應圖表問題

```tsx
// 問題:useEffect 依賴陣列大小變化
// 解決:分離自適應邏輯
const [isAutoFitEnabled, setIsAutoFitEnabled] = useState(autoFit)

// 圖表初始化
useEffect(() => {
  // 初始化邏輯,不包含 isAutoFitEnabled
}, [height, width, showVolume, symbol, interval])

// 自適應控制
useEffect(() => {
  if (chartRef.current) {
    chartRef.current.applyOptions({
      timeScale: {
        shiftVisibleRangeOnNewBar: isAutoFitEnabled,
        allowShiftVisibleRangeOnWhitespaceReplacement: isAutoFitEnabled,
      },
    })
  }
}, [isAutoFitEnabled])
```

## 🧪 測試要點

### 響應式測試尺寸

```javascript
// 手機測試
{ width: 375, height: 667 }  // iPhone SE
{ width: 390, height: 844 }  // iPhone 12

// 平板測試
{ width: 768, height: 1024 } // iPad
{ width: 820, height: 1180 } // iPad Air

// 桌面測試
{ width: 1280, height: 720 }  // 小桌面
{ width: 1920, height: 1080 } // Full HD
```

### 關鍵測試場景

```typescript
// Playwright 測試範例
test('K線圖響應式', async ({ page }) => {
  await page.goto('/test-multi-timeframe')

  // 手機版測試
  await page.setViewportSize({ width: 375, height: 667 })
  await expect(page.locator('.sidebar')).toBeHidden()

  // 桌面版測試
  await page.setViewportSize({ width: 1920, height: 1080 })
  await expect(page.locator('.sidebar')).toBeVisible()

  // 時間間隔按鈕測試
  await page.click('button:has-text("5分")')
  await expect(page.locator('text=5m K線圖')).toBeVisible()
})
```

## 📊 效能優化

### React 優化

```tsx
// 使用 React.memo 避免不必要重渲染
export const TradingChart = React.memo(function TradingChart(props) {
  // 圖表邏輯
})

// 使用 useMemo 和 useCallback
const expensiveValue = useMemo(() => {
  return computeKlineIndicators(data)
}, [data])

const handleIntervalChange = useCallback(
  (interval: string) => {
    onIntervalChange?.(interval)
  },
  [onIntervalChange]
)
```

### 圖表效能

```tsx
// 防抖更新避免過度渲染
const debouncedUpdate = useMemo(
  () =>
    debounce((newData) => {
      if (chartRef.current) {
        chartRef.current.setData(newData)
      }
    }, 100), // 100ms 防抖
  []
)
```

## 🎯 專案特定最佳實踐

### 時間間隔按鈕 (基於您的實現)

```tsx
// 標準時間間隔按鈕組
const intervals = ['1m', '5m', '15m', '60m', '1d', '1w', '1M']

<div className="flex space-x-2">
  {intervals.map(int => (
    <button
      key={int}
      onClick={() => onIntervalChange?.(int)}
      className={`px-3 py-1 text-xs rounded hover:bg-gray-200 transition-all ${
        interval === int
          ? 'bg-blue-500 text-white hover:bg-blue-600'
          : 'bg-gray-100'
      }`}
    >
      {getIntervalLabel(int)}
    </button>
  ))}
</div>
```

### WebSocket 狀態指示

```tsx
// 連線狀態顯示
<div className="flex items-center space-x-2">
  <div
    className={`w-2 h-2 rounded-full ${
      isConnected ? 'bg-green-500' : 'bg-red-500'
    }`}
  />
  <Text className="text-xs text-gray-500">
    {isConnected ? '即時更新中' : '連線中斷'}
  </Text>
</div>
```

---

_此文檔整合了所有前端開發文檔的精華內容,專門針對 SinoTrade 智能交易網站的開發需求。_
_移除原始文檔前,請確保此參考文檔涵蓋了您需要的所有重要內容。_
