/**
 * USStockChart.tsx - 美股K線圖表組件 (重構版)
 *
 * 基於 BaseChart 實現的美股專用圖表組件
 * 整合 Polygon.io API 數據源
 *
 * 🚀 特性:
 * - 統一架構 (與 KLineChartPro 一致)
 * - 支援多種時間間隔
 * - 技術指標 (MA, MACD, KDJ, VOL, BBands)
 * - Polygon.io API 整合
 * - 簡潔易懂的代碼結構
 */

'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  timeIntervalOptions,
  indicatorOptions,
  type IndicatorName,
  type IndicatorType,
  ChartButton,
} from './klinechart-pro'
import { BaseChart, loadKLineChart, type BaseChartConfig } from './BaseChart'

export interface USKLineData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface USStockChartProps {
  symbol: string
  interval: string
  height?: number
  apiEndpoint: string
  className?: string
  onIntervalChange?: (newInterval: string) => void
}

// 美股圖表核心類 - 繼承 BaseChart (參考 KLineChartPro 架構)
class USStockChartCore extends BaseChart {
  constructor(container: HTMLElement, config: BaseChartConfig) {
    // 美股不使用 WebSocket (免費計劃不支援)
    super(container, { ...config, enableWebSocket: false })
  }

  // 🎯 實現抽象方法:載入數據 (美股專用)
  async loadData(): Promise<void> {
    try {
      const apiUrl = `${this.apiEndpoint}/${this.symbol}?interval=${this.interval}`
      console.log('🔗 載入美股數據:', apiUrl)

      // 設置 90 秒超時(考慮到 rate limiting 可能需要等待 60 秒)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90000)

      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      clearTimeout(timeoutId) // 成功後清除超時

      // 檢查 HTTP 狀態碼
      if (!response.ok) {
        const errorText = await response.text()

        // 特別處理 429 錯誤(API 限制)
        if (response.status === 429) {
          console.warn('⏰ API 請求頻率限制,請等待 20 秒', errorText)
          throw new Error(
            'API 請求過於頻繁,請等待 20 秒後再試。免費計劃限制: 每分鐘3次請求。'
          )
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      // 檢查 Content-Type 是否為 JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('❌ 非 JSON 回應:', responseText)
        throw new Error(`期望 JSON 格式,但收到: ${contentType}`)
      }

      const result = await response.json()

      if (result.data && result.data.length > 0) {
        // 轉換為 KLineChart 格式
        const klineData = result.data.map((d: any) => ({
          timestamp: new Date(d.time).getTime(),
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume || 0,
        }))

        // 保存到緩存 (與 KLineChartPro 相同)
        // this.klineDataCache = [...klineData] // 已在 BaseChart 中處理

        // 設置數據到圖表
        if (typeof this.chart.applyNewData === 'function') {
          this.chart.applyNewData(klineData)
        } else if (typeof this.chart.loadData === 'function') {
          this.chart.loadData(klineData)
        }

        console.log(
          `✅ 載入 ${klineData.length} 筆美股歷史數據: ${this.symbol}`
        )
      }
    } catch (error) {
      // 特別處理超時錯誤
      if (error.name === 'AbortError') {
        console.error('⏰ 美股數據載入超時 (90秒)')
        throw new Error(
          '請求超時,請檢查網路連接或稍後再試。API 可能正在處理 rate limiting。'
        )
      }

      console.error('❌ 美股數據載入失敗:', error)
      throw error
    }
  }

  // 🎯 實現抽象方法:WebSocket 初始化 (美股不使用)
  initWebSocket(): void {
    // 美股圖表不使用 WebSocket (免費計劃不支援)
    console.log('📡 美股圖表不使用 WebSocket (免費計劃不支援)')
  }

  // updateInterval 已在 BaseChart 中實現,此處不需要重複
}

// React 組件 - 簡化版,使用 memo 防止不必要的重新渲染
const USStockChart = React.memo(function USStockChart({
  symbol,
  interval,
  height = 600,
  apiEndpoint,
  className = '',
  onIntervalChange,
}: USStockChartProps) {
  // 🔍 組件渲染追蹤 (僅開發環境)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 USStockChart 渲染:', { symbol, interval })
  }
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<USStockChartCore | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isKLineChartReady, setIsKLineChartReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 🔧 移除內部 interval 狀態,完全依賴 props,避免重複觸發
  // const [selectedInterval, setSelectedInterval] = useState(interval)
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(
    new Set()
  )
  // 初始化進行中標記,防止並發初始化
  const isInitializingRef = useRef(false)

  // 第一步:載入 KLineChart
  useEffect(() => {
    const loadChart = async () => {
      try {
        setIsLoading(true)
        const success = await loadKLineChart()
        if (success) {
          setIsKLineChartReady(true)
          setError(null)
        } else {
          setError('KLineChart 載入失敗')
        }
      } catch (err) {
        console.error('載入圖表失敗:', err)
        setError('圖表載入失敗')
      } finally {
        setIsLoading(false)
      }
    }

    loadChart()
  }, [])

  // 第二步:初始化圖表 (只在組件首次加載時執行)
  useEffect(() => {
    if (!isKLineChartReady || !chartRef.current) {
      return
    }

    const initChart = async () => {
      // 🔧 防止並發初始化
      if (isInitializingRef.current) {
        console.log('⚠️ 圖表正在初始化中,跳過重複請求', {
          timestamp: new Date().toISOString(),
        })
        return
      }

      try {
        isInitializingRef.current = true // 標記初始化開始

        console.log('🚀 初始化美股圖表:', {
          symbol,
          interval: interval,
          timestamp: new Date().toISOString(),
        })

        // 銷毀舊圖表
        if (chartInstance.current) {
          chartInstance.current.destroy()
        }

        // 創建新圖表
        chartInstance.current = new USStockChartCore(chartRef.current!, {
          symbol,
          interval: interval,
          apiEndpoint,
        })

        // 初始化圖表
        await chartInstance.current.init()

        // 同步指標狀態
        const chartActiveIndicators =
          chartInstance.current.getActiveIndicators()
        setActiveIndicators(new Set(chartActiveIndicators))

        // 圖表初始化完成

        console.log(
          '✅ 美股圖表初始化完成,同步指標狀態:',
          chartActiveIndicators
        )
      } catch (error) {
        console.error('❌ 美股圖表初始化失敗:', error)
        setError('圖表初始化失敗: ' + error.message)
      } finally {
        isInitializingRef.current = false // 確保標記被重置
      }
    }

    initChart()

    // 清理函數
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
        chartInstance.current = null
      }

      // 🔧 雙重保險:手動清理 DOM 元素
      if (chartRef.current) {
        chartRef.current.innerHTML = ''
        console.log('🧹 React 組件 DOM 清理完成')
      }

      // 重置所有狀態
      isInitializingRef.current = false
    }
  }, [isKLineChartReady, symbol, interval, apiEndpoint]) // 🔧 ✅ 包含 interval,當切換時完全重新創建圖表

  // 處理時間間隔切換
  const handleIntervalChange = useCallback(
    (newInterval: string) => {
      if (newInterval === interval) return

      console.log('🔄 圖表組件切換時間間隔:', interval, '->', newInterval)

      // 直接通知父組件切換,讓父組件統一管理
      // 當 interval props 改變時,useEffect 會自動重新創建圖表
      // 這樣避免內部狀態衝突
      if (onIntervalChange) {
        onIntervalChange(newInterval)
      }
    },
    [interval, onIntervalChange]
  )

  // 處理指標切換
  const handleIndicatorToggle = useCallback((indicatorName: IndicatorName) => {
    if (chartInstance.current) {
      const success = chartInstance.current.toggleIndicator(
        indicatorName,
        indicatorName === 'MA' || indicatorName === 'BOLL' ? 'main' : 'sub'
      )

      if (success) {
        const chartActiveIndicators =
          chartInstance.current.getActiveIndicators()
        setActiveIndicators(new Set(chartActiveIndicators))
        console.log(`📊 ${indicatorName} 指標切換成功`, chartActiveIndicators)
      }
    }
  }, [])

  // 錯誤處理
  if (error) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 ${className}`}
      >
        <div className="p-8 text-center">
          <div className="text-red-500 text-lg font-semibold mb-4">
            ❌ {error}
          </div>
          <div className="text-gray-600">請檢查網絡連接或稍後重試</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 載入狀態 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="text-gray-500">載入美股圖表...</div>
        </div>
      )}

      {/* 控制面板 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {symbol} 美股技術分析
            </h3>
            <p className="text-sm text-gray-500">
              {interval} K線 • Polygon.io API • 簡化架構
            </p>
          </div>
        </div>

        {/* 時間間隔和指標控制按鈕 */}
        <div className="flex space-x-6">
          {/* 時間間隔 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">時間間隔:</span>
            {timeIntervalOptions.map((option) => (
              <ChartButton
                key={option.value}
                variant="toggle"
                isActive={interval === option.value}
                onClick={() => handleIntervalChange(option.value)}
                title={`切換至 ${option.label}`}
              >
                {option.label}
              </ChartButton>
            ))}
          </div>

          {/* 技術指標 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">技術指標:</span>
            {indicatorOptions.map((indicator) => (
              <ChartButton
                key={indicator.name}
                variant="toggle"
                isActive={activeIndicators.has(indicator.name)}
                onClick={() =>
                  handleIndicatorToggle(indicator.name as IndicatorName)
                }
                title={`切換 ${indicator.label} 指標`}
              >
                {indicator.label}
              </ChartButton>
            ))}
          </div>
        </div>
      </div>

      {/* 圖表容器 */}
      <div
        ref={chartRef}
        className="w-full border border-gray-200 rounded-lg"
        style={{ height: `${height}px` }}
      />

      {/* 美股數據來源說明 */}
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <span>
          📈 {symbol} · {interval} · Polygon.io API
        </span>
        <span className="flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
          簡化架構,統一管理
        </span>
      </div>
    </div>
  )
})

export default USStockChart
