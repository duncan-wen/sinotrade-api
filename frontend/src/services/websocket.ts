/**
 * WebSocket 服務 - 處理即時數據推送
 * 與 TanStack Query 整合,實現即時數據同步
 */
import { io, Socket } from 'socket.io-client'
import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/useQueries'
import type {
  Quote,
  OrderUpdate,
  PositionUpdate,
  WebSocketMessage,
  QuoteUpdate,
} from '@/types/api'

interface SocketCallbacks {
  onQuote?: (quote: Quote) => void
  onOrderUpdate?: (update: OrderUpdate) => void
  onPositionUpdate?: (update: PositionUpdate) => void
  onConnect?: () => void
  onDisconnect?: (reason: string) => void
  onError?: (error: Error) => void
}

interface SubscriptionOptions {
  symbols?: string[]
  channels?: ('quotes' | 'orders' | 'positions')[]
}

class WebSocketService {
  private socket: Socket | null = null
  private queryClient: QueryClient | null = null
  private subscriptions = new Map<string, SocketCallbacks>()
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 1000
  private isConnecting = false

  constructor() {
    // 在組件中初始化時會設置 queryClient
  }

  /**
   * 設置 QueryClient 實例
   */
  setQueryClient(queryClient: QueryClient): void {
    this.queryClient = queryClient
  }

