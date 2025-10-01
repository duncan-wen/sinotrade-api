'use client'

import React, { useState } from 'react'
import { RankingList } from '@/components/ranking'
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
import {
  RefreshCw,
  TrendingUp,
  BarChart3,
  DollarSign,
  Volume2,
  Activity,
} from 'lucide-react'

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
  const baseOptions = [
    { value: 'desc' as SortingMode, label: '由大到小' },
    { value: 'asc' as SortingMode, label: '由小到大' },
  ]

  switch (scannerType) {
    case 'ChangePercentRank':
      return [
        { value: 'gain_desc' as SortingMode, label: '漲幅：大→小 (10%→1%)' },
        { value: 'gain_asc' as SortingMode, label: '漲幅：小→大 (1%→10%)' },
        { value: 'loss_desc' as SortingMode, label: '跌幅：大→小 (-10%→-1%)' },
        { value: 'loss_asc' as SortingMode, label: '跌幅：小→大 (-1%→-10%)' },
        ...baseOptions,
      ]

    case 'ChangePriceRank':
      return [
        { value: 'gain_desc' as SortingMode, label: '漲幅：大→小' },
        { value: 'gain_asc' as SortingMode, label: '漲幅：小→大' },
        { value: 'loss_desc' as SortingMode, label: '跌幅：大→小' },
        { value: 'loss_asc' as SortingMode, label: '跌幅：小→大' },
        { value: 'price_high_low' as SortingMode, label: '價格：高→低' },
        { value: 'price_low_high' as SortingMode, label: '價格：低→高' },
      ]

    case 'DayRangeRank':
      return [
        { value: 'value_high_low' as SortingMode, label: '高低價差：大→小' },
        { value: 'value_low_high' as SortingMode, label: '高低價差：小→大' },
        ...baseOptions,
      ]

    case 'VolumeRank':
      return [
        { value: 'value_high_low' as SortingMode, label: '成交量：大→小' },
        { value: 'value_low_high' as SortingMode, label: '成交量：小→大' },
        ...baseOptions,
      ]

    case 'AmountRank':
      return [
        { value: 'value_high_low' as SortingMode, label: '成交金額：大→小' },
        { value: 'value_low_high' as SortingMode, label: '成交金額：小→大' },
        ...baseOptions,
      ]

    default:
      return baseOptions
  }
}

/**
 * 排行榜頁面
 */
export default function RankingPage() {
  const [selectedScannerType, setSelectedScannerType] =
    useState<ScannerType>('ChangePercentRank')
  const [displayCount, setDisplayCount] = useState(50)
  const [sortingMode, setSortingMode] = useState<SortingMode>('gain_desc')

  // 獲取排行類型選項
  const { types: scannerTypes, isLoading: typesLoading } = useScannerTypes()

  // 獲取排行數據
  const { data, isLoading, error, lastUpdated, refresh, isRefreshing } =
    useRankingData({
      scannerType: selectedScannerType,
      sortingMode,
      count: displayCount,
      refreshInterval: 30000, // 30秒自動刷新
    })

  // 當掃描器類型改變時，自動設置為該類型的預設排序模式
  const handleScannerTypeChange = (newScannerType: ScannerType) => {
    setSelectedScannerType(newScannerType)
    const options = getSortingOptions(newScannerType)
    if (options.length > 0) {
      setSortingMode(options[0].value)
    }
  }

  /**
   * 處理股票項目點擊
   */
  const handleItemClick = (item: ScannerData, index: number) => {
    console.log('點擊股票:', item.name, item.code)
    // 這裡可以導航到股票詳情頁面
    // router.push(`/trading/${item.code}`)
  }

  const IconComponent = getScannerIcon(selectedScannerType)

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

        {/* 最後更新時間和刷新按鈕 */}
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="text-sm text-muted-foreground">
              最後更新: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                onValueChange={(value) => setSortingMode(value as SortingMode)}
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

            {/* 顯示數量 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">顯示數量</label>
              <Select
                value={displayCount.toString()}
                onValueChange={(value) => setDisplayCount(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">前 20 名</SelectItem>
                  <SelectItem value="50">前 50 名</SelectItem>
                  <SelectItem value="100">前 100 名</SelectItem>
                  <SelectItem value="200">前 200 名</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 狀態指示 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">狀態</label>
              <div className="flex flex-wrap gap-2">
                {isLoading && <Badge variant="secondary">載入中</Badge>}
                {error && <Badge variant="destructive">錯誤</Badge>}
                {!isLoading && !error && data.length > 0 && (
                  <Badge variant="default">{data.length} 檔股票</Badge>
                )}
                {isRefreshing && <Badge variant="outline">更新中</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 排行榜內容 */}
      <RankingList
        data={data}
        scannerType={selectedScannerType}
        isLoading={isLoading}
        error={error}
        clickable
        onItemClick={handleItemClick}
        className="shadow-sm"
      />

      {/* 說明信息 */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <h4 className="font-medium text-foreground">說明:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>數據每30秒自動更新一次</li>
              <li>點擊股票項目可查看詳細信息</li>
              <li>漲跌幅以前一交易日收盤價為基準計算</li>
              <li>成交量和成交金額為當日累計數據</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
