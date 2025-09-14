import { KLineData } from './TradingChart';

// 生成模擬 K 線數據
export function generateMockKLineData(days: number = 30): KLineData[] {
  const data: KLineData[] = [];
  let basePrice = 150; // 基準價格
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // 模擬價格波動
    const volatility = 0.02; // 2% 波動率
    const change = (Math.random() - 0.5) * volatility * basePrice;

    const open = basePrice;
    const close = basePrice + change;

    // 確保 high 是最高價，low 是最低價
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;

    data.push({
      time: date.toISOString(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 100000,
    });

    basePrice = close; // 下一天的開盤價基於前一天收盤價
  }

  return data;
}

// 台積電模擬數據
export const tsmcMockData: KLineData[] = [
  {
    time: '2024-01-15',
    open: 566.0,
    high: 572.0,
    low: 563.0,
    close: 570.0,
    volume: 25420000,
  },
  {
    time: '2024-01-16',
    open: 570.0,
    high: 575.0,
    low: 568.0,
    close: 573.0,
    volume: 28350000,
  },
  {
    time: '2024-01-17',
    open: 573.0,
    high: 578.0,
    low: 571.0,
    close: 576.0,
    volume: 22180000,
  },
  {
    time: '2024-01-18',
    open: 576.0,
    high: 580.0,
    low: 574.0,
    close: 578.0,
    volume: 19870000,
  },
  {
    time: '2024-01-19',
    open: 578.0,
    high: 582.0,
    low: 575.0,
    close: 580.0,
    volume: 31250000,
  },
];

// 美股 AAPL 模擬數據
export const aaplMockData: KLineData[] = generateMockKLineData(60).map((item, index) => ({
  ...item,
  open: 180 + Math.sin(index * 0.1) * 10 + (Math.random() - 0.5) * 5,
  high: 185 + Math.sin(index * 0.1) * 10 + Math.random() * 5,
  low: 175 + Math.sin(index * 0.1) * 10 - Math.random() * 5,
  close: 182 + Math.sin(index * 0.1) * 10 + (Math.random() - 0.5) * 5,
}));
