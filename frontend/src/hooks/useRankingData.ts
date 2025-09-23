'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiService } from '@/services/api'
import { ScannerData, ScannerType, ScannerTypeOption } from '@/types/api'

interface UseRankingDataProps {
  /** 排行類型 */
  scannerType: ScannerType
  /** 排序方式,true 為由大到小 */
  ascending?: boolean
  /** 數據數量 */
  count?: number
  /** 指定日期 */
  date?: string
  /** 自動刷新間隔 (毫秒),0 為不自動刷新 */
  refreshInterval?: number
  /** 是否立即載入 */
  immediate?: boolean
}

interface UseRankingDataReturn {
  /** 排行數據 */
  data: ScannerData[]
  /** 載入狀態 */
  isLoading: boolean
  /** 錯誤信息 */
  error: string | null
  /** 最後更新時間 */
  lastUpdated: Date | null
  /** 手動刷新函數 */
  refresh: () => Promise<void>
  /** 是否正在刷新 */
  isRefreshing: boolean
}

/**
 * 排行榜數據管理 Hook
 */
export const useRankingData = ({
  scannerType,
  ascending = true,
  count = 50,
  date,
  refreshInterval = 0,
  immediate = true,
}: UseRankingDataProps): UseRankingDataReturn => {
  const [data, setData] = useState<ScannerData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  /**
   * 獲取排行數據
   */
  const fetchData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }
        setError(null)

        const result = await apiService.getScanners({
          scanner_type: scannerType,
          ascending,
          count,
          date,
        })

        setData(result)
        setLastUpdated(new Date())
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '獲取排行數據失敗'
        setError(errorMessage)
        console.error('Failed to fetch ranking data:', err)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [scannerType, ascending, count, date]
  )

  /**
   * 手動刷新
   */
  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  // 初始載入
  useEffect(() => {
    if (immediate) {
      fetchData()
    }
  }, [fetchData, immediate])

  // 自動刷新
  useEffect(() => {
    if (refreshInterval <= 0) return

    const interval = setInterval(() => {
      fetchData(true)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchData, refreshInterval])

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refresh,
    isRefreshing,
  }
}

/**
 * 排行類型選項管理 Hook
 */
export const useScannerTypes = () => {
  const [types, setTypes] = useState<ScannerTypeOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 獲取排行類型列表
   */
  const fetchTypes = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await apiService.getScannerTypes()
      setTypes(result)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '獲取排行類型失敗'
      setError(errorMessage)
      console.error('Failed to fetch scanner types:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  return {
    types,
    isLoading,
    error,
    refetch: fetchTypes,
  }
}

/**
 * 多個排行榜數據管理 Hook
 */
export const useMultipleRankingData = (scannerTypes: ScannerType[]) => {
  const [dataMap, setDataMap] = useState<Record<ScannerType, ScannerData[]>>(
    {} as Record<ScannerType, ScannerData[]>
  )
  const [loadingMap, setLoadingMap] = useState<Record<ScannerType, boolean>>(
    {} as Record<ScannerType, boolean>
  )
  const [errorMap, setErrorMap] = useState<Record<ScannerType, string | null>>(
    {} as Record<ScannerType, string | null>
  )

  // 使用 ref 來追蹤是否已經初始化
  const initializedRef = useRef(false)

  /**
   * 獲取指定類型的排行數據
   */
  const fetchScannerData = useCallback(async (scannerType: ScannerType) => {
    try {
      setLoadingMap((prev) => ({ ...prev, [scannerType]: true }))
      setErrorMap((prev) => ({ ...prev, [scannerType]: null }))

      const result = await apiService.getScanners({
        scanner_type: scannerType,
        ascending: true,
        count: 10, // 預覽模式只顯示前10名
      })

      setDataMap((prev) => ({ ...prev, [scannerType]: result }))
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '獲取排行數據失敗'
      setErrorMap((prev) => ({ ...prev, [scannerType]: errorMessage }))
      console.error(`Failed to fetch ${scannerType} data:`, err)
    } finally {
      setLoadingMap((prev) => ({ ...prev, [scannerType]: false }))
    }
  }, [])

  /**
   * 獲取所有類型的數據
   */
  const fetchAllData = useCallback(async () => {
    const promises = scannerTypes.map((type) => fetchScannerData(type))
    await Promise.allSettled(promises)
  }, [scannerTypes, fetchScannerData])

  // 只在初始化時執行一次
  useEffect(() => {
    if (scannerTypes.length > 0 && !initializedRef.current) {
      initializedRef.current = true
      fetchAllData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 空依賴項,只執行一次,避免無限循環

  /**
   * 刷新指定類型的數據
   */
  const refreshScannerData = useCallback(
    (scannerType: ScannerType) => {
      return fetchScannerData(scannerType)
    },
    [fetchScannerData]
  )

  return {
    dataMap,
    loadingMap,
    errorMap,
    refreshScannerData,
    refreshAll: fetchAllData,
  }
}
