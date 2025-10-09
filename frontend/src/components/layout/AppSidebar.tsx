'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Calendar,
  Home,
  Search,
  Settings,
  BarChart3,
  Wallet,
  TrendingUp,
  Zap,
  Globe,
  FileText,
  DollarSign,
  History,
  PieChart,
  Target,
  Bell,
  User,
  LogOut,
  ChevronUp,
  CandlestickChart,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// 主要導航項目
const data = {
  user: {
    name: 'Katy Li',
    email: 'katy0408@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
    {
      title: '主要功能',
      items: [
        {
          title: '首頁',
          url: '/',
          icon: Home,
          isActive: true,
        },
        {
          title: '台指期',
          url: '/test-klinechart-pro',
          icon: CandlestickChart,
        },
        {
          title: '美股專區',
          url: '/us-stocks',
          icon: Globe,
        },
        {
          title: '投資組合',
          url: '/portfolio',
          icon: PieChart,
        },
        {
          title: '市場數據',
          url: '/market-data',
          icon: BarChart3,
        },
        {
          title: '研究分析',
          url: '/research',
          icon: FileText,
        },
      ],
    },
    {
      title: '交易功能',
      items: [
        {
          title: '快速下單',
          url: '/quick-trade',
          icon: Zap,
        },
        {
          title: '交易記錄',
          url: '/history',
          icon: History,
        },
        {
          title: '資金管理',
          url: '/funds',
          icon: DollarSign,
        },
        {
          title: '排行榜',
          url: '/ranking',
          icon: TrendingUp,
        },
      ],
    },
  ],
  watchlist: [
    {
      symbol: 'TSLA',
      name: '特斯拉',
      price: '$248.50',
      change: '+2.3%',
      up: true,
    },
    {
      symbol: 'AAPL',
      name: '蘋果',
      price: '$192.80',
      change: '-0.8%',
      up: false,
    },
    {
      symbol: 'NVDA',
      name: '輝達',
      price: '$721.33',
      change: '+4.1%',
      up: true,
    },
    {
      symbol: '2330.TW',
      name: '台積電',
      price: 'NT$598',
      change: '+1.2%',
      up: true,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BarChart3 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">DKTrade</span>
                  <span className="truncate text-xs">投資交易平台</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* 監控清單 */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>
            <div className="flex items-center justify-between">
              <span>監控清單</span>
              <Badge variant="secondary" className="ml-auto">
                {data.watchlist.length}
              </Badge>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2">
              {data.watchlist.map((stock) => (
                <Card
                  key={stock.symbol}
                  className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {stock.symbol}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {stock.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-semibold">
                            {stock.price}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              stock.up
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {stock.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 快速功能 */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>快速功能</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/notifications">
                    <Bell />
                    <span>通知中心</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/search">
                    <Search />
                    <span>搜尋股票</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/settings">
                    <Settings />
                    <span>設定</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/profile">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={data.user.avatar} alt={data.user.name} />
                  <AvatarFallback className="rounded-lg">KL</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {data.user.name}
                  </span>
                  <span className="truncate text-xs">{data.user.email}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
