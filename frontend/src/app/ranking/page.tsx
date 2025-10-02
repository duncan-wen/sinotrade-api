'use client'

import React, { useState } from 'react'
import { RankingTable } from '@/components/ranking'
import { useRankingData, useScannerTypes } from '@/hooks/useRankingData'
import { ScannerType, ScannerData, SortingMode } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  RefreshCw,
  TrendingUp,
  BarChart3,
  DollarSign,
  Volume2,
  Activity,
  X,
} from 'lucide-react'
import KLineChartPro from '@/components/chart/KLineChartPro'

/**
 * 排行榜圖標映射
 */
const getScannerIcon = (scannerType: ScannerType) => {
  const iconMap = {
    ChangePercentRank: TrendingUp,
    ChangePriceRank: Activity,
    DayRangeRank: BarChart3,
    VolumeRank: Volume2,
    AmountRank: DollarSign,
  }
  return iconMap[scannerType] || TrendingUp
}

/**
 * 排序模式選項映射
 */
const getSortingOptions = (scannerType: ScannerType) => {
  switch (scannerType) {
    case 'ChangePercentRank':
      return [
        { value: 'gain_asc' as SortingMode, label: '漲幅：小→大 (1%→10%)' },
        { value: 'gain_desc' as SortingMode, label: '漲幅：大→小 (10%→1%)' },
        { value: 'loss_asc' as SortingMode, label: '跌幅：小→大 (-1%→-10%)' },
        { value: 'loss_desc' as SortingMode, label: '跌幅：大→小 (-10%→-1%)' },
      ]

    case 'ChangePriceRank':
      return [
        { value: 'gain_desc' as SortingMode, label: '漲點：大→小' },
        { value: 'gain_asc' as SortingMode, label: '漲點：小→大' },
        { value: 'loss_desc' as SortingMode, label: '跌點：大→小' },
        { value: 'loss_asc' as SortingMode, label: '跌點：小→大' },
        { value: 'price_high_low' as SortingMode, label: '漲點：高→低' },
        { value: 'price_low_high' as SortingMode, label: '跌點：低→高' },
      ]

    case 'DayRangeRank':
      return [
        { value: 'value_high_low' as SortingMode, label: '高低價差：大→小' },
        { value: 'value_low_high' as SortingMode, label: '高低價差：小→大' },
      ]

    case 'VolumeRank':
      return [
        {
          value: 'value_high_low' as SortingMode,
          label: '成交量：使用圖表排序',
        },
        // { value: 'value_low_high' as SortingMode, label: '成交量：小→大' },
      ]

    case 'AmountRank':
      return [
        {
          value: 'value_high_low' as SortingMode,
          label: '成交金額：使用圖表排序',
        },
        // { value: 'value_low_high' as SortingMode, label: '成交金額：小→大' },
      ]

    default:
      return [
        { value: 'gain_desc' as SortingMode, label: '由大到小' },
        { value: 'gain_asc' as SortingMode, label: '由小到大' },
      ]
  }
}

/**
 * 排行榜頁面
 */
