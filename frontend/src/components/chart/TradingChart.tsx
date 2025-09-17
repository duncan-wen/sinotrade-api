// @ts-nocheck
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
import { View } from 'react-native'
import {
  klineWebSocketService,
  KlineData,
  KlineMessage,
  TickData,
} from '@/services/klineWebsocket'

export interface KLineData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface TradingChartProps {
  data?: KLineData[] // 可選,因為會通過API獲取
  symbol: string
  className?: string
  height?: number
  width?: number
  showVolume?: boolean
  interval?: string // K線間隔,默認5m
  enableRealtime?: boolean // 是否啟用即時更新
}

export function TradingChart({
  data: initialData,
  symbol,
  className = '',
  height = 400,
  width,
  showVolume = true,
  interval = '5m',
  enableRealtime = true,
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [klineData, setKlineData] = useState<KLineData[]>(initialData || [])
  const [contractInfo, setContractInfo] = useState<{
    symbol: string
    name: string
    code: string
    exchange: string
  } | null>(null)

  // 獲取歷史K線數據
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (initialData) {
        // 如果有傳入數據,直接使用
        setKlineData(initialData)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        // 切換股票時先清空舊數據
        setKlineData([])
        const response = await fetch(
          `/api/klines/${symbol}?interval=${interval}&limit=100`
        )
        const result = await response.json()

        if (result.data) {
          console.log('📊 API歷史K線數據:', result.data.slice(0, 3)) // 只顯示前3條
          console.log('📋 合約資訊:', result.contract) // 顯示合約資訊

          // 設定合約資訊
          if (result.contract) {
            setContractInfo(result.contract)
          }

          // 確保數據格式統一,API數據應該已經是正確格式
          const formattedData = result.data.map((d: any) => ({
            time: d.time || d.timestamp,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume,
          }))
          setKlineData(formattedData)
        }
      } catch (error) {
        console.error('獲取歷史K線數據失敗:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistoricalData()
  }, [symbol, interval, initialData])

  // WebSocket即時更新
  useEffect(() => {
    if (!enableRealtime) return

    const handleKlineMessage = (message: KlineMessage) => {
      console.log('📊 處理圖表消息:', message)

      if (message.type === 'historical_klines') {
        // 處理歷史數據
        const historicalData = Array.isArray(message.data)
          ? message.data
          : [message.data]
        setKlineData((prevData) => {
          // 合併歷史數據,避免重複
          const existingTimestamps = new Set(prevData.map((d) => d.time))
          const newData = historicalData
            .filter((d) => {
              const timestamp = d.timestamp || d.time
              return !existingTimestamps.has(timestamp)
            })
            .filter((d) => {
              // 驗證歷史數據的有效性
              const timestamp = d.timestamp || d.time
              if (!timestamp || !d.open || !d.high || !d.low || !d.close) {
                console.warn('過濾無效歷史K線數據:', d)
                return false
              }
              // 驗證timestamp
              const timestampDate = new Date(timestamp)
              if (isNaN(timestampDate.getTime())) {
                console.warn('過濾無效歷史timestamp:', timestamp)
                return false
              }
              return true
            })

          const formattedNewData = newData.map((d) => ({
            time: d.timestamp || d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume,
          }))

          return [...prevData, ...formattedNewData].sort((a, b) => {
            const aTime = new Date(a.time).getTime()
            const bTime = new Date(b.time).getTime()
            // 處理無效時間的情況
            if (isNaN(aTime) && isNaN(bTime)) return 0
            if (isNaN(aTime)) return 1 // 無效時間排在後面
            if (isNaN(bTime)) return -1 // 無效時間排在後面
            return aTime - bTime
          })
        })
      } else if (message.type === 'kline') {
        // 處理即時K線更新
        const rawData = message.data as any

        // 從後端數據中提取K線字段(後端在data中包含symbol字段)
        const klineData: KlineData = {
          timestamp: rawData.timestamp,
          open: rawData.open,
          high: rawData.high,
          low: rawData.low,
          close: rawData.close,
          volume: rawData.volume,
        }

        // 驗證K線數據的有效性
        if (
          !klineData.timestamp ||
          klineData.open === undefined ||
          klineData.high === undefined ||
          klineData.low === undefined ||
          klineData.close === undefined
        ) {
          console.warn('⚠️ 無效的K線數據:', klineData, '原始數據:', rawData)
          return prevData
        }

        // 驗證timestamp的有效性
        const timestampDate = new Date(klineData.timestamp)
        if (isNaN(timestampDate.getTime())) {
          console.error(
            '❌ K線timestamp無效:',
            klineData.timestamp,
            '原始數據:',
            rawData
          )
          return prevData
        }

        setKlineData((prevData) => {
          const newKline = {
            time: klineData.timestamp,
            open: klineData.open,
            high: klineData.high,
            low: klineData.low,
            close: klineData.close,
            volume: klineData.volume,
          }

          // 檢查是否是更新現有K線還是新增
          const existingIndex = prevData.findIndex(
            (d) => d.time === newKline.time
          )
          if (existingIndex >= 0) {
            // 更新現有K線
            const updatedData = [...prevData]
            updatedData[existingIndex] = newKline
            return updatedData
          } else {
            // 新增K線
            return [...prevData, newKline]
              .sort((a, b) => {
                const aTime = new Date(a.time).getTime()
                const bTime = new Date(b.time).getTime()
                // 處理無效時間的情況
                if (isNaN(aTime) && isNaN(bTime)) return 0
                if (isNaN(aTime)) return 1 // 無效時間排在後面
                if (isNaN(bTime)) return -1 // 無效時間排在後面
                return aTime - bTime
              })
              .slice(-200) // 保留最新的200根K線
          }
        })
      } else if (message.type === 'tick') {
        // 處理即時tick更新 - 實現K棒跳動效果
        const rawData = message.data as any

        // 從後端數據中提取tick字段
        const tickData: TickData = {
          symbol: rawData.symbol,
          timestamp: rawData.timestamp,
          price: rawData.price,
          volume: rawData.volume || 0,
          amount: rawData.amount || 0,
          total_volume: rawData.total_volume || 0,
        }

        console.log('⚡ 處理tick數據:', tickData)

        setKlineData((prevData) => {
          console.log(
            '📊 當前K線數據長度:',
            prevData.length,
            '數據:',
            prevData.slice(-1)
          )
          if (prevData.length === 0) {
            console.log('⚠️ 沒有歷史K線數據,跳過tick更新')
            return prevData
          }

          // 獲取最新一條K線進行即時更新
          const latestKline = prevData[prevData.length - 1]
          console.log(
            '📊 最新K線:',
            latestKline,
            'time類型:',
            typeof latestKline.time,
            'time值:',
            latestKline.time
          )
          const tickPrice = tickData.price

          // 驗證tick數據的有效性
          if (
            !tickData.timestamp ||
            tickPrice === undefined ||
            tickPrice <= 0
          ) {
            console.warn('⚠️ 無效的tick數據:', tickData)
            return prevData
          }

          // 驗證tick時間的有效性
          const currentTime = new Date(tickData.timestamp)
          if (isNaN(currentTime.getTime())) {
            console.error('❌ tick時間戳無效:', tickData.timestamp)
            return prevData
          }

          // 驗證K線時間的有效性
          if (!latestKline.time) {
            console.error('❌ K線time字段為空或undefined:', latestKline)
            return prevData
          }

          const klineStartTime = new Date(latestKline.time)
          if (isNaN(klineStartTime.getTime())) {
            console.error(
              '❌ K線時間戳無效:',
              latestKline.time,
              '類型:',
              typeof latestKline.time
            )
            return prevData
          }

          // 計算當前K線的結束時間(5分鐘後)
          const klineEndTime = new Date(
            klineStartTime.getTime() + 5 * 60 * 1000
          ) // 5分鐘

          // 安全的時間格式化(避免無效時間導致錯誤)
          const formatTime = (date: Date) => {
            try {
              return date.toISOString()
            } catch (e) {
              return `無效時間: ${date}`
            }
          }

          console.log('⏰ 時間檢查:', {
            tickTime: formatTime(currentTime),
            klineStart: formatTime(klineStartTime),
            klineEnd: formatTime(klineEndTime),
            isWithinRange: currentTime < klineEndTime,
          })

          // 如果tick時間還在當前K線的時間範圍內,更新收盤價
          if (currentTime < klineEndTime) {
            const updatedKline = {
              ...latestKline,
              high: Math.max(latestKline.high, tickPrice), // 更新高點
              low: Math.min(latestKline.low, tickPrice), // 更新低點
              close: tickPrice, // 更新收盤價(即時跳動)
            }

            console.log('🔄 更新K線:', {
              舊: latestKline,
              新: updatedKline,
              tickPrice,
            })

            const updatedData = [...prevData]
            updatedData[prevData.length - 1] = updatedKline
            return updatedData
          }

          // 如果tick已經超出當前K線時間範圍,保持原有數據
          // 新的K線會由後端的kline消息處理
          console.log('⏳ tick超出當前K線時間範圍,等待新K線')
          return prevData
        })
      }
    }

    const connectWebSocket = async () => {
      try {
        await klineWebSocketService.connect()

        // WebSocket連接成功後立即訂閱
        klineWebSocketService.subscribe(symbol, handleKlineMessage)
      } catch (error) {
        console.error('WebSocket連接失敗:', error)
      }
    }

    connectWebSocket()

    return () => {
      klineWebSocketService.unsubscribe(symbol)
    }
  }, [symbol, enableRealtime])

  // 初始化圖表
  useEffect(() => {
    if (!chartContainerRef.current) return

    // 計算圖表高度分配
    const mainChartHeight = showVolume ? Math.floor(height * 0.7) : height
    const volumeChartHeight = showVolume ? Math.floor(height * 0.3) : 0

    // 創建圖表
    const chart = createChart(chartContainerRef.current, {
      width: width || chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1, // Normal crosshair mode
      },
      leftPriceScale: {
        borderColor: '#cccccc',
        visible: showVolume, // 只有顯示成交量時才顯示左側軸
        scaleMargins: {
          top: 0.7, // 成交量圖表在下方 30%
          bottom: 0,
        },
      },
      rightPriceScale: {
        borderColor: '#cccccc',
        scaleMargins: showVolume
          ? {
              top: 0.05,
              bottom: 0.35, // 為成交量留出空間
            }
          : {
              top: 0.05,
              bottom: 0.05, // 無成交量時正常邊距
            },
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    // 創建 K 線系列 - 台股顏色慣例:上漲紅色,下跌綠色
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#ff4444', // 上漲顏色(紅色)- 台股慣例
      downColor: '#00C851', // 下跌顏色(綠色)- 台股慣例
      borderDownColor: '#00C851',
      borderUpColor: '#ff4444',
      wickDownColor: '#00C851',
      wickUpColor: '#ff4444',
    })

    // 創建成交量系列(如果需要顯示)
    let volumeSeries = null
    if (showVolume) {
      volumeSeries = chart.addHistogramSeries({
        color: '#999999', // 預設灰色,實際顏色由數據決定
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'left', // 使用左側價格軸
      })
    }

    // 額外的時區設置(備用)
    chart.applyOptions({
      timeScale: {
        timeZone: 'Asia/Taipei',
      },
    })

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries
    volumeSeriesRef.current = volumeSeries
    setIsLoading(false)

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
  }, [height, width, showVolume])

  // 更新數據
  useEffect(() => {
    console.log('📈 更新圖表數據,K線數量:', klineData.length)
    console.log('📊 K線數據樣本:', klineData.slice(-3)) // 顯示最後3條K線

    if (!candlestickSeriesRef.current || !klineData.length) return

    // 轉換 K 線數據格式,過濾無效數據並確保時間排序
    const formattedData: CandlestickData[] = klineData
      .filter((item) => {
        // 檢查數據有效性
        if (
          !item.time ||
          !item.open ||
          !item.high ||
          !item.low ||
          !item.close
        ) {
          console.warn('過濾無效K線數據:', item)
          return false
        }

        // 檢查時間戳是否有效
        const timestamp = new Date(item.time).getTime()
        if (isNaN(timestamp)) {
          console.warn('過濾無效時間戳:', item.time)
          return false
        }

        return true
      })
      .map((item) => {
        const timestamp = new Date(item.time).getTime()
        // 將 UTC 時間轉換為台灣時間 (UTC+8)
        const taipeiTimestamp = timestamp + 8 * 60 * 60 * 1000 // +8小時
        console.log('K線時間戳調試:', {
          原始: item.time,
          UTC毫秒: timestamp,
          台灣毫秒: taipeiTimestamp,
          台灣時間: new Date(taipeiTimestamp).toLocaleString('zh-TW'),
        })
        return {
          time: (taipeiTimestamp / 1000) as Time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }
      })
      // 確保按時間升序排序
      .sort((a, b) => (a.time as number) - (b.time as number))

    // 設置 K 線數據
    if (formattedData.length > 0) {
      console.log('🔄 設置K線數據到圖表:', formattedData.length, '條')
      console.log('📈 K線數據樣本:', formattedData.slice(-2)) // 顯示最後2條
      candlestickSeriesRef.current.setData(formattedData)
    }

    // 設置成交量數據 - 台股顏色慣例:上漲紅色,下跌綠色
    if (volumeSeriesRef.current && showVolume) {
      const volumeData: HistogramData[] = klineData
        .filter((item) => {
          // 使用與K線數據相同的過濾邏輯
          if (
            !item.time ||
            !item.open ||
            !item.high ||
            !item.low ||
            !item.close
          ) {
            return false
          }
          const timestamp = new Date(item.time).getTime()
          if (isNaN(timestamp) || item.volume === undefined) {
            return false
          }
          return true
        })
        .map((item) => {
          const timestamp = new Date(item.time).getTime()
          // 使用與K線數據相同的台灣時間轉換
          const taipeiTimestamp = timestamp + 8 * 60 * 60 * 1000 // +8小時
          const time = (taipeiTimestamp / 1000) as Time
          const isUp = item.close >= item.open
          return {
            time,
            value: item.volume!,
            color: isUp ? '#ff4444' : '#00C851', // 台股慣例:上漲紅色,下跌綠色
          }
        })
        // 確保與K線數據相同的排序
        .sort((a, b) => (a.time as number) - (b.time as number))

      if (volumeData.length > 0) {
        volumeSeriesRef.current.setData(volumeData)
      }
    }

    // 自動調整視圖
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
      // 自動調整價格範圍以適應新數據
      setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent()
          // 強制重新計算價格範圍
          if (candlestickSeriesRef.current) {
            const priceScale = chartRef.current.priceScale('right')
            priceScale.applyOptions({
              autoScale: true,
            })
          }
        }
      }, 100) // 延遲確保數據已設置完成
    }
  }, [klineData, showVolume])

  return (
    <View className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 圖表標題 */}
      <View className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {contractInfo?.name ? `${contractInfo.name} (${symbol})` : symbol}
            </h3>
            <p className="text-sm text-gray-500">
              {interval} K線圖 {enableRealtime && '• 即時更新'}
              {contractInfo?.exchange && ` • ${contractInfo.exchange}`}
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
              1分
            </button>
            <button className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
              5分
            </button>
            <button className="px-3 py-1 text-xs bg-blue-500 text-white rounded">
              日線
            </button>
            <button className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
              週線
            </button>
          </div>
        </div>
      </View>

      {/* 圖表容器 */}
      <View className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-gray-500">載入圖表中...</div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="w-full min-w-0"
          style={{ height: `${height}px` }}
        />
      </View>

      {/* 圖表工具欄 */}
      <View className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">技術指標:</span>
            <button className="text-blue-600 hover:text-blue-800">MA</button>
            <button className="text-blue-600 hover:text-blue-800">MACD</button>
            <button className="text-blue-600 hover:text-blue-800">RSI</button>
            <button className="text-blue-600 hover:text-blue-800">KD</button>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showVolume}
                onChange={() => {}}
                className="rounded"
              />
              <span className="text-sm text-gray-600">顯示成交量</span>
            </label>
          </div>
          <div className="flex-1"></div>
          <div className="text-gray-500">
            {klineData.length > 0 && `${klineData.length} 筆數據`}
          </div>
        </div>
      </View>
    </View>
  )
}
