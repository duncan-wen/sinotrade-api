'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  isOpen?: boolean
}

export function Sidebar({ isOpen = true }: SidebarProps) {
  const router = useRouter()

  const menuItems = [
    { icon: '🏠', label: '首頁', active: true, path: '/' },
    { icon: '🇺🇸', label: '美股專區', active: false, path: '/us-stocks' },
    { icon: '📊', label: '交易', active: false, path: '/trading' },
    { icon: '💼', label: '投資組合', active: false, path: '/portfolio' },
    { icon: '📈', label: '市場數據', active: false, path: '/market-data' },
    { icon: '🔍', label: '研究分析', active: false, path: '/research' },
    { icon: '⚡', label: '快速下單', active: false, path: '/quick-trade' },
    { icon: '📋', label: '交易記錄', active: false, path: '/history' },
    { icon: '💰', label: '資金管理', active: false, path: '/funds' },
  ]

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const watchlist = [
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
      price: 'NT$566',
      change: '+1.2%',
      up: true,
    },
  ]

  return (
    <aside
      className={`bg-gradient-to-b from-card/80 to-card/60 backdrop-blur-md border-r border-border/50 h-full transition-all duration-300 shadow-lg ${
        isOpen
          ? 'w-80 lg:relative lg:translate-x-0 absolute z-40 lg:z-auto'
          : 'w-20 hidden lg:block'
      }`}
    >
      {/* 主選單 */}
      <div className="p-4">
        <h2
          className={`text-lg font-semibold text-foreground mb-4 ${!isOpen && 'hidden'}`}
        >
          主要功能
        </h2>

        <div className="space-y-2">
          {menuItems.map((item, index) => (
            <Button
              key={index}
              variant={item.active ? 'default' : 'ghost'}
              className={`w-full justify-start ${
                item.active
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'hover:bg-muted'
              }`}
              onClick={() => handleNavigation(item.path)}
            >
              <div className="flex items-center">
                <span className="text-lg mr-3">{item.icon}</span>
                {isOpen && (
                  <span className={item.active ? 'font-medium' : ''}>
                    {item.label}
                  </span>
                )}
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* 分隔線 */}
      {isOpen && <div className="h-px bg-border mx-4 my-4" />}

      {/* 監控清單 */}
      {isOpen && (
        <div className="p-4 flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            監控清單
          </h3>

          <div className="space-y-3">
            {watchlist.map((stock, index) => (
              <Card
                key={index}
                className="p-3 cursor-pointer hover:shadow-md transition-shadow duration-300"
                onClick={() => {
                  if (['TSLA', 'AAPL', 'NVDA'].includes(stock.symbol)) {
                    handleNavigation('/us-stocks')
                  } else {
                    // 台股處理邏輯(暫時沒有專頁)
                    console.log('點擊台股:', stock.symbol)
                  }
                }}
              >
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold text-foreground text-sm">
                        {stock.symbol}
                      </span>
                      {['TSLA', 'AAPL', 'NVDA'].includes(stock.symbol) && (
                        <span className="text-xs">🇺🇸</span>
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        stock.up ? 'text-red-600' : 'text-green-600' // 台股慣例:紅漲綠跌
                      }`}
                    >
                      {stock.change}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {stock.name}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {stock.price}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 新增按鈕 */}
          <Button variant="outline" className="w-full mt-4 border-dashed">
            + 新增股票
          </Button>
        </div>
      )}

      {/* 底部設定 */}
      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full">
          <div className="flex items-center">
            <span className="text-lg mr-3">⚙️</span>
            {isOpen && <span>設定</span>}
          </div>
        </Button>
      </div>
    </aside>
  )
}
