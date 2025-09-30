'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { apiService } from '@/services/api'
import { useOptionsQuotes } from '@/hooks/useOptionsQuotes'
import { useFuturesPrice } from '@/hooks/useFuturesPrice'
import type { OptionQuote } from '@/types/api'

// 選擇權類型選項
const OPTION_TYPES = [
  { value: 'TX1', label: 'TX1 - 臺指選擇權 (第一個週三到期)' },
  { value: 'TX2', label: 'TX2 - 臺指選擇權 (第二個週三到期)' },
  { value: 'TXO', label: 'TXO - 臺指選擇權 (第三個週三到期)' },
  { value: 'TX4', label: 'TX4 - 臺指選擇權 (第四週周三到期)' },
  { value: 'TXY', label: 'TXY - 臺指選擇權 (最近期週五到期)' },
  { value: 'TXU', label: 'TXU - 臺指選擇權 (下一期周五到期)' },
]

// 合約資訊界面
interface OptionContract {
  code: string
  symbol: string
  name: string
  option_type: string
  strike_price: number
  delivery_date: string
  delivery_month: string
  option_right: string
  distance_from_futures: number
  moneyness: string
}

// API 回應界面
interface FilteredContractsResponse {
  success: boolean
  message: string
  filters_applied: {
    option_types: string[]
    target_months: string[]
    call_put_filter: string
    price_range: string
  }
  futures_info: {
    symbol: string
    current_price: number
    method: string
  }
  option_contracts: {
    all_call_options: OptionContract[]
    all_put_options: OptionContract[]
    by_type: Record<
      string,
      {
        call_options: OptionContract[]
        put_options: OptionContract[]
        call_count: number
        put_count: number
        total_count: number
      }
    >
  }
  summary: {
    total_call_contracts: number
    total_put_contracts: number
    total_contracts: number
    by_option_type: Record<string, any>
  }
  timestamp: string
}

// 工具函數：計算本月和下個月的YYYYMM格式
const getCurrentAndNextMonth = () => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear

  return {
    current: `${currentYear}${currentMonth.toString().padStart(2, '0')}`,
    next: `${nextYear}${nextMonth.toString().padStart(2, '0')}`,
  }
}

export interface OptionsContractSelectorProps {
  onContractSelect?: (contract: OptionContract) => void
  className?: string
}

