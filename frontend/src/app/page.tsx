'use client'
import { MainLayout } from '@/components/layout/MainLayout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TradingChart } from '@/components/chart'
import { RankingList } from '@/components/ranking'
import { useMultipleRankingData } from '@/hooks/useRankingData'
import {
  generateMockKLineData,
  tsmcMockData,
} from '@/components/chart/mockData'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Eye,
  BarChart3,
  DollarSign,
  Wallet,
  Activity,
  Globe,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  CandlestickChart,
  Users,
  Clock,
} from 'lucide-react'

export default function Home() {
  const [isMobile, setIsMobile] = useState(false)

  // 獲取多個排行榜數據用於預覽
  const { dataMap, loadingMap, errorMap } = useMultipleRankingData([
    'ChangePercentRank',
    'VolumeRank',
    'AmountRank',
  ])

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return (
    <MainLayout>
      {/* 交易大廳主要內容 */}
      <div className="space-y-8 p-6">
        {/* 市場總覽卡片 - 使用現代化 shadcn/ui 設計 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: '台股指數',
              description: 'TWII Index',
              value: '17,234',
              change: '+123',
              changePercent: '+0.72%',
              up: true,
              icon: BarChart3,
              trend: 'rising',
            },
            {
              title: '美股道瓊',
              description: 'Dow Jones',
              value: '38,654',
              change: '-89',
              changePercent: '-0.23%',
              up: false,
              icon: Globe,
              trend: 'falling',
            },
            {
              title: '投資組合價值',
              description: 'Portfolio Value',
              value: '$125,680',
              change: '+$2,340',
              changePercent: '+1.90%',
              up: true,
              icon: Wallet,
              trend: 'rising',
            },
            {
              title: '今日損益',
              description: 'Today P&L',
              value: '+$1,250',
              change: '已實現',
              changePercent: '',
              up: true,
              icon: DollarSign,
              trend: 'realized',
            },
          ].map((stat, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden border-0 bg-gradient-to-br from-card via-card to-card/80 shadow-sm hover:shadow-xl transition-all duration-500 hover:scale-[1.02] cursor-pointer"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors duration-300">
                      <stat.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {stat.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={stat.up ? 'default' : 'destructive'}
                    className="flex items-center gap-1 text-xs px-2 py-1"
                  >
                    {stat.up ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {stat.up ? '漲' : '跌'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                <div className="space-y-3">
                  <div className="text-2xl font-bold tracking-tight">
                    {stat.value}
                  </div>

                  <div className="flex items-center justify-between">
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${
                        stat.up
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {stat.change}
                      {stat.changePercent && (
                        <span className="text-xs opacity-80">
                          ({stat.changePercent})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      即時
                    </div>
                  </div>
                </div>

                {/* 趨勢指示器 */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r transition-all duration-500 ${
                    stat.up
                      ? 'from-emerald-500/50 via-emerald-500 to-emerald-500/50'
                      : 'from-red-500/50 via-red-500 to-red-500/50'
                  } group-hover:h-1.5`}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 快速交易區 - 現代化 shadcn/ui 設計 */}
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-muted/50 via-background to-muted/50 shadow-lg">
          <CardHeader className="space-y-0 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">快速交易</CardTitle>
                  <CardDescription className="text-sm">
                    一鍵進入各個交易市場，開始您的投資之旅
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="hidden sm:flex items-center gap-1"
              >
                <Users className="h-3 w-3" />
                熱門
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* 台股熱門 */}
              <Card className="group overflow-hidden border-0 bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <Activity className="h-5 w-5 text-emerald-600" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      台股
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
                      台股熱門
                    </CardTitle>
                    <CardDescription className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      台積電、聯發科、鴻海等熱門股票
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardFooter className="pt-0">
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                  >
                    查看更多
                  </Button>
                </CardFooter>
              </Card>

              {/* 快速下單 */}
              <Card className="group overflow-hidden border-0 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      下單
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-blue-900 dark:text-blue-100">
                      快速下單
                    </CardTitle>
                    <CardDescription className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      一鍵買賣，即時成交執行
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardFooter className="pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-medium shadow-sm"
                  >
                    立即下單
                  </Button>
                </CardFooter>
              </Card>

              {/* 美股分析 */}
              <Card className="group overflow-hidden border-0 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                      <Globe className="h-5 w-5 text-violet-600" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      美股
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-violet-900 dark:text-violet-100">
                      美股分析
                    </CardTitle>
                    <CardDescription className="text-xs text-violet-700 dark:text-violet-300 mt-1">
                      AAPL、TSLA、NVDA 專業圖表分析
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardFooter className="pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white font-medium shadow-sm"
                    onClick={() => (window.location.href = '/us-stocks')}
                  >
                    進入美股
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* 排行榜預覽區域 */}
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200/50 dark:border-orange-800/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-orange-800 dark:text-orange-300">
                    🏆 即時排行榜
                  </CardTitle>
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    台股市場熱門排行,即時更新
                  </p>
                </div>
              </div>
              <Link href="/ranking">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
                >
                  <Eye className="h-4 w-4" />
                  查看完整排行
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 漲跌幅排行 */}
              <RankingList
                data={dataMap.ChangePercentRank || []}
                scannerType="ChangePercentRank"
                title="漲跌幅排行"
                showRank={true}
                displayCount={5}
                isLoading={loadingMap.ChangePercentRank}
                error={errorMap.ChangePercentRank}
                clickable={false}
                className="shadow-sm"
              />

              {/* 成交量排行 */}
              <RankingList
                data={dataMap.VolumeRank || []}
                scannerType="VolumeRank"
                title="成交量排行"
                showRank={true}
                displayCount={5}
                isLoading={loadingMap.VolumeRank}
                error={errorMap.VolumeRank}
                clickable={false}
                className="shadow-sm"
              />

              {/* 成交金額排行 */}
              <RankingList
                data={dataMap.AmountRank || []}
                scannerType="AmountRank"
                title="成交金額排行"
                showRank={true}
                displayCount={5}
                isLoading={loadingMap.AmountRank}
                error={errorMap.AmountRank}
                clickable={false}
                className="shadow-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* 主要圖表展示區域 - 現代化設計 */}
        <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-background via-background to-muted/30">
          <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <CandlestickChart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">
                    TSMC 台積電
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-sm">
                    即時更新 • 大量成交
                    <Badge variant="outline" className="text-xs">
                      2330.TW
                    </Badge>
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="default"
                  className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 font-medium"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  開盤中
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  15:30 更新
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <TradingChart
              data={generateMockKLineData(30)}
              symbol="TSMC 台積電"
              height={isMobile ? 320 : 520}
            />
          </CardContent>
        </Card>

        {/* 多圖表展示 - 現代化並排設計 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* 台積電圖表 */}
          <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-500 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="font-bold">2330.TW</CardTitle>
                    <CardDescription className="text-sm">
                      台積電股價走勢
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    台股
                  </Badge>
                  <Badge variant="default" className="text-xs bg-blue-600">
                    即時
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <TradingChart
                data={tsmcMockData}
                symbol="2330.TW"
                height={isMobile ? 280 : 380}
              />
            </CardContent>
          </Card>

          {/* 蘋果圖表 - 可點擊進入美股 */}
          <Card
            className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-background to-muted/20"
            onClick={() => (window.location.href = '/us-stocks')}
          >
            <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                    <Globe className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="font-bold">AAPL</CardTitle>
                    <CardDescription className="text-sm">
                      蘋果公司股價
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    美股
                  </Badge>
                  <div className="text-xs text-primary font-medium flex items-center gap-1 group-hover:text-emerald-600 transition-colors">
                    <ArrowUpRight className="h-3 w-3" />
                    點擊進入
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 relative">
              <TradingChart
                data={generateMockKLineData(15)}
                symbol="AAPL"
                height={isMobile ? 280 : 380}
              />
              {/* 懸停提示 */}
              <div className="absolute inset-0 bg-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-background/90 backdrop-blur-sm rounded-xl p-4 border shadow-lg">
                  <div className="text-sm font-medium text-center">
                    🇺🇸 點擊查看美股專區
                  </div>
                  <div className="text-xs text-muted-foreground text-center mt-1">
                    更多美股分析與交易
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
