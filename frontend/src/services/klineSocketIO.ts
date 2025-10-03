/**
 * K線 Socket.IO 服務 - 處理即時5分鐘K線數據
 * 使用 Socket.IO 自動降級機制 (WebSocket → HTTP Long Polling)
 */

import { io, Socket } from 'socket.io-client'

export interface KlineData {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TickData {
  symbol: string
  timestamp: string
  price: number
  volume: number
  amount: number
  total_volume: number
}

export interface KlineMessage {
  type: 'historical_klines' | 'tick' | 'kline_update'
  symbol: string
  interval: string
  klines?: KlineData[]
  tick?: TickData
  kline?: KlineData
  timestamp: string
}

class KlineSocketIOService {
  private socket: Socket | null = null
  // 🆕 支持多商品同時訂閱
  private subscriptions: Map<
    string,
    {
      callback: (message: KlineMessage) => void
      interval: string
    }
  > = new Map()
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 10 // 增加重連次數
  private readonly reconnectDelay = 2000 // 增加重連延遲
  private isConnecting = false
  private reconnectTimer: NodeJS.Timeout | null = null // 手動重連定時器
  private serverCheckTimer: NodeJS.Timeout | null = null // 服務器可用性檢查定時器
  private connectionStats = {
    connected: false,
    connectionId: '',
    reconnectAttempts: 0,
    lastError: null as string | null,
    subscriptions: 0,
  }

  constructor() {
    // 在瀏覽器環境中自動連接
    if (typeof window !== 'undefined') {
      this.connect()
    }
  }

  /**
   * 獲取連接統計信息
   */
  get stats() {
    return {
      ...this.connectionStats,
      // 🆕 更新為多商品支持
      activeSubscriptions: Array.from(this.subscriptions.keys()),
      subscriptionsCount: this.subscriptions.size,
    }
  }

  /**
   * 檢查是否已連接
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * 建立 Socket.IO 連接
   */
  private connect(): void {
    if (this.isConnecting || this.socket?.connected) {
      console.log('⚠️ Socket.IO 已在連接中或已連接')
      return
    }

    this.isConnecting = true
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000'

    console.log('🚀 創建新的 Socket.IO 連線:', {
      socketUrl,
      transports: ['websocket', 'polling'],
      timestamp: new Date().toISOString(),
    })

    this.socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // 自動降級
      timeout: 10000, // 增加超時時間
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000, // 最大重連延遲
      randomizationFactor: 0.5, // 隨機化重連延遲
      autoConnect: true,
      forceNew: false,
    })

