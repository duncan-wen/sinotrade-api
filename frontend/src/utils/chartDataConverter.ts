// src/utils/chartDataConverter.ts

import {
  TechnicalIndicators,
  LightweightChartsData,
  IndicatorConfig,
} from '@/types/technical-indicators'

/**
 * 將後端技術指標數據轉換為 Lightweight Charts 格式
 */
export function convertToLightweightChartsData(
  data: TechnicalIndicators[],
  config: IndicatorConfig = {}
): LightweightChartsData {
  const result: LightweightChartsData = {
    candlestick: [],
    volume: [],
    ma: {},
    kd: { k: [], d: [], j: [] },
    macd: { dif: [], dea: [], histogram: [] },
    bbands: { upper: [], middle: [], lower: [] },
    rsi: {},
  }

  // 預設顏色配置
  const defaultColors = {
    ma: {
      5: '#FF6B6B', // 紅色
      10: '#4ECDC4', // 青色
      20: '#45B7D1', // 藍色
      60: '#96CEB4', // 綠色
      120: '#FFEAA7', // 黃色
      240: '#DDA0DD', // 紫色
    },
    volume: {
      up: '#ff4444', // 台股上漲紅色
      down: '#00C851', // 台股下跌綠色
    },
    kd: {
      k: '#FF6B6B',
      d: '#4ECDC4',
      j: '#45B7D1',
    },
    macd: {
      dif: '#FF6B6B',
      dea: '#4ECDC4',
      histogram: '#45B7D1',
    },
    bbands: {
      upper: '#FF6B6B',
      middle: '#4ECDC4',
      lower: '#45B7D1',
    },
    rsi: {
      6: '#FF6B6B',
      12: '#4ECDC4',
      24: '#45B7D1',
    },
  }

  data.forEach((item) => {
    const time = new Date(item.timestamp).getTime() / 1000

    // K線數據
    result.candlestick.push({
      time: time.toString(),
      open: item.kline.open,
      high: item.kline.high,
      low: item.kline.low,
      close: item.kline.close,
    })

    // 成交量數據
    const isUp = item.kline.close >= item.kline.open
    result.volume.push({
      time: time.toString(),
      value: item.kline.volume,
      color: isUp ? defaultColors.volume.up : defaultColors.volume.down,
    })

    // 移動平均線
    if (item.ma) {
      const maData = item.ma
      Object.entries(maData).forEach(([key, value]) => {
        if (key !== 'timestamp' && value !== null && value !== undefined) {
          const period = key.replace('ma', '')
          if (!result.ma[period]) {
            result.ma[period] = []
          }
          result.ma[period].push({
            time: time.toString(),
            value: value as number,
          })
        }
      })
    }

    // KD指標
    if (item.kd) {
      if (item.kd.k !== null && item.kd.k !== undefined) {
        result.kd.k.push({ time: time.toString(), value: item.kd.k })
      }
      if (item.kd.d !== null && item.kd.d !== undefined) {
        result.kd.d.push({ time: time.toString(), value: item.kd.d })
      }
      if (item.kd.j !== null && item.kd.j !== undefined) {
        result.kd.j.push({ time: time.toString(), value: item.kd.j })
      }
    }

    // MACD指標
    if (item.macd) {
      if (item.macd.dif !== null && item.macd.dif !== undefined) {
        result.macd.dif.push({ time: time.toString(), value: item.macd.dif })
      }
      if (item.macd.dea !== null && item.macd.dea !== undefined) {
        result.macd.dea.push({ time: time.toString(), value: item.macd.dea })
      }
      if (item.macd.histogram !== null && item.macd.histogram !== undefined) {
        const color = item.macd.histogram >= 0 ? '#ff4444' : '#00C851'
        result.macd.histogram.push({
          time: time.toString(),
          value: item.macd.histogram,
          color,
        })
      }
    }

    // 布林通道
    if (item.bbands) {
      if (item.bbands.upper !== null && item.bbands.upper !== undefined) {
        result.bbands.upper.push({
          time: time.toString(),
          value: item.bbands.upper,
        })
      }
      if (item.bbands.middle !== null && item.bbands.middle !== undefined) {
        result.bbands.middle.push({
          time: time.toString(),
          value: item.bbands.middle,
        })
      }
      if (item.bbands.lower !== null && item.bbands.lower !== undefined) {
        result.bbands.lower.push({
          time: time.toString(),
          value: item.bbands.lower,
        })
      }
    }

    // RSI指標
    if (item.rsi) {
      const rsiData = item.rsi
      Object.entries(rsiData).forEach(([key, value]) => {
        if (key !== 'timestamp' && value !== null && value !== undefined) {
          const period = key.replace('rsi', '')
          if (!result.rsi[period]) {
            result.rsi[period] = []
          }
          result.rsi[period].push({
            time: time.toString(),
            value: value as number,
          })
        }
      })
    }
  })

  return result
}

/**
 * 獲取指標顏色配置
 */
export function getIndicatorColors(config: IndicatorConfig = {}) {
  return {
    ma: config.ma?.colors || {
      5: '#FF6B6B',
      10: '#4ECDC4',
      20: '#45B7D1',
      60: '#96CEB4',
      120: '#FFEAA7',
      240: '#DDA0DD',
    },
    kd: config.kd?.colors || {
      k: '#FF6B6B',
      d: '#4ECDC4',
      j: '#45B7D1',
    },
    macd: config.macd?.colors || {
      dif: '#FF6B6B',
      dea: '#4ECDC4',
      histogram: '#45B7D1',
    },
    bbands: config.bbands?.colors || {
      upper: '#FF6B6B',
      middle: '#4ECDC4',
      lower: '#45B7D1',
    },
    rsi: config.rsi?.colors || {
      6: '#FF6B6B',
      12: '#4ECDC4',
      24: '#45B7D1',
    },
  }
}
