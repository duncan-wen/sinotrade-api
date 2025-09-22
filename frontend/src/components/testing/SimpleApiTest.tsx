/**
 * 簡化版 API 測試組件
 * 使用標準 HTML 元素避免 Gluestack UI v3 兼容性問題
 */
'use client'

import React, { useState, useEffect } from 'react'
import {
  useStockQuote,
  useMultipleQuotes,
  useKlineData,
  useOrders,
  usePositions,
  useAccountInfo,
  useSystemHealth,
  useMarketStatus,
  usePlaceOrder,
  useCancelOrder,
} from '@/hooks/useQueries'
import { useWebSocket } from '@/services/websocket'
import type { OrderRequest } from '@/types/api'

const SimpleApiTest: React.FC = () => {
  const [testSymbol, setTestSymbol] = useState('2330')
  const [watchlistSymbols] = useState(['2330', '2317', '2454'])
  const [orderForm, setOrderForm] = useState<Partial<OrderRequest>>({
    symbol: '2330',
    action: 'Buy',
    order_type: 'Limit',
    quantity: 1000,
    price: 500,
  })

  const webSocket = useWebSocket()

  // API 測試 Queries
  const stockQuote = useStockQuote(testSymbol)
  const multipleQuotes = useMultipleQuotes(watchlistSymbols)
  const klineData = useKlineData({
    symbol: testSymbol,
    interval: '1d',
    limit: 30,
  })
  const orders = useOrders()
  const positions = usePositions()
  const accountInfo = useAccountInfo()
  const systemHealth = useSystemHealth()
  const marketStatus = useMarketStatus()

  // Mutations
  const placeOrderMutation = usePlaceOrder({
    onSuccess: (data) => {
      alert(`下單成功!訂單ID: ${data.id}`)
    },
    onError: (error) => {
      alert(`下單失敗: ${error.message}`)
    },
  })

  const cancelOrderMutation = useCancelOrder({
    onSuccess: () => {
      alert('取消訂單成功!')
    },
    onError: (error) => {
      alert(`取消訂單失敗: ${error.message}`)
    },
  })

  // WebSocket 設置
  useEffect(() => {
    if (!webSocket.isConnected) {
      webSocket.connect()
    }

    const unsubscribe = webSocket.subscribe(
      'test-dashboard',
      {
        onConnect: () => console.log('WebSocket 連接成功'),
        onDisconnect: (reason) => console.log('WebSocket 斷開:', reason),
        onQuote: (quote) => console.log('收到報價更新:', quote),
        onOrderUpdate: (update) => console.log('收到訂單更新:', update),
        onError: (error) => console.error('WebSocket 錯誤:', error),
      },
      {
        symbols: [testSymbol, ...watchlistSymbols],
        channels: ['quotes', 'orders', 'positions'],
      }
    )

    return () => {
      unsubscribe()
    }
  }, [testSymbol, watchlistSymbols])

  // 事件處理
  const handlePlaceOrder = () => {
    if (!orderForm.symbol || !orderForm.quantity || !orderForm.price) {
      alert('請填寫完整的訂單資訊')
      return
    }

    placeOrderMutation.mutate(orderForm as OrderRequest)
  }

  const handleCancelOrder = (orderId: string) => {
    cancelOrderMutation.mutate(orderId)
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">🧪 API 測試儀表板</h1>

      {/* 系統狀態區域 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📊 系統狀態</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              systemHealth.data?.status === 'healthy'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            系統: {systemHealth.data?.status || '檢查中...'}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              marketStatus.data?.is_open
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            市場: {marketStatus.data?.is_open ? '開市' : '休市'}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              webSocket.isConnected
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            WebSocket: {webSocket.isConnected ? '已連接' : '未連接'}
          </span>
        </div>

        {systemHealth.data && (
          <div className="text-sm text-gray-600 space-y-1">
            <p>Shioaji: {systemHealth.data.services?.shioaji || '未知'}</p>
            <p>
              運行時間: {Math.floor((systemHealth.data.uptime || 0) / 60)} 分鐘
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側:市場數據測試 */}
        <div className="space-y-6">
          {/* 單一股票報價測試 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">📈 單一股票報價</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={testSymbol}
                onChange={(e) => setTestSymbol(e.target.value)}
                placeholder="股票代號"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => stockQuote.refetch()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                刷新
              </button>
            </div>

            {stockQuote.isLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}

            {stockQuote.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {stockQuote.error.message}
              </div>
            )}

            {stockQuote.data && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-lg">
                  {stockQuote.data.name} ({stockQuote.data.symbol})
                </h4>
                <p className="text-2xl font-bold">
                  ${stockQuote.data.price.toFixed(2)}
                </p>
                <p
                  className={`font-medium ${
                    stockQuote.data.change >= 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {stockQuote.data.change >= 0 ? '+' : ''}
                  {stockQuote.data.change.toFixed(2)}(
                  {stockQuote.data.change_percent.toFixed(2)}%)
                </p>
                <p className="text-sm text-gray-500">
                  成交量: {stockQuote.data.volume.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* 多檔股票報價測試 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">📊 多檔股票報價</h3>
            {multipleQuotes.isLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            {multipleQuotes.data && (
              <div className="space-y-3">
                {multipleQuotes.data.map((quote) => (
                  <div key={quote.symbol} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{quote.symbol}</p>
                        <p className="text-xs text-gray-500">{quote.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${quote.price.toFixed(2)}</p>
                        <p
                          className={`text-sm ${
                            quote.change >= 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {quote.change >= 0 ? '+' : ''}
                          {quote.change.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* K線數據測試 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">📈 K線數據</h3>
            {klineData.isLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            {klineData.data && (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  最近30天K線數據 (共 {klineData.data.length} 筆)
                </p>
                {klineData.data.slice(0, 5).map((kline, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded mb-2">
                    <div className="flex justify-between text-sm">
                      <span>{kline.timestamp.split('T')[0]}</span>
                      <span>開: {kline.open.toFixed(2)}</span>
                      <span>高: {kline.high.toFixed(2)}</span>
                      <span>低: {kline.low.toFixed(2)}</span>
                      <span>收: {kline.close.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右側:交易功能測試 */}
        <div className="space-y-6">
          {/* 下單測試 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">💰 下單測試</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={orderForm.symbol}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, symbol: e.target.value })
                }
                placeholder="股票代號"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setOrderForm({ ...orderForm, action: 'Buy' })}
                  className={`flex-1 px-4 py-2 rounded-md font-medium ${
                    orderForm.action === 'Buy'
                      ? 'bg-red-500 text-white'
                      : 'border border-red-500 text-red-500 hover:bg-red-50'
                  }`}
                >
                  買進
                </button>
                <button
                  onClick={() => setOrderForm({ ...orderForm, action: 'Sell' })}
                  className={`flex-1 px-4 py-2 rounded-md font-medium ${
                    orderForm.action === 'Sell'
                      ? 'bg-green-500 text-white'
                      : 'border border-green-500 text-green-500 hover:bg-green-50'
                  }`}
                >
                  賣出
                </button>
              </div>

              <input
                type="number"
                value={orderForm.quantity?.toString()}
                onChange={(e) =>
                  setOrderForm({
                    ...orderForm,
                    quantity: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="數量"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="number"
                step="0.01"
                value={orderForm.price?.toString()}
                onChange={(e) =>
                  setOrderForm({
                    ...orderForm,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="價格"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                onClick={handlePlaceOrder}
                disabled={placeOrderMutation.isPending}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {placeOrderMutation.isPending ? '下單中...' : '確認下單'}
              </button>
            </div>
          </div>

          {/* 訂單列表 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">📋 訂單列表</h3>
            {orders.isLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            {orders.data?.orders && (
              <div className="space-y-3">
                {orders.data.orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{order.symbol}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          order.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : order.status === 'Filled'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>
                        {order.action} {order.quantity}
                      </span>
                      <span>@{order.price?.toFixed(2)}</span>
                      {order.status === 'Pending' && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-2 py-1 text-xs text-red-600 border border-red-600 rounded hover:bg-red-50"
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 持倉資訊 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">💼 持倉資訊</h3>
            {positions.isLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            {positions.data && (
              <div className="space-y-3">
                {positions.data.slice(0, 5).map((position) => (
                  <div
                    key={position.symbol}
                    className="bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{position.symbol}</span>
                      <span className="font-bold">
                        ${position.current_price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>持股: {position.quantity}</span>
                      <span
                        className={`font-medium ${
                          position.unrealized_pnl >= 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        {position.unrealized_pnl >= 0 ? '+' : ''}$
                        {position.unrealized_pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 帳戶資訊 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">💳 帳戶資訊</h3>
            {accountInfo.isLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            {accountInfo.data && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>帳戶餘額:</span>
                  <span className="font-bold">
                    ${accountInfo.data.balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>可用餘額:</span>
                  <span className="font-bold">
                    ${accountInfo.data.available_balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>總市值:</span>
                  <span className="font-bold">
                    ${accountInfo.data.total_value.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>未實現損益:</span>
                  <span
                    className={`font-bold ${
                      accountInfo.data.unrealized_pnl >= 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {accountInfo.data.unrealized_pnl >= 0 ? '+' : ''}$
                    {accountInfo.data.unrealized_pnl.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WebSocket 統計 */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">🔌 WebSocket 統計</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <span className="text-sm">
            連接狀態: {webSocket.stats.connected ? '已連接' : '未連接'}
          </span>
          <span className="text-sm">
            連接ID: {webSocket.stats.connectionId || 'N/A'}
          </span>
          <span className="text-sm">
            訂閱數量: {webSocket.stats.subscriptions}
          </span>
          <span className="text-sm">
            重連次數: {webSocket.stats.reconnectAttempts}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => webSocket.connect()}
            disabled={webSocket.isConnected}
            className="px-3 py-2 bg-green-500 text-white rounded-md disabled:bg-gray-400 hover:bg-green-600"
          >
            連接
          </button>
          <button
            onClick={() => webSocket.disconnect()}
            disabled={!webSocket.isConnected}
            className="px-3 py-2 border border-red-500 text-red-500 rounded-md disabled:border-gray-400 disabled:text-gray-400 hover:bg-red-50"
          >
            斷開
          </button>
          <button
            onClick={() => webSocket.subscribeQuotes([testSymbol])}
            disabled={!webSocket.isConnected}
            className="px-3 py-2 border border-blue-500 text-blue-500 rounded-md disabled:border-gray-400 disabled:text-gray-400 hover:bg-blue-50"
          >
            訂閱報價
          </button>
        </div>
      </div>
    </div>
  )
}

export default SimpleApiTest
