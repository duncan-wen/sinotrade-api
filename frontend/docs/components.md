# 元件庫指南

本文檔說明 SinoTrade 交易平台的 UI 元件庫,包括所有可重用元件的使用方法與最佳實踐。

## 📋 目錄

- [元件概述](#元件概述)
- [基礎元件](#基礎元件)
- [圖表元件](#圖表元件)
- [佈局元件](#佈局元件)
- [響應式使用](#響應式使用)
- [樣式系統](#樣式系統)

## 🎯 元件概述

### 設計原則

- **一致性**:所有元件遵循統一的設計語言
- **可重用性**:元件設計為高度可配置和可重用
- **響應式**:所有元件支持多裝置適配
- **可訪問性**:符合 WCAG 2.1 AA 標準
- **效能優化**:使用 React.memo 和適當的優化策略

### 技術棧

- **UI 框架**:React Native Web
- **樣式系統**:TailwindCSS + NativeWind
- **圖表庫**:Lightweight Charts
- **狀態管理**:Zustand
- **類型檢查**:TypeScript

## 🔧 基礎元件

### Button 按鈕元件

#### 基本用法

```tsx
import { Button, ButtonText } from '@/components/ui/button'

// 基本按鈕
<Button>
  <ButtonText>基本按鈕</ButtonText>
</Button>

// 不同變體
<Button variant="solid" action="primary">
  <ButtonText>主要按鈕</ButtonText>
</Button>

<Button variant="outline" action="secondary">
  <ButtonText>次要按鈕</ButtonText>
</Button>

<Button variant="ghost" size="sm">
  <ButtonText>小型按鈕</ButtonText>
</Button>
```

#### 屬性說明

| 屬性       | 類型                                                   | 預設值      | 描述         |
| ---------- | ------------------------------------------------------ | ----------- | ------------ |
| `variant`  | `'solid' \| 'outline' \| 'ghost'`                      | `'solid'`   | 按鈕樣式變體 |
| `action`   | `'primary' \| 'secondary' \| 'positive' \| 'negative'` | `'primary'` | 按鈕動作類型 |
| `size`     | `'sm' \| 'md' \| 'lg'`                                 | `'md'`      | 按鈕尺寸     |
| `disabled` | `boolean`                                              | `false`     | 是否禁用     |
| `onPress`  | `() => void`                                           | -           | 點擊事件處理 |

#### 響應式使用

```tsx
// 響應式大小
<Button size="sm" className="lg:size-md">
  <ButtonText className="text-xs lg:text-sm">響應式按鈕</ButtonText>
</Button>

// 響應式顯示/隱藏
<Button className="hidden sm:flex">
  <ButtonText>桌面版顯示</ButtonText>
</Button>

<Button className="sm:hidden">
  <ButtonText>手機版顯示</ButtonText>
</Button>
```

### Box 容器元件

#### 基本用法

```tsx
import { Box } from '@/components/ui/box'

// 基本容器
<Box className="p-4 bg-white rounded-lg">
  <Text>內容</Text>
</Box>

// 響應式容器
<Box className="p-2 lg:p-4 bg-white rounded-lg shadow-sm">
  <Text className="text-sm lg:text-base">響應式內容</Text>
</Box>
```

#### 常用樣式組合

```tsx
// 卡片樣式
<Box className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
  <Text>卡片內容</Text>
</Box>

// 市場數據卡片
<Box className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200">
  <Text className="text-xs lg:text-sm text-gray-500 mb-1">標題</Text>
  <Text className="text-lg lg:text-2xl font-bold text-gray-900 mb-2">數值</Text>
  <Text className="text-xs lg:text-sm text-green-600">變化</Text>
</Box>
```

## 📊 圖表元件

### TradingChart 交易圖表

#### 基本用法

```tsx
import { TradingChart } from '@/components/chart'
import { generateMockKLineData } from '@/components/chart/mockData'

// 基本圖表
<TradingChart
  data={generateMockKLineData(30)}
  symbol="TSMC 台積電"
  height={400}
  showVolume={true}
/>
```

#### 屬性說明

| 屬性         | 類型          | 預設值 | 描述                    |
| ------------ | ------------- | ------ | ----------------------- |
| `data`       | `KLineData[]` | -      | K線數據陣列             |
| `symbol`     | `string`      | -      | 股票代號/名稱           |
| `height`     | `number`      | `400`  | 圖表高度(像素)          |
| `width`      | `number`      | -      | 圖表寬度,不設定則自適應 |
| `showVolume` | `boolean`     | `true` | 是否顯示成交量          |
| `className`  | `string`      | `''`   | 額外的 CSS 類別         |

#### 數據格式

```typescript
interface KLineData {
  time: string;    // ISO 時間字串
  open: number;    // 開盤價
  high: number;    // 最高價
  low: number;     // 最低價
  close: number;   // 收盤價
  volume?: number; // 成交量(可選)
}
```

#### 響應式圖表

```tsx
import { useState, useEffect } from 'react'

function ResponsiveChart() {
  const [chartHeight, setChartHeight] = useState(400)

  useEffect(() => {
    const updateHeight = () => {
      setChartHeight(window.innerWidth < 768 ? 250 : 400)
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  return (
    <TradingChart
      data={data}
      symbol="AAPL"
      height={chartHeight}
    />
  )
}
```

#### 圖表容器

```tsx
// 完整的圖表區域
<View className="bg-white rounded-lg shadow-sm border border-gray-200">
  <TradingChart
    data={data}
    symbol="台積電 2330"
    height={400}
  />
</View>

// 多圖表佈局
<View className="grid grid-cols-1 xl:grid-cols-2 gap-2">
  <TradingChart data={data1} symbol="2330.TW" height={300} />
  <TradingChart data={data2} symbol="AAPL" height={300} />
</View>
```

## 🏗️ 佈局元件

### MainLayout 主佈局

```tsx
import { MainLayout } from '@/components/layout/MainLayout'

export default function Page() {
  return (
    <MainLayout>
      {/* 頁面內容 */}
      <View className="space-y-4">
        <YourContent />
      </View>
    </MainLayout>
  )
}
```

### Navbar 導航列

```tsx
// 自動包含在 MainLayout 中
// 包含:Logo、導航選單、用戶資訊
```

### Sidebar 側邊欄

```tsx
// 自動包含在 MainLayout 中
// 包含:主選單、監控清單、設定按鈕
// 響應式:桌面固定,手機覆蓋
```

## 📱 響應式使用

### 響應式網格

```tsx
// 市場數據卡片網格
<View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
  {stats.map((stat, index) => (
    <MarketCard key={index} {...stat} />
  ))}
</View>

// 圖表網格
<View className="grid grid-cols-1 xl:grid-cols-2 gap-2">
  <TradingChart data={data1} symbol="TSMC" height={300} />
  <TradingChart data={data2} symbol="AAPL" height={300} />
</View>
```

### 響應式文字

```tsx
// 標題文字
<Text className="text-lg lg:text-2xl font-bold text-gray-900">
  主要標題
</Text>

// 內容文字
<Text className="text-sm lg:text-base text-gray-600">
  內容文字
</Text>

// 小標籤文字
<Text className="text-xs lg:text-sm text-gray-500">
  標籤文字
</Text>
```

### 響應式間距

```tsx
// 容器間距
<View className="p-2 lg:p-4">

// 元素間距
<View className="space-y-2 lg:space-y-4">

// 網格間距
<View className="gap-2 lg:gap-3">
```

## 🎨 樣式系統

### 色彩系統

```css
/* 主要色彩 */
.text-primary-600    /* 主要文字色 */
.bg-primary-50       /* 主要背景色 */
.border-primary-200  /* 主要邊框色 */

/* 語意色彩 */
.text-green-600      /* 漲幅/正面 */
.text-red-600        /* 跌幅/負面 */
.text-gray-500       /* 次要文字 */
.text-gray-900       /* 主要文字 */

/* 背景色彩 */
.bg-white           /* 卡片背景 */
.bg-gray-50         /* 次要背景 */
.bg-gray-100        /* 頁面背景 */
```

### 陰影系統

```css
.shadow-sm          /* 卡片陰影 */
.shadow-md          /* 浮動元素陰影 */
.shadow-lg          /* 模態框陰影 */
```

### 邊框系統

```css
.rounded-lg         /* 圓角 */
.border             /* 標準邊框 */
.border-gray-200    /* 邊框顏色 */
```

## 🎯 最佳實踐

### 1. 元件組合

```tsx
// ✅ 正確:使用組合模式
<Button variant="solid" action="positive">
  <ButtonText>確認</ButtonText>
</Button>

// ❌ 錯誤:避免過度客製化
<CustomGreenButton>確認</CustomGreenButton>
```

### 2. 響應式設計

```tsx
// ✅ 正確:使用響應式類別
<Text className="text-sm lg:text-base">

// ❌ 錯誤:固定尺寸
<Text className="text-base">
```

### 3. 效能優化

```tsx
// ✅ 正確:使用 React.memo
export const TradingChart = React.memo(function TradingChart(props) {
  // ...
})

// ✅ 正確:條件渲染
{showChart && <TradingChart data={data} />}
```

### 4. 可訪問性

```tsx
// ✅ 正確:提供可訪問性屬性
<Button
  accessibilityLabel="買入股票"
  accessibilityRole="button"
  accessibilityState={{ disabled: isLoading }}
>
  <ButtonText>買入</ButtonText>
</Button>
```

### 5. 類型安全

```tsx
// ✅ 正確:定義明確的 interface
interface MarketCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
}

// ✅ 正確:使用泛型
interface ChartProps<T> {
  data: T[];
  renderer: (item: T) => React.ReactNode;
}
```

## 🔍 除錯指南

### 1. 樣式不生效

```bash
# 檢查 TailwindCSS 類別是否正確
# 使用瀏覽器開發者工具檢查 CSS

# 常見問題:
# - 類別名稱拼寫錯誤
# - 響應式斷點不正確
# - CSS 衝突
```

### 2. 響應式問題

```tsx
// 使用 useEffect 偵聽視窗大小變化
useEffect(() => {
  const handleResize = () => {
    console.log('Window size:', window.innerWidth)
  }

  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

### 3. 圖表渲染問題

```tsx
// 確保圖表容器有明確的尺寸
<View className="w-full" style={{ height: 400 }}>
  <TradingChart data={data} />
</View>
```

## 📚 相關文檔

- [響應式設計指南](./responsive-design.md)
- [佈局系統文檔](./layout-system.md)
- [開發環境設置](./development-setup.md)

---

*最後更新:2024年9月*
*責任工程師:Frontend Team*
