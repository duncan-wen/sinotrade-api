'use client'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { TrendingUp, Eye } from 'lucide-react'

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
      <div className="space-y-6 p-6">
        {/* 市場總覽卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: '台股指數',
              value: '17,234',
              change: '+123 (+0.72%)',
              up: true,
              icon: '📈',
            },
            {
              title: '美股道瓊',
              value: '38,654',
              change: '-89 (-0.23%)',
              up: false,
              icon: '🇺🇸',
            },
            {
              title: '投資組合價值',
              value: '$125,680',
              change: '+$2,340 (+1.90%)',
              up: true,
              icon: '💼',
            },
            {
              title: '今日損益',
              value: '+$1,250',
              change: '已實現',
              up: true,
              icon: '💰',
            },
          ].map((stat, index) => (
            <Card
              key={index}
              className="relative overflow-hidden bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-300 border-0 shadow-md"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{stat.icon}</span>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                  </div>
                  <Badge
                    variant={stat.up ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {stat.up ? '↗' : '↘'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      stat.up
                        ? 'text-red-600 dark:text-red-400' // 漲：紅色
                        : 'text-green-600 dark:text-green-400' // 跌：綠色
                    }`}
                  >
                    {stat.change}
                  </p>
                </div>
                <div
                  className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${
                    stat.up
                      ? 'from-green-500 to-emerald-500'
                      : 'from-red-500 to-rose-500'
                  }`}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 快速交易區 */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl">⚡</span>
              <CardTitle className="text-xl">快速交易</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="group p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200/50 dark:border-green-800/30 hover:shadow-md transition-all duration-300 cursor-pointer">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <span className="text-lg">📈</span>
                  </div>
                  <h4 className="font-semibold text-green-800 dark:text-green-300">
                    台股熱門
                  </h4>
                </div>
                <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                  台積電、聯發科、鴻海
                </p>
                <Button
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  查看更多
                </Button>
              </div>

              <div className="group p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30 hover:shadow-md transition-all duration-300 cursor-pointer">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <span className="text-lg">⚡</span>
                  </div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                    快速下單
                  </h4>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                  一鍵買賣,即時成交
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  立即下單
                </Button>
              </div>

              <div className="group p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 rounded-xl border border-purple-200/50 dark:border-purple-800/30 hover:shadow-md transition-all duration-300 cursor-pointer">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <span className="text-lg">🇺🇸</span>
                  </div>
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300">
                    美股分析
                  </h4>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
                  AAPL、TSLA、NVDA 專業圖表
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white"
                  onClick={() => (window.location.href = '/us-stocks')}
                >
                  進入美股
                </Button>
              </div>
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

        {/* 主要圖表展示區域 */}
        <Card className="overflow-hidden shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <CardTitle className="text-xl">TSMC 台積電</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    即時更新 • 會成交量
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              >
                🟢 開盤中
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <TradingChart
              data={generateMockKLineData(30)}
              symbol="TSMC 台積電"
              height={isMobile ? 300 : 500}
            />
          </CardContent>
        </Card>

        {/* 多圖表展示 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="overflow-hidden shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-b">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <span className="text-lg">🏢</span>
                </div>
                <div>
                  <CardTitle>2330.TW</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    台積電股價走勢
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <TradingChart
                data={tsmcMockData}
                symbol="2330.TW"
                height={isMobile ? 250 : 350}
              />
            </CardContent>
          </Card>

          <Card
            className="overflow-hidden shadow-lg border-0 cursor-pointer hover:shadow-xl transition-shadow duration-300"
            onClick={() => (window.location.href = '/us-stocks')}
          >
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <span className="text-lg">🍎</span>
                  </div>
                  <div>
                    <CardTitle>AAPL</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      蘋果公司股價
                    </p>
                  </div>
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  🇺🇸 點擊查看美股專區
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <TradingChart
                data={generateMockKLineData(15)}
                symbol="AAPL"
                height={isMobile ? 250 : 350}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
