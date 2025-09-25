/**
 * API 相關的 TypeScript 類型定義
 * 與後端 FastAPI 的 Pydantic 模型對應
 */

// ==================== 基礎類型 ====================

export interface BaseResponse {
  success: boolean
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ==================== 市場數據類型 ====================

export interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  change_percent: number
  volume: number
  open: number
  high: number
  low: number
  close: number
  timestamp: string
  market_status: 'open' | 'closed' | 'pre_market' | 'after_hours'
}

export interface KlineData {
  symbol: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  amount: number
  interval: string
}

export interface OrderBook {
  symbol: string
  bids: Array<{
    price: number
    volume: number
    count: number
  }>
  asks: Array<{
    price: number
    volume: number
    count: number
  }>
  timestamp: string
}

export interface TechnicalIndicator {
  symbol: string
  indicator: string
  values: number[]
  parameters: Record<string, any>
  timestamp: string
}

// ==================== 排行榜相關類型 ====================

export interface ScannerData {
  date: string // 交易日
  code: string // 股票代號
  name: string // 股票名稱
  ts: number // 時間戳記 (nanoseconds)
  open: number // 開盤價
  high: number // 最高價
  low: number // 最低價
  close: number // 收盤價
  price_range: number // 價格區間(最高價-最低價)
  tick_type: number // 內外盤別 {1: 內盤, 2: 外盤, 0: 無法判定}
  change_price: number // 價格漲跌
  change_type: number // 漲跌類型
  average_price: number // 均價
  volume: number // 成交量
  total_volume: number // 總成交量
  amount: number // 成交金額
  total_amount: number // 總成交金額
  yesterday_volume: number // 昨日總成交量
  volume_ratio: number // 總成交量/昨日總成交量
  buy_price: number // 委買價
  buy_volume: number // 委買量
  sell_price: number // 委賣價
  sell_volume: number // 委賣量
  bid_orders: number // 內盤總成交單量
  bid_volumes: number // 內盤總成交量
  ask_orders: number // 外盤總成交單量
  ask_volumes: number // 外盤總成交量
  change_percent?: number // 漲跌百分比 (計算得出)
  timestamp_datetime?: string // datetime 格式的時間戳
}

export type ScannerType =
  | 'ChangePercentRank' // 依價格漲跌幅排序
  | 'ChangePriceRank' // 依價格漲跌排序
  | 'DayRangeRank' // 依高低價差排序
  | 'VolumeRank' // 依成交量排序
  | 'AmountRank' // 依成交金額排序

export interface ScannerTypeOption {
  value: ScannerType
  label: string
  description: string
}

export interface ScannerParams {
  scanner_type: ScannerType
  ascending?: boolean // 排序方式,true 為由大到小,false 為由小到大
  count?: number // 排行數量 (1-200)
  date?: string // 指定日期 (YYYY-MM-DD),預設為當日
  timeout?: number // 超時時間 (毫秒)
}

// ==================== 交易相關類型 ====================

export interface OrderRequest {
  symbol: string
  action: 'Buy' | 'Sell'
  order_type: 'Market' | 'Limit' | 'Stop' | 'StopLimit'
  quantity: number
  price?: number
  stop_price?: number
  time_in_force?: 'Day' | 'GTC' | 'IOC' | 'FOK'
  conditions?: Array<{
    type: string
    value: any
  }>
}

export interface OrderResponse {
  id: string
  symbol: string
  action: 'Buy' | 'Sell'
  order_type: 'Market' | 'Limit' | 'Stop' | 'StopLimit'
  status: 'Pending' | 'PartiallyFilled' | 'Filled' | 'Cancelled' | 'Rejected'
  quantity: number
  filled_quantity: number
  remaining_quantity: number
  price?: number
  filled_price?: number
  stop_price?: number
  time_in_force: 'Day' | 'GTC' | 'IOC' | 'FOK'
  created_at: string
  updated_at: string
  error_message?: string
}

export interface Position {
  symbol: string
  name: string
  quantity: number
  average_price: number
  current_price: number
  market_value: number
  unrealized_pnl: number
  unrealized_pnl_percent: number
  day_pnl: number
  day_pnl_percent: number
  cost_basis: number
  last_updated: string
}

export interface Trade {
  id: string
  symbol: string
  action: 'Buy' | 'Sell'
  quantity: number
  price: number
  amount: number
  commission: number
  order_id: string
  executed_at: string
}

// ==================== 帳戶相關類型 ====================

