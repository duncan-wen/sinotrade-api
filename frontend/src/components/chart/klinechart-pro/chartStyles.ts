/**
 * KLineChart 圖表樣式配置
 * 統一管理圖表的視覺樣式
 */

import { ThemeColors } from './theme'

// 創建圖表樣式配置
export const createChartStyles = (colors: ThemeColors) =>
  ({
    grid: {
      show: true,
      horizontal: {
        show: true,
        size: 1,
        color: colors.grid,
        style: 'solid',
      },
      vertical: {
        show: true,
        size: 1,
        color: colors.grid,
        style: 'solid',
      },
    },
    candle: {
      margin: {
        top: 0.2,
        bottom: 0.1,
      },
      type: 'candle_solid',
      bar: {
        upColor: colors.up,
        downColor: colors.down,
        noChangeColor: colors.flat,
        upBorderColor: colors.up,
        downBorderColor: colors.down,
        noChangeBorderColor: colors.flat,
        upWickColor: colors.up,
        downWickColor: colors.down,
        noChangeWickColor: colors.flat,
      },
      // 🎯 右邊價格標籤配置 (台股習慣: 紅漲綠跌)
      priceMark: {
        show: true,
        high: {
          show: true,
          color: colors.up, // 最高價用上漲顏色 (紅色)
          textMargin: 5,
          textSize: 10,
          textFamily: 'Helvetica Neue',
          textWeight: 'normal',
        },
        low: {
          show: true,
          color: colors.down, // 最低價用下跌顏色 (綠色)
          textMargin: 5,
          textSize: 10,
          textFamily: 'Helvetica Neue',
          textWeight: 'normal',
        },
        last: {
          show: true,
          upColor: colors.up, // 上漲時價格標籤紅色
          downColor: colors.down, // 下跌時價格標籤綠色
          noChangeColor: colors.flat, // 平盤時價格標籤灰色
          line: {
            show: true,
            style: 'dashed', // 🎯 改為虛線
            dashedValue: [4, 4],
            size: 1,
          },
          text: {
            show: true,
            size: 12,
            paddingLeft: 4,
            paddingTop: 4,
            paddingRight: 4,
            paddingBottom: 4,
            borderRadius: 2,
            borderSize: 1,
            borderStyle: 'solid',
            family: 'Helvetica Neue',
            weight: 'normal',
          },
        },
      },
      tooltip: {
        showRule: 'always',
        showType: 'standard',
        labels: ['時間', '開', '高', '低', '收', '成交量'],
      },
    },
    crosshair: {
      show: true,
      horizontal: {
        show: true,
        line: {
          show: true,
          style: 'dashed',
          dashedValue: [4, 2],
          size: 1,
          color: '#758796',
        },
        text: {
          show: true,
          color: '#FFFFFF',
          size: 12,
          family: 'Helvetica Neue',
          weight: 'normal',
          borderStyle: 'solid',
          borderSize: 1,
          borderColor: '#686D76',
          borderRadius: 2,
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2,
          backgroundColor: '#686D76',
        },
      },
      vertical: {
        show: true,
        line: {
          show: true,
          style: 'dashed',
          dashedValue: [4, 2],
          size: 1,
          color: '#758796',
        },
        text: {
          show: true,
          color: '#FFFFFF',
          size: 12,
          family: 'Helvetica Neue',
          weight: 'normal',
          borderStyle: 'solid',
          borderSize: 1,
          borderColor: '#686D76',
          borderRadius: 2,
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2,
          backgroundColor: '#686D76',
        },
      },
    },
    indicator: {
      lastValueMark: {
        show: false,
      },
    },
  }) as const

// 創建指標樣式配置工廠函數
export const createIndicatorStyles = (colors: ThemeColors) =>
  ({
    // MA 指標樣式
    ma: {
      name: 'MA',
      precision: 2,
      calcParams: [8, 21, 55],
      styles: {
        lines: [
          {
            style: 'solid',
            smooth: false,
            size: 1,
            dashedValue: [2, 2],
            color: colors.ma8,
          },
          {
            style: 'solid',
            smooth: false,
            size: 1,
            dashedValue: [2, 2],
            color: colors.ma21,
          },
          {
            style: 'solid',
            smooth: false,
            size: 1,
            dashedValue: [2, 2],
            color: colors.ma55,
          },
        ],
      },
    },

    // MACD 指標樣式
    macd: {
      name: 'MACD',
      styles: {
        bars: [
          {
            style: 'stroke_fill',
            upColor: colors.up,
            downColor: colors.down,
            noChangeColor: colors.flat,
            upBorderColor: colors.up,
            downBorderColor: colors.down,
          },
        ],
        lines: [
          {
            style: 'solid',
            smooth: false,
            size: 1,
            dashedValue: [2, 2],
            color: colors.macdLine,
          },
          {
            style: 'solid',
            smooth: false,
            size: 1,
            dashedValue: [2, 2],
            color: colors.signalLine,
          },
        ],
      },
    },

    // KDJ 指標樣式
    kdj: {
      name: 'KDJ',
      styles: {
        lines: [
          {
            style: 'solid',
            smooth: false,
            size: 1,
            dashedValue: [2, 2],
            color: colors.kLine,
          },
          {
            style: 'solid',
            smooth: false,
            size: 1,
            dashedValue: [2, 2],
            color: colors.dLine,
          },
          {
            style: 'solid',
            smooth: false,
            size: 1,
            dashedValue: [2, 2],
            color: colors.jLine,
          },
        ],
      },
    },

    // VOL 指標樣式
    vol: {
      name: 'VOL',
      styles: {
        bars: [
          {
            upColor: colors.up,
            downColor: colors.down,
          },
        ],
      },
    },

    // BOLL (布林通道) 指標樣式
    boll: {
      name: 'BOLL',
      styles: {
        lines: [
          {
            style: 'solid',
            smooth: false,
            size: 1,
            dashedValue: [2, 2],
            color: colors.ma21, // 上軌線顏色
          },
          {
            style: 'solid',
            smooth: false,
            size: 1,
            dashedValue: [2, 2],
            color: colors.ma8, // 中軌線顏色 (MA)
          },
          {
            style: 'solid',
            smooth: false,
            size: 1,
            dashedValue: [2, 2],
            color: colors.ma55, // 下軌線顏色
          },
        ],
      },
    },
  }) as const
