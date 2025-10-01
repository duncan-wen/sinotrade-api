'use client'

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ScannerData, ScannerType } from '@/types/api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RankingTableProps {
  /** 排行榜數據 */
  data: ScannerData[]
  /** 排行榜類型 */
  scannerType: ScannerType
  /** 標題 */
  title?: string
  /** 自定義樣式 */
  className?: string
  /** 載入狀態 */
  isLoading?: boolean
  /** 錯誤狀態 */
  error?: string | null
  /** 點擊行的回調 */
  onRowClick?: (item: ScannerData, index: number) => void
  /** 是否可點擊 */
  clickable?: boolean
  /** 起始索引（用於分頁顯示正確的排名） */
  startIndex?: number
}

type SortKey =
  | 'close'
  | 'change_price'
  | 'change_percent'
  | 'price_range'
  | 'volume_ratio'
  | 'total_volume'
  | 'total_amount'
type SortDirection = 'asc' | 'desc' | null

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
 * 格式化數字顯示
 */
const formatNumber = (num: number, decimals: number = 2): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(decimals)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(decimals)}K`
  }
  return num.toFixed(decimals)
}

/**
 * 格式化金額
 */
const formatAmount = (num: number): string => {
  if (num >= 100000000) {
    return `${(num / 100000000).toFixed(2)}億`
  } else if (num >= 10000) {
    return `${(num / 10000).toFixed(2)}萬`
  }
  return num.toLocaleString()
}

/**
 * 計算漲跌百分比
 */
const calculateChangePercent = (item: ScannerData): number => {
  if (item.change_percent !== undefined) {
    return item.change_percent
  }
  const prevClose = item.close - item.change_price
  if (prevClose === 0) return 0
  return (item.change_price / prevClose) * 100
}

export const RankingTable: React.FC<RankingTableProps> = ({
  data,
  scannerType,
  title,
  className,
  isLoading = false,
  error = null,
  onRowClick,
  clickable = false,
  startIndex = 0,
}) => {
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const listTitle = title || getScannerTypeTitle(scannerType)

  /**
   * 處理排序
   */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // 同一欄位：null -> desc -> asc -> null
      if (sortDirection === null) {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection('asc')
      } else {
        setSortKey(null)
        setSortDirection(null)
      }
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  /**
   * 排序後的數據
   */
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data

    return [...data].sort((a, b) => {
      let aValue: number
      let bValue: number

      switch (sortKey) {
        case 'change_percent':
          aValue = calculateChangePercent(a)
          bValue = calculateChangePercent(b)
          break
        default:
          aValue = a[sortKey]
          bValue = b[sortKey]
      }

      if (sortDirection === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }, [data, sortKey, sortDirection])

  /**
   * 排序圖標
   */
  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="ml-2 h-4 w-4 text-primary" />
    }
    return <ArrowUp className="ml-2 h-4 w-4 text-primary" />
  }

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
            {Array.from({ length: 10 }).map((_, index) => (
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
          <div className="text-center py-8 text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  // 空數據
  if (data.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>{listTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">暫無數據</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{listTitle}</span>
          <Badge variant="outline">{sortedData.length} 檔股票</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative max-h-[600px] overflow-y-auto overflow-x-auto">
          <Table className="relative">
            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm border-b-2">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[60px] bg-background border-b-2">
                  #
                </TableHead>
                <TableHead className="min-w-[80px] bg-background border-b-2">
                  代號
                </TableHead>
                <TableHead className="min-w-[100px] bg-background border-b-2">
                  名稱
                </TableHead>
                <TableHead className="min-w-[100px] bg-background border-b-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent font-medium"
                    onClick={() => handleSort('close')}
                  >
                    收盤
                    <SortIcon columnKey="close" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[100px] bg-background border-b-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent font-medium"
                    onClick={() => handleSort('change_price')}
                  >
                    漲跌
                    <SortIcon columnKey="change_price" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px] bg-background border-b-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent font-medium"
                    onClick={() => handleSort('change_percent')}
                  >
                    漲跌幅
                    <SortIcon columnKey="change_percent" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[100px] bg-background border-b-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent font-medium"
                    onClick={() => handleSort('price_range')}
                  >
                    價格區間
                    <SortIcon columnKey="price_range" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[100px] bg-background border-b-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent font-medium"
                    onClick={() => handleSort('total_volume')}
                  >
                    總量
                    <SortIcon columnKey="total_volume" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[100px] bg-background border-b-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent font-medium"
                    onClick={() => handleSort('volume_ratio')}
                  >
                    量比
                    <SortIcon columnKey="volume_ratio" />
                  </Button>
                </TableHead>
                <TableHead className="min-w-[120px] bg-background border-b-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent font-medium"
                    onClick={() => handleSort('total_amount')}
                  >
                    總金額
                    <SortIcon columnKey="total_amount" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => {
                const changePercent = calculateChangePercent(item)
                const isPositive = changePercent > 0
                const isNegative = changePercent < 0

                return (
                  <TableRow
                    key={`${item.code}-${index}`}
                    className={cn(
                      clickable && 'cursor-pointer hover:bg-muted/50',
                      'transition-colors'
                    )}
                    onClick={() => clickable && onRowClick?.(item, index)}
                  >
                    <TableCell className="font-medium text-muted-foreground">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {item.code}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono">
                      {item.close.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'font-mono font-medium',
                          isPositive && 'text-red-500',
                          isNegative && 'text-green-500',
                          !isPositive && !isNegative && 'text-muted-foreground'
                        )}
                      >
                        {isPositive && '+'}
                        {item.change_price.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isPositive && (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        )}
                        {isNegative && (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                        <span
                          className={cn(
                            'font-mono font-medium',
                            isPositive && 'text-red-500',
                            isNegative && 'text-green-500',
                            !isPositive &&
                              !isNegative &&
                              'text-muted-foreground'
                          )}
                        >
                          {isPositive && '+'}
                          {changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {item.price_range.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatNumber(item.total_volume, 0)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.volume_ratio > 1.5
                            ? 'destructive'
                            : item.volume_ratio > 1
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {item.volume_ratio.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatAmount(item.total_amount)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
