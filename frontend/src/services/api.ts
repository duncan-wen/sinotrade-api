/**
 * API 服務層 - 處理所有後端 API 請求
 * 基於 FastAPI 後端設計
 */
import type {
  Quote,
  KlineData,
  OrderRequest,
  OrderResponse,
  Position,
  Trade,
  MarketDataRequest,
  ScannerData,
  ScannerParams,
  ScannerType,
  ScannerTypeOption,
  SortingMode,
} from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 基礎 HTTP 客戶端
 */
class HttpClient {
  private baseURL: string
  private defaultHeaders: HeadersInit

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const config: RequestInit = {
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          response.status,
          response.statusText,
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      // 處理空響應
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        return {} as T
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      // 網路錯誤或其他錯誤
      throw new ApiError(0, 'Network Error', error.message || '網路連接失敗')
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let searchParams = ''

    if (params) {
      // 過濾掉 undefined, null 和空字符串的參數
      const filteredParams = Object.entries(params)
        .filter(
          ([_, value]) => value !== undefined && value !== null && value !== ''
        )
        .reduce(
          (acc, [key, value]) => {
            acc[key] = value
            return acc
          },
          {} as Record<string, any>
        )

      if (Object.keys(filteredParams).length > 0) {
        searchParams = '?' + new URLSearchParams(filteredParams).toString()
      }
    }

    return this.request<T>(`${endpoint}${searchParams}`, {
      method: 'GET',
    })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

/**
 * API 服務類
 */
class ApiService {
  private client: HttpClient

  constructor() {
    this.client = new HttpClient(API_BASE_URL)
  }

  // ==================== 市場數據 API ====================

  /**
   * 獲取股票即時報價
   */
  async getQuote(symbol: string): Promise<Quote> {
    return this.client.get<Quote>(`/api/quotes/${symbol}`)
  }

  /**
   * 獲取多檔股票報價
   */
  async getMultipleQuotes(symbols: string[]): Promise<Quote[]> {
    return this.client.post<Quote[]>('/api/quotes/batch', { symbols })
  }

  /**
   * 獲取 K線數據
   */
  async getKlines(params: {
    symbol: string
    interval?: string
    limit?: number
    start_date?: string
    end_date?: string
  }): Promise<KlineData[]> {
    return this.client.get<KlineData[]>('/api/klines', params)
  }

  /**
   * 搜尋股票
   */
  async searchStocks(query: string): Promise<
    Array<{
      symbol: string
      name: string
      market: string
    }>
  > {
    return this.client.get('/api/stocks/search', { q: query })
  }

  // ==================== 排行榜相關 API ====================

  /**
   * 獲取排行榜數據
   */
  async getScanners(params: {
    scanner_type: ScannerType
    ascending?: boolean
    sorting_mode?: SortingMode
    count?: number
    date?: string
    timeout?: number
  }): Promise<ScannerData[]> {
    const { scanner_type, ...queryParams } = params
    return this.client.get<ScannerData[]>(
      `/api/scanners/${scanner_type}`,
      queryParams
    )
  }

  /**
   * 獲取支援的排行類型列表
   */
  async getScannerTypes(): Promise<ScannerTypeOption[]> {
    return this.client.get<ScannerTypeOption[]>('/api/scanners/types')
  }

  // ==================== 交易相關 API ====================

  /**
   * 下單
   */
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    return this.client.post<OrderResponse>('/api/orders', order)
  }

  /**
   * 取消訂單
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean }> {
    return this.client.delete(`/api/orders/${orderId}`)
  }

  /**
   * 獲取訂單列表
   */
  async getOrders(params?: {
    status?: string
    symbol?: string
    limit?: number
    offset?: number
  }): Promise<{
    orders: OrderResponse[]
    total: number
  }> {
    return this.client.get('/api/orders', params)
  }

  /**
   * 獲取持倉
   */
  async getPositions(): Promise<Position[]> {
    return this.client.get<Position[]>('/api/positions')
  }

  /**
   * 獲取交易歷史
   */
  async getTrades(params?: {
    symbol?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }): Promise<{
    trades: Trade[]
    total: number
  }> {
    return this.client.get('/api/trades', params)
  }

  // ==================== 帳戶相關 API ====================

  /**
   * 獲取帳戶資訊
   */
  async getAccountInfo(): Promise<{
    account_id: string
    balance: number
    available_balance: number
    total_value: number
    unrealized_pnl: number
  }> {
    return this.client.get('/api/account/info')
  }

  /**
   * 獲取資金流水
   */
  async getAccountHistory(params?: {
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }): Promise<{
    records: Array<{
      id: string
      type: string
      amount: number
      balance: number
      description: string
      created_at: string
    }>
    total: number
  }> {
    return this.client.get('/api/account/history', params)
  }

  // ==================== 選擇權相關 API ====================

  /**
   * 獲取篩選後的選擇權合約
   */
  async getFilteredOptionContracts(params: {
    option_types: string // 逗號分隔,如 "TXO,TX1,TX2,TX4,TX5,TXU,TXV,TXX,TXY,TXZ"
    target_months: string // 逗號分隔,如 "202509,202510"
    price_range?: number // 價格範圍 (上下多少點)
    futures_symbol?: string // 期貨合約代號
    call_put_filter?: 'call' | 'put' | 'both' // 篩選類型
  }): Promise<{
    success: boolean
    message: string
    filters_applied: {
      option_types: string[]
      target_months: string[]
      call_put_filter: string
      price_range: string
    }
    futures_info: {
      symbol: string
      current_price: number
      method: string
    }
    price_filter: {
      range: number
      lower_bound: number
      upper_bound: number
    }
    option_contracts: {
      all_call_options: any[]
      all_put_options: any[]
      by_type: Record<string, any>
    }
    summary: {
      total_call_contracts: number
      total_put_contracts: number
      total_contracts: number
      by_option_type: Record<string, any>
    }
    timestamp: string
  }> {
    return this.client.get('/api/options/contracts/filtered', params)
  }

  // ==================== 研究分析 API ====================

  /**
   * 取得匯率與台股大盤連動分析
   */
  async getForexAnalysis(params: {
    days?: number
    corr_window?: number
  }): Promise<{
    price_data: { date: string; taiex: number | null; usd_twd: number | null }[]
    corr_data: { date: string; correlation: number | null }[]
    return_data: {
      date: string
      market: number | null
      strategy: number | null
    }[]
    market_return_pct: number
    strategy_return_pct: number
    win_rate_pct: number
    total_days: number
    signal_days: number
  }> {
    return this.client.get('/api/forex/analysis', params)
  }

  // ==================== 系統狀態 API ====================

  /**
   * 檢查 API 健康狀態
   */
  async healthCheck(): Promise<{
    status: string
    timestamp: string
    shioaji_connected: boolean
  }> {
    return this.client.get('/api/health')
  }

  /**
   * 獲取市場狀態
   */
  async getMarketStatus(): Promise<{
    is_open: boolean
    next_open_time?: string
    next_close_time?: string
    timezone: string
  }> {
    return this.client.get('/api/market/status')
  }
}

// 導出單例實例
export const apiService = new ApiService()
export { ApiError }
export type { ApiService }
