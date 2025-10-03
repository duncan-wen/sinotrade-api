/**
 * Yahoo Finance 圖表外部連結組件
 * 當需要查看日線圖時，智能跳轉到 Yahoo Finance
 */

import React from 'react'
import { ExternalLink, TrendingUp, BarChart3 } from 'lucide-react'

interface YahooFinanceChartLinkProps {
  symbol: string // 台股代碼，如 "6901"
  className?: string
}

export default function YahooFinanceChartLink({
  symbol,
  className = '',
}: YahooFinanceChartLinkProps) {
  // 生成 Yahoo Finance 台股連結
  const generateYahooUrl = (code: string) => {
    const cleanCode = code.replace(/\.(TW|TWE)$/, '')
    return `https://tw.stock.yahoo.com/quote/${cleanCode}.TW/technical-analysis`
  }

  const yahooUrl = generateYahooUrl(symbol)

  return (
    <div
      className={`border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50 ${className}`}
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          <BarChart3 className="w-12 h-12 text-blue-600" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            📊 {symbol} 完整技術分析
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            查看完整的日線圖、技術指標和專業分析
          </p>
        </div>

        <a
          href={yahooUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
        >
          <TrendingUp className="w-5 h-5" />
          在 Yahoo 股市查看日線圖
          <ExternalLink className="w-4 h-4" />
        </a>

        <div className="text-xs text-gray-500">
          ⚡ 節省數據傳輸，獲得專業分析
        </div>
      </div>
    </div>
  )
}

export { YahooFinanceChartLink }
