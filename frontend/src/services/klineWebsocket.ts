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
    // 使用瀏覽器會話級別的唯一 ID,確保:
    // 1. 同一瀏覽器標籤頁內保持相同 ID (避免重複連接)
    // 2. 不同用戶/標籤頁有不同 ID (避免用戶衝突)
    const sessionId = this.getOrCreateSessionId()
    this.clientId = `kline_${sessionId}`
  }

  /**
   * 獲取或創建會話級別的唯一 ID
   */
  private getOrCreateSessionId(): string {
    // 檢查是否在瀏覽器環境 (避免 SSR 錯誤)
    if (
      typeof window === 'undefined' ||
      typeof sessionStorage === 'undefined'
    ) {
      // 服務器端或不支援 sessionStorage 的環境,生成臨時 ID
      const tempId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('🌐 服務器端生成臨時 WebSocket ID:', tempId)
      return tempId
    }

    const SESSION_KEY = 'kline_websocket_session_id'
    let sessionId = sessionStorage.getItem(SESSION_KEY)

    if (!sessionId) {
      // 創建新的會話 ID:時間戳 + 隨機字符
      sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem(SESSION_KEY, sessionId)
      console.log('🆕 創建新的 WebSocket 會話 ID:', sessionId)
    } else {
      console.log('🔄 重用現有 WebSocket 會話 ID:', sessionId)
    }

    return sessionId
  }

  /**
   * 連接 WebSocket
   */
  async connect(): Promise<void> {
    // 檢查是否已經有活躍連線
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('🔗 WebSocket 已連線,重用現有連線:', this.clientId)
      return
    }

    // 檢查是否正在連線中
    if (this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('🔄 WebSocket 正在連線中,等待完成:', this.clientId)
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            resolve()
          } else if (this.ws?.readyState === WebSocket.CLOSED) {
            reject(new Error('WebSocket 連線失敗'))
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        checkConnection()
      })
    }

    return new Promise((resolve, reject) => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

      try {
        // 先關閉舊連線(如果存在)
        if (this.ws) {
          console.log('🗑️ 關閉舊的 WebSocket 連線')
          this.ws.close()
        }

        console.log('🚀 創建新的 WebSocket 連線:', {
          clientId: this.clientId,
          url: `${wsUrl}/ws/klines/${this.clientId}`,
          wsUrl,
          timestamp: new Date().toISOString(),
        })

        // 檢查 WebSocket URL 格式
        const fullUrl = `${wsUrl}/ws/klines/${this.clientId}`
        if (!fullUrl.startsWith('ws://') && !fullUrl.startsWith('wss://')) {
          throw new Error(`無效的 WebSocket URL: ${fullUrl}`)
        }

        this.ws = new WebSocket(fullUrl)

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
          console.error('❌ K線 WebSocket 錯誤:', {
            error,
            readyState: this.ws?.readyState,
            url: `${wsUrl}/ws/klines/${this.clientId}`,
            clientId: this.clientId,
            timestamp: new Date().toISOString(),
          })
          reject(
            new Error(
              `WebSocket 連接失敗: ${(error as any)?.message || '未知錯誤'}`
            )
          )
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

// 創建全域單例實例,避免重複連接
let globalKlineWebSocketService: KlineWebSocketService | null = null

export const klineWebSocketService: KlineWebSocketService | null = (() => {
  // 延遲初始化:只在瀏覽器環境中創建實例
  if (typeof window !== 'undefined' && !globalKlineWebSocketService) {
    globalKlineWebSocketService = new KlineWebSocketService()
    console.log(
      '🔗 創建全域 KlineWebSocketService 實例:',
      globalKlineWebSocketService['clientId']
    )
  }

  // 如果在服務器端,返回 null (組件需要處理這種情況)
  return globalKlineWebSocketService
})()
