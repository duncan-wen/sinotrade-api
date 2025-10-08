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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { History, TrendingUp, TrendingDown, Clock } from 'lucide-react'

export default function HistoryPage() {
  const mockTrades = [
    {
      id: '202510030001',
      symbol: '2330',
      name: '台積電',
      type: 'buy',
      price: 598,
      quantity: 2,
      amount: 1196000,
      time: '2025-10-03 09:30:15',
      status: '已成交',
    },
    {
      id: '202510030002',
      symbol: '2454',
      name: '聯發科',
      type: 'sell',
      price: 1050,
      quantity: 1,
      amount: 1050000,
      time: '2025-10-03 10:15:42',
      status: '已成交',
    },
    {
      id: '202510030003',
      symbol: '2308',
      name: '台達電',
      type: 'buy',
      price: 385,
      quantity: 3,
      amount: 1155000,
      time: '2025-10-03 11:22:08',
      status: '已成交',
    },
  ]

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">交易記錄</h1>
              <p className="text-muted-foreground">
                查詢歷史交易明細與委託狀態
              </p>
            </div>
          </div>

          <Button variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            篩選日期
          </Button>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                今日交易筆數
              </CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">共成交 6 張</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">買入金額</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                $2,351,000
              </div>
              <p className="text-xs text-muted-foreground">5 張</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">賣出金額</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">$1,050,000</div>
              <p className="text-xs text-muted-foreground">1 張</p>
            </CardContent>
          </Card>
        </div>

        {/* 交易記錄表格 */}
        <Card>
          <CardHeader>
            <CardTitle>今日交易明細</CardTitle>
            <CardDescription>即時更新的交易記錄</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>委託編號</TableHead>
                  <TableHead>股票</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead className="text-right">價格</TableHead>
                  <TableHead className="text-right">數量</TableHead>
                  <TableHead className="text-right">成交金額</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead>狀態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-mono text-sm">
                      {trade.id}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{trade.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {trade.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {trade.type === 'buy' ? (
                        <Badge className="bg-emerald-600">買入</Badge>
                      ) : (
                        <Badge className="bg-red-600">賣出</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${trade.price}
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.quantity} 張
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${trade.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{trade.time}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{trade.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 佔位提示 */}
        <Card className="border-dashed border-2">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">
                更多歷史記錄功能即將推出
              </p>
              <p className="text-sm">
                包括交易報表、績效分析、匯出功能等正在開發中
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