export interface AccountInfo {
  account_id: string
  account_type: string
  balance: number
  available_balance: number
  total_value: number
  unrealized_pnl: number
  realized_pnl: number
  buying_power: number
  maintenance_margin: number
  currency: string
  last_updated: string
}

export interface AccountRecord {
  id: string
  type: 'deposit' | 'withdraw' | 'trade' | 'dividend' | 'interest' | 'fee'
  amount: number
  balance: number
  description: string
  reference_id?: string
  created_at: string
}

// ==================== WebSocket 類型 ====================

export interface WebSocketMessage {
  type: 'quote' | 'orderbook' | 'trade' | 'order_update' | 'position_update'
  data: any
  timestamp: string
}

export interface QuoteUpdate {
  symbol: string
  price: number
  change: number
  change_percent: number
  volume: number
  timestamp: string
}

export interface OrderUpdate {
  order_id: string
  status: OrderResponse['status']
  filled_quantity: number
  filled_price?: number
  message?: string
  timestamp: string
}

export interface PositionUpdate {
  symbol: string
  quantity: number
  current_price: number
  unrealized_pnl: number
  timestamp: string
}

// ==================== 系統狀態類型 ====================

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    api: 'up' | 'down'
    database: 'up' | 'down'
    shioaji: 'connected' | 'disconnected' | 'error'
    websocket: 'up' | 'down'
  }
  version: string
  uptime: number
}

export interface MarketStatus {
  is_open: boolean
  market_session: 'regular' | 'pre_market' | 'after_hours' | 'closed'
  next_open_time?: string
  next_close_time?: string
  timezone: string
  trading_calendar: {
    is_trading_day: boolean
    holidays: string[]
  }
}

// ==================== API 請求參數類型 ====================

export interface MarketDataRequest {
  symbol: string
  interval?: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M'
  limit?: number
  start_date?: string
  end_date?: string
}

export interface OrdersFilterParams {
  status?: OrderResponse['status']
  symbol?: string
  action?: 'Buy' | 'Sell'
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

export interface TradesFilterParams {
  symbol?: string
  action?: 'Buy' | 'Sell'
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

// ==================== 錯誤類型 ====================

export interface ApiErrorResponse {
  detail: string
  error_code?: string
  field_errors?: Record<string, string[]>
  timestamp: string
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

// ==================== 聯合類型 ====================

export type OrderStatus = OrderResponse['status']
export type OrderAction = OrderRequest['action']
export type OrderType = OrderRequest['order_type']
export type TimeInForce = OrderRequest['time_in_force']

export type MarketSession = MarketStatus['market_session']
export type SystemStatus = SystemHealth['status']
export type ServiceStatus =
  | 'up'
  | 'down'
  | 'connected'
  | 'disconnected'
  | 'error'

// ==================== 選擇權相關類型 ====================

export interface OptionContract {
  code: string
  symbol: string
  name: string
  option_type: string
  strike_price: number
  delivery_date: string
  delivery_month: string
  option_right: string
  distance_from_futures: number
  moneyness: string
  underlying_kind?: string
  unit?: number
  reference?: number
}

export interface OptionQuote {
  symbol: string
  bid_price: number
  ask_price: number
  last_price: number
  volume: number
  open_interest: number
  impl_volatility?: number
  delta?: number
  gamma?: number
  theta?: number
  vega?: number
  timestamp: string
}

export interface OptionQuoteUpdate {
  symbol: string
  bid_price: number
  ask_price: number
  last_price: number
  volume: number
  change: number
  change_percent: number
  timestamp: string
}

export interface OptionChainData {
  option_type: string
  contracts: OptionContract[]
  quotes: Record<string, OptionQuote>
  futures_price: number
  futures_symbol: string
  timestamp: string
}

// ==================== 工具類型 ====================

export type ApiResponse<T> = BaseResponse & {
  data: T
}

export type PaginatedApiResponse<T> = BaseResponse & {
  data: PaginatedResponse<T>
}

// ==================== 常數定義 ====================

export const ORDER_STATUSES = [
  'Pending',
  'PartiallyFilled',
  'Filled',
  'Cancelled',
  'Rejected',
] as const

export const ORDER_ACTIONS = ['Buy', 'Sell'] as const

export const ORDER_TYPES = ['Market', 'Limit', 'Stop', 'StopLimit'] as const

export const TIME_IN_FORCE_OPTIONS = ['Day', 'GTC', 'IOC', 'FOK'] as const

export const KLINE_INTERVALS = [
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
  '1w',
  '1M',
] as const
