'use client'

/**
 * 智能圖表切換器
 * 根據時間週期智能選擇最佳的圖表顯示方式
 */

import React, { useState } from 'react'
import { Clock, Zap, TrendingUp, Settings } from 'lucide-react'
import KLineChartPro from './KLineChartPro'
import TradingViewChart from './TradingViewChart'
import YahooFinanceChartLink from './YahooFinanceChartLink'

type ChartMode = 'realtime' | 'daily' | 'external'
type TimeInterval =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '1d'
  | '1w'
  | '1M'

interface SmartChartSwitcherProps {
  symbol: string
  className?: string
}

export default function SmartChartSwitcher({
  symbol,
  className = '',
}: SmartChartSwitcherProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('realtime')
  const [interval, setInterval] = useState<TimeInterval>('5m')

  // 圖表模式配置
  const chartModes = [
    {
      id: 'realtime' as ChartMode,
      name: '即時圖表',
      description: '1分鐘/5分鐘即時數據',
      icon: <Zap className="w-5 h-5" />,
      recommended: ['1m', '5m', '15m', '30m', '1h'],
      color: 'bg-green-100 text-green-700 border-green-300',
    },
    {
      id: 'daily' as ChartMode,
      name: 'TradingView',
      description: '日線圖與技術分析',
      icon: <TrendingUp className="w-5 h-5" />,
      recommended: ['1d', '1w', '1M'],
      color: 'bg-blue-100 text-blue-700 border-blue-300',
    },
    {
      id: 'external' as ChartMode,
      name: 'Yahoo 股市',
      description: '完整技術分析頁面',
      icon: <Settings className="w-5 h-5" />,
      recommended: ['1d', '1w', '1M'],
      color: 'bg-purple-100 text-purple-700 border-purple-300',
    },
  ]

  // 時間週期配置
  const timeIntervals = [
    { value: '1m', label: '1分', category: 'short' },
    { value: '5m', label: '5分', category: 'short' },
    { value: '15m', label: '15分', category: 'short' },
    { value: '30m', label: '30分', category: 'short' },
    { value: '1h', label: '1小時', category: 'medium' },
    { value: '4h', label: '4小時', category: 'medium' },
    { value: '1d', label: '日線', category: 'long' },
    { value: '1w', label: '週線', category: 'long' },
    { value: '1M', label: '月線', category: 'long' },
  ]

  // 根據時間週期智能推薦圖表模式
  const getRecommendedMode = (selectedInterval: TimeInterval): ChartMode => {
    if (['1m', '5m', '15m', '30m', '1h'].includes(selectedInterval)) {
      return 'realtime'
    } else if (['1d', '1w', '1M'].includes(selectedInterval)) {
      return 'daily'
    }
    return 'realtime'
  }

  const handleIntervalChange = (newInterval: TimeInterval) => {
    setInterval(newInterval)
    const recommended = getRecommendedMode(newInterval)
    if (chartMode !== 'external') {
      setChartMode(recommended)
    }
  }

  const renderChart = () => {
    switch (chartMode) {
      case 'realtime':
        return (
          <KLineChartPro
            symbol={symbol}
            interval={interval}
            className="w-full"
          />
        )

      case 'daily':
        const tradingViewInterval =
          interval === '1d'
            ? 'D'
            : interval === '1w'
              ? 'W'
              : interval === '1M'
                ? 'M'
                : 'D'
        return (
          <TradingViewChart
            symbol={symbol}
            interval={tradingViewInterval}
            width={800}
            height={500}
            className="w-full"
          />
        )

      case 'external':
        return <YahooFinanceChartLink symbol={symbol} className="w-full" />

      default:
        return null
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 控制面板 */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="w-5 h-5" />
          智能圖表控制
        </div>

        {/* 時間週期選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            時間週期
          </label>
          <div className="flex flex-wrap gap-2">
            {timeIntervals.map(({ value, label, category }) => (
              <button
                key={value}
                onClick={() => handleIntervalChange(value as TimeInterval)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  interval === value
                    ? 'bg-blue-600 text-white'
                    : category === 'short'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : category === 'medium'
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 圖表模式選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            圖表模式
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {chartModes.map((mode) => {
              const isRecommended = mode.recommended.includes(interval)
              const isSelected = chartMode === mode.id

              return (
                <button
                  key={mode.id}
                  onClick={() => setChartMode(mode.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : isRecommended
                        ? `${mode.color} border-2`
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {mode.icon}
                    <span className="font-medium">{mode.name}</span>
                    {isRecommended && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                        推薦
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {mode.description}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 當前配置顯示 */}
        <div className="bg-gray-50 rounded p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              當前: {symbol} •{' '}
              {timeIntervals.find((t) => t.value === interval)?.label} •
              {chartModes.find((m) => m.id === chartMode)?.name}
            </span>
            {chartMode === 'realtime' && (
              <span className="text-green-600 font-medium">⚡ 即時數據</span>
            )}
            {chartMode !== 'realtime' && (
              <span className="text-blue-600 font-medium">📊 節省流量</span>
            )}
          </div>
        </div>
      </div>

      {/* 圖表顯示區域 */}
      <div className="bg-white rounded-lg border">{renderChart()}</div>
    </div>
  )
}

export { SmartChartSwitcher }
