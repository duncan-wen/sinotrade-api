# 快速參考指南

本文檔提供 SinoTrade 交易平台前端開發的快速參考，包括常用程式碼片段、樣式類別和最佳實踐。

## 📋 目錄

- [響應式類別](#響應式類別)
- [常用元件](#常用元件)
- [程式碼片段](#程式碼片段)
- [樣式系統](#樣式系統)
- [開發指令](#開發指令)

## 📱 響應式類別

### 斷點系統

| 斷點 | 最小寬度 | 設備類型 |
|-----|---------|---------|
| `(default)` | 0px | 手機 |
| `sm:` | 640px | 小平板 |
| `md:` | 768px | 平板 |
| `lg:` | 1024px | 小桌面 |
| `xl:` | 1280px | 桌面 |
| `2xl:` | 1536px | 大桌面 |

### 常用響應式組合

```css
/* 文字大小 */
text-xs lg:text-sm      /* 小文字 */
text-sm lg:text-base    /* 一般文字 */
text-base lg:text-lg    /* 標題文字 */
text-lg lg:text-2xl     /* 大標題 */

/* 間距 */
p-2 lg:p-4              /* 內邊距 */
gap-2 lg:gap-3          /* 網格間距 */
space-y-2 lg:space-y-4  /* 垂直間距 */

/* 顯示控制 */
hidden sm:block         /* 小螢幕以上顯示 */
sm:hidden               /* 小螢幕隱藏 */
block lg:flex           /* 桌面版使用 flex */

/* 網格佈局 */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4  /* 響應式網格 */
```

## 🧩 常用元件

### 按鈕

```tsx
// 主要按鈕
<Button variant="solid" action="primary">
  <ButtonText>主要操作</ButtonText>
</Button>

// 次要按鈕
<Button variant="outline" action="secondary">
  <ButtonText>次要操作</ButtonText>
</Button>

// 響應式按鈕
<Button className="hidden sm:flex">
  <ButtonText className="text-xs lg:text-sm">桌面版</ButtonText>
</Button>
<Button className="sm:hidden">
  <ButtonText>📱</ButtonText>
</Button>
```

### 卡片

```tsx
// 市場數據卡片
<View className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200">
  <Text className="text-xs lg:text-sm text-gray-500 mb-1">台股指數</Text>
  <Text className="text-lg lg:text-2xl font-bold text-gray-900 mb-2">17,234</Text>
  <Text className="text-xs lg:text-sm text-green-600">+123 (+0.72%)</Text>
</View>

// 基本卡片
<View className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
  <Text>內容</Text>
</View>
```

### 網格佈局

```tsx
// 市場總覽網格
<View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
  {items.map(item => <Card key={item.id} {...item} />)}
</View>

// 圖表網格
<View className="grid grid-cols-1 xl:grid-cols-2 gap-2">
  <TradingChart data={data1} symbol="TSMC" height={300} />
  <TradingChart data={data2} symbol="AAPL" height={300} />
</View>
```

## 💻 程式碼片段

### 響應式 Hook

```tsx
// useResponsive.ts
import { useState, useEffect } from 'react'

export function useResponsive() {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

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
    screenSize
  }
}

// 使用方式
const { isMobile, isDesktop } = useResponsive()
```

### 圖表響應式

```tsx
// 響應式圖表元件
function ResponsiveChart({ data, symbol }) {
  const { isMobile } = useResponsive()

  const chartHeight = isMobile ? 250 : 400

  return (
    <View className="bg-white rounded-lg shadow-sm border border-gray-200">
      <TradingChart
        data={data}
        symbol={symbol}
        height={chartHeight}
      />
    </View>
  )
}
```

### 側邊欄控制

```tsx
// useSidebar.ts
import { useState, useCallback } from 'react'

export function useSidebar() {
  const [isOpen, setIsOpen] = useState(true)

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return { isOpen, toggle, open, close }
}
```

### 錯誤邊界

```tsx
// ErrorBoundary.tsx
import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="p-4 text-center">
          <Text className="text-red-600">發生錯誤，請重新整理頁面</Text>
        </View>
      )
    }

    return this.props.children
  }
}
```

## 🎨 樣式系統

### 色彩系統

```css
/* 文字顏色 */
text-gray-900     /* 主要文字 */
text-gray-600     /* 次要文字 */
text-gray-500     /* 標籤文字 */
text-red-600      /* 跌幅/錯誤 */
text-green-600    /* 漲幅/成功 */
text-blue-600     /* 連結/資訊 */

/* 背景顏色 */
bg-white          /* 卡片背景 */
bg-gray-50        /* 次要背景 */
bg-gray-100       /* 頁面背景 */
bg-red-50         /* 錯誤背景 */
bg-green-50       /* 成功背景 */
bg-blue-50        /* 資訊背景 */

/* 邊框顏色 */
border-gray-200   /* 標準邊框 */
border-red-200    /* 錯誤邊框 */
border-green-200  /* 成功邊框 */
border-blue-200   /* 資訊邊框 */
```

### 陰影與邊框

```css
/* 陰影 */
shadow-sm         /* 卡片陰影 */
shadow-md         /* 浮動元素 */
shadow-lg         /* 模態框 */

/* 邊框 */
border            /* 標準邊框 */
border-2          /* 較粗邊框 */
border-dashed     /* 虛線邊框 */

/* 圓角 */
rounded           /* 小圓角 */
rounded-lg        /* 標準圓角 */
rounded-xl        /* 大圓角 */
rounded-full      /* 完全圓角 */
```

### 間距系統

```css
/* 內邊距 */
p-1    /* 4px */
p-2    /* 8px */
p-3    /* 12px */
p-4    /* 16px */
p-6    /* 24px */

/* 外邊距 */
m-1    /* 4px */
m-2    /* 8px */
m-3    /* 12px */
m-4    /* 16px */
m-6    /* 24px */

/* 間距 */
space-y-2   /* 垂直間距 8px */
space-y-4   /* 垂直間距 16px */
space-x-2   /* 水平間距 8px */
space-x-4   /* 水平間距 16px */

/* 網格間距 */
gap-2   /* 8px */
gap-3   /* 12px */
gap-4   /* 16px */
```

## ⚡ 開發指令

### 常用指令

```bash
# 開發
pnpm dev                    # 啟動開發伺服器
pnpm build                  # 建構生產版本
pnpm start                  # 啟動生產伺服器

# 程式碼品質
pnpm lint                   # ESLint 檢查
pnpm lint:fix              # 自動修復 ESLint 錯誤
pnpm format                # Prettier 格式化
pnpm type-check            # TypeScript 檢查

# 測試
pnpm test                  # 執行單元測試
pnpm test:watch           # 監視模式測試
pnpm test:e2e             # E2E 測試

# 依賴管理
pnpm add <package>         # 新增依賴
pnpm add -D <package>      # 新增開發依賴
pnpm remove <package>      # 移除依賴
pnpm update               # 更新依賴
```

### Git 工作流程

```bash
# 功能開發
git checkout -b feature/trading-chart
git add .
git commit -m "feat: add responsive trading chart"
git push origin feature/trading-chart

# 修復錯誤
git checkout -b fix/chart-rendering
git add .
git commit -m "fix: resolve chart rendering issue on mobile"
git push origin fix/chart-rendering

# 提交訊息格式
feat: 新功能
fix: 錯誤修復
docs: 文檔更新
style: 樣式調整
refactor: 重構
test: 測試
chore: 工具/配置
```

## 🔍 除錯技巧

### 瀏覽器開發者工具

```javascript
// 在元件中加入除錯
console.log('Component props:', props)
console.log('State:', state)

// 檢查響應式斷點
console.log('Screen width:', window.innerWidth)
console.log('Is mobile:', window.innerWidth < 768)
```

### React DevTools

```bash
# 安裝 React DevTools 瀏覽器擴充
# Chrome: React Developer Tools
# Firefox: React Developer Tools

# 使用方式：
# 1. 開啟開發者工具
# 2. 切換到 React 或 Profiler 標籤
# 3. 檢查元件樹狀結構和 props
```

### 效能除錯

```tsx
// 使用 React.memo 避免不必要的重渲染
export const TradingChart = React.memo(function TradingChart(props) {
  // ...
})

// 使用 useMemo 和 useCallback 優化
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])

const handleClick = useCallback(() => {
  // handle click
}, [dependencies])
```

## 📚 有用的 VS Code 快捷鍵

```bash
# 常用快捷鍵
Ctrl+Shift+P          # 命令面板
Ctrl+P                # 快速開啟檔案
Ctrl+Shift+F          # 全域搜尋
Ctrl+D                # 選擇下一個相同文字
Alt+Click             # 多游標編輯
Ctrl+/                # 切換註解
Ctrl+Shift+L          # 選擇所有相同文字

# React 開發
rfc                   # React Function Component 片段
rafce                 # React Arrow Function Component Export
useState              # useState Hook 片段
useEffect             # useEffect Hook 片段
```

---

*最後更新：2024年9月*
*快速參考 - 保持書籤以便快速查閱*
