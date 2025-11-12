/**
 * 自選股報價頁面
 *
 * 功能：
 * 1. 輸入股票代碼查看技術分析圖表
 * 2. 我的最愛列表管理（ComboBox 選擇器，未來可用 Firebase 儲存）
 * 3. 全版面圖表顯示，支援雙視窗（圖表 + HiStock）
 * 4. 即時報價顯示
 */

'use client'
import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Star,
  StarOff,
  Search,
  Plus,
  Trash2,
  BarChart3,
  X,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useMediaQuery } from '@/hooks/use-mobile'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// 動態載入 KLineChart Pro，避免 SSR 問題
const KLineChartPro = dynamic(
  () => import('@/components/chart/KLineChartPro'),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">載入圖表中...</div>
      </div>
    ),
  }
)

// 我的最愛股票介面定義
interface FavoriteStock {
  symbol: string
  name: string
  addedAt: string
  category?: '台股' | '期貨' | '選擇權'
  tag?: '多頭' | '空頭' | '觀察'
}

// Mock 數據 - 我的最愛列表（未來將存儲在 Firebase）
const INITIAL_FAVORITES: FavoriteStock[] = [
  {
    symbol: '2330',
    name: '台積電',
    addedAt: '2024-01-15',
    category: '台股',
    tag: '多頭',
  },
  {
    symbol: '2317',
    name: '鴻海',
    addedAt: '2024-01-16',
    category: '台股',
    tag: '觀察',
  },
  {
    symbol: '2454',
    name: '聯發科',
    addedAt: '2024-01-17',
    category: '台股',
    tag: '多頭',
  },
  {
    symbol: 'TXFR1',
    name: '台指期近月',
    addedAt: '2024-01-18',
    category: '期貨',
    tag: '多頭',
  },
  {
    symbol: '2412',
    name: '中華電',
    addedAt: '2024-01-19',
    category: '台股',
    tag: '觀察',
  },
  {
    symbol: '2308',
    name: '台達電',
    addedAt: '2024-01-20',
    category: '台股',
    tag: '空頭',
  },
]

