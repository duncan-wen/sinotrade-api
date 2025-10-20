/**
 * 美股圖表分析頁面
 *
 * 特色功能:
 * 1. 整合 Polygon.io API,支援美股即時數據
 * 2. 無需後端聚合,API 已預聚合多種時間周期
 * 3. 美股專屬功能:盤前盤後交易、市場狀態
 * 4. 豐富的美股代號搜尋和熱門股票
 */

'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { MainLayout } from '@/components/layout/MainLayout'

// 通用的超時 fetch 函數
const fetchWithTimeout = async (
  url: string,
  timeout: number = 30000
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`請求超時 (${timeout / 1000}秒),請檢查網路連接或稍後再試`)
    }
    throw error
  }
}

// 動態載入美股專用圖表組件,避免 SSR 問題
const USStockChart = dynamic(() => import('@/components/chart/USStockChart'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">載入美股圖表...</div>
    </div>
  ),
})

interface PopularStock {
  ticker: string
  name: string
  sector: string
}

interface MarketStatus {
  market: string
  status: string
  early_hours: boolean
  after_hours: boolean
}

export default function USStocksPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [interval, setInterval] = useState('1d')
  const [popularStocks, setPopularStocks] = useState<PopularStock[]>([])
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PopularStock[]>([])

  // 防抖機制:避免快速切換股票導致過多 API 請求
  const handleSymbolChange = useCallback(
    (newSymbol: string) => {
      if (newSymbol === symbol) return

      console.log('🔄 準備切換股票:', symbol, '->', newSymbol)

      // 嚴格延遲,配合 30 秒 API 限制
      setTimeout(() => {
        setSymbol(newSymbol)
      }, 2000) // 2 秒防抖延遲
    },
    [symbol]
  )
  const [isSearching, setIsSearching] = useState(false)

  // 🔧 使用 useCallback 防止回調重新創建,移除 interval 依賴避免循環更新
  const handleIntervalChangeFromChart = useCallback(
    (newInterval: string) => {
      console.log('📊 圖表間隔切換:', newInterval)
      setInterval(newInterval)
    },
    [] // 移除 interval 依賴,避免每次 interval 變化都重新創建函數
  )

  // 🔧 使用 useMemo 穩定 props 對象,現在 handleIntervalChangeFromChart 是穩定的
  const chartProps = useMemo(
    () => ({
      symbol,
      interval,
      height: 600,
      apiEndpoint: '/api/polygon/klines' as const,
      className: 'w-full',
      onIntervalChange: handleIntervalChangeFromChart,
    }),
    [symbol, interval, handleIntervalChangeFromChart] // handleIntervalChangeFromChart 現在是穩定的
  )

  // 順序載入數據,避免同時發送多個 API 請求
  useEffect(() => {
    const initializeData = async () => {
      try {
        // 1. 首先載入市場狀態
        console.log('📊 載入市場狀態...')
        const statusResponse = await fetchWithTimeout(
          '/api/polygon/market/status',
          30000
        )
        if (statusResponse.ok) {
          const status = await statusResponse.json()
          setMarketStatus(status)
        } else {
          if (statusResponse.status === 429) {
            console.warn('⏰ 市場狀態 API 限制,請等待 20 秒')
          } else {
            console.warn(
              '❌ 市場狀態載入失敗:',
              statusResponse.status,
              statusResponse.statusText
            )
          }
        }

        // 2. 等待 30 秒後載入熱門股票 (避免與圖表數據請求重疊)
        await new Promise((resolve) => setTimeout(resolve, 30000))
        console.log('🔥 載入熱門股票...')
        const stocksResponse = await fetchWithTimeout(
          '/api/polygon/tickers/popular',
          30000
        )
        if (stocksResponse.ok) {
          const stocks = await stocksResponse.json()
          setPopularStocks(stocks)
        } else {
          if (stocksResponse.status === 429) {
            console.warn('⏰ 熱門股票 API 限制,請等待 20 秒')
          } else {
            console.warn(
              '❌ 熱門股票載入失敗:',
              stocksResponse.status,
              stocksResponse.statusText
            )
          }
        }
      } catch (error) {
        console.error('載入數據失敗:', error)
      }
    }

    const fetchMarketStatus = async () => {
      try {
        const response = await fetchWithTimeout(
          '/api/polygon/market/status',
          30000
        )
        if (response.ok) {
          const status = await response.json()
          setMarketStatus(status)
        } else {
          if (response.status === 429) {
            console.warn('⏰ 定時市場狀態 API 限制,請等待 20 秒')
          } else {
            console.warn(
              '❌ 定時市場狀態更新失敗:',
              response.status,
              response.statusText
            )
          }
        }
      } catch (error) {
        console.error('更新市場狀態失敗:', error)
      }
    }

    // 初始化數據
    initializeData()

    // 🚫 暫時禁用市場狀態自動更新(避免超過 API 限制)
    // const intervalId = window.setInterval(
    //   () => {
    //     fetchMarketStatus()
    //   },
    //   5 * 60 * 1000 // 每5分鐘更新一次市場狀態
    // )

    return () => {
      // window.clearInterval(intervalId)
    }
  }, [])

  // 搜尋股票 (嚴格限制避免頻繁請求)
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // 添加適度延遲,配合 20 秒 API 限制
      await new Promise((resolve) => setTimeout(resolve, 3000))

      console.log('🔍 搜尋股票:', query)
      const response = await fetchWithTimeout(
        `/api/polygon/search?query=${encodeURIComponent(query)}&limit=10`,
        30000
      )
      if (response.ok) {
        const results = await response.json()
        setSearchResults(results)
      } else {
        if (response.status === 429) {
          console.warn('⏰ 股票搜尋 API 限制,請等待 20 秒')
        } else {
          console.warn('❌ 股票搜尋失敗:', response.status, response.statusText)
        }
        setSearchResults([]) // 清空搜尋結果
      }
    } catch (error) {
      console.error('搜尋股票失敗:', error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // 處理搜尋輸入 (嚴格防抖)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery)
    }, 3000) // 3秒防抖,配合適度 API 限制

    return () => clearTimeout(timeoutId)
  }, [searchQuery, handleSearch])

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🇺🇸 美股圖表分析
          </h1>
          <div className="space-y-2">
            <p className="text-gray-600">
              整合 Polygon.io API,提供美股數據與專業技術分析
            </p>
            <div className="space-y-1">
              <div className="inline-flex items-center text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
                ⚠️ 即時數據功能暫停中 (免費計劃不支援 WebSocket)
              </div>
              <div className="inline-flex items-center text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md">
                ⏰ 免費計劃限制: 30秒間隔,每分鐘3次請求 (頁面請求已優化時序)
              </div>
            </div>
          </div>
        </div>

        {/* 市場狀態卡片 */}
        {marketStatus && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  市場狀態
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    marketStatus.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {marketStatus.status === 'open' ? '開盤中' : '閉市'}
                </span>
              </div>
              <div className="flex space-x-4 text-sm text-gray-600">
                {marketStatus.early_hours && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    盤前交易
                  </span>
                )}
                {marketStatus.after_hours && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    盤後交易
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 股票搜尋 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                股票搜尋
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="輸入股票代號或公司名稱..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {isSearching && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>

              {/* 搜尋結果 */}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto">
                  {searchResults.map((stock) => (
                    <button
                      key={stock.ticker}
                      onClick={() => {
                        handleSymbolChange(stock.ticker)
                        setSearchQuery('')
                        setSearchResults([])
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">
                        {stock.ticker}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {stock.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 當前股票 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                當前股票
              </label>
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="font-medium text-blue-900">{symbol}</div>
                <div className="text-sm text-blue-600">{interval} 圖表</div>
              </div>
            </div>
          </div>
        </div>

        {/* 熱門股票快速選擇 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🔥 熱門美股
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {popularStocks.map((stock) => (
              <button
                key={stock.ticker}
                onClick={() => handleSymbolChange(stock.ticker)}
                className={`p-3 text-left border rounded-lg transition-colors ${
                  symbol === stock.ticker
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{stock.ticker}</div>
                <div className="text-sm text-gray-600 truncate">
                  {stock.name}
                </div>
                <div className="text-xs text-gray-500">{stock.sector}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 圖表區域 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {symbol} 技術分析圖表
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Polygon.io 數據源</span>
            </div>
          </div>

          {/* 美股專用圖表組件,整合 Polygon.io API */}
          <USStockChart {...chartProps} />
        </div>

        {/* API 優勢說明 */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            🚀 Polygon.io API 優勢
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">✅</span>
              <span>
                <strong>無需聚合:</strong>API 已預聚合多種時間周期
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">⚡</span>
              <span>
                <strong>快速響應:</strong>不需後端處理大量1分鐘數據
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">📊</span>
              <span>
                <strong>豐富周期:</strong>支援從1分鐘到月線的多種周期
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500 mt-0.5">💾</span>
              <span>
                <strong>節省資源:</strong>減少頻寬和計算負載
              </span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
