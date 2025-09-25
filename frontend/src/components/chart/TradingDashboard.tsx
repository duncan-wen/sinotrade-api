'use client'

import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Globe,
  DollarSign,
  Zap,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TaiwanStockChart } from './TaiwanStockChart'
import {
  marketStats,
  popularStockQuotes,
  formatNumber,
  formatCurrency,
  formatPercentage,
} from './mockTaiwanStockData'

// 統計卡片組件
function StatCard({
  title,
  value,
  change,
  changePercent,
  icon: Icon,
  badge,
  currency = 'TWD',
}: {
  title: string
  value: number
  change: number
  changePercent: number
  icon: any
  badge: string
  currency?: string
}) {
  const isPositive = change >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
          {badge}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {currency === 'TWD'
            ? formatNumber(value)
            : formatCurrency(value, 'USD')}
        </div>
        <div
          className={`text-xs flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}
        >
          {isPositive ? '+' : ''}
          {formatNumber(change)} ({formatPercentage(changePercent)})
          {isPositive ? (
            <TrendingUp className="ml-1 h-3 w-3" />
          ) : (
            <TrendingDown className="ml-1 h-3 w-3" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 熱門股票列表組件
function PopularStocksList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">熱門股票</CardTitle>
        <CardDescription>當日熱門股票表現</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {popularStockQuotes.map((stock) => (
          <div
            key={stock.symbol}
            className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-medium text-sm">{stock.name}</span>
                <span className="text-xs text-muted-foreground">
                  {stock.symbol}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-medium">${stock.price}</span>
              <span
                className={`text-xs ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {stock.change >= 0 ? '+' : ''}
                {stock.change} ({formatPercentage(stock.changePercent)})
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// 快速操作區域
function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-full">
            <BarChart3 className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">台股熱門</h3>
            <p className="text-sm text-muted-foreground">
              台積電、鴻海等熱門標的
            </p>
          </div>
        </div>
        <Button className="w-full mt-4 bg-green-600 hover:bg-green-700">
          查看走勢
        </Button>
      </Card>

      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Zap className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">快速下單</h3>
            <p className="text-sm text-muted-foreground">一鍵進入各種標的</p>
          </div>
        </div>
        <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
          立即下單
        </Button>
      </Card>

      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-full">
            <Globe className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">美股分析</h3>
            <p className="text-sm text-muted-foreground">
              AAPL、TSLA、NVDA等熱門標的分析
            </p>
          </div>
        </div>
        <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
          查看美股
        </Button>
      </Card>
    </div>
  )
}

export function TradingDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* 頂部統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="台股指數"
          value={marketStats.twiIndex.value}
          change={marketStats.twiIndex.change}
          changePercent={marketStats.twiIndex.changePercent}
          icon={BarChart3}
          badge="2 漲"
        />
        <StatCard
          title="美股道瓊"
          value={marketStats.dowJones.value}
          change={marketStats.dowJones.change}
          changePercent={marketStats.dowJones.changePercent}
          icon={Globe}
          badge="3 跌"
        />
        <StatCard
          title="投資組合價值"
          value={marketStats.portfolioValue.value}
          change={marketStats.portfolioValue.change}
          changePercent={marketStats.portfolioValue.changePercent}
          icon={DollarSign}
          badge="2 漲"
          currency="USD"
        />
        <StatCard
          title="今日損益"
          value={marketStats.todayPnL.value}
          change={0}
          changePercent={0}
          icon={TrendingUp}
          badge="已實現"
          currency="USD"
        />
      </div>

      {/* 快速操作區域 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">快速交易</h2>
        <p className="text-sm text-muted-foreground mb-4">
          一鍵進入各種模式,開始你的投資之路
        </p>
        <QuickActions />
      </div>

      {/* 圖表和股票列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TaiwanStockChart />
        </div>
        <div>
          <PopularStocksList />
        </div>
      </div>

      {/* 即時排行榜區域 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              漲跌幅排行
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center py-8 text-muted-foreground">
              <p>5 個股票</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              成交量排行
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center py-8 text-muted-foreground">
              <p>5 個股票</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              成交金額排行
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center py-8 text-muted-foreground">
              <p>5 個股票</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
