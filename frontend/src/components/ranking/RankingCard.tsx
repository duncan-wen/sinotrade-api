'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ScannerData, ScannerType } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { VolumeRatioChart } from './VolumeRatioChart'

interface RankingCardProps {
  /** 排行數據 */
  data: ScannerData
  /** 排名 (可選) */
  rank?: number
  /** 排行類型 */
  scannerType: ScannerType
  /** 主要顯示欄位 */
  primaryField: keyof ScannerData
  /** 點擊回調 */
  onClick?: () => void
  /** 自定義樣式 */
  className?: string
}

/**
 * 格式化數字顯示
 */
const formatNumber = (
  value: number,
  type: 'currency' | 'volume' | 'percent' | 'number' = 'number'
): string => {
  switch (type) {
    case 'currency':
      if (value >= 1e8) {
        return `${(value / 1e8).toFixed(1)}億`
      }
      if (value >= 1e4) {
        return `${(value / 1e4).toFixed(1)}萬`
      }
      return value.toLocaleString()

    case 'volume':
      if (value >= 1e8) {
        return `${(value / 1e8).toFixed(1)}億`
      }
      if (value >= 1e4) {
        return `${(value / 1e4).toFixed(1)}萬`
      }
      return value.toLocaleString()

    case 'percent':
      return `${value.toFixed(2)}%`

    default:
      return value.toLocaleString()
  }
}

/**
 * 計算漲跌百分比
 */
const calculateChangePercent = (close: number, changePrice: number): number => {
  if (!close || !changePrice) return 0
  const previousClose = close - changePrice
  if (previousClose === 0) return 0
  return (changePrice / previousClose) * 100
}

/**
 * 獲取漲跌顏色樣式 (台股慣例:紅漲綠跌)
 */
const getChangeColorClass = (change: number): string => {
  if (change > 0) return 'text-red-600 dark:text-red-400' // 漲:紅色
  if (change < 0) return 'text-green-600 dark:text-green-400' // 跌:綠色
  return 'text-muted-foreground' // 平盤:中性色
}

/**
 * 獲取主要欄位的顯示文字和值
 */
const getPrimaryFieldDisplay = (
  data: ScannerData,
  field: keyof ScannerData,
  scannerType: ScannerType
) => {
  const value = data[field] as number

  switch (scannerType) {
    case 'ChangePercentRank':
      const changePercent = calculateChangePercent(
        data.close,
        data.change_price
      )
      return {
        label: '漲跌幅',
        value: formatNumber(changePercent, 'percent'),
        colorClass: getChangeColorClass(data.change_price),
      }

    case 'ChangePriceRank':
      return {
        label: '漲跌',
        value:
          data.change_price > 0
            ? `+${data.change_price}`
            : `${data.change_price}`,
        colorClass: getChangeColorClass(data.change_price),
      }

    case 'DayRangeRank':
      return {
        label: '高低價差',
        value: formatNumber(value, 'number'),
        colorClass: 'text-foreground',
      }

    case 'VolumeRank':
      return {
        label: '成交量',
        value: formatNumber(value, 'volume'),
        colorClass: 'text-foreground',
      }

    case 'AmountRank':
      return {
        label: '成交金額',
        value: formatNumber(value, 'currency'),
        colorClass: 'text-foreground',
      }

    default:
      return {
        label: '數值',
        value: formatNumber(value, 'number'),
        colorClass: 'text-foreground',
      }
  }
}

export const RankingCard: React.FC<RankingCardProps> = ({
  data,
  rank,
  scannerType,
  primaryField,
  onClick,
  className,
}) => {
  const primaryDisplay = getPrimaryFieldDisplay(data, primaryField, scannerType)
  const changePercent = calculateChangePercent(data.close, data.change_price)

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* 左側: 排名 + 股票資訊 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* 排名 */}
        {rank && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">{rank}</span>
          </div>
        )}

        {/* 股票基本資訊 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground truncate">
              {data.name}
            </h3>
            <Badge variant="outline" className="text-xs">
              {data.code}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>收盤: {data.close}</span>
            <span className={getChangeColorClass(data.change_price)}>
              {data.change_price > 0 ? '+' : ''}
              {data.change_price} ({changePercent > 0 ? '+' : ''}
              {changePercent.toFixed(2)}%)
            </span>
          </div>

          {/* 成交量信息 */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>總量: {formatNumber(data.total_volume, 'volume')}</span>
            <span>昨量: {formatNumber(data.yesterday_volume, 'volume')}</span>
            <span
              className={
                data.volume_ratio >= 1 ? 'text-orange-600' : 'text-blue-600'
              }
            >
              量比: {data.volume_ratio.toFixed(2)}
            </span>
          </div>

          {/* 內外盤占比圖表 */}
          <div className="mt-2">
            <VolumeRatioChart
              bidVolumes={data.bid_volumes}
              askVolumes={data.ask_volumes}
              size="sm"
              showLabels={false}
            />
          </div>
        </div>
      </div>

      {/* 右側: 主要指標 */}
      <div className="flex-shrink-0 text-right">
        <div className="text-sm text-muted-foreground">
          {primaryDisplay.label}
        </div>
        <div className={cn('text-lg font-semibold', primaryDisplay.colorClass)}>
          {primaryDisplay.value}
        </div>
      </div>
    </div>
  )
}
