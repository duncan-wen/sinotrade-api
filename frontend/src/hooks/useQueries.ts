/**
 * TanStack Query Hooks
 * 統一管理所有 API 請求的狀態和快取
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
  type InfiniteData,
} from '@tanstack/react-query'

import { apiService } from '@/services/api'
import type {
  Quote,
  KlineData,
  OrderRequest,
  OrderResponse,
  Position,
  Trade,
  AccountInfo,
  SystemHealth,
  MarketStatus,
  OrdersFilterParams,
  TradesFilterParams,
} from '@/types/api'

// ==================== Query Keys ====================
// 統一管理所有查詢鍵,避免重複和錯誤

export const queryKeys = {
  // 市場數據
  quotes: (symbol?: string) => (symbol ? ['quotes', symbol] : ['quotes']),
  multipleQuotes: (symbols: string[]) => ['quotes', 'multiple', symbols.sort()],
  klines: (symbol: string, interval?: string, limit?: number) => [
    'klines',
    symbol,
    interval,
    limit,
  ],

  // 交易相關
  orders: (filters?: OrdersFilterParams) => ['orders', filters],
  order: (orderId: string) => ['orders', orderId],
  positions: () => ['positions'],
  trades: (filters?: TradesFilterParams) => ['trades', filters],

  // 帳戶相關
  account: () => ['account'],
  accountHistory: (params?: any) => ['account', 'history', params],

  // 系統狀態
  health: () => ['health'],
  marketStatus: () => ['market', 'status'],
} as const

// ==================== 市場數據 Queries ====================

/**
 * 獲取單一股票報價
 */
export const useStockQuote = (
  symbol: string,
  options?: Omit<UseQueryOptions<Quote>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.quotes(symbol),
    queryFn: () => apiService.getQuote(symbol),
    enabled: !!symbol,
    staleTime: 5000, // 5秒內認為數據新鮮
    refetchInterval: 10000, // 每10秒自動重新獲取
    ...options,
  })
}

/**
 * 獲取多檔股票報價
 */
export const useMultipleQuotes = (
  symbols: string[],
  options?: Omit<UseQueryOptions<Quote[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.multipleQuotes(symbols),
    queryFn: () => apiService.getMultipleQuotes(symbols),
    enabled: symbols.length > 0,
    staleTime: 3000,
    refetchInterval: 8000,
    ...options,
  })
}

/**
 * 獲取 K線數據
 */
export const useKlineData = (
  params: {
    symbol: string
    interval?: string
    limit?: number
    start_date?: string
    end_date?: string
  },
  options?: Omit<UseQueryOptions<KlineData[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.klines(params.symbol, params.interval, params.limit),
    queryFn: () => apiService.getKlines(params),
    enabled: !!params.symbol,
    staleTime: 30000, // K線數據30秒內認為新鮮
    ...options,
  })
}

// ==================== 交易相關 Queries ====================

/**
 * 獲取訂單列表
 */
export const useOrders = (
  filters?: OrdersFilterParams,
  options?: Omit<
    UseQueryOptions<{ orders: OrderResponse[]; total: number }>,
    'queryKey' | 'queryFn'
  >
) => {
  return useQuery({
    queryKey: queryKeys.orders(filters),
    queryFn: () => apiService.getOrders(filters),
    staleTime: 10000,
    refetchInterval: 15000,
    ...options,
  })
}

/**
 * 獲取訂單列表 (無限滾動)
 */
export const useInfiniteOrders = (
  filters?: Omit<OrdersFilterParams, 'offset'>,
  options?: any
) => {
  return useInfiniteQuery({
    queryKey: ['orders', 'infinite', filters],
    queryFn: ({ pageParam = 0 }) =>
      apiService.getOrders({ ...filters, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.length * (filters?.limit || 20)
      return totalLoaded < lastPage.total ? totalLoaded : undefined
    },
    initialPageParam: 0,
    ...options,
  })
}

/**
 * 獲取持倉
 */
export const usePositions = (
  options?: Omit<UseQueryOptions<Position[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.positions(),
    queryFn: () => apiService.getPositions(),
    staleTime: 15000,
    refetchInterval: 30000,
    ...options,
  })
}

/**
 * 獲取交易歷史
 */
export const useTrades = (
  filters?: TradesFilterParams,
  options?: Omit<
    UseQueryOptions<{ trades: Trade[]; total: number }>,
    'queryKey' | 'queryFn'
  >
) => {
  return useQuery({
    queryKey: queryKeys.trades(filters),
    queryFn: () => apiService.getTrades(filters),
    staleTime: 30000,
    ...options,
  })
}

