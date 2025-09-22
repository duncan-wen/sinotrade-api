/**
 * KLineChartPro 組件相關配置統一匯出
 * 包含主題、樣式、選項、按鈕組件等
 */

// 主題配置
export {
  themes,
  DEFAULT_THEME,
  taiwanStockColors,
  darkThemeColors,
  type ThemeColors,
} from './theme'

// 樣式配置
export { createChartStyles, createIndicatorStyles } from './chartStyles'

// 選項配置
export {
  timeIntervalOptions,
  indicatorOptions,
  type IndicatorName,
  type IndicatorType,
  type TimeInterval,
} from './options'

// 語言配置
export { zhTWLocale, LOCALES, DEFAULT_LOCALE, languageOptions } from './locale'

// UI 組件
export { default as ChartButton } from './ChartButton'
