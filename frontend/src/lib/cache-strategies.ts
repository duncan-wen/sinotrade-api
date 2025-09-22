// 🚀 高性能緩存策略實現

import { useEffect } from 'react'
import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client-core'
import { createSyncStoragePersister } from '@tanstack/react-query-persist-client-core'

// 智能緩存配置
export const createOptimizedQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 根據數據類型設定不同的緩存策略
        staleTime: (query) => {
          const [type, symbol, interval] = query.queryKey as string[]

          switch (type) {
            case 'klines':
              // K線數據根據間隔設定緩存時間
              switch (interval) {
                case '1m':
                  return 30 * 1000 // 30秒
                case '5m':
                  return 60 * 1000 // 1分鐘
                case '15m':
                  return 3 * 60 * 1000 // 3分鐘
                case '1d':
                  return 5 * 60 * 1000 // 5分鐘
                default:
                  return 60 * 1000
              }
            case 'contracts':
              return 24 * 60 * 60 * 1000 // 24小時
            case 'realtime':
              return 1 * 1000 // 1秒
            default:
              return 5 * 60 * 1000
          }
        },

        gcTime: 10 * 60 * 1000, // 10分鐘後清除
        retry: (failureCount, error: any) => {
          // 金融數據快速失敗策略
          if (error?.status === 404) return false
          return failureCount < 2
        },

        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  })
}

// 本地存儲持久化
export const setupPersistence = (queryClient: QueryClient) => {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'sinotrade-cache',
    serialize: (data) => {
      // 只持久化重要數據,減少存儲空間
      const filtered = {
        ...data,
        clientState: {
          ...data.clientState,
          queries: data.clientState.queries.filter((query: any) => {
            const [type] = query.queryKey
            return ['contracts', 'user-preferences'].includes(type)
          }),
        },
      }
      return JSON.stringify(filtered)
    },
    deserialize: JSON.parse,
  })

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 24 * 60 * 60 * 1000, // 24小時
  })
}

// 智能預載入 Hook
export const useSmartPreload = (currentSymbol: string) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const preloadRelated = async () => {
      // 根據當前商品預載入相關數據
      const relatedSymbols = getRelatedSymbols(currentSymbol)

      const preloadTasks = relatedSymbols.map((symbol) =>
        queryClient.prefetchQuery({
          queryKey: ['klines', symbol, '1d'],
          queryFn: () =>
            fetch(`/api/klines/${symbol}?interval=1d`).then((r) => r.json()),
        })
      )

      await Promise.allSettled(preloadTasks)
    }

    // 延遲預載入,避免影響當前頁面性能
    const timer = setTimeout(preloadRelated, 1000)
    return () => clearTimeout(timer)
  }, [currentSymbol, queryClient])
}

// 相關商品邏輯
const getRelatedSymbols = (symbol: string): string[] => {
  // 期貨相關邏輯
  if (symbol.startsWith('TXF')) {
    return ['MXFR1', 'MXFR2', 'TXFR2'] // 相關期貨
  }

  // 股票相關邏輯
  if (['2330', '2317', '2454'].includes(symbol)) {
    return ['TSE001'] // 大型股 + 加權指數
  }

  return []
}

// 數據壓縮工具
export class DataCompressor {
  // Delta 編碼 - 減少數值傳輸量
  static deltaEncode(numbers: number[]): number[] {
    if (numbers.length === 0) return []

    const result = [numbers[0]]
    for (let i = 1; i < numbers.length; i++) {
      result.push(numbers[i] - numbers[i - 1])
    }
    return result
  }

  static deltaDecode(deltas: number[]): number[] {
    if (deltas.length === 0) return []

    const result = [deltas[0]]
    for (let i = 1; i < deltas.length; i++) {
      result.push(result[i - 1] + deltas[i])
    }
    return result
  }

  // K線數據壓縮
  static compressKlines(klines: any[]): any {
    if (klines.length === 0) return { compressed: true, data: {} }

    const timestamps = klines.map((k) => new Date(k.time).getTime())
    const opens = klines.map((k) => k.open)
    const highs = klines.map((k) => k.high)
    const lows = klines.map((k) => k.low)
    const closes = klines.map((k) => k.close)
    const volumes = klines.map((k) => k.volume)

    return {
      compressed: true,
      data: {
        t: this.deltaEncode(timestamps),
        o: this.deltaEncode(opens.map((v) => Math.round(v * 100))), // 保留2位小數
        h: highs.map((h, i) => Math.round((h - opens[i]) * 100)), // 相對於開盤價
        l: lows.map((l, i) => Math.round((l - opens[i]) * 100)),
        c: closes.map((c, i) => Math.round((c - opens[i]) * 100)),
        v: this.deltaEncode(volumes),
        length: klines.length,
      },
    }
  }

  static decompressKlines(compressed: any): any[] {
    if (!compressed.compressed) return compressed

    const { data } = compressed
    const timestamps = this.deltaDecode(data.t)
    const opens = this.deltaDecode(data.o).map((v) => v / 100)

    const result = []
    for (let i = 0; i < data.length; i++) {
      result.push({
        time: new Date(timestamps[i]).toISOString(),
        open: opens[i],
        high: opens[i] + data.h[i] / 100,
        low: opens[i] + data.l[i] / 100,
        close: opens[i] + data.c[i] / 100,
        volume: opens[i] + (this.deltaDecode(data.v)[i] || 0),
      })
    }

    return result
  }
}

// 性能監控 Hook
export const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime

      // 記錄組件渲染時間
      if (duration > 100) {
        // 超過100ms才記錄
        console.warn(`🐌 ${componentName} 渲染緩慢: ${duration.toFixed(2)}ms`)
      }
    }
  })

  // 記憶體使用監控
  useEffect(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      console.log(`📊 ${componentName} 記憶體使用:`, {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      })
    }
  }, [componentName])
}