export default function RankingPage() {
  const [selectedScannerType, setSelectedScannerType] =
    useState<ScannerType>('ChangePercentRank')
  const [sortingMode, setSortingMode] = useState<SortingMode>('gain_asc')

  // 自動更新控制
  const [autoRefresh, setAutoRefresh] = useState(false)

  // 量比篩選控制
  const [filterVolumeRatio, setFilterVolumeRatio] = useState(true)

  // 分頁控制
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 35 // 每頁顯示 35 筆

  // K線圖 Dialog 狀態
  const [isChartDialogOpen, setIsChartDialogOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState<ScannerData | null>(null)

  // 獲取排行類型選項
  const { types: scannerTypes, isLoading: typesLoading } = useScannerTypes()

  // 獲取排行數據（抓取所有 200 筆）
  const { data, isLoading, error, lastUpdated, refresh, isRefreshing } =
    useRankingData({
      scannerType: selectedScannerType,
      sortingMode,
      count: 200, // 抓取所有數據
      refreshInterval: autoRefresh ? 30000 : 0, // 根據 toggle 決定是否自動刷新
    })

  // 根據量比篩選條件過濾數據
  const filteredData = filterVolumeRatio
    ? data.filter((item) => item.volume_ratio > 1.5)
    : data

  // 計算分頁數據
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)

  // 當掃描器類型改變時，自動設置為該類型的預設排序模式並重置頁碼
  const handleScannerTypeChange = (newScannerType: ScannerType) => {
    setSelectedScannerType(newScannerType)
    setCurrentPage(1) // 重置到第一頁
    const options = getSortingOptions(newScannerType)
    if (options.length > 0) {
      setSortingMode(options[0].value)
    }
  }

  // 當排序模式改變時，重置頁碼
  const handleSortingModeChange = (newSortingMode: SortingMode) => {
    setSortingMode(newSortingMode)
    setCurrentPage(1) // 重置到第一頁
  }

  /**
   * 處理股票項目點擊 - 打開 K線圖 Dialog
   */
  const handleItemClick = (item: ScannerData, index: number) => {
    console.log('點擊股票:', item.name, item.code)
    setSelectedStock(item)
    setIsChartDialogOpen(true)
  }

  const IconComponent = getScannerIcon(selectedScannerType)

  // Pagination 組件（可重用）
  const PaginationComponent = () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className={
              currentPage === 1
                ? 'pointer-events-none opacity-50'
                : 'cursor-pointer'
            }
          />
        </PaginationItem>

        {/* 第一頁 */}
        {currentPage > 2 && (
          <>
            <PaginationItem>
              <PaginationLink
                onClick={() => setCurrentPage(1)}
                className="cursor-pointer"
              >
                1
              </PaginationLink>
            </PaginationItem>
            {currentPage > 3 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
          </>
        )}

        {/* 前一頁 */}
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationLink
              onClick={() => setCurrentPage(currentPage - 1)}
              className="cursor-pointer"
            >
              {currentPage - 1}
            </PaginationLink>
          </PaginationItem>
        )}

        {/* 當前頁 */}
        <PaginationItem>
          <PaginationLink isActive className="cursor-default">
            {currentPage}
          </PaginationLink>
        </PaginationItem>

        {/* 後一頁 */}
        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationLink
              onClick={() => setCurrentPage(currentPage + 1)}
              className="cursor-pointer"
            >
              {currentPage + 1}
            </PaginationLink>
          </PaginationItem>
        )}

        {/* 最後一頁 */}
        {currentPage < totalPages - 1 && (
          <>
            {currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationLink
                onClick={() => setCurrentPage(totalPages)}
                className="cursor-pointer"
              >
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}

        <PaginationItem>
          <PaginationNext
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            className={
              currentPage === totalPages
                ? 'pointer-events-none opacity-50'
                : 'cursor-pointer'
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">台股排行榜</h1>
            <p className="text-muted-foreground">即時台股市場排行數據</p>
          </div>
        </div>

        {/* 最後更新時間和控制按鈕 */}
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="text-sm text-muted-foreground">
              最後更新: {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {/* 自動更新 Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="cursor-pointer">
              自動更新
            </Label>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            刷新
          </Button>
        </div>
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            排行設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 排行類型選擇 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">排行類型</label>
              <Select
                value={selectedScannerType}
                onValueChange={(value) =>
                  handleScannerTypeChange(value as ScannerType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇排行類型" />
                </SelectTrigger>
                <SelectContent>
                  {scannerTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {React.createElement(getScannerIcon(type.value), {
                          className: 'h-4 w-4',
                        })}
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 詳細排序方式 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">排序方式</label>
              <Select
                value={sortingMode}
                onValueChange={(value) =>
                  handleSortingModeChange(value as SortingMode)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSortingOptions(selectedScannerType).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 分頁信息 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">分頁信息</label>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground">
                  第 {currentPage} / {totalPages} 頁
                </div>
                <div className="text-sm text-muted-foreground">
                  顯示 {startIndex + 1}-
                  {Math.min(endIndex, filteredData.length)} / 共{' '}
                  {filteredData.length} 筆
                </div>
              </div>
            </div>

            {/* 量比篩選 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">特別篩選</label>
              <div className="flex items-center space-x-2 pt-1">
                <Switch
                  id="volume-ratio-filter"
                  checked={filterVolumeRatio}
                  onCheckedChange={(checked) => {
                    setFilterVolumeRatio(checked)
                    setCurrentPage(1) // 重置到第一頁
                  }}
                />
                <Label htmlFor="volume-ratio-filter" className="cursor-pointer">
                  量比 &gt; 1.5
                </Label>
              </div>
            </div>

            {/* 狀態指示 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">狀態</label>
              <div className="flex flex-wrap gap-2">
                {isLoading && <Badge variant="secondary">載入中</Badge>}
                {error && <Badge variant="destructive">錯誤</Badge>}
                {!isLoading && !error && (
                  <>
                    <Badge variant="default">
                      {filteredData.length} / {data.length} 檔
                    </Badge>
                    {filterVolumeRatio && (
                      <Badge variant="outline">篩選中</Badge>
                    )}
                  </>
                )}
                {isRefreshing && <Badge variant="outline">更新中</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分頁控制器（上方） */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex justify-center">
          <PaginationComponent />
        </div>
      )}

      {/* 排行榜內容 - 使用可排序表格 */}
      <RankingTable
        data={paginatedData}
        scannerType={selectedScannerType}
        isLoading={isLoading}
        error={error}
        clickable
        onRowClick={handleItemClick}
        startIndex={startIndex}
        className="shadow-sm"
      />

      {/* 分頁控制器（下方） */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex justify-center">
          <PaginationComponent />
        </div>
      )}

      {/* 說明信息 */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <h4 className="font-medium text-foreground">說明:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>每次抓取 200 筆數據，每頁顯示 35 筆</li>
              <li>表格可垂直滾動，表頭固定方便查看</li>
              <li>可開啟/關閉自動更新（預設每30秒刷新一次）</li>
              <li>可開啟量比篩選，只顯示量比 &gt; 1.5 的股票</li>
              <li>點擊股票項目可查看 K線圖</li>
              <li>漲跌幅以前一交易日收盤價為基準計算</li>
              <li>成交量和成交金額為當日累計數據</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* K線圖 Modal */}
      {isChartDialogOpen && selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-[95vw] h-[90vh] bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">
                {selectedStock.code} {selectedStock.name} - K線圖
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChartDialogOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 h-[calc(100%-60px)]">
              <KLineChartPro
                symbol={selectedStock.code}
                symbolName={selectedStock.name}
                interval="5m"
                height={700}
                enableRealtime={true}
                mainIndicators={['MA', 'BOLL']}
                subIndicators={['MACD', 'KD']}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
