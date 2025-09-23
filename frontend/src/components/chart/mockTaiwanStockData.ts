// 台股市場 Mock 數據

export interface TaiwanStockData {
  date: string
  twiIndex: number
  volume: number
  change: number
  changePercent: number
}

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
}

// 台股指數歷史數據 (最近30天)
export const taiwanStockHistoryData: TaiwanStockData[] = [
  {
    date: '2024-08-24',
    twiIndex: 16958,
    volume: 82.3,
    change: -45,
    changePercent: -0.26,
  },
  {
    date: '2024-08-25',
    twiIndex: 17012,
    volume: 89.5,
    change: 54,
    changePercent: 0.32,
  },
  {
    date: '2024-08-26',
    twiIndex: 16987,
    volume: 76.8,
    change: -25,
    changePercent: -0.15,
  },
  {
    date: '2024-08-27',
    twiIndex: 17089,
    volume: 91.2,
    change: 102,
    changePercent: 0.6,
  },
  {
    date: '2024-08-28',
    twiIndex: 17134,
    volume: 88.9,
    change: 45,
    changePercent: 0.26,
  },
  {
    date: '2024-08-29',
    twiIndex: 17098,
    volume: 85.4,
    change: -36,
    changePercent: -0.21,
  },
  {
    date: '2024-08-30',
    twiIndex: 17156,
    volume: 92.3,
    change: 58,
    changePercent: 0.34,
  },
  {
    date: '2024-09-02',
    twiIndex: 17178,
    volume: 94.1,
    change: 22,
    changePercent: 0.13,
  },
  {
    date: '2024-09-03',
    twiIndex: 17145,
    volume: 87.6,
    change: -33,
    changePercent: -0.19,
  },
  {
    date: '2024-09-04',
    twiIndex: 17189,
    volume: 89.8,
    change: 44,
    changePercent: 0.26,
  },
  {
    date: '2024-09-05',
    twiIndex: 17234,
    volume: 91.2,
    change: 45,
    changePercent: 0.26,
  },
  {
    date: '2024-09-06',
    twiIndex: 17198,
    volume: 86.7,
    change: -36,
    changePercent: -0.21,
  },
  {
    date: '2024-09-09',
    twiIndex: 17267,
    volume: 93.5,
    change: 69,
    changePercent: 0.4,
  },
  {
    date: '2024-09-10',
    twiIndex: 17298,
    volume: 95.2,
    change: 31,
    changePercent: 0.18,
  },
  {
    date: '2024-09-11',
    twiIndex: 17256,
    volume: 88.9,
    change: -42,
    changePercent: -0.24,
  },
  {
    date: '2024-09-12',
    twiIndex: 17289,
    volume: 90.7,
    change: 33,
    changePercent: 0.19,
  },
  {
    date: '2024-09-13',
    twiIndex: 17324,
    volume: 92.1,
    change: 35,
    changePercent: 0.2,
  },
  {
    date: '2024-09-16',
    twiIndex: 17301,
    volume: 89.3,
    change: -23,
    changePercent: -0.13,
  },
  {
    date: '2024-09-17',
    twiIndex: 17356,
    volume: 94.7,
    change: 55,
    changePercent: 0.32,
  },
  {
    date: '2024-09-18',
    twiIndex: 17289,
    volume: 87.2,
    change: -67,
    changePercent: -0.39,
  },
  {
    date: '2024-09-19',
    twiIndex: 17334,
    volume: 91.8,
    change: 45,
    changePercent: 0.26,
  },
  {
    date: '2024-09-20',
    twiIndex: 17367,
    volume: 93.4,
    change: 33,
    changePercent: 0.19,
  },
  {
    date: '2024-09-21',
    twiIndex: 17298,
    volume: 88.6,
    change: -69,
    changePercent: -0.4,
  },
  {
    date: '2024-09-22',
    twiIndex: 17334,
    volume: 90.2,
    change: 36,
    changePercent: 0.21,
  },
  {
    date: '2024-09-23',
    twiIndex: 17357,
    volume: 92.8,
    change: 23,
    changePercent: 0.13,
  },
]

// 熱門股票報價數據
export const popularStockQuotes: StockQuote[] = [
  {
    symbol: '2330',
    name: '台積電',
    price: 589.5,
    change: 12.5,
    changePercent: 2.17,
    volume: 45832,
    high: 592.0,
    low: 577.0,
  },
  {
    symbol: '2317',
    name: '鴻海',
    price: 134.5,
    change: -2.5,
    changePercent: -1.82,
    volume: 89456,
    high: 137.0,
    low: 133.5,
  },
  {
    symbol: '2454',
    name: '聯發科',
    price: 1089.0,
    change: 25.0,
    changePercent: 2.35,
    volume: 12893,
    high: 1095.0,
    low: 1064.0,
  },
  {
    symbol: '1301',
    name: '台塑',
    price: 98.7,
    change: -1.8,
    changePercent: -1.79,
    volume: 23567,
    high: 100.5,
    low: 98.2,
  },
  {
    symbol: '2412',
    name: '中華電',
    price: 118.5,
    change: 0.5,
    changePercent: 0.42,
    volume: 15678,
    high: 119.0,
    low: 117.5,
  },
]

// 市場統計數據
export const marketStats = {
  twiIndex: {
    value: 17357,
    change: 23,
    changePercent: 0.13,
    volume: 92.8,
  },
  dowJones: {
    value: 38654,
    change: -89,
    changePercent: -0.23,
    volume: 0, // 美股不用億元計算
  },
  portfolioValue: {
    value: 125680,
    change: 2340,
    changePercent: 1.9,
    currency: 'USD',
  },
  todayPnL: {
    value: 1250,
    change: 0,
    changePercent: 0,
    currency: 'USD',
    status: 'profit' as const,
  },
}

// 產生即時數據的函數 (模擬實時更新)
export function generateRealtimeData(): TaiwanStockData {
  const lastData = taiwanStockHistoryData[taiwanStockHistoryData.length - 1]
  const randomChange = Math.floor(Math.random() * 100) - 50 // -50 到 +50
  const newIndex = lastData.twiIndex + randomChange
  const changePercent = (randomChange / lastData.twiIndex) * 100

  return {
    date: new Date().toISOString().split('T')[0],
    twiIndex: newIndex,
    volume: Math.round((Math.random() * 20 + 80) * 10) / 10, // 80-100億
    change: randomChange,
    changePercent: Math.round(changePercent * 100) / 100,
  }
}

// 格式化數字的工具函數
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-TW')
}

export function formatCurrency(num: number, currency: string = 'TWD'): string {
  const formatter = new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: currency === 'TWD' ? 'TWD' : 'USD',
    minimumFractionDigits: currency === 'TWD' ? 0 : 2,
  })
  return formatter.format(num)
}

export function formatPercentage(num: number): string {
  const sign = num >= 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}
