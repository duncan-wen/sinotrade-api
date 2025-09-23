/**
 * KLineChart UI 選項配置
 * 包含時間間隔、指標選項等配置
 */

// 時間間隔選項配置
export const timeIntervalOptions = [
  { value: '1m', label: '1分鐘' },
  { value: '5m', label: '5分鐘' },
  { value: '15m', label: '15分鐘' },
  { value: '1h', label: '1小時' },
  { value: '4h', label: '4小時' },
  { value: '1d', label: '日線' },
  { value: '1w', label: '週線' },
  { value: '1M', label: '月線' },
] as const

// 指標選項配置
export const indicatorOptions = [
  { name: 'MA', label: 'MA', type: 'main' as const },
  { name: 'BOLL', label: 'BBands', type: 'main' as const },
  { name: 'VOL', label: 'VOL', type: 'sub' as const },
  { name: 'KDJ', label: 'KDJ', type: 'sub' as const },
  { name: 'MACD', label: 'MACD', type: 'sub' as const },
] as const

// 指標類型
export type IndicatorType = 'main' | 'sub'

/**
🔍 [number] 的作用
這是從 timeIntervalOptions 數組中提取每個元素類型的語法：
typeof timeIntervalOptions - 獲取數組的類型
[number] - 訪問數組中任意一個元素的類型
['value'] - 從該元素中提取 value 屬性的類型
*/
// 時間間隔類型
export type TimeInterval = (typeof timeIntervalOptions)[number]['value']

// 指標名稱類型
export type IndicatorName = (typeof indicatorOptions)[number]['name']
