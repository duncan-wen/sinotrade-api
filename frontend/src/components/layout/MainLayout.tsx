'use client'
import React, { useState } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      {/* 頂部導航欄 - 固定在頂部 */}
      <Navbar />

      {/* 主要內容區域 - 留出頂部空間 */}
      <div className="flex-1 flex flex-row relative pt-16">
        {/* 側邊欄 */}
        <Sidebar isOpen={sidebarOpen} />

        {/* 手機版覆蓋層 */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 主要內容 */}
        <div className="flex-1 flex flex-col lg:relative">
          {/* 內容工具欄 */}
          <div className="bg-background/80 backdrop-blur-md border-b border-border/50 px-3 lg:px-6 py-3 flex items-center justify-between shadow-sm">
            {/* 側邊欄切換按鈕 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-2 lg:mr-4 hover:bg-primary/10"
            >
              {sidebarOpen ? '👈' : '👉'}
            </Button>

            {/* 麵包屑導航 */}
            <div className="flex items-center flex-1">
              <span className="text-xs lg:text-sm text-muted-foreground hidden sm:block">
                首頁
              </span>
              <span className="text-xs lg:text-sm text-muted-foreground mx-1 lg:mx-2 hidden sm:block">
                /
              </span>
              <span className="text-xs lg:text-sm text-foreground font-medium">
                交易大廳
              </span>
            </div>

            {/* 右側快速操作 */}
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                className="hidden sm:flex bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
              >
                🟢 買入
              </Button>
              <Button
                size="sm"
                className="hidden sm:flex bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md"
              >
                🔴 賣出
              </Button>
              {/* 手機版簡化按鈕 */}
              <Button
                size="sm"
                className="sm:hidden bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                🟢
              </Button>
              <Button
                size="sm"
                className="sm:hidden bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white"
              >
                🔴
              </Button>
            </div>
          </div>

          {/* 滾動內容區域 */}
          <div className="flex-1 overflow-auto">
            <div className="w-full min-h-full">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
