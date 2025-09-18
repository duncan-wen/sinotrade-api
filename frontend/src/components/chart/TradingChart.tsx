/**
 * TradingChart.tsx - 台股 K線圖表組件
 *
 * 🔧 [2025-09-18] 重要修正:時間間隔切換 K線消失問題
 *
 * 主要修正內容:
 * 1. 狀態重置機制:防止切換時間間隔時的狀態混亂
 * 2. 安全回退機制:處理時間戳格式衝突,確保圖表穩定運行
 * 3. 強制視圖調整:確保新數據正確顯示在可視範圍內
 *
 * ⚠️ 清理提醒:搜尋 "TODO: 未來可清理" 可找到所有可移除的調試代碼
 */

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
// Removed react-native import - using standard div
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
  autoFit?: boolean // 是否啟用自動適應圖表,默認true
  onIntervalChange?: (interval: string) => void // 時間間隔變更回調
}

export function TradingChart({
  data: initialData,
  symbol,
  className = '',
  height = 400,
  width,
  showVolume = true,
  interval = '1d',
  enableRealtime = true,
  autoFit = false,
  onIntervalChange,
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
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false)
  const [lastDataUpdateTime, setLastDataUpdateTime] = useState<number>(0)
  const [dataRange, setDataRange] = useState<{
    startTime: string
    endTime: string
    totalBars: number
    interval: string
    dataSource: string
  } | null>(null)
  const lastDataLengthRef = useRef<number>(0)
  const [isAutoFitEnabled, setIsAutoFitEnabled] = useState(autoFit)
  const [isVolumeVisible, setIsVolumeVisible] = useState(showVolume)

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

        // 檢測是否為期貨代碼
        const isFutures = /^(TX|MX|FX|EX)/i.test(symbol) || symbol.includes('F')

        // 計算交易時間範圍
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        let marketOpen, marketClose, currentTime, startTime

        if (isFutures) {
          // 期貨連續交易,不限制時間範圍
          currentTime = now
          startTime = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) // 7天前
          console.log('📅 期貨交易時間:連續交易,無時間限制', {
            商品代碼: symbol,
            當前時間: currentTime.toLocaleTimeString('zh-TW'),
            查詢範圍: '過去7天',
          })
        } else {
          // 台股開盤時間: 09:30
          marketOpen = new Date(today)
          marketOpen.setHours(9, 30, 0, 0)

          // 台股收盤時間: 13:30 (下午1:30)
          marketClose = new Date(today)
          marketClose.setHours(13, 30, 0, 0)

          // 當前時間,但不超過收盤時間
          currentTime = now > marketClose ? marketClose : now

          // 確保開始時間不早於開盤時間
          startTime = now < marketOpen ? marketOpen : marketOpen

          console.log('📅 台股交易時間範圍:', {
            開盤時間: marketOpen.toLocaleTimeString('zh-TW'),
            當前時間: currentTime.toLocaleTimeString('zh-TW'),
            市場狀態:
              now < marketOpen
                ? '未開盤'
                : now > marketClose
                  ? '已收盤'
                  : '交易中',
          })
        }

        // 🔧 [2025-09-18] 針對不同時間間隔的智能limit策略
        let smartLimit: number

        if (isFutures) {
          // 期貨連續交易策略:根據時間間隔設定較大的 limit
          if (interval === '60m' || interval === '1h') {
            smartLimit = 300 // 期貨24小時交易,需要更多數據
          } else if (interval === '15m') {
            smartLimit = 200 // 15分鐘間隔
          } else if (['1d', '1w', '1M'].includes(interval)) {
            smartLimit = 500 // 長期間隔
          } else {
            // 分鐘級別(1m, 5m):期貨連續交易
            smartLimit = 800 // 期貨需要更多數據覆蓋連續交易
          }
          console.log('🧠 期貨智能K線數量計算:', {
            時間間隔: interval,
            最終限制: smartLimit,
            策略: '期貨連續交易策略',
          })
        } else {
          // 股票交易策略
          if (interval === '60m' || interval === '1h') {
            // 1小時:匹配後端30天配置,每天4根K線 = 120根
            smartLimit = 150 // 留點緩衝
          } else if (interval === '15m') {
            // 15分鐘:匹配後端3天配置,每天16根K線 = 48根
            smartLimit = 60 // 留點緩衝
          } else if (
            interval === '1d' ||
            interval === '1w' ||
            interval === '1M'
          ) {
            // 長期間隔:使用較大的limit獲取足夠歷史數據
            smartLimit = 200
          } else {
            // 分鐘級別(1m, 5m):使用當日交易時段計算
            const tradingMinutes = Math.ceil(
              (currentTime.getTime() - startTime.getTime()) / (1000 * 60)
            )
            const intervalsInMinutes = interval === '5m' ? 5 : 1
            const estimatedBars = Math.ceil(tradingMinutes / intervalsInMinutes)
            const aggressiveLimit = Math.max(estimatedBars * 3, 100) // 3倍緩衝,最少100條
            smartLimit = Math.min(aggressiveLimit, 500) // 最多500條
          }
          console.log('🧠 股票智能K線數量計算:', {
            時間間隔: interval,
            最終限制: smartLimit,
            策略: '股票交易時段智能計算',
          })
        }

        // 使用智能計算的limit參數
        const apiUrl = `/api/klines/${symbol}?interval=${interval}&limit=${Math.floor(smartLimit)}`
        console.log('🔗 API請求(智能limit):', apiUrl)

        const response = await fetch(apiUrl)
        const result = await response.json()

        // 前端過濾:股票保留當日交易時段的數據,期貨保留全部數據
        if (result.data && result.data.length > 0) {
          const originalLength = result.data.length

          if (isFutures) {
            // 期貨連續交易,保留全部數據
            console.log(
              `📊 期貨連續交易: 保留全部 ${originalLength} 條數據,無時間限制`
            )
          } else {
            // 只對股票的短期分鐘級別時間間隔進行當日交易時段過濾
            // 1小時及以上的間隔包含完整的歷史數據,不需要過濾
            const shouldFilterByTradingHours = [
              '1m',
              '5m',
              '15m',
              '30m',
            ].includes(interval)

            if (shouldFilterByTradingHours) {
              // 過濾股票當日交易時段數據
              const filteredData = result.data.filter((item) => {
                const itemTime = new Date(item.time || item.timestamp)
                return itemTime >= startTime && itemTime <= currentTime
              })

              // 更新結果
              result.data = filteredData
              console.log(
                `🎯 股票時間過濾結果: ${originalLength} → ${result.data.length} 條`
              )
              console.log(
                `📊 股票交易時間範圍: ${startTime.toLocaleTimeString('zh-TW')} - ${currentTime.toLocaleTimeString('zh-TW')}`
              )
            } else {
              console.log(
                `📊 股票 ${interval} 間隔不使用交易時間過濾,保留全部 ${originalLength} 條數據`
              )
            }
          }
        }

        if (result.data) {
          // 分析獲取的數據範圍
          const dataLength = result.data.length
          const firstKline = result.data[0]
          const lastKline = result.data[dataLength - 1]

          // 安全的時間格式化
          const formatKlineTime = (timeStr) => {
            try {
              // 處理多種時間格式
              let date
              if (typeof timeStr === 'string') {
                // 明確指定為台灣時區(UTC+8)
                if (timeStr.includes('+') || timeStr.includes('Z')) {
                  // 已有時區信息,直接解析
                  date = new Date(timeStr)
                } else {
                  // 沒有時區信息,添加台灣時區
                  date = new Date(timeStr + '+08:00')
                }
              } else {
                date = new Date(timeStr)
              }

              return isNaN(date.getTime())
                ? '無效時間'
                : date.toLocaleTimeString('zh-TW')
            } catch (e) {
              return '解析錯誤'
            }
          }

          if (isFutures) {
            // 期貨數據統計
            console.log('📊 期貨K線數據統計:', {
              獲取數量: dataLength,
              實際時間範圍:
                firstKline && lastKline
                  ? `${formatKlineTime(firstKline.time)} - ${formatKlineTime(lastKline.time)}`
                  : '無數據',
              請求數量: `${Math.floor(smartLimit)}條`,
              涵蓋時段: '連續交易時段',
              數據類型: '期貨連續交易數據',
              過濾策略: '無時間限制',
            })
          } else {
            // 股票數據統計
            const expectedCount = Math.ceil(
              (currentTime.getTime() - startTime.getTime()) / (5 * 60 * 1000)
            )

            // 檢查數據覆蓋範圍
            const coverage = dataLength / expectedCount
            const isDataInsufficient = coverage < 0.6 // 低於60%覆蓋率認為不足

            console.log('📊 股票當日K線數據統計:', {
              獲取數量: dataLength,
              實際時間範圍:
                firstKline && lastKline
                  ? `${formatKlineTime(firstKline.time)} - ${formatKlineTime(lastKline.time)}`
                  : '無數據',
              預期數量: `${expectedCount}條 (理論值)`,
              激進請求: `${Math.floor(smartLimit)}條 (3倍緩衝)`,
              涵蓋時段: `開盤至${currentTime.toLocaleTimeString('zh-TW')}`,
              數據覆蓋率: `${(coverage * 100).toFixed(1)}%`,
              後端限制: isDataInsufficient
                ? '⚠️ tick聚合數據不足,僅保留最近1-2小時'
                : '✅ 正常',
              過濾策略: '前端時間範圍過濾',
            })

            // 如果數據不足,顯示警告
            if (isDataInsufficient) {
              console.warn('⚠️ 數據範圍限制:後端tick聚合只保留最近1-2小時數據')
              console.warn(
                '💡 建議:修改後端支援完整當日時間範圍或使用混合數據源'
              )
            }
          }

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

  // 🔧 [2025-09-18] 當K線數據變化時自動更新數據範圍信息
  useEffect(() => {
    if (klineData.length > 0) {
      const startTime = klineData[0].time
      const endTime = klineData[klineData.length - 1].time
      const isFutures = /^(TX|MX|FX|EX)/i.test(symbol) || symbol.includes('F')

      setDataRange({
        startTime: new Date(startTime).toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        endTime: new Date(endTime).toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        totalBars: klineData.length,
        interval: interval,
        dataSource: isFutures
          ? '期貨連續'
          : ['1m', '5m', '15m', '30m'].includes(interval)
            ? '當日交易'
            : '歷史數據',
      })
    }
  }, [klineData, interval, symbol])

  // WebSocket即時更新
  useEffect(() => {
    if (!enableRealtime) return

    // 檢查是否在瀏覽器環境且服務可用
    if (!klineSocketIOService) {
      console.warn('⚠️ Socket.IO 服務不可用 (SSR環境)')
      return
    }

    const handleKlineMessage = (message: KlineMessage) => {
      console.log('📊 處理圖表消息:', message.type, message.symbol)

      if (message.type === 'historical_klines') {
        // 處理歷史數據 - Socket.IO 數據結構
        const historicalData = message.klines || []
        console.log('📈 處理歷史K線數據:', historicalData)
        setKlineData((prevData) => {
          // 合併歷史數據,避免重複
          const existingTimestamps = new Set(prevData.map((d) => d.time))
          const newData = historicalData
            .filter((d) => {
              // 安全檢查數據結構
              if (!d || typeof d !== 'object') {
                console.warn('過濾無效數據結構:', d)
                return false
              }
              const timestamp = d.timestamp || d.time
              return timestamp && !existingTimestamps.has(timestamp)
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
      } else if (message.type === 'kline_update') {
        // 處理即時K線更新 - Socket.IO 結構
        const klineData = message.kline

        if (!klineData) {
          console.warn('K線更新數據為空:', message)
          return
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
        // 處理即時tick更新 - Socket.IO 結構
        const tickData = message.tick

        if (!tickData) {
          console.warn('Tick數據為空:', message)
          return
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
              volume: (latestKline.volume || 0) + (tickData.volume || 0), // 累積成交量
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

          // 如果tick已經超出當前K線時間範圍,創建新的K線
          console.log('📊 tick超出當前K線時間範圍,創建新K線')

          // 計算新K線的開始時間 (對齊到5分鐘邊界)
          const tickMinutes = currentTime.getMinutes()
          const alignedMinutes = Math.floor(tickMinutes / 5) * 5
          const newKlineStartTime = new Date(currentTime)
          newKlineStartTime.setMinutes(alignedMinutes, 0, 0) // 設定到5分鐘邊界

          const newKline = {
            time: newKlineStartTime.toISOString(),
            open: tickPrice,
            high: tickPrice,
            low: tickPrice,
            close: tickPrice,
            volume: tickData.volume || 0,
          }

          console.log('🆕 創建新K線:', {
            time: newKline.time,
            price: tickPrice,
            originalTickTime: formatTime(currentTime),
            alignedTime: formatTime(newKlineStartTime),
          })

          return [...prevData, newKline].slice(-200) // 保留最新200根K線
        })
      }
    }

    const connectWebSocket = async () => {
      try {
        console.log('🔗 準備連接 WebSocket,當前狀態:', isWebSocketConnected)

        // 避免重複連接
        if (isWebSocketConnected) {
          console.log('⚠️ WebSocket 已連接,跳過重複連接')
          // 只重新訂閱即可
          klineSocketIOService.subscribe(symbol, handleKlineMessage)
          return
        }

        // Socket.IO 自動連接,無需手動 connect
        setIsWebSocketConnected(true)

        // WebSocket連接成功後立即訂閱
        klineSocketIOService.subscribe(symbol, handleKlineMessage)
      } catch (error) {
        console.error('WebSocket連接失敗:', error)
        setIsWebSocketConnected(false)
      }
    }

    connectWebSocket()

    return () => {
      console.log('🧹 清理 WebSocket 訂閱:', symbol)
      if (klineSocketIOService) {
        klineSocketIOService.unsubscribe()
        // 注意:不調用 disconnect(),因為其他組件可能還在使用同一個 WebSocket 連接
      }
      // 重置連接狀態,允許下次重新連接
      setIsWebSocketConnected(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, enableRealtime]) // isWebSocketConnected 是 useEffect 的輸出,包含它會導致無限循環

  // 初始化圖表
  useEffect(() => {
    if (!chartContainerRef.current) return

    // 計算圖表高度分配
    const mainChartHeight = isVolumeVisible ? Math.floor(height * 0.7) : height
    const volumeChartHeight = isVolumeVisible ? Math.floor(height * 0.3) : 0

    // 創建圖表
    const chart = createChart(chartContainerRef.current, {
      width: width || chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
        attributionLogo: false, // 隱藏 TradingView logo
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1, // Normal crosshair mode
        vertLine: {
          labelVisible: true, // 顯示時間標籤
          width: 1,
          color: '#758696',
          style: 3, // dashed
        },
        horzLine: {
          labelVisible: true, // 顯示價格標籤
          width: 1,
          color: '#758696',
          style: 3, // dashed
        },
      },
      localization: {
        // 修正 hover 時的時間顯示
        timeFormatter: (time) => {
          // time 是 Unix 時間戳(秒)
          const date = new Date((time as number) * 1000)
          return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        },
      },
      leftPriceScale: {
        borderColor: '#cccccc',
        visible: isVolumeVisible, // 只有顯示成交量時才顯示左側軸
        scaleMargins: {
          top: 0.8, // 成交量在下方 20%
          bottom: 0, // 底部固定
        },
        // 確保價格軸刻度和標籤顯示
        ticksVisible: true,
        entireTextOnly: false,
      },
      rightPriceScale: {
        borderColor: '#cccccc',
        scaleMargins: isVolumeVisible
          ? {
              top: 0.05,
              bottom: 0.25, // 為成交量留出 20% 空間（對應 top: 0.8）
            }
          : {
              top: 0.05,
              bottom: 0.05, // 無成交量時正常邊距
            },
        // 確保價格軸刻度和標籤顯示
        ticksVisible: true,
        entireTextOnly: false,
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: false,
        // 根據autoFit設定控制視圖自動移動行為
        shiftVisibleRangeOnNewBar: autoFit, // 根據設定決定是否在新數據時自動移動視圖
        allowShiftVisibleRangeOnWhitespaceReplacement: autoFit, // 根據設定決定是否在替換空白時移動視圖
        fixRightEdge: false, // 不固定右邊緣,允許用戶自由導航
        // 確保時間軸標籤顯示
        visible: true,
        tickMarkFormatter: (time, tickMarkType, locale) => {
          // time 現在是 Unix 時間戳(秒)
          const date = new Date((time as number) * 1000) // 轉換為毫秒
          if (tickMarkType >= 2) {
            // Day or bigger
            return date.toLocaleDateString('zh-TW', {
              month: 'short',
              day: 'numeric',
            })
          }
          return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
          })
        },
      },
      handleScale: {
        // 確保用戶可以正常縮放和拖動
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        // 確保用戶可以正常滾動
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
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
    if (isVolumeVisible) {
      volumeSeries = chart.addHistogramSeries({
        color: '#999999', // 預設灰色,實際顏色由數據決定
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'left', // 使用左側價格軸
      })
    }

    // 明確設置台灣時區
    chart.applyOptions({
      timeScale: {
        timeZone: 'Asia/Taipei',
      },
    })

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries
    volumeSeriesRef.current = volumeSeries

    // 使用官方配置後,不再需要複雜的視圖保持邏輯
    // 只需簡單的日誌記錄來驗證功能正常
    console.log('📊 圖表已創建,使用官方防視圖移動配置')

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
  }, [height, width, isVolumeVisible, autoFit])

  // 動態更新自適應配置
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        timeScale: {
          shiftVisibleRangeOnNewBar: isAutoFitEnabled,
          allowShiftVisibleRangeOnWhitespaceReplacement: isAutoFitEnabled,
        },
      })
      console.log('🔧 更新自適應配置:', isAutoFitEnabled ? '啟用' : '停用')
    }
  }, [isAutoFitEnabled])

  // 更新數據
  useEffect(() => {
    console.log('📈 更新圖表數據,K線數量:', klineData.length) // TODO: 未來可清理
    console.log('📊 K線數據樣本:', klineData.slice(-3)) // TODO: 未來可清理 - 顯示最後3條K線

    if (!candlestickSeriesRef.current || !klineData.length) {
      // TODO: 未來可清理 - 調試用,檢查無數據的原因
      if (!candlestickSeriesRef.current) {
        console.warn('⚠️ candlestickSeriesRef 未初始化')
      }
      if (!klineData.length) {
        console.warn('⚠️ klineData 為空,當前interval:', interval)
      }
      return
    }

    /**
     * 🔧 [重要修正] 時間間隔切換狀態重置機制
     *
     * 問題:當用戶切換時間間隔(如從1小時到15分鐘)時,lastDataLengthRef
     *      保持著上一個間隔的數據長度,導致圖表誤判為"增量更新",
     *      造成 K線消失或顯示異常
     *
     * 解決:每次數據更新時重置 lastDataLengthRef 為0,強制使用 setData()
     *      進行完整數據重新載入,確保切換間隔時顯示正確
     *
     * 日期:2025-09-18
     */
    if (lastDataLengthRef.current > 0) {
      console.log('🔄 重置數據長度記錄 (切換時間間隔)') // TODO: 未來可清理
      lastDataLengthRef.current = 0
    }

    // 官方配置已自動處理視圖保持

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
      .map((item, index) => {
        // 根據官方文檔,使用 Unix 時間戳(秒)
        const timestamp = new Date(item.time).getTime() / 1000 // 轉換為秒

        // 確保時間戳是有效數字
        if (isNaN(timestamp)) {
          console.error('❌ 無效的時間戳:', item.time)
          return null
        }

        return {
          time: timestamp as Time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }
      })
      .filter((item) => item !== null) // 過濾掉無效項目
      // 確保按時間升序排序(Unix 時間戳)
      .sort((a, b) => (a.time as number) - (b.time as number))

    if (formattedData.length > 0) {
      console.log('🔄 設置K線數據到圖表:', formattedData.length, '條')
      console.log('📈 K線數據樣本:', formattedData.slice(-2)) // 顯示最後2條

      // TODO: 未來可清理 - 調試用,檢查時間間隔切換問題
      console.log('📊 當前時間間隔:', interval)
      console.log('📊 數據時間範圍:', {
        第一條: new Date(
          (formattedData[0].time as number) * 1000
        ).toLocaleString('zh-TW'),
        最後一條: new Date(
          (formattedData[formattedData.length - 1].time as number) * 1000
        ).toLocaleString('zh-TW'),
        總條數: formattedData.length,
      })

      // 官方配置已處理視圖保持,簡化邏輯
      const isNewData = formattedData.length > lastDataLengthRef.current

      if (lastDataLengthRef.current > 0 && isNewData) {
        // 增量更新:只更新最後一根K線,官方配置自動保持視圖
        console.log('🔄 增量更新K線數據(官方配置保持視圖)') // TODO: 未來可清理
        const lastBar = formattedData[formattedData.length - 1]

        /**
         * 🔧 [重要修正] 時間戳格式衝突安全回退機制 - 增量更新
         *
         * 問題:切換時間間隔時,舊的數據格式可能與新數據產生衝突,
         *      lightweight-charts 的 update() 方法會拋出錯誤:
         *      "Cannot update oldest data, last time=[object Object]"
         *
         * 解決:使用 try-catch 捕獲更新錯誤,自動回退到 setData()
         *      進行完整數據重載,確保圖表在任何情況下都能正常顯示
         *
         * 日期:2025-09-18
         */
        try {
          if (
            typeof lastBar.time === 'number' &&
            !isNaN(lastBar.time as number)
          ) {
            candlestickSeriesRef.current.update(lastBar)
          } else {
            console.error('❌ lastBar時間戳無效,使用setData:', lastBar.time) // TODO: 未來可清理
            candlestickSeriesRef.current.setData(formattedData)
          }
        } catch (error) {
          console.warn('⚠️ update()失敗,回退到setData():', error.message) // TODO: 未來可清理
          candlestickSeriesRef.current.setData(formattedData)
        }
      } else if (lastDataLengthRef.current > 0) {
        // 更新現有K線:使用update方法
        console.log('🔄 更新現有K線數據(官方配置保持視圖)') // TODO: 未來可清理
        const lastBar = formattedData[formattedData.length - 1]

        /**
         * 🔧 [重要修正] 時間戳格式衝突安全回退機制 - 更新現有K線
         * 同上述增量更新的問題和解決方案
         * 日期:2025-09-18
         */
        try {
          if (
            typeof lastBar.time === 'number' &&
            !isNaN(lastBar.time as number)
          ) {
            candlestickSeriesRef.current.update(lastBar)
          } else {
            console.error('❌ lastBar時間戳無效,使用setData:', lastBar.time) // TODO: 未來可清理
            candlestickSeriesRef.current.setData(formattedData)
          }
        } catch (error) {
          console.warn('⚠️ update()失敗,回退到setData():', error.message) // TODO: 未來可清理
          candlestickSeriesRef.current.setData(formattedData)
        }
      } else {
        // 初始載入:全量更新
        console.log('🔄 初始載入K線數據') // TODO: 未來可清理
        candlestickSeriesRef.current.setData(formattedData)

        /**
         * 🔧 [重要修正] 條件性視圖調整機制
         *
         * 問題:切換時間間隔時,新數據的時間範圍可能與當前視圖範圍不匹配,
         *      導致 K線超出可視範圍,用戶看不到新載入的數據
         *
         * 解決:根據autoFit設定決定是否執行 fitContent(),
         *      只有在啟用自適應時才自動調整視圖
         *
         * 日期:2025-09-18
         */
        if (isAutoFitEnabled) {
          setTimeout(() => {
            if (chartRef.current?.timeScale) {
              console.log('🔄 自適應:強制調整視圖適應新數據') // TODO: 未來可清理
              chartRef.current.timeScale().fitContent()
            }
          }, 100)
        }
      }

      // 更新數據長度記錄
      lastDataLengthRef.current = formattedData.length
    } else {
      // TODO: 未來可清理 - 調試用,分析空數據情況
      console.warn('⚠️ 沒有K線數據!')
      console.log('📊 當前時間間隔:', interval)
      console.log('📊 原始數據:', klineData?.slice(0, 3))
      console.log('📊 過濾後數據長度:', formattedData.length)
    }

    setLastDataUpdateTime(Date.now())

    // 設置成交量數據 - 台股顏色慣例:上漲紅色,下跌綠色
    if (volumeSeriesRef.current && isVolumeVisible) {
      const volumeData: HistogramData[] = klineData
        .filter((item) => {
          // 使用與K線數據相同的過濾邏輯
          if (
            !item.time ||
            !item.open ||
            !item.high ||
            !item.low ||
            !item.close ||
            item.volume === undefined
          ) {
            return false
          }
          // 驗證時間字符串是否有效
          const date = new Date(item.time)
          if (isNaN(date.getTime())) {
            return false
          }
          return true
        })
        .map((item) => {
          // 使用與K線數據相同的 Unix 時間戳格式
          const timestamp = new Date(item.time).getTime() / 1000 // 轉換為秒
          const isUp = item.close >= item.open
          return {
            time: timestamp as Time,
            value: item.volume!,
            color: isUp ? '#ff4444' : '#00C851', // 台股慣例:上漲紅色,下跌綠色
          }
        })
        // 確保與K線數據相同的排序(Unix 時間戳)
        .sort((a, b) => (a.time as number) - (b.time as number))

      if (volumeData.length > 0) {
        console.log('📊 設置成交量數據:', volumeData.length, '條')

        // 成交量總是全量更新,避免歷史數據丟失
        volumeSeriesRef.current.setData(volumeData)
      }
    }

    // 🔧 [2025-09-18] 條件性智能自動調整策略:商品切換和初始載入
    const isInitialLoad = lastDataLengthRef.current === 0
    const hasValidData = klineData.length > 0 && chartRef.current

    // 需要自動調整的情況:
    // 1. 啟用自適應功能時
    // 2. 初始載入時
    // 3. 有有效數據時(包含商品切換,解決價格範圍差異問題)
    const shouldAutoFit =
      isAutoFitEnabled &&
      (isInitialLoad || hasValidData) &&
      klineData.length > 0

    if (shouldAutoFit && chartRef.current) {
      console.log('🎯 自適應:自動調整價格範圍:', {
        原因: isInitialLoad ? '初始載入' : '數據更新/商品切換',
        數據長度: klineData.length,
        前一次長度: lastDataLengthRef.current,
        商品代號: symbol,
        自適應狀態: isAutoFitEnabled,
      })

      // 先調整時間軸
      chartRef.current.timeScale().fitContent()

      // 延遲調整價格軸,確保數據渲染完成
      setTimeout(() => {
        if (chartRef.current && candlestickSeriesRef.current) {
          // 強制重新計算並適應價格範圍
          const priceScale = chartRef.current.priceScale('right')
          priceScale.applyOptions({
            autoScale: true,
          })

          // 再次調整時間軸以確保完整顯示
          chartRef.current.timeScale().fitContent()

          console.log('✅ 自適應:價格範圍自動調整完成')
        }
      }, 150) // 增加延遲時間確保價格調整生效
    } else if (!isAutoFitEnabled) {
      console.log('🔒 自適應已停用,保持用戶調整的視圖位置')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klineData, isVolumeVisible, symbol]) // 添加symbol確保商品切換時自動調整價格範圍

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 圖表標題 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {contractInfo?.name ? `${contractInfo.name} (${symbol})` : symbol}
            </h3>
            <p className="text-sm text-gray-500">
              {interval} K線圖 {enableRealtime && '• 即時更新'}
              {contractInfo?.exchange && ` • ${contractInfo.exchange}`}
              {isVolumeVisible && ' • 含成交量'}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onIntervalChange?.('1m')}
              className={`px-3 py-1 text-xs rounded hover:bg-gray-200 transition-all ${
                interval === '1m'
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100'
              }`}
            >
              1分
            </button>
            <button
              onClick={() => onIntervalChange?.('5m')}
              className={`px-3 py-1 text-xs rounded hover:bg-gray-200 transition-all ${
                interval === '5m'
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100'
              }`}
            >
              5分
            </button>
            <button
              onClick={() => onIntervalChange?.('15m')}
              className={`px-3 py-1 text-xs rounded hover:bg-gray-200 transition-all ${
                interval === '15m'
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100'
              }`}
            >
              15分
            </button>
            <button
              onClick={() => onIntervalChange?.('60m')}
              className={`px-3 py-1 text-xs rounded hover:bg-gray-200 transition-all ${
                interval === '60m'
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100'
              }`}
            >
              1小時
            </button>
            <button
              onClick={() => onIntervalChange?.('1d')}
              className={`px-3 py-1 text-xs rounded hover:bg-gray-200 transition-all ${
                interval === '1d'
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100'
              }`}
            >
              日線
            </button>
            <button
              onClick={() => onIntervalChange?.('1w')}
              className={`px-3 py-1 text-xs rounded hover:bg-gray-200 transition-all ${
                interval === '1w'
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100'
              }`}
            >
              週線
            </button>
            <button
              onClick={() => onIntervalChange?.('1M')}
              className={`px-3 py-1 text-xs rounded hover:bg-gray-200 transition-all ${
                interval === '1M'
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100'
              }`}
            >
              月線
            </button>
          </div>
        </div>
      </div>

      {/* 圖表容器 */}
      <div className="relative">
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
      </div>

      {/* 圖表工具欄 */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
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
                checked={isVolumeVisible}
                onChange={(e) => setIsVolumeVisible(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-600">顯示成交量</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isAutoFitEnabled}
                onChange={(e) => setIsAutoFitEnabled(e.target.checked)}
                className="rounded"
              />
              <span
                className="text-sm text-gray-600 font-medium"
                title="啟用時會自動調整圖表視圖以適應新數據；停用時保持用戶手動調整的位置"
              >
                自適應圖表 {isAutoFitEnabled ? '🔒' : '🔓'}
              </span>
            </label>
          </div>
          <div className="flex-1"></div>
          {/* 數據範圍信息 */}
          <div className="text-xs text-gray-500 space-y-1">
            {dataRange ? (
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-gray-700">
                    {dataRange.totalBars} 根 {dataRange.interval} K線
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {dataRange.dataSource}
                  </span>
                </div>
                <div className="text-gray-500">
                  📅 {dataRange.startTime} ~ {dataRange.endTime}
                </div>
              </div>
            ) : (
              klineData.length > 0 && (
                <div className="text-gray-500">{klineData.length} 筆數據</div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
