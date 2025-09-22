/**
 * 美股 Socket.IO 服務 - 處理 Polygon.io 即時數據
 * 使用 Socket.IO 連接後端,後端通過 Polygon.io WebSocket 獲取數據
 *
 * ⚠️ 注意: Polygon.io 免費計劃不支援 WebSocket 即時數據
 * 目前僅可使用 REST API 獲取歷史數據
 */

import { io, Socket } from 'socket.io-client'

export interface USKlineData {
  symbol: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  interval: string
  source: string
  market: string
}

export interface USSubscriptionStatus {
  type: 'klines'
  symbol: string
  interval?: string
  status: 'subscribed' | 'unsubscribed'
  source: string
  market: string
  subscribers_count: number
}

export interface PolygonStatus {
  connected: boolean
  authenticated: boolean
  subscriptions: string[]
  total_clients: number
  reconnect_attempts: number
}

export interface ConnectionStatus {
  status: string
  sid: string
  timestamp: string
  server_info: {
    shioaji_logged_in: boolean
    shioaji_initialized: boolean
    polygon_connected: boolean
    polygon_authenticated: boolean
  }
}

type USKlineCallback = (data: USKlineData) => void
type StatusCallback = (status: USSubscriptionStatus) => void
type ErrorCallback = (error: string) => void
type ConnectionCallback = (status: ConnectionStatus) => void

class USStockSocketIOService {
  private socket: Socket | null = null
  private subscriptions: Map<string, USKlineCallback> = new Map()
  private isConnected: boolean = false
  private reconnectAttempts: number = 0
  private readonly maxReconnectAttempts: number = 5
  private readonly reconnectDelay: number = 2000

  // 回調函數
  private statusCallback: StatusCallback | null = null
  private errorCallback: ErrorCallback | null = null
  private connectionCallback: ConnectionCallback | null = null

  // 連接狀態
  private connectionStats = {
    connected: false,
    connectionId: '',
    polygonConnected: false,
    polygonAuthenticated: false,
    subscriptions: 0,
  }

  constructor() {
    this.connect()
  }

  /**
   * 連接到 Socket.IO 服務器
   */
  private connect() {
    if (this.socket?.connected) {
      console.log('⏳ Socket.IO 已連接...')
      return
    }

    try {
      console.log('🔗 正在連接美股 Socket.IO 服務器...')

      // 創建 Socket.IO 連接
      this.socket = io('http://localhost:8000', {
        path: '/socket.io',
        transports: ['websocket', 'polling'], // 自動降級
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
      })

      this.setupEventHandlers()
    } catch (error) {
      console.error('❌ Socket.IO 連接失敗:', error)
      this.handleReconnect()
    }
  }

