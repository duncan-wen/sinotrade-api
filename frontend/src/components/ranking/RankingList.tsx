'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ScannerData, ScannerType } from '@/types/api'
import { RankingCard } from './RankingCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RankingListProps {
  /** 排行榜數據 */
  data: ScannerData[]
  /** 排行榜類型 */
  scannerType: ScannerType
  /** 標題 */
  title?: string
  /** 是否顯示排名編號 */
  showRank?: boolean
  /** 顯示的項目數量 */
  displayCount?: number
  /** 自定義樣式 */
  className?: string
  /** 載入狀態 */
  isLoading?: boolean
  /** 錯誤狀態 */
  error?: string | null
  /** 點擊項目的回調 */
  onItemClick?: (item: ScannerData, index: number) => void
  /** 是否可點擊 */
  clickable?: boolean
}

/**
 * 獲取排行榜類型的中文標題
 */
const getScannerTypeTitle = (scannerType: ScannerType): string => {
  const titleMap: Record<ScannerType, string> = {
    ChangePercentRank: '漲跌幅排行',
    ChangePriceRank: '漲跌排行',
    DayRangeRank: '高低價差排行',
    VolumeRank: '成交量排行',
    AmountRank: '成交金額排行',
  }
  return titleMap[scannerType] || '排行榜'
}

/**
 * 獲取排行榜類型的主要顯示欄位
 */
const getScannerTypePrimaryField = (
  scannerType: ScannerType
): keyof ScannerData => {
  const fieldMap: Record<ScannerType, keyof ScannerData> = {
    ChangePercentRank: 'change_price',
    ChangePriceRank: 'change_price',
    DayRangeRank: 'price_range',
    VolumeRank: 'total_volume',
    AmountRank: 'total_amount',
  }
  return fieldMap[scannerType] || 'change_price'
}

export const RankingList: React.FC<RankingListProps> = ({
  data,
  scannerType,
  title,
  showRank = true,
  displayCount,
  className,
  isLoading = false,
  error = null,
  onItemClick,
  clickable = false,
}) => {
  // 處理顯示數據
  const displayData = displayCount ? data.slice(0, displayCount) : data
  const listTitle = title || getScannerTypeTitle(scannerType)
  const primaryField = getScannerTypePrimaryField(scannerType)

  // 載入狀態
  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{listTitle}</span>
            <Badge variant="outline">載入中...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: displayCount || 10 }).map((_, index) => (
              <div
                key={index}
                className="h-16 bg-muted/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{listTitle}</span>
            <Badge variant="destructive">錯誤</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>載入失敗: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 空數據狀態
  if (!data || data.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{listTitle}</span>
            <Badge variant="outline">無數據</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>暫無排行數據</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{listTitle}</span>
          <Badge variant="outline">{displayData.length} 檔股票</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayData.map((item, index) => (
            <RankingCard
              key={`${item.code}-${index}`}
              data={item}
              rank={showRank ? index + 1 : undefined}
              scannerType={scannerType}
              primaryField={primaryField}
              onClick={clickable ? () => onItemClick?.(item, index) : undefined}
              className={
                clickable
                  ? 'cursor-pointer hover:bg-muted/50 transition-colors'
                  : ''
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
