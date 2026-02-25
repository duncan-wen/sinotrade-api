'use client'

import React, { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiService } from '@/services/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts'

// ─── 型別 ────────────────────────────────────────────────
type PricePoint = { date: string; taiex: number | null; usd_twd: number | null }
type CorrPoint = { date: string; correlation: number | null }
type ReturnPoint = {
  date: string
  market: number | null
  strategy: number | null
}

// ─── 工具元件 ────────────────────────────────────────────

/** 每隔 N 個 tick 才顯示一次日期 label */
const sparseTickFormatter = (step: number) => {
  let count = 0
  return (value: string) => {
    count++
    return count % step === 0 ? value.slice(0, 7) : ''
  }
}

const TICK_STEP = 30

const tickFmtPrice = sparseTickFormatter(TICK_STEP)
const tickFmtCorr = sparseTickFormatter(TICK_STEP)
const tickFmtReturn = sparseTickFormatter(TICK_STEP)

// ─── 主元件 ──────────────────────────────────────────────
export function ForexAnalysis() {
  const [days, setDays] = useState(730)
  const [corrWindow, setCorrWindow] = useState(20)
  const [pendingDays, setPendingDays] = useState(730)
  const [pendingWindow, setPendingWindow] = useState(20)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['forex-analysis', days, corrWindow],
    queryFn: () =>
      apiService.getForexAnalysis({ days, corr_window: corrWindow }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const handleApply = useCallback(() => {
    setDays(pendingDays)
    setCorrWindow(pendingWindow)
  }, [pendingDays, pendingWindow])

  // ── 載入中 ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-48 bg-muted/50 rounded-lg animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // ── 錯誤 ──
  if (error || !data) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6 text-center text-muted-foreground space-y-3">
          <Activity className="h-12 w-12 mx-auto opacity-40" />
          <p className="font-semibold text-destructive">
            {error instanceof Error ? error.message : '資料載入失敗'}
          </p>
          <p className="text-sm">請確認後端服務已啟動且已安裝 yfinance 套件</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            重試
          </Button>
        </CardContent>
      </Card>
    )
  }

  const {
    price_data,
    corr_data,
    return_data,
    market_return_pct,
    strategy_return_pct,
    win_rate_pct,
    total_days,
    signal_days,
  } = data

  const strategyDelta = strategy_return_pct - market_return_pct

  return (
    <div className="space-y-6">
      {/* ── 參數控制面板 ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            分析參數設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* 回測天數 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                回測天數：
                <span className="text-primary font-bold">{pendingDays} 天</span>
                <span className="text-muted-foreground ml-1">
                  (~{Math.round(pendingDays / 365)} 年)
                </span>
              </label>
              <input
                type="range"
                min={365}
                max={3650}
                step={90}
                value={pendingDays}
                onChange={(e) => setPendingDays(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 年</span>
                <span>5 年</span>
                <span>10 年</span>
              </div>
            </div>

            {/* 相關係數視窗 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                相關係數視窗：
                <span className="text-primary font-bold">
                  {pendingWindow} 天
                </span>
              </label>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={pendingWindow}
                onChange={(e) => setPendingWindow(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5 天</span>
                <span>30 天</span>
                <span>60 天</span>
              </div>
            </div>

            {/* 套用按鈕 */}
            <div className="flex gap-2">
              <Button
                onClick={handleApply}
                disabled={isFetching}
                className="flex-1"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
                />
                套用分析
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 mt-3 text-xs text-muted-foreground">
            <span>資料來源：Yahoo Finance (^TWII + TWD=X)</span>
            <span>•</span>
            <span>共 {total_days} 個交易日</span>
            <span>•</span>
            <span>訊號天數：{signal_days} 天</span>
          </div>
        </CardContent>
      </Card>

      {/* ── 績效指標 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">大盤累積報酬</p>
                <p
                  className={`text-3xl font-bold mt-1 ${market_return_pct >= 0 ? 'text-red-500' : 'text-green-500'}`}
                >
                  {market_return_pct >= 0 ? '+' : ''}
                  {market_return_pct.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  台灣加權指數 (^TWII)
                </p>
              </div>
              {market_return_pct >= 0 ? (
                <TrendingUp className="h-10 w-10 text-red-400 opacity-60" />
              ) : (
                <TrendingDown className="h-10 w-10 text-green-400 opacity-60" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">策略累積報酬</p>
                <p
                  className={`text-3xl font-bold mt-1 ${strategy_return_pct >= 0 ? 'text-red-500' : 'text-green-500'}`}
                >
                  {strategy_return_pct >= 0 ? '+' : ''}
                  {strategy_return_pct.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  vs 大盤{' '}
                  <span
                    className={
                      strategyDelta >= 0 ? 'text-red-500' : 'text-green-500'
                    }
                  >
                    {strategyDelta >= 0 ? '+' : ''}
                    {strategyDelta.toFixed(2)}%
                  </span>
                </p>
              </div>
              <Activity className="h-10 w-10 text-blue-400 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">策略勝率</p>
                <p
                  className={`text-3xl font-bold mt-1 ${win_rate_pct >= 50 ? 'text-red-500' : 'text-green-500'}`}
                >
                  {win_rate_pct.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  台幣升值隔日買入獲利機率
                </p>
              </div>
              <Badge
                variant={win_rate_pct >= 55 ? 'default' : 'secondary'}
                className="text-base px-3 py-1"
              >
                {win_rate_pct >= 55
                  ? '有效'
                  : win_rate_pct >= 50
                    ? '微弱'
                    : '無效'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 圖一：加權指數 vs 匯率 ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">加權指數 vs. 台幣匯率</CardTitle>
          <CardDescription>
            美金/台幣 下跌 = 台幣升值；兩者通常呈負相關
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={price_data as PricePoint[]}
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={tickFmtPrice}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="left"
                domain={['auto', 'auto']}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.toLocaleString()}
                label={{
                  value: '指數點數',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 11 },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={['auto', 'auto']}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.toFixed(1)}
                label={{
                  value: '匯率 (USD/TWD)',
                  angle: 90,
                  position: 'insideRight',
                  offset: 10,
                  style: { fontSize: 11 },
                }}
              />
              <Tooltip
                labelFormatter={(label) => `日期：${label}`}
                formatter={(value: number, name: string) => {
                  if (name === '加權指數')
                    return [value?.toLocaleString(), name]
                  return [value?.toFixed(3), name]
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="taiex"
                name="加權指數"
                stroke="#ef4444"
                dot={false}
                strokeWidth={1.5}
                connectNulls
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="usd_twd"
                name="USD/TWD 匯率"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={1.5}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── 圖二：滾動相關係數 ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            滾動 {corrWindow} 天相關係數
          </CardTitle>
          <CardDescription>
            接近 -1：台幣升值 → 股市漲（強負相關）｜接近 +1：同向變動（正相關）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={corr_data as CorrPoint[]}
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={tickFmtCorr}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                domain={[-1, 1]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <Tooltip
                labelFormatter={(label) => `日期：${label}`}
                formatter={(value: number) => [value?.toFixed(3), '相關係數']}
              />
              <ReferenceLine y={0} stroke="#999" strokeDasharray="4 4" />
              <ReferenceLine
                y={-0.5}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: '-0.5',
                  position: 'right',
                  style: { fontSize: 10, fill: '#ef4444' },
                }}
              />
              <Area
                type="monotone"
                dataKey="correlation"
                name="相關係數"
                stroke="#6b7280"
                fill="#6b7280"
                fillOpacity={0.2}
                dot={false}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── 圖三：策略回測累積報酬 ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            策略回測：台幣升值隔日買入大盤
          </CardTitle>
          <CardDescription>
            當日 USD/TWD 下跌（台幣升值）→ 隔日持有加權指數；以累積倍數表示
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={return_data as ReturnPoint[]}
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={tickFmtReturn}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v.toFixed(1)}x`}
                label={{
                  value: '累積倍數',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 11 },
                }}
              />
              <Tooltip
                labelFormatter={(label) => `日期：${label}`}
                formatter={(value: number, name: string) => [
                  `${value?.toFixed(3)}x (+${((value - 1) * 100).toFixed(1)}%)`,
                  name,
                ]}
              />
              <Legend />
              <ReferenceLine y={1} stroke="#999" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="market"
                name="持有大盤"
                stroke="#ef4444"
                dot={false}
                strokeWidth={1.5}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="strategy"
                name="匯率策略"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── 說明 ── */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <h4 className="font-medium text-foreground">策略說明</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                資料來源：Yahoo Finance，^TWII（台灣加權指數）+
                TWD=X（美元/台幣匯率）
              </li>
              <li>
                訊號：當日 USD/TWD 收盤匯率下跌（台幣升值），
                <strong>隔日</strong>持有加權指數
              </li>
              <li>無槓桿、無做空，僅在有訊號時才進場，其餘時間空倉</li>
              <li>策略報酬 = 持有大盤報酬 × 前一日訊號（0 或 1）</li>
              <li>
                累積倍數 1.0 代表不賺不虧，高於紅色虛線代表策略優於持有大盤
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