  /**
   * 連接 WebSocket
   */
  async connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return
    }

    this.isConnecting = true
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000'

    try {
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        autoConnect: true,
        forceNew: false,
        path: '/socket.io/',
      })

      this.setupEventListeners()
      this.isConnecting = false
    } catch (error) {
      this.isConnecting = false
      console.error('WebSocket 連接失敗:', error)
      throw error
    }
  }

  /**
   * 設置事件監聽器
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    // 連接事件
    this.socket.on('connect', () => {
      console.log('✅ WebSocket 連接成功', this.socket?.id)
      this.reconnectAttempts = 0
      this.notifyCallbacks('onConnect')
    })

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 WebSocket 連接斷開:', reason)
      this.notifyCallbacks('onDisconnect', reason)
    })

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ WebSocket 連接錯誤:', error)
      this.reconnectAttempts++
      this.notifyCallbacks('onError', error)
    })

    // 市場數據事件
    this.socket.on('quote_update', (data: { symbol: string; quote: Quote }) => {
      this.handleQuoteUpdate(data)
    })

    this.socket.on('multiple_quotes', (data: { quotes: Quote[] }) => {
      this.handleMultipleQuotes(data.quotes)
    })

    // 交易相關事件
    this.socket.on('order_update', (data: OrderUpdate) => {
      this.handleOrderUpdate(data)
    })

    this.socket.on('position_update', (data: PositionUpdate) => {
      this.handlePositionUpdate(data)
    })

    // 系統事件
    this.socket.on(
      'system_message',
      (data: { type: string; message: string }) => {
        console.log('系統消息:', data)
      }
    )

    // 錯誤處理
    this.socket.on('error', (error: any) => {
      console.error('❌ WebSocket 錯誤:', error)
      this.notifyCallbacks(
        'onError',
        new Error(error.message || 'WebSocket error')
      )
    })
  }

  /**
   * 處理報價更新
   */
  private handleQuoteUpdate(data: { symbol: string; quote: Quote }): void {
    if (!this.queryClient) return

    // 更新單一報價快取
    this.queryClient.setQueryData(queryKeys.quotes(data.symbol), data.quote)

    // 更新多檔報價快取
    this.queryClient.setQueriesData(
      { queryKey: ['quotes', 'multiple'] },
      (oldData: Quote[] | undefined) => {
        if (!oldData) return oldData
        return oldData.map((quote) =>
          quote.symbol === data.symbol ? data.quote : quote
        )
      }
    )

    // 通知回調函數
    this.notifyCallbacks('onQuote', data.quote)
  }

  /**
   * 處理多檔報價更新
   */
  private handleMultipleQuotes(quotes: Quote[]): void {
    if (!this.queryClient) return

    quotes.forEach((quote) => {
      this.queryClient!.setQueryData(queryKeys.quotes(quote.symbol), quote)
    })

    // 通知回調函數
    quotes.forEach((quote) => {
      this.notifyCallbacks('onQuote', quote)
    })
  }

  /**
   * 處理訂單更新
   */
  private handleOrderUpdate(update: OrderUpdate): void {
    if (!this.queryClient) return

    // 更新訂單快取
    this.queryClient.setQueriesData(
      { queryKey: ['orders'] },
      (oldData: { orders: any[]; total: number } | undefined) => {
        if (!oldData) return oldData

        return {
          ...oldData,
          orders: oldData.orders.map((order) =>
            order.id === update.order_id
              ? {
                  ...order,
                  status: update.status,
                  filled_quantity: update.filled_quantity,
                  filled_price: update.filled_price,
                  updated_at: update.timestamp,
                }
              : order
          ),
        }
      }
    )

    // 如果訂單完全成交,刷新持倉和帳戶資訊
    if (update.status === 'Filled') {
      this.queryClient.invalidateQueries({ queryKey: queryKeys.positions() })
      this.queryClient.invalidateQueries({ queryKey: queryKeys.account() })
    }

    this.notifyCallbacks('onOrderUpdate', update)
  }

  /**
   * 處理持倉更新
   */
  private handlePositionUpdate(update: PositionUpdate): void {
    if (!this.queryClient) return

    // 更新持倉快取
    this.queryClient.setQueryData(
      queryKeys.positions(),
      (oldData: any[] | undefined) => {
        if (!oldData) return oldData

        return oldData.map((position) =>
          position.symbol === update.symbol
            ? {
                ...position,
                quantity: update.quantity,
                current_price: update.current_price,
                unrealized_pnl: update.unrealized_pnl,
                last_updated: update.timestamp,
              }
            : position
        )
      }
    )

    this.notifyCallbacks('onPositionUpdate', update)
  }

  /**
   * 通知所有回調函數
   */
  private notifyCallbacks(event: keyof SocketCallbacks, data?: any): void {
    this.subscriptions.forEach((callbacks) => {
      const callback = callbacks[event]
      if (callback) {
        try {
          callback(data)
        } catch (error) {
          console.error(`回調函數執行錯誤 (${event}):`, error)
        }
      }
    })
  }

  /**
   * 斷開連接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.subscriptions.clear()
    this.reconnectAttempts = 0
  }

  /**
   * 訂閱數據推送
   */
  subscribe(
    subscriberId: string,
    callbacks: SocketCallbacks,
    options?: SubscriptionOptions
  ): () => void {
    this.subscriptions.set(subscriberId, callbacks)

    if (this.socket?.connected && options) {
      // 發送訂閱請求到後端
      this.socket.emit('subscribe', {
        symbols: options.symbols || [],
        channels: options.channels || ['quotes', 'orders', 'positions'],
      })
    }

    // 返回取消訂閱函數
    return () => {
      this.unsubscribe(subscriberId, options)
    }
  }

  /**
   * 取消訂閱
   */
  unsubscribe(subscriberId: string, options?: SubscriptionOptions): void {
    this.subscriptions.delete(subscriberId)

    if (this.socket?.connected && options) {
      this.socket.emit('unsubscribe', {
        symbols: options.symbols || [],
        channels: options.channels || ['quotes', 'orders', 'positions'],
      })
    }
  }

  /**
   * 訂閱特定股票報價
   */
  subscribeQuotes(symbols: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_quotes', { symbols })
    }
  }

  /**
   * 取消股票報價訂閱
   */
  unsubscribeQuotes(symbols: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe_quotes', { symbols })
    }
  }

  /**
   * 手動重新連接
   */
  reconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
    }
    this.connect()
  }

  /**
   * 獲取連接狀態
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * 獲取連接 ID
   */
  getConnectionId(): string | undefined {
    return this.socket?.id
  }

  /**
   * 發送自定義事件
   */
  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  /**
   * 監聽自定義事件
   */
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback)
  }

  /**
   * 移除事件監聽
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback)
  }

  /**
   * 獲取統計信息
   */
  getStats(): {
    connected: boolean
    connectionId?: string
    subscriptions: number
    reconnectAttempts: number
  } {
    return {
      connected: this.isConnected(),
      connectionId: this.getConnectionId(),
      subscriptions: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
    }
  }
}

// 導出單例實例
export const websocketService = new WebSocketService()

// React Hook 封裝
export const useWebSocket = () => {
  return {
    service: websocketService,
    isConnected: websocketService.isConnected(),
    connect: websocketService.connect.bind(websocketService),
    disconnect: websocketService.disconnect.bind(websocketService),
    subscribe: websocketService.subscribe.bind(websocketService),
    unsubscribe: websocketService.unsubscribe.bind(websocketService),
    subscribeQuotes: websocketService.subscribeQuotes.bind(websocketService),
    unsubscribeQuotes:
      websocketService.unsubscribeQuotes.bind(websocketService),
    emit: websocketService.emit.bind(websocketService),
    stats: websocketService.getStats(),
  }
}
