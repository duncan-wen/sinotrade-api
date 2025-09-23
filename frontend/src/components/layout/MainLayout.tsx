'use client'

import React from 'react'
import { Navbar } from './Navbar'
import { AppSidebar } from './AppSidebar'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
// import {
//   Breadcrumb,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbList,
//   BreadcrumbPage,
//   BreadcrumbSeparator,
// } from '@/components/ui/breadcrumb'
import { ShoppingCart, TrendingUp, TrendingDown, Menu } from 'lucide-react'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar />
        <SidebarInset>
          {/* 頂部導航欄 */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            {/* 麵包屑導航 */}
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="hidden md:block">首頁</span>
              <span className="hidden md:block mx-2">/</span>
              <span className="font-medium text-foreground">交易大廳</span>
            </div>

            {/* 右側功能區 */}
            <div className="ml-auto flex items-center space-x-2">
              {/* 桌面版快速交易按鈕 */}
              <Button
                size="sm"
                className="hidden sm:flex bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-sm"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                買入
              </Button>
              <Button
                size="sm"
                className="hidden sm:flex bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-sm"
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                賣出
              </Button>

              {/* 手機版簡化按鈕 */}
              <Button
                size="sm"
                className="sm:hidden bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                className="sm:hidden bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white"
              >
                <TrendingDown className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* 主要內容區域 */}
          <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