export default function WatchlistPage() {
  // 狀態管理
  const [favorites, setFavorites] = useState<FavoriteStock[]>(INITIAL_FAVORITES)
  const [currentSymbol, setCurrentSymbol] = useState('2330')
  const [currentName, setCurrentName] = useState('台積電')
  const [searchInput, setSearchInput] = useState('')
  const [interval, setInterval] = useState('5m')
  const [isLoadingSymbol, setIsLoadingSymbol] = useState(false)
  const [symbolError, setSymbolError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [showHiStockPanel, setShowHiStockPanel] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedTag, setSelectedTag] = useState<'多頭' | '空頭' | '觀察'>(
    '觀察'
  )
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // 從 localStorage 載入我的最愛（未來改為 Firebase）
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('myFavoriteStocks')
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites))
      }
    } catch (error) {
      console.error('載入我的最愛失敗:', error)
    }
  }, [])

  // 儲存我的最愛到 localStorage（未來改為 Firebase）
  const saveFavorites = (newFavorites: FavoriteStock[]) => {
    try {
      localStorage.setItem('myFavoriteStocks', JSON.stringify(newFavorites))
      setFavorites(newFavorites)
    } catch (error) {
      console.error('儲存我的最愛失敗:', error)
    }
  }

  // 檢查是否已在我的最愛中
  const isFavorite = (symbol: string) => {
    return favorites.some((fav) => fav.symbol === symbol)
  }

  // 打開加入我的最愛對話框
  const openAddToFavoritesDialog = () => {
    if (isFavorite(currentSymbol)) {
      alert('此股票已在我的最愛中')
      return
    }
    setSelectedTag('觀察')
    setShowAddDialog(true)
  }

  // 確認添加到我的最愛
  const confirmAddToFavorites = () => {
    const newFavorite: FavoriteStock = {
      symbol: currentSymbol,
      name: currentName || currentSymbol,
      addedAt: new Date().toISOString().split('T')[0],
      category:
        currentSymbol.includes('TXF') || currentSymbol.includes('MXF')
          ? '期貨'
          : '台股',
      tag: selectedTag,
    }

    const newFavorites = [...favorites, newFavorite]
    saveFavorites(newFavorites)
    setShowAddDialog(false)
  }

  // 從我的最愛移除
  const removeFromFavorites = (symbol: string) => {
    const newFavorites = favorites.filter((fav) => fav.symbol !== symbol)
    saveFavorites(newFavorites)
  }

  // 查詢股票資訊
  const searchSymbol = async () => {
    if (!searchInput.trim()) {
      setSymbolError('請輸入股票代碼')
      return
    }

    setIsLoadingSymbol(true)
    setSymbolError(null)

    try {
      // 嘗試從 API 獲取股票名稱
      const response = await fetch(`/api/contract-info/${searchInput}`)

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.contract) {
          setCurrentSymbol(searchInput)
          setCurrentName(data.contract.name || searchInput)
          setSymbolError(null)
        } else {
          // API 找不到，但仍然顯示圖表
          setCurrentSymbol(searchInput)
          setCurrentName(searchInput)
          setSymbolError(`找不到 ${searchInput} 的資訊，但仍顯示圖表`)
        }
      } else {
        // API 失敗，但仍然顯示圖表
        setCurrentSymbol(searchInput)
        setCurrentName(searchInput)
        setSymbolError('無法連接後端 API，顯示基本圖表')
      }
    } catch (error) {
      console.error('查詢股票失敗:', error)
      setCurrentSymbol(searchInput)
      setCurrentName(searchInput)
      setSymbolError('查詢失敗，顯示基本圖表')
    } finally {
      setIsLoadingSymbol(false)
    }
  }

  // 快速切換到我的最愛中的股票
  const switchToFavorite = (stock: FavoriteStock) => {
    setCurrentSymbol(stock.symbol)
    setCurrentName(stock.name)
    setSearchInput(stock.symbol)
    setSymbolError(null)
    setOpen(false)
  }

  // 處理搜尋框 Enter 鍵
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      searchSymbol()
    }
  }

  // ComboBox 我的最愛選擇器
  const FavoritesComboBox = () => {
    if (isDesktop) {
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              我的最愛 ({favorites.length})
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <FavoritesList />
          </PopoverContent>
        </Popover>
      )
    }

    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" className="justify-start gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            我的最愛 ({favorites.length})
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mt-4 border-t">
            <FavoritesList />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  // 我的最愛列表
  const FavoritesList = () => {
    return (
      <Command>
        <CommandInput placeholder="搜尋股票..." />
        <CommandList>
          <CommandEmpty>找不到股票</CommandEmpty>
          <CommandGroup heading="我的最愛">
            {favorites.map((stock) => (
              <CommandItem
                key={stock.symbol}
                value={stock.symbol}
                onSelect={() => switchToFavorite(stock)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-medium">{stock.symbol}</span>
                  <span className="text-sm text-muted-foreground">
                    {stock.name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {stock.category}
                  </Badge>
                  {stock.tag && (
                    <Badge
                      variant={
                        stock.tag === '多頭'
                          ? 'default'
                          : stock.tag === '空頭'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="text-xs gap-1"
                    >
                      {stock.tag === '多頭' && (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      {stock.tag === '空頭' && (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {stock.tag}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFromFavorites(stock.symbol)
                  }}
                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-full mx-auto px-2 py-4 space-y-4">
        {/* 頁面標題和控制區 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
              自選股報價
            </h1>
            <p className="text-muted-foreground mt-2">
              輸入股票代碼查看技術分析圖表，全版面專業分析
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="histock-panel"
                checked={showHiStockPanel}
                onCheckedChange={setShowHiStockPanel}
              />
              <Label htmlFor="histock-panel" className="cursor-pointer">
                顯示 HiStock
              </Label>
            </div>
          </div>
        </div>

        {/* 搜尋和控制列 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2 flex-wrap">
              {/* 我的最愛 ComboBox */}
              <FavoritesComboBox />

              {/* 搜尋輸入框 */}
              <div className="flex-1 flex gap-2 min-w-[300px]">
                <Input
                  placeholder="輸入股票代碼，例如: 2330、TXFR1"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="flex-1"
                />
                <Button onClick={searchSymbol} disabled={isLoadingSymbol}>
                  <Search className="h-4 w-4 mr-2" />
                  {isLoadingSymbol ? '查詢中...' : '搜尋'}
                </Button>
              </div>

              {/* 加入/移除最愛 */}
              <Button
                variant={isFavorite(currentSymbol) ? 'destructive' : 'outline'}
                onClick={() => {
                  if (isFavorite(currentSymbol)) {
                    removeFromFavorites(currentSymbol)
                  } else {
                    openAddToFavoritesDialog()
                  }
                }}
              >
                {isFavorite(currentSymbol) ? (
                  <>
                    <StarOff className="h-4 w-4 mr-2" />
                    取消最愛
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    加入最愛
                  </>
                )}
              </Button>
            </div>

            {symbolError && (
              <Alert className="mt-4">
                <AlertDescription>{symbolError}</AlertDescription>
              </Alert>
            )}

            {/* 快速搜尋 */}
            <div className="flex items-center gap-2 flex-wrap mt-4">
              <span className="text-sm text-muted-foreground">快速搜尋:</span>
              {['2330', '2317', '2454', 'TXFR1', '2412', '2308'].map((code) => (
                <Button
                  key={code}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchInput(code)
                    setTimeout(() => searchSymbol(), 100)
                  }}
                  className="h-7"
                >
                  {code}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 圖表顯示區域 - 全版面 */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="h-[800px]">
            {showHiStockPanel ? (
              // 雙視窗模式 - 顯示專業圖表 + HiStock
              <ResizablePanelGroup
                direction="horizontal"
                className="h-full w-full"
              >
                {/* 左側面板 - KLineChart Pro */}
                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className="flex flex-col h-full">
                    <div className="p-3 border-b bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          🚀 專業K線圖表
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded font-medium">
                            {currentSymbol} - {currentName}
                          </span>
                          <Badge variant="secondary">{interval}</Badge>
                        </h2>
                      </div>
                    </div>
                    <div className="flex-1 p-4 overflow-auto">
                      <KLineChartPro
                        symbol={currentSymbol}
                        symbolName={currentName}
                        interval={interval}
                        height={700}
                        enableRealtime={true}
                        mainIndicators={['MA', 'BOLL']}
                        subIndicators={['VOL', 'MACD', 'KD']}
                        onIntervalChange={setInterval}
                        className="w-full"
                      />
                    </div>
                  </div>
                </ResizablePanel>

                {/* 可拖動的分隔線 */}
                <ResizableHandle withHandle />

                {/* 右側面板 - HiStock */}
                <ResizablePanel defaultSize={50} minSize={30}>
                  <div className="flex flex-col h-full">
                    <div className="p-3 border-b bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        📈 HiStock 股市資訊
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const cleanCode = currentSymbol.replace(
                            /\.(TW|TWE)$/,
                            ''
                          )
                          const histockUrl = `https://histock.tw/stock/tchart.aspx?no=${cleanCode}`
                          window.open(
                            histockUrl,
                            '_blank',
                            'noopener,noreferrer'
                          )
                        }}
                        className="gap-1 h-7 text-xs"
                      >
                        <BarChart3 className="h-3 w-3" />
                        新視窗開啟
                      </Button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <iframe
                        src={`https://histock.tw/stock/tchart.aspx?no=${currentSymbol.replace(/\.(TW|TWE)$/, '')}`}
                        className="w-full h-full border-0"
                        title="HiStock 技術分析"
                      />
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              // 單視窗模式 - 只顯示專業圖表（全寬）
              <div className="flex flex-col h-full">
                <div className="p-3 border-b bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      🚀 專業K線圖表
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded font-medium">
                        {currentSymbol} - {currentName}
                      </span>
                      <Badge variant="secondary">{interval}</Badge>
                    </h2>
                  </div>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                  <KLineChartPro
                    symbol={currentSymbol}
                    symbolName={currentName}
                    interval={interval}
                    height={700}
                    enableRealtime={true}
                    mainIndicators={['MA', 'BOLL']}
                    subIndicators={['VOL', 'MACD', 'KD']}
                    onIntervalChange={setInterval}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 功能說明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">💡 功能說明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-foreground mb-2">
                  📊 圖表功能
                </h4>
                <ul className="space-y-1">
                  <li>• 全版面專業圖表顯示</li>
                  <li>• 支援多種技術指標（MA、BOLL、MACD、KDJ）</li>
                  <li>• 即時 WebSocket 數據更新</li>
                  <li>• 可切換時間間隔（1分、5分、15分、1小時等）</li>
                  <li>• 雙視窗模式：專業圖表 + HiStock 參考</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">
                  ⭐ 我的最愛
                </h4>
                <ul className="space-y-1">
                  <li>• 使用 ComboBox 快速選擇收藏股票</li>
                  <li>• 支援搜尋過濾功能</li>
                  <li>• 一鍵加入/移除最愛</li>
                  <li>• 本地儲存，重新整理不遺失</li>
                  <li className="pt-2 border-t">
                    <span className="font-semibold">🔮 未來規劃：</span>
                    <br />
                    使用 Firebase 雲端儲存，跨裝置同步
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 加入最愛對話框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>加入我的最愛</DialogTitle>
            <DialogDescription>
              將 <strong>{currentSymbol}</strong> ({currentName}) 加入我的最愛
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock-symbol" className="text-right">
                股票代碼
              </Label>
              <Input
                id="stock-symbol"
                value={currentSymbol}
                disabled
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock-name" className="text-right">
                股票名稱
              </Label>
              <Input
                id="stock-name"
                value={currentName}
                disabled
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock-tag" className="text-right">
                標籤
              </Label>
              <Select
                value={selectedTag}
                onValueChange={(value) =>
                  setSelectedTag(value as '多頭' | '空頭' | '觀察')
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="選擇標籤" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="多頭">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>多頭</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="空頭">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span>空頭</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="觀察">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-gray-600" />
                      <span>觀察</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={confirmAddToFavorites}>確認加入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
