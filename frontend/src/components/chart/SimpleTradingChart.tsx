/**
 * SimpleTradingChart.tsx - 簡化版K線圖表組件
 *
 * 基於 Lightweight Charts 的簡潔版實現
 * 適用於需要簡單顯示的場景
 *
 * 🎯 特性:
 * - 基礎K線顯示
 * - 成交量圖表
 * - 移動平均線(MA5、MA10、MA20)
 * - 實時更新支援
 * - 輕量化設計
 */

'use client'
import React, { useEffect, useRef, useState } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
} from 'lightweight-charts'
import {
  klineSocketIOService,
  KlineData,
  KlineMessage,
  TickData,
} from '@/services/klineSocketIO'

export interface KLineData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
  ma5?: number | null
  ma10?: number | null
  ma20?: number | null
}

// 🔧 K線邊界計算函數(與 TradingChart 保持一致)
const calculateKlineBoundary = (tickTime: Date, intervalStr: string) => {
  const tickDate = new Date(tickTime)

  switch (intervalStr) {
    case '1m': {
      // 1分鐘:對齊到整分鐘
      const aligned = new Date(tickDate)
      aligned.setSeconds(0, 0)
      return aligned
    }
    case '5m': {
      // 5分鐘:對齊到5分鐘邊界 (0, 5, 10, 15, ...)
      const aligned = new Date(tickDate)
      const minutes = aligned.getMinutes()
      const alignedMinutes = Math.floor(minutes / 5) * 5
      aligned.setMinutes(alignedMinutes, 0, 0)
      return aligned
    }
    case '15m': {
      // 15分鐘:對齊到15分鐘邊界 (0, 15, 30, 45)
      const aligned = new Date(tickDate)
      const minutes = aligned.getMinutes()
      const alignedMinutes = Math.floor(minutes / 15) * 15
      aligned.setMinutes(alignedMinutes, 0, 0)
      return aligned
    }
    case '1h': {
      // 1小時:對齊到整點
      const aligned = new Date(tickDate)
      aligned.setMinutes(0, 0, 0)
      return aligned
    }
    case '1d': {
      // 日線:對齊到當天開始 (台股開盤時間 09:00)
      const aligned = new Date(tickDate)
      aligned.setHours(9, 0, 0, 0)
      // 如果當前時間早於09:00,應該屬於前一個交易日
      if (tickDate.getHours() < 9) {
        aligned.setDate(aligned.getDate() - 1)
      }
      return aligned
    }
    default: {
      // 默認1分鐘對齊
      const aligned = new Date(tickDate)
      aligned.setSeconds(0, 0)
      return aligned
    }
  }
}

const getIntervalMilliseconds = (intervalStr: string): number => {
  switch (intervalStr) {
    case '1m':
      return 1 * 60 * 1000 // 1分鐘
    case '5m':
      return 5 * 60 * 1000 // 5分鐘
    case '15m':
      return 15 * 60 * 1000 // 15分鐘
    case '1h':
      return 60 * 60 * 1000 // 1小時
    case '1d':
      return 24 * 60 * 60 * 1000 // 1天
    default:
      return 1 * 60 * 1000 // 默認1分鐘
  }
}

interface SimpleTradingChartProps {
  symbol: string
  className?: string
  height?: number
  width?: number
  interval?: string
  enableRealtime?: boolean
  showVolume?: boolean
  showMA?: boolean
  onIntervalChange?: (interval: string) => void
}

