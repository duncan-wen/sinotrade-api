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
import { Progress } from '@/components/ui/progress'
import {
  DollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'

export default function FundsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">資金管理</h1>
              <p className="text-muted-foreground">帳戶資金概覽與交易額度</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              入金
            </Button>
            <Button variant="outline">
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              出金
            </Button>
          </div>
        </div>

        {/* 資金總覽 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總資產</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$2,456,789</div>
              <p className="text-xs text-emerald-600">+2.34% 本月</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">可用資金</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$856,234</div>
              <p className="text-xs text-muted-foreground">可下單金額</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已用額度</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$1,600,555</div>
              <p className="text-xs text-muted-foreground">持倉市值</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日損益</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                +$15,234
              </div>
              <p className="text-xs text-emerald-600">+0.62%</p>
            </CardContent>
          </Card>
        </div>

        {/* 資金使用率 */}
        <Card>
          <CardHeader>
            <CardTitle>資金使用情況</CardTitle>
            <CardDescription>當前資金配置與使用比例</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">資金使用率</span>
                <span className="text-sm text-muted-foreground">65.14%</span>
              </div>
              <Progress value={65.14} className="h-2" />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>已使用 $1,600,555</span>
                <span>總額度 $2,456,789</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">資金配置</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">現金</span>
                    <span className="font-medium">$856,234 (34.86%)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">股票持倉</span>
                    <span className="font-medium">$1,600,555 (65.14%)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">信用額度</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">可用融資額度</span>
                    <span className="font-medium">$500,000</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">已用融資</span>
                    <span className="font-medium">$0</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 近期資金異動 */}
        <Card>
          <CardHeader>
            <CardTitle>近期資金異動</CardTitle>
            <CardDescription>最近的入金、出金記錄</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  type: 'deposit',
                  amount: 500000,
                  date: '2025-10-01',
                  status: '已完成',
                },
                {
                  type: 'withdraw',
                  amount: 200000,
                  date: '2025-09-28',
                  status: '已完成',
                },
                {
                  type: 'deposit',
                  amount: 1000000,
                  date: '2025-09-15',
                  status: '已完成',
                },
              ].map((record, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {record.type === 'deposit' ? (
                      <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900">
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                        <ArrowDownLeft className="h-4 w-4 text-red-600" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">
                        {record.type === 'deposit' ? '入金' : '出金'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {record.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${
                        record.type === 'deposit'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {record.type === 'deposit' ? '+' : '-'}$
                      {record.amount.toLocaleString()}
                    </div>
                    <Badge variant="outline" className="mt-1">
                      {record.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 佔位提示 */}
        <Card className="border-dashed border-2">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">
                更多資金管理功能即將推出
              </p>
              <p className="text-sm">
                包括自動入金、銀行帳戶綁定、信用交易管理等功能正在開發中
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
