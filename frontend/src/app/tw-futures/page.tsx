/**
 * 台灣期貨頁面
 *
 * 展示:
 * 1. KLineChart Pro 專業圖表(支援所有技術指標)
 * 2. HiStock 期貨頁面參考資料
 * 3. 可拖動調整的雙視窗布局
 */

'use client'
import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import SimpleTradingChart from '@/components/chart/SimpleTradingChart'
import { MainLayout } from '@/components/layout/MainLayout'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { BarChart3 } from 'lucide-react'

// 動態載入 KLineChart Pro,避免 SSR 問題
const KLineChartPro = dynamic(
  () => import('@/components/chart/KLineChartPro'),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">載入 KLineChart Pro...</div>
      </div>
    ),
  }
)

interface SymbolOption {
  value: string
  label: string
  loading?: boolean
}

export default function TaiwanFuturesPage() {
  const [symbol, setSymbol] = useState('TXFR1')
  const [interval, setInterval] = useState('5m')
  const [currentChart, setCurrentChart] = useState<'pro' | 'simple' | 'both'>(
    'both'
  )
  const [apiError, setApiError] = useState<string | null>(null)

  // 控制右側 HiStock 期貨頁面是否顯示
  const [showHiStockPanel, setShowHiStockPanel] = useState(true)

  // 預設股票代號列表(稍後會用 API 獲取名稱)
  const defaultSymbols = ['TXFR2', 'TXFR1', 'MXFR1', '2408', '2330', '2317']
  const [symbols, setSymbols] = useState<SymbolOption[]>(
    defaultSymbols.map((s) => ({ value: s, label: s, loading: true }))
  )

  // 🚀 動態獲取股票名稱
  useEffect(() => {
    const fetchSymbolNames = async () => {
      try {
        const updatedSymbols = await Promise.all(
          defaultSymbols.map(async (symbolCode) => {
            try {
              // 使用相對路徑,讓 Next.js rewrites 處理代理
              const response = await fetch(`/api/contract-info/${symbolCode}`)

              if (!response.ok) {
                throw new Error(
                  `HTTP ${response.status}: ${response.statusText}`
                )
              }

              const data = await response.json()

              if (data.success && data.contract) {
                const name = data.contract.name || symbolCode
                return {
                  value: symbolCode,
                  label: `${symbolCode} (${name})`,
                  loading: false,
                }
              }
            } catch (error) {
              console.error(
                `❌ 獲取 ${symbolCode} 名稱失敗:`,
                error instanceof Error ? error.message : error
              )
            }

            // 失敗時返回原始代號
            return { value: symbolCode, label: symbolCode, loading: false }
          })
        )

        setSymbols(updatedSymbols)
        setApiError(null)
        console.log('✅ 動態股票名稱載入完成:', updatedSymbols)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知錯誤'
        console.error('❌ 載入股票名稱失敗:', errorMsg)
        setApiError('無法連接到後端 API。請確認後端服務是否正在運行。')

        // 使用原始代號作為備援
        setSymbols(
          defaultSymbols.map((s) => ({ value: s, label: s, loading: false }))
        )
      }
    }

    fetchSymbolNames()
  }, []) // 只在頁面載入時執行一次

  const intervals = [
    { value: '1m', label: '1分鐘' },
    { value: '5m', label: '5分鐘' },
    { value: '15m', label: '15分鐘' },
    { value: '60m', label: '1小時' },
    { value: '1d', label: '日線' },
    // { value: '1w', label: '週線' },
    // { value: '1M', label: '月線' },
  ]

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* 控制面板 */}
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">圖表顯示設定</h3>
              <p className="text-sm text-muted-foreground">
                自訂圖表顯示方式和外部參考資料
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="histock-panel"
                checked={showHiStockPanel}
                onCheckedChange={setShowHiStockPanel}
              />
              <Label htmlFor="histock-panel" className="cursor-pointer">
                顯示 HiStock 期貨頁面
              </Label>
            </div>
          </div>
        </div>

        {/* 圖表顯示區域 - 雙視窗 Resizable 布局 */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="h-[800px]">
            {showHiStockPanel ? (
              // 雙視窗模式 - 顯示 KLineChart Pro + HiStock 期貨頁面
              <ResizablePanelGroup
                direction="horizontal"
                className="h-full w-full"
              >
                {/* 左側面板 - KLineChart Pro */}
                {(currentChart === 'pro' || currentChart === 'both') && (
                  <>
                    <ResizablePanel defaultSize={50} minSize={20}>
                      <div className="flex flex-col h-full">
                        <div className="p-3 border-b bg-gray-50 dark:bg-gray-800">
                          <h2 className="text-lg font-semibold flex items-center">
                            🚀 KLineChart Pro - 專業級圖表
                            <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded font-medium">
                              {symbols.find((s) => s.value === symbol)?.label ||
                                symbol}
                            </span>
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              內建技術指標
                            </span>
                          </h2>
                        </div>
                        <div className="flex-1 p-4 overflow-auto">
                          <KLineChartPro
                            symbol={symbol}
                            symbolName={(() => {
                              const fullLabel =
                                symbols.find((s) => s.value === symbol)
                                  ?.label || ''
                              const match = fullLabel.match(/\(([^)]+)\)/)
                              return match ? match[1] : ''
                            })()}
                            interval={interval}
                            height={700}
                            enableRealtime={true}
                            mainIndicators={['MA', 'BOLL']}
                            subIndicators={['MACD', 'KD']}
                            onIntervalChange={setInterval}
                            className="shadow-lg"
                          />
                        </div>
                      </div>
                    </ResizablePanel>

                    {/* 可拖動的分隔線 */}
                    <ResizableHandle withHandle />

                    {/* 右側面板 - HiStock 期貨頁面 */}
                    <ResizablePanel defaultSize={50} minSize={20}>
                      <div className="flex flex-col h-full">
                        <div className="p-3 border-b bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                          <h3 className="text-lg font-semibold">
                            📈 HiStock 期貨頁面
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const histockUrl =
                                'https://histock.tw/futures/mainfutures.aspx'
                              window.open(
                                histockUrl,
                                '_blank',
                                'noopener,noreferrer'
                              )
                            }}
                            className="gap-1 h-7 text-xs"
                          >
                            <BarChart3 className="h-3 w-3" />
                            新視窗開啟
                          </Button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <iframe
                            src="https://histock.tw/futures/mainfutures.aspx"
                            className="w-full h-full border-0"
                            title="HiStock 期貨頁面"
                          />
                        </div>
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            ) : (
              // 單視窗模式 - 只顯示 KLineChart Pro (全寬)
              (currentChart === 'pro' || currentChart === 'both') && (
                <div className="flex flex-col h-full">
                  <div className="p-3 border-b bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-lg font-semibold flex items-center">
                      🚀 KLineChart Pro - 專業級圖表
                      <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded font-medium">
                        {symbols.find((s) => s.value === symbol)?.label ||
                          symbol}
                      </span>
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                        內建技術指標
                      </span>
                    </h2>
                  </div>
                  <div className="flex-1 p-4 overflow-auto">
                    <KLineChartPro
                      symbol={symbol}
                      symbolName={(() => {
                        const fullLabel =
                          symbols.find((s) => s.value === symbol)?.label || ''
                        const match = fullLabel.match(/\(([^)]+)\)/)
                        return match ? match[1] : ''
                      })()}
                      interval={interval}
                      height={700}
                      enableRealtime={true}
                      mainIndicators={['MA', 'BOLL']}
                      subIndicators={['MACD', 'KD']}
                      onIntervalChange={setInterval}
                      className="shadow-lg"
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* 實現說明 */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">🔧 技術實現</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">
                KLineChart Pro
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 基於 klinecharts 基礎套件</li>
                <li>• 內建常用技術指標 (MA, VOL等)</li>
                <li>• 自定義專業圖表類別</li>
                <li>• 支援基礎繪圖功能</li>
                <li>• 動態載入避免 SSR 問題</li>
                <li>• 與現有 WebSocket 無縫整合</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">
                HiStock 期貨參考
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 嵌入式 iframe 顯示</li>
                <li>• 可拖動調整視窗比例</li>
                <li>• 支援新視窗開啟</li>
                <li>• 可開關顯示/隱藏</li>
                <li>• 提供即時期貨資訊</li>
                <li>• 完整的市場數據參考</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
