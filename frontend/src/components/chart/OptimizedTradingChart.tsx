// 🚀 優化版交易圖表 - 演示K線跳轉最佳實踐

import React, { useEffect, useState } from 'react'
import {
  useOptimizedKline,
  useKlinePerformanceTest,
} from '../../hooks/useOptimizedKline'
import type { TickData } from '../../services/OptimizedKlineManager'

interface OptimizedTradingChartProps {
  symbol: string
  interval: string
  strategy?: 'smart' | 'time-driven' | 'hybrid'
  showDebugInfo?: boolean
}

/**
 * 🎯 優化版交易圖表組件
 * 展示如何使用新的K線跳轉策略
 */
export const OptimizedTradingChart: React.FC<OptimizedTradingChartProps> = ({
  symbol,
  interval,
  strategy = 'smart',
  showDebugInfo = false,
}) => {
  // 使用優化的K線Hook
  const {
    klineData,
    metrics,
    isReady,
    processTick,
    createTestKline,
    resetKlines,
    getStatistics,
    latestKline,
  } = useOptimizedKline(symbol, interval, {
    strategy,
    enablePerformanceMonitoring: showDebugInfo,
    maxKlines: 200,
  })

  // 性能測試Hook
  const { testResults, runPerformanceTest } = useKlinePerformanceTest(
    symbol,
    interval
  )

  // 模擬實時tick數據
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationSpeed, setSimulationSpeed] = useState(1000) // 毫秒

  // 模擬tick數據生成
  useEffect(() => {
    if (!isSimulating || !isReady) return

    let lastPrice = 25700 + Math.random() * 100

    const generateTick = () => {
      // 模擬價格波動
      const change = (Math.random() - 0.5) * 10
      lastPrice = Math.max(25000, lastPrice + change)

      const tick: TickData = {
        symbol,
        price: lastPrice,
        volume: Math.floor(Math.random() * 1000) + 100,
        timestamp: Date.now(),
      }

      processTick(tick)
    }

    const timer = setInterval(generateTick, simulationSpeed)
    return () => clearInterval(timer)
  }, [isSimulating, simulationSpeed, isReady, symbol, processTick])

  const statistics = getStatistics()

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      {/* 標題和控制 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">
          🚀 優化K線圖表 - {symbol} ({interval})
        </h2>

        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">策略:</span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                strategy === 'smart'
                  ? 'bg-blue-100 text-blue-800'
                  : strategy === 'time-driven'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-purple-100 text-purple-800'
              }`}
            >
              {strategy.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">狀態:</span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                isReady
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {isReady ? '就緒' : '初始化中'}
            </span>
          </div>
        </div>

        {/* 控制按鈕 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-4 py-2 rounded font-medium ${
              isSimulating
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isSimulating ? '停止模擬' : '開始模擬'}
          </button>

          <button
            onClick={() => createTestKline(25700 + Math.random() * 100)}
            className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600"
          >
            測試K線
          </button>

          <button
            onClick={resetKlines}
            className="px-4 py-2 bg-gray-500 text-white rounded font-medium hover:bg-gray-600"
          >
            重置數據
          </button>

          <button
            onClick={() => runPerformanceTest(100)}
            className="px-4 py-2 bg-purple-500 text-white rounded font-medium hover:bg-purple-600"
          >
            性能測試
          </button>
        </div>

        {/* 模擬速度控制 */}
        {isSimulating && (
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm font-medium">模擬速度:</span>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-gray-600">{simulationSpeed}ms</span>
          </div>
        )}
      </div>

      {/* 統計信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-medium text-blue-800">K線數量</h3>
          <p className="text-2xl font-bold text-blue-900">
            {statistics.totalKlines}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded">
          <h3 className="font-medium text-green-800">總成交量</h3>
          <p className="text-2xl font-bold text-green-900">
            {statistics.volumeTotal.toLocaleString()}
          </p>
        </div>

        {statistics.priceRange && (
          <>
            <div className="bg-red-50 p-4 rounded">
              <h3 className="font-medium text-red-800">最高價</h3>
              <p className="text-2xl font-bold text-red-900">
                {statistics.priceRange.high.toFixed(2)}
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded">
              <h3 className="font-medium text-yellow-800">最低價</h3>
              <p className="text-2xl font-bold text-yellow-900">
                {statistics.priceRange.low.toFixed(2)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* 性能指標 */}
      {showDebugInfo && metrics && (
        <div className="bg-gray-50 p-4 rounded mb-6">
          <h3 className="font-medium mb-2">🔍 性能指標</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">跳轉準確率:</span>
              <span className="ml-2 font-medium">{metrics.jumpAccuracy}</span>
            </div>
            <div>
              <span className="text-gray-600">平均延遲:</span>
              <span className="ml-2 font-medium">{metrics.averageLatency}</span>
            </div>
            <div>
              <span className="text-gray-600">總跳轉次數:</span>
              <span className="ml-2 font-medium">{metrics.totalJumps}</span>
            </div>
            <div>
              <span className="text-gray-600">最後更新:</span>
              <span className="ml-2 font-medium">{metrics.lastUpdate}</span>
            </div>
          </div>
        </div>
      )}

      {/* 最新K線信息 */}
      {latestKline && (
        <div className="bg-blue-50 p-4 rounded mb-6">
          <h3 className="font-medium mb-2">📊 最新K線</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="text-gray-600">時間:</span>
              <div className="font-medium">
                {new Date(latestKline.time).toLocaleTimeString()}
              </div>
            </div>
            <div>
              <span className="text-gray-600">開盤:</span>
              <div className="font-medium">{latestKline.open.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-600">最高:</span>
              <div className="font-medium text-red-600">
                {latestKline.high.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">最低:</span>
              <div className="font-medium text-green-600">
                {latestKline.low.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">收盤:</span>
              <div className="font-medium">{latestKline.close.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-600">成交量:</span>
              <div className="font-medium">
                {latestKline.volume.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 性能測試結果 */}
      {testResults.length > 0 && (
        <div className="bg-purple-50 p-4 rounded mb-6">
          <h3 className="font-medium mb-2">🧪 性能測試結果</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">策略</th>
                  <th className="text-left py-2">平均延遲</th>
                  <th className="text-left py-2">準確率</th>
                  <th className="text-left py-2">測試次數</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 font-medium">{result.strategy}</td>
                    <td className="py-2">
                      {result.averageLatency.toFixed(3)}ms
                    </td>
                    <td className="py-2">{result.accuracy.toFixed(1)}%</td>
                    <td className="py-2">{result.testCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* K線數據列表 */}
      <div className="bg-gray-50 p-4 rounded">
        <h3 className="font-medium mb-2">📈 K線數據 (最近10根)</h3>
        {klineData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            暫無K線數據，點擊"開始模擬"或"測試K線"來生成數據
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">時間</th>
                  <th className="text-left py-1">開盤</th>
                  <th className="text-left py-1">最高</th>
                  <th className="text-left py-1">最低</th>
                  <th className="text-left py-1">收盤</th>
                  <th className="text-left py-1">成交量</th>
                </tr>
              </thead>
              <tbody>
                {klineData.slice(-10).map((kline, index) => (
                  <tr key={index} className="border-b hover:bg-gray-100">
                    <td className="py-1">
                      {new Date(kline.time).toLocaleTimeString()}
                    </td>
                    <td className="py-1">{kline.open.toFixed(2)}</td>
                    <td className="py-1 text-red-600">
                      {kline.high.toFixed(2)}
                    </td>
                    <td className="py-1 text-green-600">
                      {kline.low.toFixed(2)}
                    </td>
                    <td className="py-1 font-medium">
                      {kline.close.toFixed(2)}
                    </td>
                    <td className="py-1">{kline.volume.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 使用說明 */}
      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-medium mb-2">💡 使用說明:</h4>
        <ul className="space-y-1">
          <li>
            • <strong>Smart策略</strong>: 使用預載入緩存，性能最佳，適合高頻場景
          </li>
          <li>
            • <strong>Time-driven策略</strong>: 使用定時器驅動，時間最準確
          </li>
          <li>
            • <strong>Hybrid策略</strong>: 短期用Smart，長期用Time-driven
          </li>
          <li>• 點擊"開始模擬"可以看到實時K線跳轉效果</li>
          <li>• 點擊"性能測試"可以比較不同策略的性能</li>
        </ul>
      </div>
    </div>
  )
}

export default OptimizedTradingChart
