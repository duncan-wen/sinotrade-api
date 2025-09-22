// 🚀 優化K線Hook - 整合多種跳轉策略

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  SmartKlineManager,
  TimeDrivenKlineManager,
  KlineData,
  KlineEvent,
  TickData,
} from '../services/OptimizedKlineManager'

export interface UseOptimizedKlineOptions {
  strategy: 'smart' | 'time-driven' | 'hybrid'
  enablePerformanceMonitoring: boolean
  maxKlines: number
}

export interface KlineMetrics {
  jumpAccuracy: string
  averageLatency: string
  totalJumps: number
  lastUpdate: string
}

/**
 * 🎯 優化K線Hook - 解決跳轉問題
 */
export const useOptimizedKline = (
  symbol: string,
  interval: string,
  options: UseOptimizedKlineOptions = {
    strategy: 'smart',
    enablePerformanceMonitoring: true,
    maxKlines: 200,
  }
) => {
  const [klineData, setKlineData] = useState<KlineData[]>([])
  const [metrics, setMetrics] = useState<KlineMetrics | null>(null)
  const [isReady, setIsReady] = useState(false)

  // 管理器實例
  const smartManagerRef = useRef<SmartKlineManager | null>(null)
  const timeDrivenManagerRef = useRef<TimeDrivenKlineManager | null>(null)

  // 初始化管理器
  useEffect(() => {
    if (options.strategy === 'smart' || options.strategy === 'hybrid') {
      smartManagerRef.current = new SmartKlineManager()
    }

    if (options.strategy === 'time-driven' || options.strategy === 'hybrid') {
      timeDrivenManagerRef.current = new TimeDrivenKlineManager()

      // 設置事件處理器
      timeDrivenManagerRef.current.onKlineEvent(
        symbol,
        interval,
        handleKlineEvent
      )

      // 啟動時間驅動
      timeDrivenManagerRef.current.startInterval(symbol, interval)
    }

    setIsReady(true)

    return () => {
      // 清理資源
      timeDrivenManagerRef.current?.cleanup()
      smartManagerRef.current?.cleanup()
    }
  }, [symbol, interval, options.strategy])

  /**
   * 🎯 處理K線事件
   */
  const handleKlineEvent = useCallback(
    (event: KlineEvent) => {
      console.log('📊 K線事件:', event.action, event.kline.time)

      setKlineData((prevData) => {
        switch (event.action) {
          case 'create':
            // 創建新K線
            const newData = [...prevData, event.kline].slice(-options.maxKlines)
            console.log('🆕 新K線創建:', {
              time: event.kline.time,
              price: event.kline.close,
              latency: event.metadata.latency,
            })
            return newData

          case 'update':
            // 更新現有K線
            if (prevData.length === 0) return prevData

            const updatedData = [...prevData]
            updatedData[updatedData.length - 1] = event.kline
            return updatedData

          case 'complete':
            // K線完成 - 可以觸發技術指標計算
            console.log('✅ K線完成:', event.kline.time)
            return prevData

          default:
            return prevData
        }
      })

      // 更新性能指標
      if (options.enablePerformanceMonitoring && smartManagerRef.current) {
        const performanceData = smartManagerRef.current.getPerformanceMetrics()
        setMetrics({
          jumpAccuracy: performanceData.accuracy,
          averageLatency: performanceData.averageJumpLatency,
          totalJumps: performanceData.totalJumps,
          lastUpdate: new Date().toLocaleTimeString(),
        })
      }
    },
    [options.maxKlines, options.enablePerformanceMonitoring]
  )

  /**
   * 🔥 處理Tick數據 - 核心邏輯
   */
  const processTick = useCallback(
    (tickData: TickData) => {
      if (!isReady) return

      switch (options.strategy) {
        case 'smart':
          if (smartManagerRef.current) {
            const event = smartManagerRef.current.processTick(
              tickData,
              interval
            )
            handleKlineEvent(event)
          }
          break

        case 'time-driven':
          if (timeDrivenManagerRef.current) {
            timeDrivenManagerRef.current.updateWithTick(
              tickData,
              symbol,
              interval
            )
          }
          break

        case 'hybrid':
          // 混合策略:短期用smart,長期用time-driven
          if (
            ['1m', '5m', '15m'].includes(interval) &&
            smartManagerRef.current
          ) {
            const event = smartManagerRef.current.processTick(
              tickData,
              interval
            )
            handleKlineEvent(event)
          } else if (timeDrivenManagerRef.current) {
            timeDrivenManagerRef.current.updateWithTick(
              tickData,
              symbol,
              interval
            )
          }
          break
      }
    },
    [isReady, options.strategy, interval, symbol, handleKlineEvent]
  )

  /**
   * 📊 手動創建K線 - 用於測試
   */
  const createTestKline = useCallback(
    (price: number) => {
      if (!isReady) return

      const testTick: TickData = {
        symbol,
        price,
        volume: Math.floor(Math.random() * 1000),
        timestamp: Date.now(),
      }

      processTick(testTick)
    },
    [isReady, symbol, processTick]
  )

  /**
   * 🔄 重置K線數據
   */
  const resetKlines = useCallback(() => {
    setKlineData([])

    if (timeDrivenManagerRef.current) {
      timeDrivenManagerRef.current.cleanup()
      timeDrivenManagerRef.current.startInterval(symbol, interval)
    }
  }, [symbol, interval])

  /**
   * 📈 獲取統計信息
   */
  const getStatistics = useCallback(() => {
    return {
      totalKlines: klineData.length,
      latestTime: klineData[klineData.length - 1]?.time,
      priceRange:
        klineData.length > 0
          ? {
              high: Math.max(...klineData.map((k) => k.high)),
              low: Math.min(...klineData.map((k) => k.low)),
            }
          : null,
      volumeTotal: klineData.reduce((sum, k) => sum + k.volume, 0),
      strategy: options.strategy,
      metrics,
    }
  }, [klineData, options.strategy, metrics])

  return {
    // 數據
    klineData,
    metrics,
    isReady,

    // 方法
    processTick,
    createTestKline,
    resetKlines,
    getStatistics,

    // 狀態
    isEmpty: klineData.length === 0,
    latestKline: klineData[klineData.length - 1] || null,
    totalKlines: klineData.length,
  }
}

