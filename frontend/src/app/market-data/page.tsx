'use client'

import { MainLayout } from '@/components/layout/MainLayout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Globe,
} from 'lucide-react'

export default function MarketDataPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">市場數據</h1>
              <p className="text-muted-foreground">即時市場行情與數據分析</p>
            </div>
          </div>
        </div>

        {/* 市場概況卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                台股加權指數
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">17,234</div>
              <p className="text-xs text-emerald-600">+123 (+0.72%)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">美股道瓊</CardTitle>
              <Globe className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">38,654</div>
              <p className="text-xs text-red-600">-89 (-0.23%)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">成交量</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">234億</div>
              <p className="text-xs text-muted-foreground">台股總成交量</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">成交金額</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3,567億</div>
              <p className="text-xs text-muted-foreground">台股總成交金額</p>
            </CardContent>
          </Card>
        </div>

        {/* 市場熱點 */}
        <Card>
          <CardHeader>
            <CardTitle>市場熱點</CardTitle>
            <CardDescription>今日市場關注焦點</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">半導體類股強勢</h3>
                  <p className="text-sm text-muted-foreground">
                    台積電領漲,帶動整體半導體類股上揚
                  </p>
                </div>
                <Badge variant="default" className="bg-emerald-600">
                  漲
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">金融股回檔</h3>
                  <p className="text-sm text-muted-foreground">
                    銀行股受利率影響,今日普遍下跌
                  </p>
                </div>
                <Badge variant="default" className="bg-red-600">
                  跌
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">航運股持平</h3>
                  <p className="text-sm text-muted-foreground">
                    航運類股表現平穩,多頭觀望中
                  </p>
                </div>
                <Badge variant="secondary">平</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 佔位提示 */}
        <Card className="border-dashed border-2">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">更多市場數據即將推出</p>
              <p className="text-sm">
                包括技術分析、市場深度、歷史數據等功能正在開發中
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
