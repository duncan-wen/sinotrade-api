'use client'

import React, { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ForexAnalysis } from '@/components/research/ForexAnalysis'
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
  BookOpen,
  DollarSign,
  BarChart3,
} from 'lucide-react'

type Tab = 'overview' | 'forex'

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">研究分析</h1>
            <p className="text-muted-foreground">
              專業市場研究報告與投資分析工具
            </p>
          </div>
        </div>

        {/* Tab 導航 */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              研究總覽
            </div>
          </button>
          <button
            onClick={() => setActiveTab('forex')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'forex'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              匯率大盤分析
              <Badge variant="secondary" className="text-xs">
                新
              </Badge>
            </div>
          </button>
        </div>

        {/* ── 研究總覽 Tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 功能卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card
                className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200"
                onClick={() => setActiveTab('forex')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                    <Badge>新功能</Badge>
                  </div>
                  <CardTitle className="mt-4">匯率大盤分析</CardTitle>
                  <CardDescription>
                    分析 USD/TWD 匯率與台灣加權指數的連動關係與策略回測
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setActiveTab('forex')}
                  >
                    開始分析
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-60">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <TrendingUp className="h-8 w-8 text-emerald-600" />
                    <Badge variant="outline">開發中</Badge>
                  </div>
                  <CardTitle className="mt-4">技術分析</CardTitle>
                  <CardDescription>
                    K線圖表分析、技術指標解讀與趨勢預測
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled>
                    即將推出
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-60">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                    <Badge variant="outline">開發中</Badge>
                  </div>
                  <CardTitle className="mt-4">產業輪動分析</CardTitle>
                  <CardDescription>
                    各產業板塊資金流向、強弱比較與輪動策略
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled>
                    即將推出
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
          </div>
        )}

        {/* ── 匯率大盤分析 Tab ── */}
        {activeTab === 'forex' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">匯率與大盤連動分析系統</h2>
              <Badge variant="secondary">Beta</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              分析 <strong>台幣升貶 (USD/TWD)</strong> 與{' '}
              <strong>台灣加權指數 (^TWII)</strong>{' '}
              的相關性，並回測「台幣升值即買入」策略
            </p>
            <ForexAnalysis />
          </div>
        )}
      </div>
    </MainLayout>
  )
}
