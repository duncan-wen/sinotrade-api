'use client'

import { MainLayout } from '@/components/layout/MainLayout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Zap, TrendingUp, TrendingDown, Info } from 'lucide-react'

export default function QuickTradePage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">快速下單</h1>
              <p className="text-muted-foreground">一鍵快速交易,即時掌握市場</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 買入表單 */}
          <Card className="border-emerald-200 dark:border-emerald-900">
            <CardHeader className="bg-emerald-50 dark:bg-emerald-950">
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <TrendingUp className="h-5 w-5" />
                買入
              </CardTitle>
              <CardDescription>建立多頭部位</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buy-symbol">股票代碼</Label>
                <Input id="buy-symbol" placeholder="輸入股票代碼,例如:2330" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buy-type">委託類型</Label>
                <Select defaultValue="market">
                  <SelectTrigger id="buy-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">市價單</SelectItem>
                    <SelectItem value="limit">限價單</SelectItem>
                    <SelectItem value="stop">停損單</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buy-price">價格</Label>
                <Input
                  id="buy-price"
                  type="number"
                  placeholder="輸入買入價格"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="buy-quantity">數量(張)</Label>
                <Input
                  id="buy-quantity"
                  type="number"
                  placeholder="輸入買入數量"
                  defaultValue="1"
                />
              </div>

              <div className="pt-4">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  確認買入
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 賣出表單 */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader className="bg-red-50 dark:bg-red-950">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <TrendingDown className="h-5 w-5" />
                賣出
              </CardTitle>
              <CardDescription>平倉或建立空頭部位</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sell-symbol">股票代碼</Label>
                <Input id="sell-symbol" placeholder="輸入股票代碼,例如:2330" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sell-type">委託類型</Label>
                <Select defaultValue="market">
                  <SelectTrigger id="sell-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">市價單</SelectItem>
                    <SelectItem value="limit">限價單</SelectItem>
                    <SelectItem value="stop">停損單</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sell-price">價格</Label>
                <Input
                  id="sell-price"
                  type="number"
                  placeholder="輸入賣出價格"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sell-quantity">數量(張)</Label>
                <Input
                  id="sell-quantity"
                  type="number"
                  placeholder="輸入賣出數量"
                  defaultValue="1"
                />
              </div>

              <div className="pt-4">
                <Button className="w-full bg-red-600 hover:bg-red-700">
                  <TrendingDown className="h-4 w-4 mr-2" />
                  確認賣出
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 風險提示 */}
        <Card className="border-orange-200 dark:border-orange-900">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">
                  風險提示
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 投資有風險,請謹慎評估自身風險承受能力</li>
                  <li>• 市價單將以市場最佳價格成交,可能與預期價格有差異</li>
                  <li>
                    • 請確認委託內容無誤後再送出,已送出的委託請至交易記錄查詢
                  </li>
                  <li>• 台股交易時間:週一至週五 9:00-13:30(不含國定假日)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
