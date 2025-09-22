/**
 * KLineChart 圖表主題配置
 * 包含色彩主題、樣式配置等
 */

// 🎨 台股色彩主題
export const taiwanStockColors = {
  // 台股習慣:紅漲綠跌
  up: '#FF6B6B', // 上漲紅色
  down: '#00C851', // 下跌綠色
  flat: '#888888', // 平盤灰色

  // 技術指標顏色
  ma8: '#FF6B6B', // MA8 紅色
  ma21: '#4169E1', // MA21 藍色
  ma55: '#00C851', // MA55 綠色

  // KDJ 指標顏色
  kLine: '#FF6B6B', // K線 紅色
  dLine: '#4169E1', // D線 藍色
  jLine: '#9B59B6', // J線 紫色

  // MACD 指標顏色
  macdLine: '#FF6B6B', // MACD線 紅色
  signalLine: '#4169E1', // Signal線 藍色

  // 圖表基礎顏色
  grid: '#f0f0f0', // 網格線顏色
  border: '#e0e0e0', // 邊框顏色
  text: '#333333', // 文字顏色
  background: '#ffffff', // 背景色
} as const

// 🌙 暗色主題(可擴展)
export const darkThemeColors = {
  up: '#FF6B6B',
  down: '#00C851',
  flat: '#888888',

  ma8: '#FF6B6B',
  ma21: '#4169E1',
  ma55: '#00C851',

  kLine: '#FF6B6B',
  dLine: '#4169E1',
  jLine: '#9B59B6',

  macdLine: '#FF6B6B',
  signalLine: '#4169E1',

  grid: '#2a2a2a',
  border: '#404040',
  text: '#ffffff',
  background: '#1a1a1a',
} as const

// 主題顏色介面
export interface ThemeColors {
  // 台股習慣:紅漲綠跌
  up: string // 上漲顏色
  down: string // 下跌顏色
  flat: string // 平盤顏色

  // 技術指標顏色
  ma8: string // MA8 顏色
  ma21: string // MA21 顏色
  ma55: string // MA55 顏色

  // KDJ 指標顏色
  kLine: string // K線顏色
  dLine: string // D線顏色
  jLine: string // J線顏色

  // MACD 指標顏色
  macdLine: string // MACD線顏色
  signalLine: string // Signal線顏色

  // 圖表基礎顏色
  grid: string // 網格線顏色
  border: string // 邊框顏色
  text: string // 文字顏色
  background: string // 背景色
}

// 主題映射
export const themes = {
  light: taiwanStockColors,
  dark: darkThemeColors,
} as const

// 默認主題
export const DEFAULT_THEME = 'light' as const
