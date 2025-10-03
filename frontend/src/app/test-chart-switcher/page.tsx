'use client'

/**
 * 圖表切換測試頁面
 * 測試不同的圖表顯示方案
 */

import React from 'react'
import SmartChartSwitcher from '@/components/chart/SmartChartSwitcher'

export default function TestChartSwitcherPage() {
  // 測試用的股票代碼
  const testSymbols = [
    { code: '6901', name: '鑽石投資' },
    { code: '2330', name: '台積電' },
    { code: '2454', name: '聯發科' },
    { code: '0050', name: '元大台灣50' },
  ]

  const [selectedSymbol, setSelectedSymbol] = React.useState('6901')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 智能圖表系統測試
          </h1>
          <p className="text-gray-600">
            測試不同的圖表顯示方案，優化數據使用量
          </p>
        </div>

        {/* 股票選擇器 */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            選擇測試股票
          </label>
          <div className="flex flex-wrap gap-2">
            {testSymbols.map(({ code, name }) => (
              <button
                key={code}
                onClick={() => setSelectedSymbol(code)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedSymbol === code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {code} {name}
              </button>
            ))}
          </div>
        </div>

        {/* 智能圖表切換器 */}
        <SmartChartSwitcher symbol={selectedSymbol} className="w-full" />

        {/* 功能說明 */}
        <div className="mt-8 bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">💡 功能說明</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">⚡ 即時圖表</h3>
              <p className="text-sm text-green-700">
                使用自有後端數據，適合短週期（1分、5分）的即時分析
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">📊 TradingView</h3>
              <p className="text-sm text-blue-700">
                嵌入第三方圖表，適合日線圖，節省數據傳輸
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-2">🔗 外部連結</h3>
              <p className="text-sm text-purple-700">
                跳轉到 Yahoo 股市，獲得最完整的技術分析
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