  /**
   * 設置事件處理器
   */
  private setupEventHandlers() {
    if (!this.socket) return

    // 連接成功
    this.socket.on('connect', () => {
      console.log('✅ 美股 Socket.IO 連接成功')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.connectionStats.connected = true
      this.connectionStats.connectionId = this.socket?.id || ''

      // 重新訂閱所有股票
      this.resubscribeAll()
    })

    // 連接狀態更新
    this.socket.on('connection_status', (data: ConnectionStatus) => {
      console.log('📊 連接狀態更新:', data)
      this.connectionStats.polygonConnected = data.server_info.polygon_connected
      this.connectionStats.polygonAuthenticated =
        data.server_info.polygon_authenticated
      this.connectionCallback?.(data)
    })

    // 美股 K線即時數據
    this.socket.on('us_kline_tick', (data: USKlineData) => {
      console.log(`📊 收到美股 K線: ${data.symbol} $${data.close}`)

      const callback = this.subscriptions.get(data.symbol)
      if (callback) {
        callback(data)
      }
    })

    // 美股訂閱狀態
    this.socket.on('us_subscription_status', (data: USSubscriptionStatus) => {
      console.log(`📡 美股訂閱狀態: ${data.symbol} ${data.status}`)
      this.statusCallback?.(data)

      if (data.status === 'subscribed') {
        this.connectionStats.subscriptions++
      } else if (data.status === 'unsubscribed') {
        this.connectionStats.subscriptions = Math.max(
          0,
          this.connectionStats.subscriptions - 1
        )
      }
    })

    // Polygon.io 狀態
    this.socket.on('polygon_status', (data: PolygonStatus) => {
      console.log('🔵 Polygon.io 狀態:', data)
      this.connectionStats.polygonConnected = data.connected
      this.connectionStats.polygonAuthenticated = data.authenticated
    })

    // 錯誤處理
    this.socket.on('error', (error: any) => {
      console.error('❌ Socket.IO 錯誤:', error)
      this.errorCallback?.(error.message || String(error))
    })

    // 斷開連接
    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ Socket.IO 斷開連接:', reason)
      this.isConnected = false
      this.connectionStats.connected = false
      this.connectionStats.connectionId = ''

      if (reason === 'io server disconnect') {
        // 服務器主動斷開,需要手動重連
        this.handleReconnect()
      }
    })

    // 重連成功
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`✅ Socket.IO 重連成功 (第 ${attemptNumber} 次嘗試)`)
      this.reconnectAttempts = 0
    })

    // 重連失敗
    this.socket.on('reconnect_failed', () => {
      console.error('❌ Socket.IO 重連失敗,達到最大重試次數')
      this.errorCallback?.('Socket.IO 連接失敗,請檢查網絡連接')
    })
  }

  /**
   * 訂閱美股 K線數據
   */
  subscribeKlines(
    symbol: string,
    callback: USKlineCallback,
    interval: string = '1m'
  ) {
    if (!symbol) {
      console.error('❌ 股票代號不能為空')
      return
    }

    const upperSymbol = symbol.toUpperCase()
    console.log(`📡 訂閱美股 K線: ${upperSymbol} (${interval})`)

    // 保存回調函數
    this.subscriptions.set(upperSymbol, callback)

    // 如果已連接,立即發送訂閱請求
    if (this.isConnected && this.socket) {
      this.socket.emit('subscribe_us_klines', {
        symbol: upperSymbol,
        interval: interval,
      })
    } else {
      console.log(`⏳ 暫存訂閱請求: ${upperSymbol},等待連接...`)
    }
  }

  /**
   * 取消訂閱美股 K線數據
   */
  unsubscribe(symbol: string) {
    if (!symbol) return

    const upperSymbol = symbol.toUpperCase()
    console.log(`📡 取消訂閱美股: ${upperSymbol}`)

    // 移除回調函數
    this.subscriptions.delete(upperSymbol)

    // 發送取消訂閱請求
    if (this.isConnected && this.socket) {
      this.socket.emit('unsubscribe_us_klines', {
        symbol: upperSymbol,
      })
    }
  }

  /**
   * 重新訂閱所有股票
   */
  private resubscribeAll() {
    if (this.subscriptions.size === 0) return

    console.log(`🔄 重新訂閱 ${this.subscriptions.size} 個美股`)

    for (const symbol of this.subscriptions.keys()) {
      if (this.socket) {
        this.socket.emit('subscribe_us_klines', {
          symbol: symbol,
          interval: '1m',
        })
      }
    }
  }

  /**
   * 獲取 Polygon.io 狀態
   */
  getPolygonStatus() {
    if (this.isConnected && this.socket) {
      this.socket.emit('get_polygon_status', {})
    } else {
      console.warn('⚠️ Socket.IO 未連接,無法獲取 Polygon.io 狀態')
    }
  }

  /**
   * 處理重連
   */
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ 達到最大重連次數,停止重連')
      this.errorCallback?.('連接失敗,請刷新頁面重試')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // 指數退避

    console.log(`🔄 ${delay}ms 後嘗試重連 (第 ${this.reconnectAttempts} 次)`)

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * 設置狀態回調
   */
  onStatus(callback: StatusCallback) {
    this.statusCallback = callback
  }

  /**
   * 設置錯誤回調
   */
  onError(callback: ErrorCallback) {
    this.errorCallback = callback
  }

  /**
   * 設置連接回調
   */
  onConnection(callback: ConnectionCallback) {
    this.connectionCallback = callback
  }

  /**
   * 獲取連接狀態
   */
  getConnectionStats() {
    return {
      ...this.connectionStats,
      subscriptions: this.subscriptions.size,
      socketConnected: this.socket?.connected || false,
      socketId: this.socket?.id || '',
    }
  }

  /**
   * 斷開連接
   */
  disconnect() {
    console.log('📡 主動斷開美股 Socket.IO 連接')

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.isConnected = false
    this.subscriptions.clear()
    this.connectionStats = {
      connected: false,
      connectionId: '',
      polygonConnected: false,
      polygonAuthenticated: false,
      subscriptions: 0,
    }
  }

  /**
   * 檢查連接狀態
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true
  }
}

// 全局實例
export const usStockSocketIOService = new USStockSocketIOService()
export type {
  USKlineCallback,
  StatusCallback,
  ErrorCallback,
  ConnectionCallback,
}
