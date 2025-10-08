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
  FileText,
  TrendingUp,
  Search,
  BookOpen,
  AlertCircle,
} from 'lucide-react'

export default function ResearchPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">研究分析</h1>
              <p className="text-muted-foreground">
                專業市場研究報告與投資分析
              </p>
            </div>
          </div>
        </div>

        {/* 功能卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <TrendingUp className="h-8 w-8 text-emerald-600" />
                <Badge>熱門</Badge>
              </div>
              <CardTitle className="mt-4">技術分析</CardTitle>
              <CardDescription>
                K線圖表分析、技術指標解讀與趨勢預測
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                查看分析
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <FileText className="h-8 w-8 text-blue-600" />
                <Badge variant="secondary">新</Badge>
              </div>
              <CardTitle className="mt-4">基本面分析</CardTitle>
              <CardDescription>
                財報解讀、產業研究與公司價值評估
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                查看報告
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <BookOpen className="h-8 w-8 text-purple-600" />
                <Badge variant="outline">Pro</Badge>
              </div>
              <CardTitle className="mt-4">市場研究</CardTitle>
              <CardDescription>
                產業趨勢、市場動態與投資策略分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                閱讀報告
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 最新研究報告 */}
        <Card>
          <CardHeader>
            <CardTitle>最新研究報告</CardTitle>
            <CardDescription>專業分析師提供的最新市場洞察</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  title: '2025 Q1 半導體產業展望',
                  author: '分析師 張明',
                  date: '2025-10-03',
                  category: '產業研究',
                },
                {
                  title: 'AI 概念股投資機會分析',
                  author: '分析師 李華',
                  date: '2025-10-02',
                  category: '投資策略',
                },
                {
                  title: '台積電 Q4 營收預測與分析',
                  author: '分析師 王強',
                  date: '2025-10-01',
                  category: '個股研究',
                },
              ].map((report, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{report.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{report.author}</span>
                      <span>•</span>
                      <span>{report.date}</span>
                      <Badge variant="outline" className="ml-2">
                        {report.category}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    閱讀
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 佔位提示 */}
        <Card className="border-dashed border-2">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">更多研究工具即將推出</p>
              <p className="text-sm">
                包括自選股分析、智能選股、投資組合優化等功能正在開發中
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
