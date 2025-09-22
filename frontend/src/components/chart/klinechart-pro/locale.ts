/**
 * KLineChart 圖表多語言配置
 * 包含繁體中文翻譯表
 */

// 繁體中文語言包
export const zhTWLocale = {
  time: '時間:',
  open: '開:',
  high: '高:',
  low: '低:',
  close: '收:',
  volume: '成交量:',
  turnover: '成交額:',
  change: '漲幅:',
  change_rate: '漲幅:',
  last: '最新:',
  ma: '移動平均',
  ema: '指數移動平均',
  sma: '簡單移動平均',
  vol: '成交量',
  macd: 'MACD',
  kdj: 'KDJ',
  rsi: 'RSI',
  boll: '布林通道',
  wr: '威廉指標',
  bias: '乖離率',
  cci: '順勢指標',
  psy: '心理線',
  dmi: 'DMI',
  trix: 'TRIX',
  obv: 'OBV',
  vr: 'VR',
  dma: 'DMA',
  mtm: 'MTM',
  roc: 'ROC',
  ppo: 'PPO',
  sar: 'SAR',
  highest: '最高',
  lowest: '最低',
} as const

// 語言配置常數
export const LOCALES = {
  ZH_TW: 'zh-TW',
} as const

// 語言配置映射
export const localeMap = {
  [LOCALES.ZH_TW]: zhTWLocale,
} as const

// 默認語言
export const DEFAULT_LOCALE = LOCALES.ZH_TW

// UI語言選項配置
export const languageOptions = [
  { value: LOCALES.ZH_TW, label: '繁中', flag: '🇹🇼' },
  { value: 'zh-CN', label: '简中', flag: '🇨🇳' },
  { value: 'en-US', label: 'EN', flag: '🇺🇸' },
] as const
