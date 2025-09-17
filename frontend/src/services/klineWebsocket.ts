/**
 * K線 WebSocket 服務 - 處理即時5分鐘K線數據
 */

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
  type: 'historical_klines' | 'kline' | 'tick'
  symbol?: string // 後端消息中symbol在data裡面
  interval?: string
  data: KlineData[] | KlineData | TickData
}

class KlineWebSocketService {
  private ws: WebSocket | null = null
  private clientId: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private subscriptions = new Map<string, (message: KlineMessage) => void>()

  constructor() {
    this.clientId = `kline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 連接 WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    return new Promise((resolve, reject) => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

      try {
        this.ws = new WebSocket(`${wsUrl}/ws/klines/${this.clientId}`)

        this.ws.onopen = () => {
          console.log('✅ K線 WebSocket 連接成功')
          this.reconnectAttempts = 0

          // 只在重新連接時恢復訂閱,頁面刷新由組件自己處理
          if (this.reconnectAttempts > 0) {
            this.resubscribeAll()
          }

          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: KlineMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('解析 WebSocket 消息失敗:', error)
          }
        }

        this.ws.onclose = () => {
          console.log('🔌 K線 WebSocket 連接關閉')
          this.handleReconnect()
        }

        this.ws.onerror = (error) => {
          console.error('K線 WebSocket 錯誤:', error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 訂閱K線數據
   */
  subscribe(symbol: string, callback: (message: KlineMessage) => void): void {
    // 保存當前訂閱的symbol到localStorage,用於頁面刷新恢復
    localStorage.setItem('lastSubscribedSymbol', symbol)

    // 如果已經訂閱了其他股票,先取消
    const currentSubscriptions = Array.from(this.subscriptions.keys())
    currentSubscriptions.forEach((oldSymbol) => {
      if (oldSymbol !== symbol) {
        this.unsubscribe(oldSymbol)
      }
    })

    this.subscriptions.set(symbol, callback)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'subscribe_kline',
          symbol: symbol,
          interval: '5m', // 5分鐘K線
        })
      )
    }
  }

  /**
   * 取消訂閱
   */
  unsubscribe(symbol: string): void {
    this.subscriptions.delete(symbol)

    // 如果是最後一個訂閱,清空localStorage
    if (this.subscriptions.size === 0) {
      localStorage.removeItem('lastSubscribedSymbol')
    }

    // 向服務器發送取消訂閱消息
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'unsubscribe_kline',
          symbol: symbol,
        })
      )
    }
  }

  /**
   * 處理接收到的消息
   */
  private handleMessage(message: KlineMessage): void {
    console.log('📨 收到 WebSocket 消息:', message)

    // 從data中提取symbol,因為後端把symbol放在data裡面
    const actualSymbol = (message.data as any)?.symbol || message.symbol
    const enrichedMessage = { ...message, symbol: actualSymbol }

    console.log('🔍 處理消息,symbol:', actualSymbol)

    // 調用所有訂閱的callback,因為tick消息可能來自不同的symbol
    for (const callback of this.subscriptions.values()) {
      callback(enrichedMessage)
    }
  }

  /**
   * 處理重新連接
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(
        `嘗試重新連接 K線 WebSocket... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      )

      setTimeout(() => {
        this.connect()
          .then(() => {
            // 重新訂閱所有股票
            this.resubscribeAll()
          })
          .catch((error) => {
            console.error('重新連接失敗:', error)
          })
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  /**
   * 重新訂閱所有股票(用於重新連接)
   */
  private resubscribeAll(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('⚠️ WebSocket 未連接,跳過重新訂閱')
      return
    }

    console.log(`🔄 重新連接後恢復 ${this.subscriptions.size} 個活躍訂閱...`)

    // 重新發送所有活躍訂閱的請求
    this.subscriptions.forEach((_, symbol) => {
      console.log(`📈 重新訂閱: ${symbol}`)
      this.ws!.send(
        JSON.stringify({
          type: 'subscribe_kline',
          symbol: symbol,
          interval: '5m',
        })
      )
    })

    console.log('✅ 訂閱恢復完成')
  }

  /**
   * 斷開連接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.subscriptions.clear()
  }
}

// 全局實例
export const klineWebSocketService = new KlineWebSocketService()
