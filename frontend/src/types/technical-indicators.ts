// src/types/technical-indicators.ts

export interface KLineData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MovingAverageData {
  timestamp: string;
  ma5?: number;
  ma10?: number;
  ma20?: number;
  ma60?: number;
  ma120?: number;
  ma240?: number;
}

export interface KDData {
  timestamp: string;
  k?: number;
  d?: number;
  j?: number;
}

export interface MACDData {
  timestamp: string;
  dif?: number;      // DIF線 (快線)
  dea?: number;      // DEA線 (慢線)
  macd?: number;     // MACD柱狀圖
  histogram?: number; // 柱狀圖 (DIF-DEA)*2
}

export interface BollingerBandsData {
  timestamp: string;
  upper?: number;    // 上軌
  middle?: number;   // 中軌 (MA20)
  lower?: number;    // 下軌
  bandwidth?: number; // 通道寬度
}

export interface RSIData {
  timestamp: string;
  rsi6?: number;
  rsi12?: number;
  rsi24?: number;
}

export interface TechnicalIndicators {
  timestamp: string;
  // 基礎數據
  kline: KLineData;
  // 技術指標
  ma?: MovingAverageData;
  kd?: KDData;
  macd?: MACDData;
  bbands?: BollingerBandsData;
  rsi?: RSIData;
}

export interface ChartDataResponse {
  symbol: string;
  interval: string;
  data: TechnicalIndicators[];
  count: number;
  indicators_config: Record<string, any>;
  source: string;
}

// Lightweight Charts 專用格式
export interface LightweightChartsData {
  candlestick: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  volume: Array<{
    time: string;
    value: number;
    color: string;
  }>;
  ma: Record<string, Array<{
    time: string;
    value: number;
  }>>;
  kd: {
    k: Array<{ time: string; value: number }>;
    d: Array<{ time: string; value: number }>;
    j: Array<{ time: string; value: number }>;
  };
  macd: {
    dif: Array<{ time: string; value: number }>;
    dea: Array<{ time: string; value: number }>;
    histogram: Array<{ time: string; value: number; color: string }>;
  };
  bbands: {
    upper: Array<{ time: string; value: number }>;
    middle: Array<{ time: string; value: number }>;
    lower: Array<{ time: string; value: number }>;
  };
  rsi: Record<string, Array<{
    time: string;
    value: number;
  }>>;
}

// 指標配置
export interface IndicatorConfig {
  ma?: {
    periods: number[];
    colors: Record<number, string>;
  };
  kd?: {
    k_period: number;
    d_period: number;
    rsv_period: number;
    colors: { k: string; d: string; j: string };
  };
  macd?: {
    fast: number;
    slow: number;
    signal: number;
    colors: { dif: string; dea: string; histogram: string };
  };
  bbands?: {
    period: number;
    std_multiplier: number;
    colors: { upper: string; middle: string; lower: string };
  };
  rsi?: {
    periods: number[];
    colors: Record<number, string>;
    overbought: number;
    oversold: number;
  };
}