export default function OptionsContractSelector({
  onContractSelect,
  className,
}: OptionsContractSelectorProps) {
  // 狀態管理
  const [selectedOptionType, setSelectedOptionType] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contractsData, setContractsData] =
    useState<FilteredContractsResponse | null>(null)

  // 計算目標月份
  const { current, next } = getCurrentAndNextMonth()
  const targetMonths = `${current},${next}`

  // 即時報價 Hook
  const {
    quotes,
    isConnected: isQuotesConnected,
    error: quotesError,
    subscribeToOptions,
    unsubscribeFromOptions,
    generateMockQuotes,
    getQuote,
  } = useOptionsQuotes({ enabled: true })

  // 期貨即時價格 Hook
  const {
    price: futuresPrice,
    isConnected: isFuturesConnected,
    error: futuresError,
    lastUpdate: futuresLastUpdate,
  } = useFuturesPrice({
    symbol: 'TXFR1',
    interval: '1m',
    enabled: true,
  })

  // 追踪期貨價格百位數變化，自動重新載入合約
  const lastHundredsRef = useRef<number | null>(null)
  const lastReloadTimeRef = useRef<number>(0)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const priceStabilityCountRef = useRef<number>(0)

  // 測試模式：手動調整期貨價格（僅用於測試百位數變化）
  const [testMode, setTestMode] = useState(false)
  const [testPrice, setTestPrice] = useState<number>(26021)

  // 載入選擇權合約
  const loadOptionContracts = useCallback(async () => {
    if (!selectedOptionType) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.getFilteredOptionContracts({
        option_types: selectedOptionType,
        target_months: targetMonths,
        price_range: 600, // 預設價格範圍
        futures_symbol: 'TXFR1', // 預設期貨代號
        call_put_filter: 'both',
      })

      setContractsData(response)

      // 合約載入成功後，訂閱即時報價
      if (response.success) {
        const allContracts = [
          ...response.option_contracts.all_call_options,
          ...response.option_contracts.all_put_options,
        ]

        if (allContracts.length > 0) {
          // 只生成基於期貨現價 ±600 範圍的模擬報價，不使用 WebSocket
          console.log(
            '📊 [OptionsContractSelector] 生成基於期貨現價的選擇權報價'
          )
          generateMockQuotes(allContracts)
        }
      }
    } catch (err) {
      console.error('載入選擇權合約失敗:', err)
      setError(err instanceof Error ? err.message : '載入合約資料失敗')
    } finally {
      setIsLoading(false)
    }
  }, [selectedOptionType, targetMonths, generateMockQuotes])

  // 🛡️ 防抖動：延遲執行合約重載
  const debouncedLoadContracts = useCallback(
    (newHundreds: number, price: number) => {
      // 清除之前的計時器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // 設置新的計時器（2秒防抖）
      debounceTimerRef.current = setTimeout(() => {
        const now = Date.now()
        const timeSinceLastReload = now - lastReloadTimeRef.current
        const minReloadInterval = 5000 // 最少間隔5秒

        // 檢查是否滿足重載條件
        if (timeSinceLastReload >= minReloadInterval) {
          console.log(
            `📊 [防抖重載] 百位數穩定在 ${newHundreds}，執行合約重載 (價格: ${price}) ${testMode ? '[測試模式]' : ''}`
          )

          // 更新記錄
          lastHundredsRef.current = newHundreds
          lastReloadTimeRef.current = now
          priceStabilityCountRef.current = 0

          // 執行重載
          loadOptionContracts()
        } else {
          const remainingTime = Math.ceil(
            (minReloadInterval - timeSinceLastReload) / 1000
          )
          console.log(
            `📊 [防抖跳過] 距離上次重載不足5秒，還需等待 ${remainingTime} 秒`
          )
        }
      }, 2000) // 2秒防抖延遲
    },
    [testMode, loadOptionContracts]
  )

  // 當選擇權類型改變時重新載入
  useEffect(() => {
    if (selectedOptionType) {
      console.log(
        '📊 [OptionsContractSelector] 選擇權類型變更，重新載入合約:',
        selectedOptionType
      )

      // 重設百位數追蹤和防抖狀態
      lastHundredsRef.current = null
      lastReloadTimeRef.current = 0
      priceStabilityCountRef.current = 0

      // 清除防抖計時器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // 載入新合約
      loadOptionContracts()
    }
  }, [selectedOptionType, loadOptionContracts])

  // 🕐 監聽期貨價格百位數變化，自動重新載入合約（含防抖動）
  useEffect(() => {
    // 使用測試價格或真實期貨價格
    const currentPrice = testMode ? testPrice : futuresPrice
    if (!currentPrice || !contractsData) return

    // 計算當前百位數 (例如: 26022 -> 260, 25999 -> 259)
    const currentHundreds = Math.floor(currentPrice / 100)

    // 如果是第一次載入價格，記錄百位數
    if (lastHundredsRef.current === null) {
      lastHundredsRef.current = currentHundreds
      lastReloadTimeRef.current = Date.now()
      console.log(
        `📊 [自動重載] 初始期貨價格百位數: ${currentHundreds} (價格: ${currentPrice}) ${testMode ? '[測試模式]' : ''}`
      )
      return
    }

    // 檢查百位數是否發生變化
    if (currentHundreds !== lastHundredsRef.current) {
      console.log(
        `📊 [百位數變化] ${lastHundredsRef.current} -> ${currentHundreds} (價格: ${currentPrice}) ${testMode ? '[測試模式]' : ''}`
      )

      // 🛡️ 防抖動：使用延遲執行，避免震盪
      debouncedLoadContracts(currentHundreds, currentPrice)
    } else {
      // 百位數相同，增加穩定性計數
      priceStabilityCountRef.current += 1
    }
  }, [futuresPrice, testPrice, testMode, contractsData, debouncedLoadContracts])

  // 處理合約選擇
  const handleContractSelect = (contract: OptionContract) => {
    onContractSelect?.(contract)
  }

  // 格式化履約價
  const formatStrikePrice = (price: number) => {
    return price?.toLocaleString() || '0'
  }

  // 格式化到期日
  const formatDeliveryDate = (dateStr: string) => {
    if (!dateStr) return ''
    return dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1/$2/$3')
  }

  // 獲取合約的即時報價
  const getContractQuote = useCallback(
    (contract: OptionContract): OptionQuote | null => {
      return getQuote(contract.symbol)
    },
    [getQuote]
  )

  // 🧹 頁面卸載時清理訂閱（瀏覽器關閉或頁面跳轉）
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('📊 [OptionsContractSelector] 頁面卸載，清理期貨價格訂閱')
      // 清理防抖計時器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      // 期貨價格訂閱會在 useFuturesPrice hook 中自動清理
    }

    // 監聽瀏覽器關閉和頁面跳轉事件
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // 組件卸載時也清理計時器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // 建立T字報價資料結構
  const buildTQuoteData = () => {
    if (!contractsData || !selectedOptionType) return []

    const currentData =
      contractsData.option_contracts.by_type[selectedOptionType]
    if (!currentData) return []

    // 按履約價分組
    const strikeGroups: Record<
      number,
      { call?: OptionContract; put?: OptionContract }
    > = {}

    currentData.call_options.forEach((contract) => {
      if (!strikeGroups[contract.strike_price]) {
        strikeGroups[contract.strike_price] = {}
      }
      strikeGroups[contract.strike_price].call = contract
    })

    currentData.put_options.forEach((contract) => {
      if (!strikeGroups[contract.strike_price]) {
        strikeGroups[contract.strike_price] = {}
      }
      strikeGroups[contract.strike_price].put = contract
    })

    // 轉換為陣列並排序
    return Object.entries(strikeGroups)
      .map(([strike, contracts]) => ({
        strikePrice: parseFloat(strike),
        ...contracts,
      }))
      .sort((a, b) => a.strikePrice - b.strikePrice)
  }

  // 渲染T字報價表
  const renderTQuoteTable = () => {
    if (!contractsData) return null

    const tQuoteData = buildTQuoteData()
    if (tQuoteData.length === 0) return null

    const currentData =
      contractsData.option_contracts.by_type[selectedOptionType]

    return (
      <div className="space-y-6">
        {/* 統計資訊 */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {currentData.call_count}
              </div>
              <div className="text-sm text-gray-600">買權合約</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {currentData.put_count}
              </div>
              <div className="text-sm text-gray-600">賣權合約</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentData.total_count}
              </div>
              <div className="text-sm text-gray-600">總合約數</div>
            </CardContent>
          </Card>
        </div>

        {/* T字報價表 */}
        <div className="bg-black text-white rounded-lg overflow-hidden">
          {/* 表頭 */}
          <div className="bg-gray-800 text-center py-3">
            <div className="text-lg font-bold">
              {selectedOptionType} 選擇權T字報價
            </div>
            <div className="text-sm text-gray-300">
              期貨價格:{' '}
              {testMode
                ? testPrice.toLocaleString()
                : (
                    futuresPrice || contractsData.futures_info?.current_price
                  )?.toLocaleString()}
              {testMode && (
                <span className="ml-2 text-red-400">[測試模式]</span>
              )}
              {!testMode && futuresLastUpdate && (
                <span className="ml-2 text-xs text-gray-400">
                  ({new Date(futuresLastUpdate).toLocaleTimeString()})
                </span>
              )}
            </div>
          </div>

          {/* 欄位標題 */}
          <div className="grid grid-cols-11 gap-1 bg-gray-700 p-2 text-sm font-semibold">
            {/* CALL 欄位 */}
            <div className="col-span-2 text-center text-green-400">買量</div>
            <div className="col-span-2 text-center text-green-400">CALL</div>

            {/* 履約價 */}
            <div className="col-span-3 text-center text-yellow-400">履約價</div>

            {/* PUT 欄位 */}
            <div className="col-span-2 text-center text-red-400">PUT</div>
            <div className="col-span-2 text-center text-red-400">賣量</div>
          </div>

          {/* 報價數據 */}
          <div className="max-h-96 overflow-y-auto">
            {tQuoteData.map((row, index) => {
              const callQuote = row.call ? getContractQuote(row.call) : null
              const putQuote = row.put ? getContractQuote(row.put) : null
              // 使用測試價格、即時期貨價格或API返回的價格
              const currentFuturesPrice = testMode
                ? testPrice
                : futuresPrice || contractsData.futures_info?.current_price || 0

              // 判斷價內外狀態
              const isCallITM = row.strikePrice < currentFuturesPrice
              const isPutITM = row.strikePrice > currentFuturesPrice
              const isATM =
                Math.abs(row.strikePrice - currentFuturesPrice) <= 25

              return (
                <div
                  key={`${row.strikePrice}-${index}`}
                  className={cn(
                    'grid grid-cols-11 gap-1 p-2 text-sm border-b border-gray-600 hover:bg-gray-800 transition-colors',
                    isATM && 'bg-yellow-900/20'
                  )}
                >
                  {/* CALL 買量 */}
                  <div
                    className={cn(
                      'col-span-2 text-center cursor-pointer hover:bg-green-800/30 rounded p-1',
                      isCallITM ? 'text-yellow-300' : 'text-green-300'
                    )}
                    onClick={() => row.call && handleContractSelect(row.call)}
                  >
                    {callQuote ? callQuote.volume.toLocaleString() : '—'}
                  </div>

                  {/* CALL 價格 */}
                  <div
                    className={cn(
                      'col-span-2 text-center cursor-pointer hover:bg-green-800/30 rounded p-1',
                      isCallITM ? 'text-yellow-300 font-bold' : 'text-green-300'
                    )}
                    onClick={() => row.call && handleContractSelect(row.call)}
                  >
                    {callQuote ? (
                      <div>
                        <div className="text-xs">
                          買 {callQuote.bid_price.toFixed(2)}
                        </div>
                        <div className="text-xs">
                          賣 {callQuote.ask_price.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </div>

                  {/* 履約價 */}
                  <div className="col-span-3 text-center bg-blue-900/30 rounded p-1">
                    <div className="text-white font-bold text-lg">
                      {formatStrikePrice(row.strikePrice)}
                    </div>
                    {isATM && (
                      <div className="text-yellow-400 text-xs">ATM</div>
                    )}
                  </div>

                  {/* PUT 價格 */}
                  <div
                    className={cn(
                      'col-span-2 text-center cursor-pointer hover:bg-red-800/30 rounded p-1',
                      isPutITM ? 'text-yellow-300 font-bold' : 'text-red-300'
                    )}
                    onClick={() => row.put && handleContractSelect(row.put)}
                  >
                    {putQuote ? (
                      <div>
                        <div className="text-xs">
                          買 {putQuote.bid_price.toFixed(2)}
                        </div>
                        <div className="text-xs">
                          賣 {putQuote.ask_price.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </div>

                  {/* PUT 賣量 */}
                  <div
                    className={cn(
                      'col-span-2 text-center cursor-pointer hover:bg-red-800/30 rounded p-1',
                      isPutITM ? 'text-yellow-300' : 'text-red-300'
                    )}
                    onClick={() => row.put && handleContractSelect(row.put)}
                  >
                    {putQuote ? putQuote.volume.toLocaleString() : '—'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 圖例 */}
          <div className="bg-gray-800 p-3 text-xs">
            <div className="flex justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                <span>價內 (ITM)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-900 rounded"></div>
                <span>價平 (ATM)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <span>買權 (CALL)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span>賣權 (PUT)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>選擇權合約選擇器</CardTitle>
        <p className="text-sm text-gray-600">
          選擇選擇權類型以查看 {current.slice(0, 4)}/{current.slice(4)} 和{' '}
          {next.slice(0, 4)}/{next.slice(4)} 的周選合約
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 選擇權類型選擇 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">選擇權類型</label>
          <Select
            value={selectedOptionType}
            onValueChange={setSelectedOptionType}
          >
            <SelectTrigger>
              <SelectValue placeholder="請選擇選擇權類型" />
            </SelectTrigger>
            <SelectContent>
              {OPTION_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 期貨資訊和連接狀態 */}
        {contractsData?.futures_info && (
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">
                    期貨價格 ({contractsData.futures_info.symbol})
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isFuturesConnected ? 'bg-green-500' : 'bg-red-500'
                      )}
                    />
                    <span className="text-xs text-gray-600">
                      {isFuturesConnected ? '即時期貨價格' : '使用API價格'}
                    </span>
                    <span className="text-xs text-gray-600 ml-2">
                      選擇權使用計算報價
                    </span>
                    {/* 防抖狀態顯示 */}
                    {(testMode ? testPrice : futuresPrice) && (
                      <span className="text-xs text-blue-500 ml-2">
                        百位數:{' '}
                        {Math.floor(
                          (testMode ? testPrice : futuresPrice) / 100
                        )}
                        {priceStabilityCountRef.current > 3
                          ? ' (穩定)'
                          : ' (監控)'}
                        {debounceTimerRef.current ? ' [防抖中]' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-600">
                    {testMode
                      ? testPrice.toLocaleString()
                      : (
                          futuresPrice ||
                          contractsData.futures_info.current_price
                        )?.toLocaleString()}
                  </span>
                  {testMode && (
                    <div className="text-xs text-red-500">[測試模式]</div>
                  )}
                  {!testMode && futuresLastUpdate && (
                    <div className="text-xs text-gray-500">
                      {new Date(futuresLastUpdate).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 錯誤提示 */}
        {(error || futuresError) && (
          <Alert>
            <AlertDescription>
              {error && <div>合約載入錯誤: {error}</div>}
              {futuresError && <div>期貨價格錯誤: {futuresError}</div>}
            </AlertDescription>
          </Alert>
        )}

        {/* 載入中 */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        )}

        {/* T字報價表 */}
        {!isLoading && contractsData && renderTQuoteTable()}

        {/* 重新載入按鈕 */}
        {selectedOptionType && (
          <div className="text-center pt-4">
            <div className="flex gap-2">
              <Button
                onClick={loadOptionContracts}
                disabled={isLoading}
                variant="outline"
              >
                重新載入合約
              </Button>
              <Button
                variant={testMode ? 'destructive' : 'outline'}
                onClick={() => {
                  setTestMode(!testMode)
                  if (!testMode) {
                    // 進入測試模式時，重設百位數追踪
                    lastHundredsRef.current = null
                  }
                }}
              >
                {testMode ? '退出測試' : '百位數測試'}
              </Button>
            </div>

            {/* 測試模式控制 */}
            {testMode && (
              <Card className="mt-4 bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-red-800">
                      百位數變化測試模式
                    </div>
                    <div className="text-xs text-red-600">
                      調整價格來測試百位數變化時的自動重載功能
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium">測試價格:</label>
                      <input
                        type="number"
                        value={testPrice}
                        onChange={(e) => setTestPrice(Number(e.target.value))}
                        className="px-3 py-1 border rounded text-sm w-24"
                        step="100"
                        min="20000"
                        max="30000"
                      />
                      <div className="text-xs text-gray-600">
                        當前百位數: {Math.floor(testPrice / 100)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTestPrice(25999)}
                      >
                        259xx
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTestPrice(26099)}
                      >
                        260xx
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTestPrice(26199)}
                      >
                        261xx
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
