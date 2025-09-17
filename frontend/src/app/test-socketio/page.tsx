'use client'

import { useEffect, useState } from 'react'
import { klineSocketIOService } from '@/services/klineSocketIO'
import type { KlineMessage } from '@/services/klineSocketIO'

export default function TestSocketIOPage() {
  const [connectionStatus, setConnectionStatus] = useState<any>({})
  const [messages, setMessages] = useState<KlineMessage[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [symbol, setSymbol] = useState('MXFR1')

  // 更新連接狀態
  useEffect(() => {
    const updateStatus = () => {
      if (klineSocketIOService) {
        setConnectionStatus(klineSocketIOService.getConnectionStatus())
      }
    }

    updateStatus()
    const interval = setInterval(updateStatus, 1000)
    return () => clearInterval(interval)
  }, [])

  // 處理訂閱
  const handleSubscribe = () => {
    if (!klineSocketIOService) return

    console.log('🚀 測試訂閱:', symbol)

    klineSocketIOService.subscribe(symbol, (message: KlineMessage) => {
      console.log('📨 收到消息:', message)
      setMessages((prev) => [...prev.slice(-9), message]) // 只保留最後10條
    })

    setIsSubscribed(true)
  }

  const handleUnsubscribe = () => {
    if (!klineSocketIOService) return

    console.log('🛑 取消訂閱')
    klineSocketIOService.unsubscribe()
    setIsSubscribed(false)
  }

  const handleReconnect = () => {
    if (!klineSocketIOService) return

    console.log('🔄 重新連接')
    klineSocketIOService.reconnect()
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Socket.IO K線服務測試</h1>

      {/* 連接狀態 */}
      <div
        style={{
          padding: '15px',
          backgroundColor: connectionStatus.connected ? '#d4edda' : '#f8d7da',
          border: `1px solid ${connectionStatus.connected ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '5px',
          marginBottom: '20px',
        }}
      >
        <h3>🔗 連接狀態</h3>
        <p>
          <strong>已連接:</strong>{' '}
          {connectionStatus.connected ? '✅ 是' : '❌ 否'}
        </p>
        <p>
          <strong>傳輸方式:</strong> {connectionStatus.transport || 'N/A'}
        </p>
        <p>
          <strong>延遲:</strong> {connectionStatus.ping || 'N/A'} ms
        </p>
        <p>
          <strong>連接ID:</strong>{' '}
          {connectionStatus.stats?.connectionId || 'N/A'}
        </p>
        <p>
          <strong>重連次數:</strong>{' '}
          {connectionStatus.stats?.reconnectAttempts || 0}
        </p>
        <p>
          <strong>訂閱數:</strong> {connectionStatus.stats?.subscriptions || 0}
        </p>
        <p>
          <strong>當前股票:</strong>{' '}
          {connectionStatus.stats?.currentSymbol || 'N/A'}
        </p>
        {connectionStatus.stats?.lastError && (
          <p style={{ color: 'red' }}>
            <strong>最後錯誤:</strong> {connectionStatus.stats.lastError}
          </p>
        )}
      </div>

      {/* 控制面板 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🎛️ 控制面板</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>
            股票代號:
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
        </div>
        <div>
          <button
            onClick={handleSubscribe}
            disabled={isSubscribed || !connectionStatus.connected}
            style={{
              marginRight: '10px',
              padding: '10px 20px',
              backgroundColor: isSubscribed ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isSubscribed ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubscribed ? '已訂閱' : '訂閱K線'}
          </button>

          <button
            onClick={handleUnsubscribe}
            disabled={!isSubscribed}
            style={{
              marginRight: '10px',
              padding: '10px 20px',
              backgroundColor: !isSubscribed ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: !isSubscribed ? 'not-allowed' : 'pointer',
            }}
          >
            取消訂閱
          </button>

          <button
            onClick={handleReconnect}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            重新連接
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div>
        <h3>📨 接收到的消息 (最近10條)</h3>
        <div
          style={{
            height: '400px',
            overflow: 'auto',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            padding: '10px',
            borderRadius: '5px',
          }}
        >
          {messages.length === 0 ? (
            <p style={{ color: '#6c757d' }}>暫無消息...</p>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '10px',
                  padding: '10px',
                  backgroundColor: 'white',
                  border: '1px solid #e9ecef',
                  borderRadius: '3px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '5px',
                  }}
                >
                  <strong>{message.type}</strong>
                  <span style={{ color: '#6c757d', fontSize: '12px' }}>
                    {message.timestamp}
                  </span>
                </div>
                <div style={{ fontSize: '14px' }}>
                  <strong>股票:</strong> {message.symbol} |
                  <strong> 間隔:</strong> {message.interval}
                </div>
                <pre
                  style={{
                    fontSize: '12px',
                    color: '#495057',
                    backgroundColor: '#f8f9fa',
                    padding: '5px',
                    borderRadius: '3px',
                    marginTop: '5px',
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(message, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 說明 */}
      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          border: '1px solid #b3d7ff',
          borderRadius: '5px',
        }}
      >
        <h4>📝 測試說明</h4>
        <ul>
          <li>
            <strong>自動降級:</strong> Socket.IO 會優先嘗試
            WebSocket,失敗時自動降級到 HTTP Long Polling
          </li>
          <li>
            <strong>傳輸方式:</strong> 可觀察 "傳輸方式" 欄位了解目前使用的協議
            (websocket/polling)
          </li>
          <li>
            <strong>Socket.IO 路徑:</strong> 現在使用 /socket.io 路徑,避免與原生
            WebSocket 衝突
          </li>
          <li>
            <strong>重連機制:</strong> 連接斷開時會自動重連,最多嘗試 5 次
          </li>
          <li>
            <strong>測試方法:</strong> 可以關閉後端服務來測試重連和降級機制
          </li>
          <li>
            <strong>數據映射:</strong> 後端會將 TXFJ5 等具體合約映射為 TXF
          </li>
          <li>
            <strong>實時數據:</strong> 如果在交易時間,應該會看到即時 tick 數據
          </li>
        </ul>
      </div>
    </div>
  )
}
