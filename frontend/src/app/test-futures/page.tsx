/**
 * 期貨K線圖測試頁面
 */
'use client'

import React, { useState } from 'react'
import { TradingChart } from '@/components/chart/TradingChart'
import Select from '@/components/common/select'

export default function TestFuturesPage() {
  const [symbol, setSymbol] = useState('TXFR2')
  const [enableRealtime, setEnableRealtime] = useState(true)

  // 期貨合約列表
  const futuresSymbols = [
    'TXFR2', // 台指期貨
    'MXFR2', // 小台指期貨
    'T5FF', // 5年期公債期貨
    'T10FF', // 10年期公債期貨
    'GTFF', // 櫃買期貨
    'USDFF', // 美元指數期貨
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          期貨K線圖測試 📈
        </h1>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">期貨測試設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                期貨代號
              </label>
              <Select
                value={symbol}
                onValueChange={setSymbol}
                placeholder="選擇期貨代號"
                options={futuresSymbols.map((sym) => ({
                  label: sym,
                  value: sym,
                }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                即時更新
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="realtime"
                  checked={enableRealtime}
                  onChange={(e) => setEnableRealtime(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="realtime" className="text-sm text-gray-700">
                  啟用即時數據
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                當前選擇
              </label>
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm">
                <span className="font-medium text-blue-800">{symbol}</span>
                <span className="text-blue-600 ml-2">
                  {enableRealtime ? '🟢 即時' : '🔴 靜態'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 期貨說明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            📋 期貨測試說明
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>
              • <strong>TXFR2</strong>: 台指期貨 (Taiwan Stock Index Futures)
            </li>
            <li>
              • <strong>MXFR2</strong>: 小台指期貨 (Mini Taiwan Stock Index
              Futures)
            </li>
            <li>
              • <strong>T5FF</strong>: 5年期公債期貨
            </li>
            <li>
              • <strong>T10FF</strong>: 10年期公債期貨
            </li>
            <li>
              • <strong>GTFF</strong>: 櫃買期貨
            </li>
            <li>
              • <strong>USDFF</strong>: 美元指數期貨
            </li>
          </ul>
        </div>

        {/* K線圖表 */}
        <div className="bg-white rounded-lg shadow">
          <TradingChart
            symbol={symbol}
            interval="5m"
            height={600}
            enableRealtime={enableRealtime}
            showVolume={true}
            className="rounded-lg"
          />
        </div>

        {/* 技術說明 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            🔧 技術特性
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-semibold mb-1">期貨數據特點:</h4>
              <ul className="space-y-1">
                <li>• 價格範圍較大 (台指期約20,000點以上)</li>
                <li>• 支援台灣時區顯示</li>
                <li>• 自動價格範圍調整</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">圖表功能:</h4>
              <ul className="space-y-1">
                <li>• 成交量顯示 (左側刻度)</li>
                <li>• 即時數據更新</li>
                <li>• 商品名稱自動顯示</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
