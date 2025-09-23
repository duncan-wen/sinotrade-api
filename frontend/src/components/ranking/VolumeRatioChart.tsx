'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface VolumeRatioChartProps {
  /** 內盤成交量 */
  bidVolumes: number
  /** 外盤成交量 */
  askVolumes: number
  /** 圖表大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否顯示數值標籤 */
  showLabels?: boolean
  /** 自定義樣式 */
  className?: string
}

/**
 * 格式化成交量數字 (萬、億單位)
 */
const formatVolume = (volume: number): string => {
  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(1)}億`
  } else if (volume >= 10000) {
    return `${(volume / 10000).toFixed(1)}萬`
  } else {
    return volume.toString()
  }
}

/**
 * 內外盤占比圖表組件
 */
export const VolumeRatioChart: React.FC<VolumeRatioChartProps> = ({
  bidVolumes,
  askVolumes,
  size = 'md',
  showLabels = true,
  className,
}) => {
  const totalVolume = bidVolumes + askVolumes
  const bidRatio = totalVolume > 0 ? (bidVolumes / totalVolume) * 100 : 0
  const askRatio = totalVolume > 0 ? (askVolumes / totalVolume) * 100 : 0

  // 大小樣式映射
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm',
  }

  if (totalVolume === 0) {
    return (
      <div className={cn('text-muted-foreground', textSizeClasses[size])}>
        無成交資料
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      {/* 圖表條 */}
      <div
        className={cn('flex rounded-full overflow-hidden', sizeClasses[size])}
      >
        {/* 內盤 (綠色,台股跌勢表示) */}
        {bidRatio > 0 && (
          <div
            className="bg-green-500 dark:bg-green-400"
            style={{ width: `${bidRatio}%` }}
            title={`內盤: ${formatVolume(bidVolumes)} (${bidRatio.toFixed(1)}%)`}
          />
        )}
        {/* 外盤 (紅色,台股漲勢表示) */}
        {askRatio > 0 && (
          <div
            className="bg-red-500 dark:bg-red-400"
            style={{ width: `${askRatio}%` }}
            title={`外盤: ${formatVolume(askVolumes)} (${askRatio.toFixed(1)}%)`}
          />
        )}
      </div>

      {/* 標籤 */}
      {showLabels && (
        <div className={cn('flex justify-between', textSizeClasses[size])}>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
            <span className="text-muted-foreground">
              內盤: {formatVolume(bidVolumes)}
            </span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              ({bidRatio.toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full" />
            <span className="text-muted-foreground">
              外盤: {formatVolume(askVolumes)}
            </span>
            <span className="text-red-600 dark:text-red-400 font-medium">
              ({askRatio.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* 總計 */}
      {showLabels && (
        <div
          className={cn(
            'text-center text-muted-foreground',
            textSizeClasses[size]
          )}
        >
          總計: {formatVolume(totalVolume)}
        </div>
      )}
    </div>
  )
}

export default VolumeRatioChart
