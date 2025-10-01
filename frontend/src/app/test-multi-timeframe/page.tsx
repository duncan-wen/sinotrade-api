/**
 * 多時間間隔K線圖測試頁面
 */
'use client'

import React, { useState } from 'react'
import { TradingChart } from '@/components/chart/TradingChart'
import Select from '@/components/common/select'

export default function TestMultiTimeframePage() {
  const [symbol, setSymbol] = useState('TXFR1')
  const [interval, setInterval] = useState('1m')
  const [enableRealtime, setEnableRealtime] = useState(true)

  const testSymbols = [
    'CDFR1',
    'CDFR2',
    'TXFR1',
    'TXFR2',
    'MXFR1',
    'MXFR2',
    '2408',
    '2330',
    '2317',
    '2454',
    '3008',
  ]

  const timeframes = [
    { value: '1m', label: '1分鐘' },
    { value: '5m', label: '5分鐘' },
    { value: '15m', label: '15分鐘' },
    { value: '60m', label: '1小時' },
    { value: '1d', label: '日線' },
    // { value: '1w', label: '週線' },
    // { value: '1M', label: '月線' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          多時間間隔K線圖測試
        </h1>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">測試設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                股票代號
              </label>
              <Select
                value={symbol}
                onValueChange={setSymbol}
                placeholder="選擇股票"
                options={testSymbols.map((code) => ({
                  label: code,
                  value: code,
                }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                時間間隔
              </label>
              <Select
                value={interval}
                onValueChange={setInterval}
                placeholder="選擇時間間隔"
                options={timeframes}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                即時更新
              </label>
              <button
                onClick={() => setEnableRealtime(!enableRealtime)}
                className={`w-full px-4 py-2 rounded-md text-sm font-medium ${
                  enableRealtime
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {enableRealtime ? '開啟' : '關閉'}
              </button>
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

          {/* 當前設定顯示 */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <span className="text-sm text-blue-800">
              當前設定: {symbol} -{' '}
              {timeframes.find((tf) => tf.value === interval)?.label}
              {enableRealtime ? ' (即時)' : ' (靜態)'}
            </span>
          </div>
        </div>

        {/* 圖表區域 */}
        <div className="bg-white rounded-lg shadow">
          <TradingChart
            symbol={symbol}
            interval={interval}
            enableRealtime={enableRealtime}
            height={600}
            showVolume={true}
            className="w-full"
            onIntervalChange={setInterval}
          />
        </div>

        {/* 說明區域 */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">多時間間隔支援</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                ✅ 支援的時間間隔
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>1分鐘</strong>: 直接來自KBar API
                </li>
                <li>
                  • <strong>5分鐘</strong>: 從1分鐘數據聚合
                </li>
                <li>
                  • <strong>15分鐘</strong>: 從1分鐘數據聚合
                </li>
                <li>
                  • <strong>1小時</strong>: 從1分鐘數據聚合
                </li>
                <li>
                  • <strong>日線</strong>: 從1分鐘數據聚合
                </li>
                <li>
                  • <strong>週線</strong>: 從日線數據聚合
                </li>
                <li>
                  • <strong>月線</strong>: 從日線數據聚合
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">🔧 技術實現</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>統一數據源</strong>: Shioaji KBar API
                </li>
                <li>
                  • <strong>智能聚合</strong>: Pandas resample
                </li>
                <li>
                  • <strong>完整歷史</strong>: 從開盤到現在
                </li>
                <li>
                  • <strong>即時更新</strong>: WebSocket推送
                </li>
                <li>
                  • <strong>視圖保持</strong>: 防止自動重置
                </li>
                <li>
                  • <strong>台股顏色</strong>: 上漲紅、下跌綠
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-md">
            <h4 className="font-medium text-yellow-800 mb-2">📝 使用提示</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 切換時間間隔會重新載入數據</li>
              <li>• 拖動、縮放操作不會被新數據重置</li>
              <li>• 不同時間間隔有不同的數據量限制</li>
              <li>• 期貨代號請使用 TXFF, MXFF 等</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
