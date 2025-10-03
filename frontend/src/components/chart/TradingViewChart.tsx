'use client'

/**
 * TradingView 嵌入式圖表組件
 * 支持台股日線圖，減少後端數據負擔
 */

import React, { useEffect, useRef } from 'react'

interface TradingViewChartProps {
  symbol: string // 台股代碼，如 "6901"
  interval?: string // 時間週期："D" | "W" | "M" | "1" | "5" | "15" | "30" | "60" | "240"
  theme?: 'light' | 'dark'
  width?: number
  height?: number
  className?: string
}

export default function TradingViewChart({
  symbol,
  interval = 'D', // 預設日線
  theme = 'light',
  width = 800,
  height = 500,
  className = '',
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // 清理之前的腳本
    containerRef.current.innerHTML = ''

    // TradingView 台股代碼格式轉換
    const formatTaiwanSymbol = (code: string) => {
      // 移除可能的後綴
      const cleanCode = code.replace(/\.(TW|TWE)$/, '')
      return `TWSE:${cleanCode}`
    }

    const tradingViewSymbol = formatTaiwanSymbol(symbol)

    // 創建 TradingView widget
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (typeof (window as any).TradingView !== 'undefined') {
        new (window as any).TradingView.widget({
          width: width,
          height: height,
          symbol: tradingViewSymbol,
          interval: interval,
          timezone: 'Asia/Taipei',
          theme: theme,
          style: '1', // 蠟燭圖
          locale: 'zh_TW',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: false,
          container_id: `tradingview_${symbol.replace(/\W/g, '_')}`,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          studies: [
            'MASimple@tv-basicstudies', // MA均線
            'Volume@tv-basicstudies', // 成交量
          ],
        })
      }
    }

    // 創建容器
    const widgetContainer = document.createElement('div')
    widgetContainer.id = `tradingview_${symbol.replace(/\W/g, '_')}`
    widgetContainer.style.width = `${width}px`
    widgetContainer.style.height = `${height}px`

    containerRef.current.appendChild(widgetContainer)
    document.head.appendChild(script)

    // 清理函數
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [symbol, interval, theme, width, height])

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          📈 {symbol} 日線圖 (TradingView)
        </h3>
        <div className="text-sm text-gray-500">由 TradingView 提供</div>
      </div>
      <div
        ref={containerRef}
        className="border rounded-lg overflow-hidden"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    </div>
  )
}

// 預設導出組件
export { TradingViewChart }
