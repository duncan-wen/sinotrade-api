'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { klineSocketIOService } from '@/services/klineSocketIO'
import type { KlineMessage } from '@/services/klineSocketIO'

interface FuturesPriceState {
  price: number | null
  isConnected: boolean
  lastUpdate: string | null
  error: string | null
}

interface UseFuturesPriceOptions {
  symbol?: string
  interval?: string
  enabled?: boolean
}

export function useFuturesPrice(options: UseFuturesPriceOptions = {}) {
  const { symbol = 'TXFR1', interval = '1m', enabled = true } = options

  const [state, setState] = useState<FuturesPriceState>({
    price: null,
    isConnected: false,
    lastUpdate: null,
    error: null,
  })

  const mountedRef = useRef(true)

  // 🎯 簡化版:直接處理價格更新
  const handleKlineMessage = useCallback((message: KlineMessage) => {
    if (!mountedRef.current) return

    let newPrice: number | null = null

    // 📊 從不同消息類型取得最新價格
    if (message.type === 'tick' && message.tick?.price) {
      newPrice = Number(message.tick.price)
    } else if (message.type === 'kline_update' && message.kline?.close) {
      newPrice = Number(message.kline.close)
    } else if (message.type === 'historical_klines' && message.klines?.length) {
      const lastKline = message.klines[message.klines.length - 1]
      newPrice = Number(lastKline.close)
    }

    // ✅ 直接更新價格,不需要 K 線處理
    if (newPrice && mountedRef.current) {
      setState((prev) => ({
        ...prev,
        price: newPrice,
        lastUpdate: new Date().toISOString(),
        error: null,
      }))
    }
  }, [])

  // 檢查連接狀態
  const checkConnectionStatus = useCallback(() => {
    if (!klineSocketIOService) return

    const isConnected = klineSocketIOService.isConnected
    setState((prev) => ({
      ...prev,
      isConnected,
      error: isConnected ? null : '期貨價格服務未連接',
    }))
  }, [])

  // 📡 訂閱期貨價格數據
  useEffect(() => {
    if (!enabled || !klineSocketIOService) return

    console.log(`📊 [useFuturesPrice] 訂閱期貨價格: ${symbol}`)

    // 直接訂閱價格數據
    klineSocketIOService.subscribe(symbol, handleKlineMessage, interval)

    // 檢查初始連接狀態
    checkConnectionStatus()

    // 定期檢查連接狀態
    const statusCheckInterval = setInterval(checkConnectionStatus, 5000)

    return () => {
      console.log(`📊 [useFuturesPrice] 取消訂閱期貨價格: ${symbol}`)
      klineSocketIOService.unsubscribe()
      clearInterval(statusCheckInterval)
    }
  }, [enabled, symbol, interval, handleKlineMessage, checkConnectionStatus])

  // 清理
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // 手動重新連接
  const reconnect = useCallback(() => {
    if (klineSocketIOService) {
      klineSocketIOService.reconnect()
    }
  }, [])

  return {
    // 📊 狀態
    price: state.price,
    isConnected: state.isConnected,
    lastUpdate: state.lastUpdate,
    error: state.error,

    // 🔧 操作方法
    reconnect,

    // 📈 統計信息
    connectionStats: klineSocketIOService?.getConnectionStatus() || null,
  }
}