// ==================== 帳戶相關 Queries ====================

/**
 * 獲取帳戶資訊
 */
export const useAccountInfo = (
  options?: Omit<UseQueryOptions<AccountInfo>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.account(),
    queryFn: () => apiService.getAccountInfo(),
    staleTime: 30000,
    refetchInterval: 60000,
    ...options,
  })
}

// ==================== 系統狀態 Queries ====================

/**
 * 系統健康檢查
 */
export const useSystemHealth = (
  options?: Omit<UseQueryOptions<SystemHealth>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: () => apiService.healthCheck(),
    staleTime: 10000,
    refetchInterval: 30000,
    retry: 1, // 健康檢查失敗只重試1次
    ...options,
  })
}

/**
 * 市場狀態
 */
export const useMarketStatus = (
  options?: Omit<UseQueryOptions<MarketStatus>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.marketStatus(),
    queryFn: () => apiService.getMarketStatus(),
    staleTime: 60000, // 市場狀態1分鐘內認為新鮮
    refetchInterval: 300000, // 每5分鐘檢查一次
    ...options,
  })
}

// ==================== Mutations ====================

/**
 * 下單 Mutation
 */
export const usePlaceOrder = (
  options?: UseMutationOptions<OrderResponse, Error, OrderRequest>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (order: OrderRequest) => apiService.placeOrder(order),
    onSuccess: (data, variables) => {
      // 下單成功後更新相關快取
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() })
      queryClient.invalidateQueries({ queryKey: queryKeys.positions() })
      queryClient.invalidateQueries({ queryKey: queryKeys.account() })

      // 樂觀更新:立即添加新訂單到快取
      queryClient.setQueryData(
        queryKeys.orders(),
        (old: { orders: OrderResponse[]; total: number } | undefined) => {
          if (!old) return old
          return {
            orders: [data, ...old.orders],
            total: old.total + 1,
          }
        }
      )
    },
    ...options,
  })
}

/**
 * 取消訂單 Mutation
 */
export const useCancelOrder = (
  options?: UseMutationOptions<{ success: boolean }, Error, string>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) => apiService.cancelOrder(orderId),
    onSuccess: (data, orderId) => {
      // 更新訂單狀態
      queryClient.setQueryData(
        queryKeys.orders(),
        (old: { orders: OrderResponse[]; total: number } | undefined) => {
          if (!old) return old
          return {
            ...old,
            orders: old.orders.map((order) =>
              order.id === orderId
                ? { ...order, status: 'Cancelled' as const }
                : order
            ),
          }
        }
      )

      // 重新獲取最新數據
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() })
    },
    ...options,
  })
}

// ==================== 自定義 Hooks ====================

/**
 * 監控股票的完整數據
 */
export const useStockMonitor = (symbol: string) => {
  const quote = useStockQuote(symbol)
  const klines = useKlineData({ symbol, interval: '1m', limit: 100 })

  return {
    quote: quote.data,
    klines: klines.data,
    isLoading: quote.isLoading || klines.isLoading,
    error: quote.error || klines.error,
    refetch: () => {
      quote.refetch()
      klines.refetch()
    },
  }
}

/**
 * 交易儀表板數據
 */
export const useTradingDashboard = () => {
  const positions = usePositions()
  const orders = useOrders({ status: 'Pending' })
  const account = useAccountInfo()
  const systemHealth = useSystemHealth()

  return {
    positions: positions.data,
    pendingOrders: orders.data?.orders,
    account: account.data,
    systemHealth: systemHealth.data,
    isLoading: positions.isLoading || orders.isLoading || account.isLoading,
    hasError: positions.error || orders.error || account.error,
    refetchAll: () => {
      positions.refetch()
      orders.refetch()
      account.refetch()
      systemHealth.refetch()
    },
  }
}

/**
 * 預取常用數據
 */
export const usePrefetchCommonData = () => {
  const queryClient = useQueryClient()

  const prefetchMarketData = (symbol: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.quotes(symbol),
      queryFn: () => apiService.getQuote(symbol),
      staleTime: 5000,
    })

    queryClient.prefetchQuery({
      queryKey: queryKeys.klines(symbol, '1d', 30),
      queryFn: () =>
        apiService.getKlines({ symbol, interval: '1d', limit: 30 }),
      staleTime: 300000,
    })
  }

  return { prefetchMarketData }
}
