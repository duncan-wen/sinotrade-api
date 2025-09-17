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
  private currentSymbol: string | null = null
  private messageCallback: ((message: KlineMessage) => void) | null = null
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 1000
  private isConnecting = false
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
      currentSymbol: this.currentSymbol,
      hasCallback: !!this.messageCallback,
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
      timeout: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
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

      // 如果有之前的訂閱,重新訂閱
      if (this.currentSymbol) {
        this.subscribeToSymbol(this.currentSymbol)
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 K線 Socket.IO 連接斷開:', reason)
      this.connectionStats.connected = false
      this.connectionStats.connectionId = ''
      this.isConnecting = false
    })

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ K線 Socket.IO 連接錯誤:', {
        error: error.message,
        type: error.type || 'unknown',
        description: error.description || 'no description',
        timestamp: new Date().toISOString(),
      })

      this.connectionStats.lastError = error.message
      this.connectionStats.reconnectAttempts++
      this.isConnecting = false
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

      this.handleMessage({
        type: 'tick',
        symbol: data.symbol,
        interval: '5m', // 假設是5分鐘
        tick: data,
        timestamp: data.timestamp,
      })
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
   * 處理接收到的消息
   */
  private handleMessage(message: KlineMessage): void {
    if (this.messageCallback) {
      try {
        this.messageCallback(message)
      } catch (error) {
        console.error('❌ 處理K線消息失敗:', error)
      }
    }
  }

  /**
   * 訂閱指定股票的K線數據
   */
  subscribe(symbol: string, callback: (message: KlineMessage) => void): void {
    console.log('📊 訂閱K線數據:', symbol)

    // 保存回調函數
    this.messageCallback = callback

    // 保存當前訂閱的symbol到localStorage,用於頁面刷新恢復
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSubscribedSymbol', symbol)
    }

    // 如果已經訂閱了其他股票,先取消
    if (this.currentSymbol && this.currentSymbol !== symbol) {
      this.unsubscribe()
    }

    this.currentSymbol = symbol

    // 確保連接後再訂閱
    if (this.isConnected) {
      this.subscribeToSymbol(symbol)
    } else {
      console.log('⏳ 等待 Socket.IO 連接建立...')
      this.connect()
    }
  }

  /**
   * 實際執行訂閱操作
   */
  private subscribeToSymbol(symbol: string): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket.IO 未連接,無法訂閱')
      return
    }

    console.log('📡 發送K線訂閱請求:', symbol)
    this.socket.emit('subscribe_klines', {
      symbol: symbol,
      interval: '5m',
    })
  }

  /**
   * 取消訂閱
   */
  unsubscribe(): void {
    if (this.currentSymbol && this.socket?.connected) {
      console.log('📊 取消訂閱K線數據:', this.currentSymbol)
      this.socket.emit('unsubscribe_klines', {
        symbol: this.currentSymbol,
      })
    }

    this.currentSymbol = null
    this.messageCallback = null
    this.connectionStats.subscriptions = 0

    // 清除localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lastSubscribedSymbol')
    }
  }

  /**
   * 斷開連接
   */
  disconnect(): void {
    console.log('🔌 手動斷開K線 Socket.IO 連接')

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.currentSymbol = null
    this.messageCallback = null
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
