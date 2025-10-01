/**
 * KLineChart Pro 測試頁面
 *
 * 展示:
 * 1. KLineChart Pro 專業圖表(支援所有技術指標)
 * 2. SimpleTradingChart 簡化版圖表
 * 3. 對比兩種圖表的特性和使用場景
 */

'use client'
import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import SimpleTradingChart from '@/components/chart/SimpleTradingChart'

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

export default function TestKLineChartProPage() {
  const [symbol, setSymbol] = useState('TXFR1')
  const [interval, setInterval] = useState('5m')
  const [currentChart, setCurrentChart] = useState<'pro' | 'simple' | 'both'>(
    'both'
  )
  const [apiError, setApiError] = useState<string | null>(null)

  // 預設股票代號列表（稍後會用 API 獲取名稱）
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
              // 使用相對路徑，讓 Next.js rewrites 處理代理
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          📊 KLineChart Pro vs SimpleTradingChart 測試
        </h1>

        {/* API 錯誤提示 */}
        {apiError && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  後端 API 連接失敗
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{apiError}</p>
                  <p className="mt-2">
                    請執行以下步驟:
                    <br />
                    1. 確認後端服務已啟動 (
                    <code className="bg-yellow-100 px-1 py-0.5 rounded">
                      cd backend && pnpm dev
                    </code>
                    )
                    <br />
                    2. 檢查後端是否運行在{' '}
                    <code className="bg-yellow-100 px-1 py-0.5 rounded">
                      localhost:8000
                    </code>
                    <br />
                    3. 查看瀏覽器控制台的詳細錯誤訊息
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 商品選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選擇商品
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {symbols.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* 時間間隔選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              時間間隔
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {intervals.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          {/* 圖表類型選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              顯示模式
            </label>
            <select
              value={currentChart}
              onChange={(e) =>
                setCurrentChart(e.target.value as 'pro' | 'simple' | 'both')
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="both">同時顯示</option>
              <option value="pro">只顯示 Pro 版</option>
              <option value="simple">只顯示簡化版</option>
            </select>
          </div>
        </div>

        {/* 功能對比表 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">📋 功能對比</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">功能</th>
                  <th className="text-center py-2">KLineChart Pro</th>
                  <th className="text-center py-2">SimpleTradingChart</th>
                </tr>
              </thead>
              <tbody className="space-y-2">
                <tr className="border-b">
                  <td className="py-2">基礎K線圖</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">成交量圖表</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">移動平均線 (MA)</td>
                  <td className="text-center">✅ 內建</td>
                  <td className="text-center">✅ 簡單實現</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">MACD 指標</td>
                  <td className="text-center">⚠️ 部分支援</td>
                  <td className="text-center">❌</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">KD 隨機指標</td>
                  <td className="text-center">⚠️ 部分支援</td>
                  <td className="text-center">❌</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">布林帶 (BBands)</td>
                  <td className="text-center">⚠️ 部分支援</td>
                  <td className="text-center">❌</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">繪圖工具</td>
                  <td className="text-center">✅ 專業工具</td>
                  <td className="text-center">❌</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">即時更新</td>
                  <td className="text-center">✅</td>
                  <td className="text-center">✅</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">檔案大小</td>
                  <td className="text-center">較大</td>
                  <td className="text-center">輕量</td>
                </tr>
                <tr>
                  <td className="py-2">使用場景</td>
                  <td className="text-center">專業分析</td>
                  <td className="text-center">簡單顯示</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 使用提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="text-blue-800 font-semibold mb-2">💡 使用建議</h4>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>
              <strong>KLineChart Pro:</strong>適合需要專業技術指標分析的場景
            </li>
            <li>
              <strong>SimpleTradingChart:</strong>
              適合儀表板、概覽頁面等簡單顯示需求
            </li>
            <li>
              <strong>安裝要求:</strong>專業版需要安裝套件{' '}
              <code>pnpm add klinecharts</code>
            </li>
          </ul>
        </div>
      </div>

      {/* 圖表顯示區域 */}
      <div className="space-y-6">
        {/* KLineChart Pro */}
        {(currentChart === 'pro' || currentChart === 'both') && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              🚀 KLineChart Pro - 專業級圖表
              <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded font-medium">
                {symbols.find((s) => s.value === symbol)?.label || symbol}
              </span>
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                內建技術指標
              </span>
            </h2>
            <KLineChartPro
              symbol={symbol}
              symbolName={(() => {
                const fullLabel =
                  symbols.find((s) => s.value === symbol)?.label || ''
                const match = fullLabel.match(/\(([^)]+)\)/)
                return match ? match[1] : ''
              })()}
              interval={interval}
              height={500}
              enableRealtime={true}
              mainIndicators={['MA', 'BOLL']}
              subIndicators={['MACD', 'KD']}
              onIntervalChange={setInterval}
              className="shadow-lg"
            />
          </div>
        )}

        {/* SimpleTradingChart
        {(currentChart === 'simple' || currentChart === 'both') && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              📊 SimpleTradingChart - 簡化版圖表
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                輕量快速
              </span>
            </h2>
            <SimpleTradingChart
              symbol={symbol}
              interval={interval}
              height={400}
              enableRealtime={true}
              showVolume={true}
              showMA={true}
              onIntervalChange={setInterval}
              className="shadow-lg"
            />
          </div>
        )} */}
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
              SimpleTradingChart
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 基於 Lightweight Charts</li>
              <li>• 精簡的功能集合</li>
              <li>• 快速載入和渲染</li>
              <li>• 基礎MA線支援</li>
              <li>• 簡潔的UI設計</li>
              <li>• 適合儀表板使用</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
