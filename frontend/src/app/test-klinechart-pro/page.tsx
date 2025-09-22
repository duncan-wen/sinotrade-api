/**
 * KLineChart Pro 測試頁面
 *
 * 展示：
 * 1. KLineChart Pro 專業圖表（支援所有技術指標）
 * 2. SimpleTradingChart 簡化版圖表
 * 3. 對比兩種圖表的特性和使用場景
 */

'use client'
import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import SimpleTradingChart from '@/components/chart/SimpleTradingChart'

// 動態載入 KLineChart Pro，避免 SSR 問題
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

export default function TestKLineChartProPage() {
  const [symbol, setSymbol] = useState('TXFR1')
  const [interval, setInterval] = useState('5m')
  const [currentChart, setCurrentChart] = useState<'pro' | 'simple' | 'both'>(
    'both'
  )

  const symbols = [
    { value: 'TXFR2', label: 'TXFR2 (台指期近月)' },
    { value: 'TXFR1', label: 'TXFR1 (台指期遠月)' },
    { value: 'MXFR1', label: 'MXFR1 (小台指期)' },
    { value: '2408', label: '2408 (南亞科)' },
    { value: '2330', label: '2330 (台積電)' },
    { value: '2317', label: '2317 (鴻海)' },
  ]

  const intervals = [
    { value: '1m', label: '1分鐘' },
    { value: '5m', label: '5分鐘' },
    { value: '15m', label: '15分鐘' },
    { value: '60m', label: '1小時' },
    { value: '1d', label: '日線' },
    { value: '1w', label: '週線' },
    { value: '1M', label: '月線' },
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          📊 KLineChart Pro vs SimpleTradingChart 測試
        </h1>

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
              <strong>KLineChart Pro：</strong>適合需要專業技術指標分析的場景
            </li>
            <li>
              <strong>SimpleTradingChart：</strong>
              適合儀表板、概覽頁面等簡單顯示需求
            </li>
            <li>
              <strong>安裝要求：</strong>專業版需要安裝套件{' '}
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
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                內建技術指標
              </span>
            </h2>
            <KLineChartPro
              symbol={symbol}
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
