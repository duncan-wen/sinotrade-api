/**
 * API 測試儀表板
 * 用於測試前後端串接功能
 */
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  useTradingDashboard,
} from '@/hooks/useQueries'
import { useWebSocket } from '@/services/websocket'
import type { OrderRequest } from '@/types/api'

const ApiTestDashboard: React.FC = () => {
  const [testSymbol, setTestSymbol] = useState('2330')
  const [watchlistSymbols, setWatchlistSymbols] = useState([
    '2330',
    '2317',
    '2454',
  ])
  const [orderForm, setOrderForm] = useState<Partial<OrderRequest>>({
    symbol: '2330',
    action: 'Buy',
    order_type: 'Limit',
    quantity: 1000,
    price: 500,
  })

  const webSocket = useWebSocket()

  // ==================== API 測試 Queries ====================

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
  const tradingDashboard = useTradingDashboard()

  // ==================== Mutations ====================

  const placeOrderMutation = usePlaceOrder({
    onSuccess: (data) => {
      alert(`下單成功！訂單ID: ${data.id}`)
    },
    onError: (error) => {
      alert(`下單失敗: ${error.message}`)
    },
  })

  const cancelOrderMutation = useCancelOrder({
    onSuccess: () => {
      alert('取消訂單成功！')
    },
    onError: (error) => {
      alert(`取消訂單失敗: ${error.message}`)
    },
  })

  // ==================== WebSocket 測試 ====================

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

  // ==================== 事件處理 ====================

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

  // ==================== 渲染組件 ====================

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 API 測試儀表板</h1>

      {/* 系統狀態區域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📊 系統狀態</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              variant={
                systemHealth.data?.status === 'healthy'
                  ? 'default'
                  : 'destructive'
              }
            >
              系統: {systemHealth.data?.status || '檢查中...'}
            </Badge>
            <Badge
              variant={marketStatus.data?.is_open ? 'default' : 'secondary'}
            >
              市場: {marketStatus.data?.is_open ? '開市' : '休市'}
            </Badge>
            <Badge variant={webSocket.isConnected ? 'default' : 'destructive'}>
              WebSocket: {webSocket.isConnected ? '已連接' : '未連接'}
            </Badge>
          </div>

          {systemHealth.data && (
            <div className="mt-4 space-y-1">
              <p className="text-sm text-muted-foreground">
                Shioaji: {systemHealth.data.services?.shioaji || '未知'}
              </p>
              <p className="text-sm text-muted-foreground">
                運行時間: {Math.floor((systemHealth.data.uptime || 0) / 60)}{' '}
                分鐘
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側:市場數據測試 */}
        <div className="space-y-4">
          {/* 單一股票報價測試 */}
          <Card>
            <CardHeader>
              <CardTitle>📈 單一股票報價</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  value={testSymbol}
                  onChange={(e) => setTestSymbol(e.target.value)}
                  placeholder="股票代號"
                  className="flex-1"
                />
                <Button onClick={() => stockQuote.refetch()}>刷新</Button>
              </div>

              {stockQuote.isLoading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              )}
              {stockQuote.error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    {stockQuote.error.message}
                  </AlertDescription>
                </Alert>
              )}
              {stockQuote.data && (
                <div className="bg-muted p-3 rounded">
                  <p className="font-bold">
                    {stockQuote.data.name} ({stockQuote.data.symbol})
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    成交量: {stockQuote.data.volume.toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 多檔股票報價測試 */}
          <Card>
            <CardHeader>
              <CardTitle>📊 多檔股票報價</CardTitle>
            </CardHeader>
            <CardContent>
              {multipleQuotes.isLoading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              )}
              {multipleQuotes.data && (
                <div className="space-y-2">
                  {multipleQuotes.data.map((quote) => (
                    <div key={quote.symbol} className="bg-muted p-2 rounded">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{quote.symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            {quote.name}
                          </p>
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
            </CardContent>
          </Card>
        </div>

        {/* 右側:交易功能測試 */}
        <div className="space-y-4">
          {/* 下單測試 */}
          <Card>
            <CardHeader>
              <CardTitle>💰 下單測試</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Input
                  value={orderForm.symbol}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, symbol: e.target.value })
                  }
                  placeholder="股票代號"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={orderForm.action === 'Buy' ? 'default' : 'outline'}
                    onClick={() =>
                      setOrderForm({ ...orderForm, action: 'Buy' })
                    }
                    className="text-red-600"
                  >
                    買進
                  </Button>
                  <Button
                    variant={
                      orderForm.action === 'Sell' ? 'default' : 'outline'
                    }
                    onClick={() =>
                      setOrderForm({ ...orderForm, action: 'Sell' })
                    }
                    className="text-green-600"
                  >
                    賣出
                  </Button>
                </div>
                <Input
                  value={orderForm.quantity?.toString()}
                  onChange={(e) =>
                    setOrderForm({
                      ...orderForm,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="數量"
                />
                <Input
                  value={orderForm.price?.toString()}
                  onChange={(e) =>
                    setOrderForm({
                      ...orderForm,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="價格"
                />
                <Button
                  onClick={handlePlaceOrder}
                  disabled={placeOrderMutation.isPending}
                  className="w-full"
                >
                  {placeOrderMutation.isPending ? '下單中...' : '確認下單'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 訂單列表 */}
          <Card>
            <CardHeader>
              <CardTitle>📋 訂單列表</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.isLoading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              )}
              {orders.data?.orders && (
                <div className="space-y-2">
                  {orders.data.orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="bg-muted p-3 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{order.symbol}</span>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>
                          {order.action} {order.quantity}
                        </span>
                        <span>@{order.price?.toFixed(2)}</span>
                        {order.status === 'Pending' && (
                          <Button
                            onClick={() => handleCancelOrder(order.id)}
                            variant="outline"
                            size="sm"
                          >
                            取消
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* WebSocket 統計 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>🔌 WebSocket 統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">連接狀態</p>
              <p className="font-medium">
                {webSocket.stats.connected ? '已連接' : '未連接'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">連接ID</p>
              <p className="font-medium">
                {webSocket.stats.connectionId || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">訂閱數量</p>
              <p className="font-medium">{webSocket.stats.subscriptions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">重連次數</p>
              <p className="font-medium">{webSocket.stats.reconnectAttempts}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => webSocket.connect()}
              disabled={webSocket.isConnected}
              variant="default"
            >
              連接
            </Button>
            <Button
              onClick={() => webSocket.disconnect()}
              disabled={!webSocket.isConnected}
              variant="outline"
            >
              斷開
            </Button>
            <Button
              onClick={() => webSocket.subscribeQuotes([testSymbol])}
              disabled={!webSocket.isConnected}
              variant="outline"
            >
              訂閱報價
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ApiTestDashboard