/**
 * 🎯 效能測試Hook
 */
export const useKlinePerformanceTest = (symbol: string, interval: string) => {
  const [testResults, setTestResults] = useState<
    {
      strategy: string
      averageLatency: number
      accuracy: number
      testCount: number
    }[]
  >([])

  const runPerformanceTest = useCallback(
    async (tickCount: number = 1000) => {
      const strategies = ['smart', 'time-driven'] as const
      const results = []

      for (const strategy of strategies) {
        console.log(`🧪 測試策略: ${strategy}`)

        let manager: SmartKlineManager | TimeDrivenKlineManager

        if (strategy === 'smart') {
          manager = new SmartKlineManager()
        } else {
          manager = new TimeDrivenKlineManager()
        }

        const latencies: number[] = []
        let correctJumps = 0
        let totalJumps = 0

        // 生成測試數據
        const baseTime = Date.now()

        for (let i = 0; i < tickCount; i++) {
          const tickTime = baseTime + i * 30000 // 每30秒一個tick
          const tick: TickData = {
            symbol,
            price: 100 + Math.random() * 10,
            volume: Math.floor(Math.random() * 1000),
            timestamp: tickTime,
          }

          const startTime = performance.now()

          if (strategy === 'smart' && manager instanceof SmartKlineManager) {
            const event = manager.processTick(tick, interval)
            const latency = performance.now() - startTime
            latencies.push(latency)

            if (event.action === 'create') {
              totalJumps++
              // 簡單的正確性檢查
              const expectedBoundary = Math.floor(tickTime / 60000) * 60000
              const actualBoundary = new Date(event.kline.time).getTime()
              if (Math.abs(expectedBoundary - actualBoundary) < 1000) {
                correctJumps++
              }
            }
          }
        }

        const avgLatency =
          latencies.reduce((sum, l) => sum + l, 0) / latencies.length
        const accuracy =
          totalJumps > 0 ? (correctJumps / totalJumps) * 100 : 100

        results.push({
          strategy,
          averageLatency: avgLatency,
          accuracy,
          testCount: tickCount,
        })

        // 清理
        if (manager instanceof TimeDrivenKlineManager) {
          manager.cleanup()
        }
      }

      setTestResults(results)
      return results
    },
    [symbol, interval]
  )

  return {
    testResults,
    runPerformanceTest,
    clearResults: () => setTestResults([]),
  }
}

// 使用示例和最佳實踐
export const KlineOptimizationGuide = {
  /**
   * 🎯 推薦配置
   */
  recommendedConfig: {
    // 高頻交易場景
    highFrequency: {
      strategy: 'smart' as const,
      enablePerformanceMonitoring: true,
      maxKlines: 500,
    },

    // 一般交易場景
    normal: {
      strategy: 'hybrid' as const,
      enablePerformanceMonitoring: false,
      maxKlines: 200,
    },

    // 低延遲要求
    lowLatency: {
      strategy: 'time-driven' as const,
      enablePerformanceMonitoring: false,
      maxKlines: 100,
    },
  },

  /**
   * 📊 間隔策略建議
   */
  intervalStrategies: {
    '1m': '建議使用smart策略,預載入效果最佳',
    '5m': '建議使用smart策略,平衡性能和準確性',
    '15m': '建議使用hybrid策略,減少計算負擔',
    '1h': '建議使用time-driven策略,時間精確',
    '1d': '建議交給後端處理,前端只負責渲染',
  },

  /**
   * 🔧 故障排除
   */
  troubleshooting: {
    K線不跳轉: '檢查時間邊界計算邏輯',
    跳轉延遲高: '考慮使用smart策略的預載入',
    記憶體使用過高: '減少maxKlines或清理緩存',
    時間不準確: '確保客戶端時間同步',
  },
}