export default function SimpleTradingChart({
  symbol,
  className = '',
  height = 400,
  width,
  interval = '5m',
  enableRealtime = true,
  showVolume = true,
  showMA = true,
  onIntervalChange,
}: SimpleTradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const ma5SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const ma10SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [klineData, setKlineData] = useState<KLineData[]>([])
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false)

  // 獲取歷史數據
  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        setIsLoading(true)
        setKlineData([])

        const apiUrl = `/api/klines/${symbol}?interval=${interval}&limit=200&ma_periods=5,10,20&include_indicators=true`
        console.log('🔗 SimpleTradingChart API請求:', apiUrl)

        const response = await fetch(apiUrl)
        const result = await response.json()

        if (result.data && result.data.length > 0) {
          let formattedData: KLineData[]

          if (result.data[0] && result.data[0].kline) {
            // 新格式:包含技術指標
            formattedData = result.data.map((d: any) => ({
              time: d.timestamp,
              open: d.kline.open,
              high: d.kline.high,
              low: d.kline.low,
              close: d.kline.close,
              volume: d.kline.volume,
              ma5: d.ma?.ma5 || null,
              ma10: d.ma?.ma10 || null,
              ma20: d.ma?.ma20 || null,
            }))
          } else {
            // 舊格式:基本OHLCV
            formattedData = result.data.map((d: any) => ({
              time: d.time || d.timestamp,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              volume: d.volume,
              ma5: d.ma5 || null,
              ma10: d.ma10 || null,
              ma20: d.ma20 || null,
            }))
          }

          setKlineData(formattedData)
          console.log(
            '✅ SimpleTradingChart 數據載入完成:',
            formattedData.length,
            '條'
          )
        }
      } catch (error) {
        console.error('❌ SimpleTradingChart 數據載入失敗:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistoricalData()
  }, [symbol, interval])

  // WebSocket 實時更新
  useEffect(() => {
    if (!enableRealtime) return

    if (!klineSocketIOService) {
      console.warn('⚠️ Socket.IO 服務不可用')
      return
    }

    const handleKlineMessage = (message: KlineMessage) => {
      if (message.type === 'tick') {
        const tickData = message.tick
        if (!tickData || !tickData.price || !tickData.timestamp) return

        setKlineData((prevData) => {
          if (prevData.length === 0) return prevData

          const tickTime = new Date(tickData.timestamp)
          const tickPrice = parseFloat(String(tickData.price))
          const tickVolume = tickData.volume || 0

          // 🔧 使用與 TradingChart 相同的邊界計算邏輯
          // 計算當前 tick 應該歸屬的 K 線邊界
          const currentKlineStartTime = calculateKlineBoundary(
            tickTime,
            interval
          )
          const intervalMs = getIntervalMilliseconds(interval)
          const currentKlineEndTime = new Date(
            currentKlineStartTime.getTime() + intervalMs
          )

          const latestKline = prevData[prevData.length - 1]
          const latestKlineTime = new Date(latestKline.time)

          // 🔧 重要修復:檢查最後一根K線是否在當前邊界時間範圍內
          const isWithinCurrentKline =
            latestKlineTime.getTime() >= currentKlineStartTime.getTime() &&
            latestKlineTime.getTime() < currentKlineEndTime.getTime()

          // 安全的時間格式化
          const formatTime = (date: Date) => {
            try {
              return date.toISOString()
            } catch (e) {
              return `無效時間: ${date}`
            }
          }

          console.log('🔍 [SimpleTradingChart] tick處理 [統一邊界版]:', {
            間隔: interval,
            間隔毫秒: intervalMs,
            tick時間: formatTime(tickTime),
            計算的K線開始: formatTime(currentKlineStartTime),
            計算的K線結束: formatTime(currentKlineEndTime),
            最後K線時間: formatTime(latestKlineTime),
            在當前邊界內: isWithinCurrentKline,
            操作: isWithinCurrentKline ? '更新現有K線' : '創建新K線',
            tickPrice,
            tickVolume,
            邊界詳情: {
              最後K線時間戳: latestKlineTime.getTime(),
              當前邊界開始: currentKlineStartTime.getTime(),
              當前邊界結束: currentKlineEndTime.getTime(),
              判斷結果: isWithinCurrentKline,
            },
          })

          // 判斷是否需要創建新 K 線
          if (!isWithinCurrentKline) {
            // 創建新 K 線
            console.log('📊 [SimpleTradingChart] 創建新 K 線')
            const newKline: KLineData = {
              time: currentKlineStartTime.toISOString(),
              open: tickPrice,
              high: tickPrice,
              low: tickPrice,
              close: tickPrice,
              volume: tickVolume,
              ma5: null,
              ma10: null,
              ma20: null,
            }

            return [...prevData, newKline]
          } else {
            // 更新現有 K 線
            console.log('📊 [SimpleTradingChart] 更新現有 K 線')
            const updatedKline: KLineData = {
              ...latestKline,
              high: Math.max(latestKline.high, tickPrice),
              low: Math.min(latestKline.low, tickPrice),
              close: tickPrice,
              volume: (latestKline.volume || 0) + tickVolume,
            }

            const updatedData = [...prevData]
            updatedData[prevData.length - 1] = updatedKline
            return updatedData
          }
        })
      }
    }

    const connectWebSocket = async () => {
      try {
        setIsWebSocketConnected(true)
        klineSocketIOService.subscribe(symbol, handleKlineMessage)
      } catch (error) {
        console.error('WebSocket連接失敗:', error)
        setIsWebSocketConnected(false)
      }
    }

    connectWebSocket()

    return () => {
      if (klineSocketIOService) {
        klineSocketIOService.unsubscribe()
      }
      setIsWebSocketConnected(false)
    }
  }, [symbol, enableRealtime, interval]) // 🔧 添加 interval 依賴確保切換間隔時重新訂閱

  // 初始化圖表
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      width: width || chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          labelVisible: true,
          width: 1,
          color: '#758696',
          style: 3,
        },
        horzLine: {
          labelVisible: true,
          width: 1,
          color: '#758696',
          style: 3,
        },
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#cccccc',
        scaleMargins: showVolume
          ? {
              top: 0.05,
              bottom: 0.25,
            }
          : {
              top: 0.05,
              bottom: 0.05,
            },
      },
      leftPriceScale: {
        borderColor: '#cccccc',
        visible: showVolume,
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      },
    })

    // K線系列
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#ff4444',
      downColor: '#00C851',
      borderDownColor: '#00C851',
      borderUpColor: '#ff4444',
      wickDownColor: '#00C851',
      wickUpColor: '#ff4444',
    })

    // 成交量系列
    let volumeSeries = null
    if (showVolume) {
      volumeSeries = chart.addHistogramSeries({
        color: '#999999',
        priceFormat: { type: 'volume' },
        priceScaleId: 'left',
      })
    }

    // MA系列
    let ma5Series = null,
      ma10Series = null,
      ma20Series = null
    if (showMA) {
      ma5Series = chart.addLineSeries({
        color: '#FF6B6B',
        lineWidth: 2,
        title: 'MA5',
        lastValueVisible: false,
      })

      ma10Series = chart.addLineSeries({
        color: '#4ECDC4',
        lineWidth: 2,
        title: 'MA10',
        lastValueVisible: false,
      })

      ma20Series = chart.addLineSeries({
        color: '#45B7D1',
        lineWidth: 2,
        title: 'MA20',
        lastValueVisible: false,
      })
    }

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries
    volumeSeriesRef.current = volumeSeries
    ma5SeriesRef.current = ma5Series
    ma10SeriesRef.current = ma10Series
    ma20SeriesRef.current = ma20Series

    // 響應式調整
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: width || chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [height, width, showVolume, showMA])

  // 更新圖表數據
  useEffect(() => {
    if (!candlestickSeriesRef.current || !klineData.length) return

    // 轉換K線數據
    const formattedData: CandlestickData[] = klineData
      .filter(
        (item) => item.time && item.open && item.high && item.low && item.close
      )
      .map((item) => ({
        time: (new Date(item.time).getTime() / 1000) as Time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number))

    if (formattedData.length > 0) {
      candlestickSeriesRef.current.setData(formattedData)

      // 設置成交量數據
      if (volumeSeriesRef.current && showVolume) {
        const volumeData: HistogramData[] = klineData
          .filter((item) => item.time && item.volume !== undefined)
          .map((item) => {
            const isUp = item.close >= item.open
            return {
              time: (new Date(item.time).getTime() / 1000) as Time,
              value: item.volume!,
              color: isUp ? '#ff4444' : '#00C851',
            }
          })
          .sort((a, b) => (a.time as number) - (b.time as number))

        if (volumeData.length > 0) {
          volumeSeriesRef.current.setData(volumeData)
        }
      }

      // 設置MA數據
      if (showMA) {
        if (ma5SeriesRef.current) {
          const ma5Data = klineData
            .filter(
              (item) =>
                item.ma5 !== null && item.ma5 !== undefined && item.ma5 > 0
            )
            .map((item) => ({
              time: (new Date(item.time).getTime() / 1000) as Time,
              value: item.ma5!,
            }))
            .sort((a, b) => (a.time as number) - (b.time as number))

          if (ma5Data.length > 0) {
            ma5SeriesRef.current.setData(ma5Data)
          }
        }

        if (ma10SeriesRef.current) {
          const ma10Data = klineData
            .filter(
              (item) =>
                item.ma10 !== null && item.ma10 !== undefined && item.ma10 > 0
            )
            .map((item) => ({
              time: (new Date(item.time).getTime() / 1000) as Time,
              value: item.ma10!,
            }))
            .sort((a, b) => (a.time as number) - (b.time as number))

          if (ma10Data.length > 0) {
            ma10SeriesRef.current.setData(ma10Data)
          }
        }

        if (ma20SeriesRef.current) {
          const ma20Data = klineData
            .filter(
              (item) =>
                item.ma20 !== null && item.ma20 !== undefined && item.ma20 > 0
            )
            .map((item) => ({
              time: (new Date(item.time).getTime() / 1000) as Time,
              value: item.ma20!,
            }))
            .sort((a, b) => (a.time as number) - (b.time as number))

          if (ma20Data.length > 0) {
            ma20SeriesRef.current.setData(ma20Data)
          }
        }
      }

      // 自動調整視圖
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent()
      }
    }
  }, [klineData, showVolume, showMA])

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 簡潔標題欄 */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{symbol}</h3>
            <p className="text-sm text-gray-500">
              {interval} K線 • 簡潔版
              {enableRealtime && isWebSocketConnected && ' • 🟢 即時'}
            </p>
          </div>

          {/* 時間間隔按鈕 */}
          <div className="flex space-x-1">
            {['1m', '5m', '15m', '1h', '1d'].map((int) => (
              <button
                key={int}
                onClick={() => onIntervalChange?.(int)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  interval === int
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {int}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 圖表容器 */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-gray-500">載入中...</div>
          </div>
        )}

        <div
          ref={chartContainerRef}
          className="w-full"
          style={{ height: `${height}px` }}
        />
      </div>

      {/* 簡潔工具欄 */}
      <div className="p-2 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-500">
            {klineData.length > 0 ? `${klineData.length} 條數據` : '無數據'}
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {showVolume && <span className="text-gray-500">📊 成交量</span>}
            {showMA && <span className="text-gray-500">📈 MA線</span>}
            {enableRealtime && (
              <span
                className={`${isWebSocketConnected ? 'text-green-600' : 'text-red-600'}`}
              >
                {isWebSocketConnected ? '🟢 即時' : '🔴 離線'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
