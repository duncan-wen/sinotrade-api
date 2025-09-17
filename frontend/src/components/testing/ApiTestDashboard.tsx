/**
 * API 測試儀表板
 * 用於測試前後端串接功能
 */
'use client'

import React, { useState, useEffect } from 'react'
import { Box } from '@/components/ui/box'
import { VStack } from '@/components/ui/vstack'
import { HStack } from '@/components/ui/hstack'
import { Card } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
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
    <Box className="p-6 max-w-7xl mx-auto">
      <Text className="text-3xl font-bold mb-6">🧪 API 測試儀表板</Text>

      {/* 系統狀態區域 */}
      <Card className="mb-6 p-4">
        <Text className="text-xl font-semibold mb-4">📊 系統狀態</Text>
        <HStack className="flex-wrap gap-2">
          <Badge
            variant={
              systemHealth.data?.status === 'healthy' ? 'solid' : 'outline'
            }
            className={`${systemHealth.data?.status === 'healthy' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
          >
            <Text className="text-xs">
              系統: {systemHealth.data?.status || '檢查中...'}
            </Text>
          </Badge>
          <Badge
            variant={marketStatus.data?.is_open ? 'solid' : 'outline'}
            className={`${marketStatus.data?.is_open ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}
          >
            <Text className="text-xs">
              市場: {marketStatus.data?.is_open ? '開市' : '休市'}
            </Text>
          </Badge>
          <Badge
            variant={webSocket.isConnected ? 'solid' : 'outline'}
            className={`${webSocket.isConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
          >
            <Text className="text-xs">
              WebSocket: {webSocket.isConnected ? '已連接' : '未連接'}
            </Text>
          </Badge>
        </HStack>

        {systemHealth.data && (
          <Box className="mt-4">
            <Text className="text-sm text-gray-600">
              Shioaji: {systemHealth.data.services?.shioaji || '未知'}
            </Text>
            <Text className="text-sm text-gray-600">
              運行時間: {Math.floor((systemHealth.data.uptime || 0) / 60)} 分鐘
            </Text>
          </Box>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側:市場數據測試 */}
        <VStack className="space-y-4">
          {/* 單一股票報價測試 */}
          <Card className="w-full p-4">
            <Text className="text-lg font-semibold mb-4">📈 單一股票報價</Text>
            <HStack className="space-y-2" className="mb-4">
              <Input
                value={testSymbol}
                onChangeText={setTestSymbol}
                placeholder="股票代號"
                className="flex-1"
              />
              <Button
                onPress={() => stockQuote.refetch()}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                <Text className="text-white">刷新</Text>
              </Button>
            </HStack>

            {stockQuote.isLoading && <Spinner />}
            {stockQuote.error && (
              <Alert action="error" className="mb-4">
                <Text className="text-red-600">{stockQuote.error.message}</Text>
              </Alert>
            )}
            {stockQuote.data && (
              <Box className="bg-gray-50 p-3 rounded">
                <Text className="font-bold">
                  {stockQuote.data.name} ({stockQuote.data.symbol})
                </Text>
                <Text className="text-2xl font-bold">
                  ${stockQuote.data.price.toFixed(2)}
                </Text>
                <Text
                  className={`font-medium ${
                    stockQuote.data.change >= 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {stockQuote.data.change >= 0 ? '+' : ''}
                  {stockQuote.data.change.toFixed(2)}(
                  {stockQuote.data.change_percent.toFixed(2)}%)
                </Text>
                <Text className="text-sm text-gray-500">
                  成交量: {stockQuote.data.volume.toLocaleString()}
                </Text>
              </Box>
            )}
          </Card>

          {/* 多檔股票報價測試 */}
          <Card className="w-full p-4">
            <Text className="text-lg font-semibold mb-4">📊 多檔股票報價</Text>
            {multipleQuotes.isLoading && <Spinner />}
            {multipleQuotes.data && (
              <VStack className="space-y-2">
                {multipleQuotes.data.map((quote) => (
                  <Box key={quote.symbol} className="bg-gray-50 p-2 rounded">
                    <HStack className="justify-between">
                      <VStack>
                        <Text className="font-medium">{quote.symbol}</Text>
                        <Text className="text-xs text-gray-500">
                          {quote.name}
                        </Text>
                      </VStack>
                      <VStack className="items-end">
                        <Text className="font-bold">
                          ${quote.price.toFixed(2)}
                        </Text>
                        <Text
                          className={`text-sm ${
                            quote.change >= 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {quote.change >= 0 ? '+' : ''}
                          {quote.change.toFixed(2)}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Card>

          {/* K線數據測試 */}
          <Card className="w-full p-4">
            <Text className="text-lg font-semibold mb-4">📈 K線數據</Text>
            {klineData.isLoading && <Spinner />}
            {klineData.data && (
              <Box>
                <Text className="text-sm text-gray-600 mb-2">
                  最近30天K線數據 (共 {klineData.data.length} 筆)
                </Text>
                {klineData.data.slice(0, 5).map((kline, index) => (
                  <Box key={index} className="bg-gray-50 p-2 rounded mb-1">
                    <HStack className="justify-between text-sm">
                      <Text>{kline.timestamp.split('T')[0]}</Text>
                      <Text>開: {kline.open.toFixed(2)}</Text>
                      <Text>高: {kline.high.toFixed(2)}</Text>
                      <Text>低: {kline.low.toFixed(2)}</Text>
                      <Text>收: {kline.close.toFixed(2)}</Text>
                    </HStack>
                  </Box>
                ))}
              </Box>
            )}
          </Card>
        </VStack>

        {/* 右側:交易功能測試 */}
        <VStack className="space-y-4">
          {/* 下單測試 */}
          <Card className="w-full p-4">
            <Text className="text-lg font-semibold mb-4">💰 下單測試</Text>
            <VStack className="space-y-2">
              <Input
                value={orderForm.symbol}
                onChangeText={(value) =>
                  setOrderForm({ ...orderForm, symbol: value })
                }
                placeholder="股票代號"
                className="border border-gray-300 rounded px-3 py-2"
              />
              <HStack className="space-x-2">
                <Button
                  variant={orderForm.action === 'Buy' ? 'solid' : 'outline'}
                  onPress={() => setOrderForm({ ...orderForm, action: 'Buy' })}
                  className={`flex-1 ${orderForm.action === 'Buy' ? 'bg-red-500 text-white' : 'border border-red-500 text-red-500'} px-4 py-2 rounded`}
                >
                  <Text
                    className={
                      orderForm.action === 'Buy' ? 'text-white' : 'text-red-500'
                    }
                  >
                    買進
                  </Text>
                </Button>
                <Button
                  variant={orderForm.action === 'Sell' ? 'solid' : 'outline'}
                  onPress={() => setOrderForm({ ...orderForm, action: 'Sell' })}
                  className={`flex-1 ${orderForm.action === 'Sell' ? 'bg-green-500 text-white' : 'border border-green-500 text-green-500'} px-4 py-2 rounded`}
                >
                  <Text
                    className={
                      orderForm.action === 'Sell'
                        ? 'text-white'
                        : 'text-green-500'
                    }
                  >
                    賣出
                  </Text>
                </Button>
              </HStack>
              <Input
                value={orderForm.quantity?.toString()}
                onChangeText={(value) =>
                  setOrderForm({ ...orderForm, quantity: parseInt(value) || 0 })
                }
                placeholder="數量"
                className="border border-gray-300 rounded px-3 py-2"
              />
              <Input
                value={orderForm.price?.toString()}
                onChangeText={(value) =>
                  setOrderForm({ ...orderForm, price: parseFloat(value) || 0 })
                }
                placeholder="價格"
                className="border border-gray-300 rounded px-3 py-2"
              />
              <Button
                onPress={handlePlaceOrder}
                disabled={placeOrderMutation.isPending}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
              >
                <Text className="text-white font-medium">
                  {placeOrderMutation.isPending ? '下單中...' : '確認下單'}
                </Text>
              </Button>
            </VStack>
          </Card>

          {/* 訂單列表 */}
          <Card className="w-full p-4">
            <Text className="text-lg font-semibold mb-4">📋 訂單列表</Text>
            {orders.isLoading && <Spinner />}
            {orders.data?.orders && (
              <VStack className="space-y-2">
                {orders.data.orders.slice(0, 5).map((order) => (
                  <Box key={order.id} className="bg-gray-50 p-3 rounded">
                    <HStack className="justify-between mb-2">
                      <Text className="font-medium">{order.symbol}</Text>
                      <Badge variant="outline">{order.status}</Badge>
                    </HStack>
                    <HStack className="justify-between text-sm">
                      <Text>
                        {order.action} {order.quantity}
                      </Text>
                      <Text>@{order.price?.toFixed(2)}</Text>
                      {order.status === 'Pending' && (
                        <Button
                          onPress={() => handleCancelOrder(order.id)}
                          className="px-3 py-1 border border-red-500 text-red-500 rounded text-sm"
                        >
                          <Text className="text-red-500 text-xs">取消</Text>
                        </Button>
                      )}
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Card>

          {/* 持倉資訊 */}
          <Card className="w-full p-4">
            <Text className="text-lg font-semibold mb-4">💼 持倉資訊</Text>
            {positions.isLoading && <Spinner />}
            {positions.data && (
              <VStack className="space-y-2">
                {positions.data.slice(0, 5).map((position) => (
                  <Box key={position.symbol} className="bg-gray-50 p-3 rounded">
                    <HStack className="justify-between mb-1">
                      <Text className="font-medium">{position.symbol}</Text>
                      <Text className="font-bold">
                        ${position.current_price.toFixed(2)}
                      </Text>
                    </HStack>
                    <HStack className="justify-between text-sm">
                      <Text>持股: {position.quantity}</Text>
                      <Text
                        className={`font-medium ${
                          position.unrealized_pnl >= 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        {position.unrealized_pnl >= 0 ? '+' : ''}$
                        {position.unrealized_pnl.toFixed(2)}
                      </Text>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Card>

          {/* 帳戶資訊 */}
          <Card className="w-full p-4">
            <Text className="text-lg font-semibold mb-4">💳 帳戶資訊</Text>
            {accountInfo.isLoading && <Spinner />}
            {accountInfo.data && (
              <VStack className="space-y-2">
                <HStack className="justify-between">
                  <Text>帳戶餘額:</Text>
                  <Text className="font-bold">
                    ${accountInfo.data.balance.toLocaleString()}
                  </Text>
                </HStack>
                <HStack className="justify-between">
                  <Text>可用餘額:</Text>
                  <Text className="font-bold">
                    ${accountInfo.data.available_balance.toLocaleString()}
                  </Text>
                </HStack>
                <HStack className="justify-between">
                  <Text>總市值:</Text>
                  <Text className="font-bold">
                    ${accountInfo.data.total_value.toLocaleString()}
                  </Text>
                </HStack>
                <HStack className="justify-between">
                  <Text>未實現損益:</Text>
                  <Text
                    className={`font-bold ${
                      accountInfo.data.unrealized_pnl >= 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {accountInfo.data.unrealized_pnl >= 0 ? '+' : ''}$
                    {accountInfo.data.unrealized_pnl.toLocaleString()}
                  </Text>
                </HStack>
              </VStack>
            )}
          </Card>
        </VStack>
      </div>

      {/* WebSocket 統計 */}
      <Card className="mt-6 p-4">
        <Text className="text-lg font-semibold mb-4">🔌 WebSocket 統計</Text>
        <HStack className="space-y-4" className="flex-wrap">
          <Text className="text-sm">
            連接狀態: {webSocket.stats.connected ? '已連接' : '未連接'}
          </Text>
          <Text className="text-sm">
            連接ID: {webSocket.stats.connectionId || 'N/A'}
          </Text>
          <Text className="text-sm">
            訂閱數量: {webSocket.stats.subscriptions}
          </Text>
          <Text className="text-sm">
            重連次數: {webSocket.stats.reconnectAttempts}
          </Text>
        </HStack>
        <HStack className="mt-4 space-x-2">
          <Button
            onPress={() => webSocket.connect()}
            disabled={webSocket.isConnected}
            className="px-3 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
          >
            <Text className="text-white text-sm">連接</Text>
          </Button>
          <Button
            onPress={() => webSocket.disconnect()}
            disabled={!webSocket.isConnected}
            className="px-3 py-2 border border-red-500 text-red-500 rounded disabled:border-gray-400 disabled:text-gray-400"
          >
            <Text className="text-red-500 text-sm">斷開</Text>
          </Button>
          <Button
            onPress={() => webSocket.subscribeQuotes([testSymbol])}
            disabled={!webSocket.isConnected}
            className="px-3 py-2 border border-blue-500 text-blue-500 rounded disabled:border-gray-400 disabled:text-gray-400"
          >
            <Text className="text-blue-500 text-sm">訂閱報價</Text>
          </Button>
        </HStack>
      </Card>
    </Box>
  )
}

export default ApiTestDashboard
