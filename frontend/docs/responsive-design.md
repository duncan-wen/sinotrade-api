# 響應式設計指南 (RWD)

本文檔詳細說明 SinoTrade 交易平台的響應式設計實作方法與最佳實踐。

## 📋 目錄

- [設計原則](#設計原則)
- [斷點系統](#斷點系統)
- [佈局策略](#佈局策略)
- [元件響應式實作](#元件響應式實作)
- [測試方法](#測試方法)
- [常見問題](#常見問題)

## 🎯 設計原則

### Mobile First 優先原則
我們採用 Mobile First 設計方法，從最小螢幕開始設計，然後擴展到更大的螢幕。

```css
/* 基礎樣式（手機版） */
.card { padding: 0.75rem; }

/* 平板版擴展 */
@media (min-width: 768px) {
  .card { padding: 1rem; }
}

/* 桌面版擴展 */
@media (min-width: 1024px) {
  .card { padding: 1.5rem; }
}
```

### 漸進式增強
每個裝置都能獲得核心功能，在更大螢幕上提供更豐富的體驗。

### 觸控友好
所有互動元素都針對觸控操作進行優化。

## 📱 斷點系統

### TailwindCSS 斷點定義

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // 小平板
      'md': '768px',   // 平板
      'lg': '1024px',  // 小桌面
      'xl': '1280px',  // 桌面
      '2xl': '1536px', // 大桌面
    }
  }
}
```

### 裝置類型對應

| 裝置類型 | 螢幕範圍 | 主要特徵 | 使用情境 |
|---------|---------|---------|---------|
| 📱 手機 | 320px - 639px | 單手操作、垂直滾動 | 移動中快速查看 |
| 📱 小平板 | 640px - 767px | 雙手操作、混合模式 | 休閒瀏覽 |
| 💻 平板 | 768px - 1023px | 觸控+鍵盤、橫向使用 | 分析與交易 |
| 🖥️ 小桌面 | 1024px - 1279px | 鼠標操作、多視窗 | 專業交易 |
| 🖥️ 桌面 | 1280px - 1535px | 大螢幕、多任務 | 深度分析 |
| 🖥️ 大桌面 | 1536px+ | 超寬螢幕 | 專業交易室 |

## 🎨 佈局策略

### 1. 網格系統

```tsx
// 響應式網格範例
<View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
  {/* 手機：1列，平板：2列，桌面：4列 */}
</View>
```

### 2. 側邊欄策略

#### 手機版 - 覆蓋模式
```tsx
// Sidebar.tsx
<View className={`
  ${isOpen
    ? 'w-80 lg:relative lg:translate-x-0 absolute z-50 lg:z-auto'
    : 'w-20 hidden lg:block'
  }
`}>
```

#### 桌面版 - 固定顯示
```tsx
// MainLayout.tsx
{/* 手機版覆蓋層 */}
{sidebarOpen && (
  <View className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" />
)}
```

### 3. 圖表自適應

```tsx
// 動態圖表高度
const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
  const checkIsMobile = () => {
    setIsMobile(window.innerWidth < 768)
  }

  checkIsMobile()
  window.addEventListener('resize', checkIsMobile)

  return () => window.removeEventListener('resize', checkIsMobile)
}, [])

// 使用響應式高度
<TradingChart height={isMobile ? 250 : 400} />
```

## 🧩 元件響應式實作

### 1. 卡片元件

```tsx
// 響應式市場數據卡片
<View className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200">
  <Text className="text-xs lg:text-sm text-gray-500 mb-1">{title}</Text>
  <Text className="text-lg lg:text-2xl font-bold text-gray-900 mb-2">{value}</Text>
  <Text className="text-xs lg:text-sm text-green-600">{change}</Text>
</View>
```

### 2. 導航列

```tsx
// 響應式導航按鈕
<View className="flex-row items-center space-x-1 lg:space-x-2">
  {/* 桌面版完整按鈕 */}
  <Button className="hidden sm:flex">
    <ButtonText className="text-xs lg:text-sm">🟢 買入</ButtonText>
  </Button>

  {/* 手機版簡化按鈕 */}
  <Button className="sm:hidden">
    <ButtonText>🟢</ButtonText>
  </Button>
</View>
```

### 3. 文字響應式

```tsx
// 響應式文字大小系統
const textSizes = {
  'text-xs lg:text-sm',     // 小文字
  'text-sm lg:text-base',   // 一般文字
  'text-base lg:text-lg',   // 標題文字
  'text-lg lg:text-2xl',    // 大標題
  'text-xl lg:text-3xl',    // 超大標題
}
```

## 🧪 測試方法

### 1. 瀏覽器開發者工具

```bash
# Chrome DevTools 快捷鍵
Ctrl+Shift+M  # 切換裝置模擬器
Ctrl+Shift+C  # 檢查元素
```

### 2. 常用測試解析度

```javascript
// 手機測試解析度
const mobileViewports = [
  { width: 375, height: 667 },  // iPhone SE
  { width: 390, height: 844 },  // iPhone 12
  { width: 360, height: 640 },  // Galaxy S5
]

// 平板測試解析度
const tabletViewports = [
  { width: 768, height: 1024 }, // iPad
  { width: 820, height: 1180 }, // iPad Air
]

// 桌面測試解析度
const desktopViewports = [
  { width: 1280, height: 720 }, // 小桌面
  { width: 1920, height: 1080 }, // Full HD
  { width: 2560, height: 1440 }, // 2K
]
```

### 3. Playwright 自動化測試

```typescript
// tests/responsive.spec.ts
import { test, expect } from '@playwright/test'

test('響應式佈局測試', async ({ page }) => {
  await page.goto('/')

  // 測試手機版
  await page.setViewportSize({ width: 375, height: 667 })
  await expect(page.locator('.sidebar')).toBeHidden()

  // 測試桌面版
  await page.setViewportSize({ width: 1920, height: 1080 })
  await expect(page.locator('.sidebar')).toBeVisible()
})
```

## 🎨 實用 CSS 類別

### 顯示/隱藏控制

```css
/* 響應式顯示控制 */
.hidden             /* 完全隱藏 */
.sm:block          /* 小螢幕以上顯示 */
.lg:hidden         /* 大螢幕隱藏 */
.xl:flex           /* 超大螢幕使用 flex */
```

### 間距控制

```css
/* 響應式間距 */
.p-2.lg:p-4        /* 手機 8px，桌面 16px */
.gap-2.lg:gap-4    /* 響應式網格間距 */
.space-x-1.lg:space-x-3  /* 響應式水平間距 */
```

### 文字控制

```css
/* 響應式文字 */
.text-sm.lg:text-base    /* 手機小字，桌面正常 */
.font-medium.lg:font-bold /* 響應式字重 */
.leading-tight.lg:leading-normal /* 響應式行高 */
```

## ⚠️ 常見問題

### 1. 側邊欄在手機版無法關閉

**問題**：點擊覆蓋層無法關閉側邊欄

**解決方案**：
```tsx
// 正確的覆蓋層實作
{sidebarOpen && (
  <Pressable
    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
    onPress={() => setSidebarOpen(false)}
  />
)}
```

### 2. 圖表在小螢幕上被截斷

**問題**：TradingChart 在手機版顯示不完整

**解決方案**：
```tsx
// 使用響應式圖表大小
<TradingChart
  width={isMobile ? '100%' : undefined}
  height={isMobile ? 250 : 400}
/>
```

### 3. 文字在小螢幕上過小

**問題**：使用固定文字大小導致可讀性問題

**解決方案**：
```tsx
// 使用響應式文字類別
<Text className="text-xs sm:text-sm lg:text-base">
  {content}
</Text>
```

### 4. 按鈕在觸控裝置上難以點擊

**問題**：按鈕目標區域過小

**解決方案**：
```tsx
// 確保最小觸控目標 44px
<Button className="min-h-[44px] min-w-[44px] p-3">
  <ButtonText>操作</ButtonText>
</Button>
```

## 📚 延伸閱讀

- [TailwindCSS 響應式設計](https://tailwindcss.com/docs/responsive-design)
- [React Native Web 響應式](https://necolas.github.io/react-native-web/docs/styling/#responsive-design)
- [Web Content Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Mobile First Design Principles](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)

---

*最後更新：2024年9月*
*責任工程師：Frontend Team*
