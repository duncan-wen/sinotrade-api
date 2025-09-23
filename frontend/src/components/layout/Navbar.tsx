'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { TrendingUp, BarChart3, PieChart, FileText } from 'lucide-react'

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 導航項目配置
  const navItems = [
    {
      href: '/',
      label: '市場總覽',
      icon: BarChart3,
    },
    {
      href: '/ranking',
      label: '排行榜',
      icon: TrendingUp,
    },
    {
      href: '/portfolio',
      label: '投資組合',
      icon: PieChart,
    },
    {
      href: '/reports',
      label: '研究報告',
      icon: FileText,
    },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-3 flex items-center justify-between transition-all duration-300 ${
        isScrolled
          ? 'bg-background/95 backdrop-blur-lg border-b border-border/70 shadow-lg'
          : 'bg-background/80 backdrop-blur-md border-b border-border/30 shadow-md'
      }`}
    >
      {/* Logo 區域 */}
      <div className="flex items-center">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <span className="text-xl">📈</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            SinoTrade
          </h1>
        </div>
      </div>

      {/* 中間導航 */}
      <div className="hidden md:flex items-center space-x-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={`flex items-center gap-2 px-4 py-2 transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </div>

      {/* 右側用戶區域 */}
      <div className="flex items-center space-x-4">
        {/* 主題切換 */}
        <ThemeToggle />

        {/* 通知 */}
        <Button variant="outline" size="sm" className="rounded-full p-2">
          🔔
        </Button>

        {/* 用戶資料 */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80"
                alt="User"
              />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <Badge className="absolute -top-1 -right-1 h-3 w-3 p-0 bg-green-500"></Badge>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground">用戶名稱</p>
            <p className="text-xs text-muted-foreground">可用資金: $50,000</p>
          </div>
        </div>
      </div>
    </nav>
  )
}
