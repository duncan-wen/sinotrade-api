'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { websocketService } from '@/services/websocket'
import type {
  OptionQuote,
  OptionQuoteUpdate,
  OptionContract,
} from '@/types/api'

interface UseOptionsQuotesOptions {
  enabled?: boolean
  autoReconnect?: boolean
}

interface OptionsQuotesState {
  quotes: Record<string, OptionQuote>
  isConnected: boolean
  isSubscribed: boolean
  error: string | null
  lastUpdate: string | null
  subscribedSymbols: string[]
}

export function useOptionsQuotes(options: UseOptionsQuotesOptions = {}) {
  const { enabled = true, autoReconnect = true } = options

  const [state, setState] = useState<OptionsQuotesState>({
    quotes: {},
    isConnected: false,
    isSubscribed: false,
    error: null,
    lastUpdate: null,
    subscribedSymbols: [],
  })

  const subscriberIdRef = useRef(`options-quotes-${Date.now()}`)
  const mountedRef = useRef(true)

  // 更新報價數據
  const updateQuote = useCallback((symbol: string, quote: OptionQuote) => {
    if (!mountedRef.current) return

    setState((prev) => ({
      ...prev,
      quotes: {
        ...prev.quotes,
        [symbol]: quote,
      },
      lastUpdate: new Date().toISOString(),
    }))
  }, [])

  // 處理 WebSocket 事件回調
  const handleQuoteUpdate = useCallback(
    (quote: any) => {
      if (!mountedRef.current) return

      // 轉換為選擇權報價格式
      const optionQuote: OptionQuote = {
        symbol: quote.symbol,
        bid_price: quote.bid_price || quote.price - 0.5,
        ask_price: quote.ask_price || quote.price + 0.5,
        last_price: quote.last_price || quote.price,
        volume: quote.volume || 0,
        open_interest: quote.open_interest || 0,
        timestamp: quote.timestamp,
      }

      updateQuote(quote.symbol, optionQuote)
    },
    [updateQuote]
  )

  const handleConnect = useCallback(() => {
    if (!mountedRef.current) return

    setState((prev) => ({
      ...prev,
      isConnected: true,
      error: null,
    }))
  }, [])

  const handleDisconnect = useCallback((reason: string) => {
    if (!mountedRef.current) return

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isSubscribed: false,
      error: `連接斷開: ${reason}`,
    }))
  }, [])

  const handleError = useCallback((error: Error) => {
    if (!mountedRef.current) return

    setState((prev) => ({
      ...prev,
      error: error.message,
    }))
  }, [])

  // 設置選擇權合約（不使用 WebSocket 訂閱）
  const subscribeToOptions = useCallback(
    (contracts: OptionContract[]) => {
      if (!enabled || contracts.length === 0) return

      const symbols = contracts.map((contract) => contract.symbol)

      setState((prev) => ({
        ...prev,
        subscribedSymbols: symbols,
        isSubscribed: true,
      }))

      console.log(
        '📊 [useOptionsQuotes] 設置選擇權合約（不使用 WebSocket）:',
        symbols.length
      )
    },
    [enabled]
  )

  // 清除選擇權合約
  const unsubscribeFromOptions = useCallback(() => {
    setState((prev) => ({
      ...prev,
      subscribedSymbols: [],
      isSubscribed: false,
      quotes: {}, // 清除所有報價數據
    }))
    console.log('📊 [useOptionsQuotes] 清除選擇權合約和報價數據')
  }, [])

  // 訂閱特定合約的報價
  const subscribeToContract = useCallback(
    (contract: OptionContract) => {
      return subscribeToOptions([contract])
    },
    [subscribeToOptions]
  )

  // 手動重新連接
  const reconnect = useCallback(() => {
    if (!enabled) return

    websocketService.reconnect()
  }, [enabled])

  // 清除錯誤
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }))
  }, [])

  // 瀏覽器關閉或頁面跳轉時清理數據
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('📊 [useOptionsQuotes] 頁面卸載，清理選擇權報價數據')
      unsubscribeFromOptions()
      mountedRef.current = false
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [unsubscribeFromOptions])

  // 獲取特定合約的報價
  const getQuote = useCallback(
    (symbol: string): OptionQuote | null => {
      return state.quotes[symbol] || null
    },
    [state.quotes]
  )

  // 獲取多個合約的報價
  const getQuotes = useCallback(
    (symbols: string[]): Record<string, OptionQuote> => {
      const result: Record<string, OptionQuote> = {}
      symbols.forEach((symbol) => {
        if (state.quotes[symbol]) {
          result[symbol] = state.quotes[symbol]
        }
      })
      return result
    },
    [state.quotes]
  )

  // 生成模擬報價數據（在實際 WebSocket 連接前使用）
  const generateMockQuote = useCallback(
    (contract: OptionContract): OptionQuote => {
      const basePrice = Math.random() * 200 + 50
      const spread = basePrice * 0.02 // 2% 價差

      return {
        symbol: contract.symbol,
        bid_price: basePrice - spread / 2,
        ask_price: basePrice + spread / 2,
        last_price: basePrice,
        volume: Math.floor(Math.random() * 1000 + 100),
        open_interest: Math.floor(Math.random() * 5000 + 500),
        timestamp: new Date().toISOString(),
      }
    },
    []
  )

  // 為多個合約生成模擬報價
  const generateMockQuotes = useCallback(
    (contracts: OptionContract[]): Record<string, OptionQuote> => {
      const mockQuotes: Record<string, OptionQuote> = {}

      contracts.forEach((contract) => {
        mockQuotes[contract.symbol] = generateMockQuote(contract)
      })

      // 更新狀態中的報價
      setState((prev) => ({
        ...prev,
        quotes: {
          ...prev.quotes,
          ...mockQuotes,
        },
        lastUpdate: new Date().toISOString(),
      }))

      return mockQuotes
    },
    [generateMockQuote]
  )

  // 初始化 WebSocket 連接
  useEffect(() => {
    if (!enabled) return

    const initConnection = async () => {
      try {
        await websocketService.connect()
      } catch (error) {
        console.error('WebSocket 連接失敗:', error)
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error.message : '連接失敗',
          }))
        }
      }
    }

    initConnection()
  }, [enabled])

  // 清理
  useEffect(() => {
    return () => {
      mountedRef.current = false
      // 清理時直接取消訂閱，不依賴 state
      websocketService.unsubscribe(subscriberIdRef.current)
    }
  }, [])

  return {
    // 狀態
    quotes: state.quotes,
    isConnected: state.isConnected,
    isSubscribed: state.isSubscribed,
    error: state.error,
    lastUpdate: state.lastUpdate,
    subscribedSymbols: state.subscribedSymbols,

    // 操作方法
    subscribeToOptions,
    subscribeToContract,
    unsubscribeFromOptions,
    reconnect,
    clearError,
    getQuote,
    getQuotes,

    // 模擬數據方法（開發測試用）
    generateMockQuote,
    generateMockQuotes,

    // WebSocket 狀態
    connectionStats: websocketService.getStats(),
  }
}
