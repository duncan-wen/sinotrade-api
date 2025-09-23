'use client'

import { TradingDashboard } from '@/components/chart/TradingDashboard'

export default function TestTaiwanChartPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 text-white p-2 rounded">
              <span className="font-bold text-sm">Sinotrade</span>
            </div>
            <h1 className="text-xl font-semibold">投資交易平台</h1>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground">首頁</span>
              <span>/</span>
              <span className="text-muted-foreground">交易大廳</span>
            </div>
          </div>
        </div>
      </div>

      <TradingDashboard />
    </div>
  )
}