    this.setupEventHandlers()
  }

  /**
   * 設置事件處理器
   */
  private setupEventHandlers(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ K線 Socket.IO 連接成功:', this.socket?.id)
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.connectionStats = {
        connected: true,
        connectionId: this.socket?.id || '',
        reconnectAttempts: 0,
        lastError: null,
        subscriptions: this.connectionStats.subscriptions,
      }

      // 🔧 清理重連定時器
      this.clearReconnectTimers()

      // 🆕 恢復所有現有訂閱
      if (this.subscriptions.size > 0) {
        console.log(
          '🔄 重連成功,恢復所有訂閱:',
          Array.from(this.subscriptions.keys())
        )
        this.subscriptions.forEach((subscription, symbol) => {
          this.subscribeToSymbol(symbol, subscription.interval)
        })
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 K線 Socket.IO 連接斷開:', reason)
      this.connectionStats.connected = false
      this.connectionStats.connectionId = ''
      this.isConnecting = false

      // 🔧 如果是服務器主動斷開或意外斷開,啟動服務器檢查
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('🔄 服務器斷開,啟動定期檢查...')
        this.startServerHealthCheck()
      }
    })

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ K線 Socket.IO 連接錯誤:', {
        error: error.message,
        type: error.type || 'unknown',
        description: error.description || 'no description',
        timestamp: new Date().toISOString(),
        reconnectAttempts: this.connectionStats.reconnectAttempts,
      })

      this.connectionStats.lastError = error.message
      this.connectionStats.reconnectAttempts++
      this.isConnecting = false

      // 🔧 如果達到最大重連次數,啟動服務器健康檢查
      if (this.connectionStats.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('❌ 達到最大重連次數,啟動服務器健康檢查...')
        this.startServerHealthCheck()
      }
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 K線 Socket.IO 重連嘗試:', attemptNumber)
      this.connectionStats.reconnectAttempts = attemptNumber
    })

    // K線特定事件
    this.socket.on('subscription_status', (data) => {
      console.log('📊 K線訂閱狀態:', data)
      if (data.type === 'klines') {
        this.connectionStats.subscriptions =
          data.status === 'subscribed' ? 1 : 0
      }
    })

    this.socket.on('historical_klines', (data) => {
      console.log('📈 收到歷史K線數據:', data)
      this.handleMessage({
        type: 'historical_klines',
        symbol: data.symbol,
        interval: data.interval,
        klines: data.klines || [],
        timestamp: data.timestamp,
      })
    })

    this.socket.on('kline_tick', (data) => {
      console.log('📊 收到K線tick數據:', data.symbol, '價格:', data.close)

      // 🆕 獲取該商品的訂閱信息
      const subscription = this.subscriptions.get(data.symbol)
      if (subscription) {
        this.handleMessage({
          type: 'tick',
          symbol: data.symbol,
          interval: subscription.interval,
          tick: data,
          timestamp: data.timestamp,
        })
      } else {
        console.warn('⚠️ 收到未訂閱商品的數據:', data.symbol)
      }
    })

    this.socket.on('kline_update', (data) => {
      console.log('🔄 收到K線更新數據:', data)
      this.handleMessage({
        type: 'kline_update',
        symbol: data.symbol,
        interval: data.interval,
        kline: data.kline,
        timestamp: data.timestamp,
      })
    })

    this.socket.on('error', (error) => {
      console.error('❌ Socket.IO 錯誤:', error)
      this.connectionStats.lastError = error.message || '未知錯誤'
    })
  }

  /**
   * 🆕 處理接收到的消息 - 按 symbol 路由到正確的回調函數
   */
  private handleMessage(message: KlineMessage): void {
    const subscription = this.subscriptions.get(message.symbol)
    if (subscription && subscription.callback) {
      try {
        subscription.callback(message)
        console.log(`📡 路由數據到 ${message.symbol} 的圖表:`, message.type)
      } catch (error) {
        console.error(`❌ 處理 ${message.symbol} K線消息失敗:`, error)
      }
    } else {
      console.warn(`⚠️ 未找到 ${message.symbol} 的訂閱者`)
    }
  }

  /**
   * 🆕 訂閱指定商品的K線數據 - 支持多商品同時訂閱
   */
  subscribe(
    symbol: string,
    callback: (message: KlineMessage) => void,
    interval: string = '5m'
  ): void {
    console.log('📊 訂閱K線數據:', symbol, '間隔:', interval)

    // 🆕 保存多商品訂閱信息
    this.subscriptions.set(symbol, {
      callback,
      interval,
    })

    // 保存最新訂閱的symbol和interval到localStorage,用於頁面刷新恢復
    if (typeof window !== 'undefined') {
      const existingSymbols = JSON.parse(
        localStorage.getItem('subscribedSymbols') || '[]'
      )
      const updatedSymbols = Array.from(new Set([...existingSymbols, symbol]))
      localStorage.setItem('subscribedSymbols', JSON.stringify(updatedSymbols))
      localStorage.setItem(`symbol_${symbol}_interval`, interval)
    }

    // 確保連接後再訂閱
    if (this.isConnected) {
      this.subscribeToSymbol(symbol, interval)
    } else {
      console.log('⏳ 等待 Socket.IO 連接建立...')
      this.connect()
    }

    console.log(`✅ ${symbol} 訂閱完成，當前訂閱數:`, this.subscriptions.size)
  }

  /**
   * 實際執行訂閱操作
   */
  private subscribeToSymbol(symbol: string, interval: string): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket.IO 未連接,無法訂閱')
      return
    }

    console.log('📡 發送K線訂閱請求:', symbol, '間隔:', interval)
    this.socket.emit('subscribe_klines', {
      symbol: symbol,
      interval: interval,
    })
  }

  /**
   * 🆕 取消特定商品的訂閱
   */
  unsubscribe(symbol?: string): void {
    if (symbol) {
      // 取消特定商品的訂閱
      if (this.subscriptions.has(symbol)) {
        console.log('📊 取消訂閱K線數據:', symbol)

        if (this.socket?.connected) {
          this.socket.emit('unsubscribe_klines', { symbol })
        }

        this.subscriptions.delete(symbol)

        // 更新 localStorage
        if (typeof window !== 'undefined') {
          const existingSymbols = JSON.parse(
            localStorage.getItem('subscribedSymbols') || '[]'
          )
          const updatedSymbols = existingSymbols.filter(
            (s: string) => s !== symbol
          )
          localStorage.setItem(
            'subscribedSymbols',
            JSON.stringify(updatedSymbols)
          )
          localStorage.removeItem(`symbol_${symbol}_interval`)
        }

        console.log(
          `✅ ${symbol} 訂閱取消，剩餘訂閱數:`,
          this.subscriptions.size
        )
      }
    } else {
      // 取消所有訂閱
      console.log('📊 取消所有K線訂閱')

      if (this.socket?.connected) {
        this.subscriptions.forEach((_, symbol) => {
          this.socket!.emit('unsubscribe_klines', { symbol })
        })
      }

      this.subscriptions.clear()
      this.connectionStats.subscriptions = 0

      // 清除localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('subscribedSymbols')
        // 清除所有商品的 interval 設定
        const keys = Object.keys(localStorage).filter(
          (key) => key.startsWith('symbol_') && key.endsWith('_interval')
        )
        keys.forEach((key) => localStorage.removeItem(key))
      }
    }
  }

  /**
   * 斷開連接
   */
  disconnect(): void {
    console.log('🔌 手動斷開K線 Socket.IO 連接')

    // 🔧 清理所有定時器
    this.clearReconnectTimers()

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    // 🆕 清理所有訂閱
    this.subscriptions.clear()
    this.isConnecting = false
    this.connectionStats = {
      connected: false,
      connectionId: '',
      reconnectAttempts: 0,
      lastError: null,
      subscriptions: 0,
    }
  }

  /**
   * 🔧 清理所有重連定時器
   */
  private clearReconnectTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.serverCheckTimer) {
      clearInterval(this.serverCheckTimer)
      this.serverCheckTimer = null
    }
  }

  /**
   * 🔧 啟動服務器健康檢查
   */
  private startServerHealthCheck(): void {
    // 清理現有的檢查定時器
    this.clearReconnectTimers()

    console.log('🔄 啟動服務器健康檢查 (每30秒檢查一次)')

    this.serverCheckTimer = setInterval(async () => {
      try {
        console.log('🔍 檢查服務器可用性...')

        // 嘗試 HTTP 健康檢查
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const healthCheck = await fetch('/api/status', {
          method: 'GET',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (healthCheck.ok) {
          console.log('✅ 服務器已恢復,嘗試重新連接...')
          this.clearReconnectTimers()
          this.forceReconnect()
        } else {
          console.log('⚠️ 服務器尚未完全恢復')
        }
      } catch (error) {
        console.log('🔍 服務器仍不可用,繼續檢查...')
      }
    }, 30000) // 每30秒檢查一次
  }

  /**
   * 🔧 強制重新連接 (重置重連計數)
   */
  forceReconnect(): void {
    console.log('🚀 強制重新連接 (重置計數器)')

    // 重置重連計數器
    this.reconnectAttempts = 0
    this.connectionStats.reconnectAttempts = 0
    this.connectionStats.lastError = null

    // 清理定時器
    this.clearReconnectTimers()

    // 斷開現有連接
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    // 短暫延遲後重新連接
    setTimeout(() => {
      this.connect()
    }, 1000)
  }

  /**
   * 重新連接
   */
  reconnect(): void {
    console.log('🔄 手動重新連接K線 Socket.IO')
    this.disconnect()
    setTimeout(() => {
      this.connect()
    }, 1000)
  }

  /**
   * 獲取連接狀態
   */
  getConnectionStatus(): {
    connected: boolean
    transport?: string
    ping?: number
    stats: typeof this.connectionStats
  } {
    return {
      connected: this.isConnected,
      transport: this.socket?.io.engine?.transport?.name,
      ping: (this.socket?.io.engine as any)?.ping,
      stats: this.stats,
    }
  }
}

// 創建單例實例
let klineSocketIOService: KlineSocketIOService | null = null

// 只在瀏覽器環境中創建實例
if (typeof window !== 'undefined') {
  klineSocketIOService = new KlineSocketIOService()
}

export { klineSocketIOService }
export default KlineSocketIOService
