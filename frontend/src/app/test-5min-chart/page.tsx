/**
 * 5分鐘K線圖測試頁面
 */
'use client'

import React, { useState } from 'react'
import { TradingChart } from '@/components/chart/TradingChart'
import Select from '@/components/common/select'

export default function Test5MinChartPage() {
  const [symbol, setSymbol] = useState('2408')
  const [enableRealtime, setEnableRealtime] = useState(true)

  const testSymbols = ['2408', '2330', '2317', '2454', '3008', 'TXFF', 'MXFF']

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          5分鐘K線圖測試
        </h1>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">測試設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                股票代號
              </label>
              <Select
                value={symbol}
                onValueChange={setSymbol}
                placeholder="選擇股票代號"
                options={testSymbols.map((sym) => ({ label: sym, value: sym }))}
              />
              {/* <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {testSymbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select> */}
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={enableRealtime}
                  onChange={(e) => setEnableRealtime(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">啟用即時更新</span>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">狀態:</span>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  enableRealtime
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {enableRealtime ? '即時更新中' : '靜態模式'}
              </span>
            </div>
          </div>
        </div>

        {/* 圖表區域 */}
        <div className="bg-white rounded-lg shadow">
          <TradingChart
            symbol={symbol}
            interval="5m"
            enableRealtime={enableRealtime}
            height={600}
            showVolume={true}
            className="w-full"
          />
        </div>

        {/* 說明區域 */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">功能說明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">✅ 已實現功能</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 5分鐘K線數據從後端獲取</li>
                <li>• WebSocket即時更新5分鐘K線</li>
                <li>• 成交量圖表顯示</li>
                <li>• 台股顏色慣例(上漲紅色,下跌綠色)</li>
                <li>• 自動數據排序和限制</li>
                <li>• 連接狀態管理</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">🔧 技術實現</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 後端:tick數據聚合為5分鐘K線</li>
                <li>• WebSocket:即時推送5分鐘K線更新</li>
                <li>• 前端:lightweight-charts渲染</li>
                <li>• 數據流:歷史數據 + 即時更新</li>
                <li>• 效能:限制200根K線顯示</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">🎯 測試建議</h4>
            <p className="text-sm text-blue-800">
              1. 選擇不同股票測試數據載入
              <br />
              2. 觀察即時更新的K線變化
              <br />
              3. 比較開啟/關閉即時更新的差異
              <br />
              4. 檢查成交量顏色是否符合台股慣例
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
