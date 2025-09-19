// 🚀 優化的K線管理器 - 解決跳轉問題的最佳實踐

export interface TickData {
  symbol: string
  price: number
  volume: number
  timestamp: number
}

export interface KlineData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  ma5?: number | null
  ma10?: number | null
  ma20?: number | null
  predicted?: boolean
}

export interface TimeBoundary {
  start: number
  end: number
  aligned: boolean
}

export type KlineAction = 'update' | 'create' | 'complete'

export interface KlineEvent {
  action: KlineAction
  kline: KlineData
  metadata: {
    interval: string
    symbol: string
    boundary: TimeBoundary
    latency: number
  }
}

/**
 * 🎯 方案一：智能預載入K線管理器
 * 特點：預先計算邊界時間，零延遲判斷
 */
export class SmartKlineManager {
  private boundaryCache = new Map<string, number[]>()
  private activeKlines = new Map<string, KlineData>()
  private performanceMetrics = {
    jumpLatency: [] as number[],
    missedJumps: 0,
    totalJumps: 0,
  }

  constructor() {
    this.preloadBoundaries()

    // 每小時更新邊界緩存
    setInterval(() => this.preloadBoundaries(), 3600000)
  }

  /**
   * 🚀 核心方法：處理tick數據
   */
  processTick(tick: TickData, interval: string): KlineEvent {
    const startTime = performance.now()

    // 1. 快速查找邊界時間
    const boundary = this.findBoundary(tick.timestamp, interval)

    // 2. 檢查是否需要跳轉
    const key = `${tick.symbol}_${interval}`
    const currentKline = this.activeKlines.get(key)

    let action: KlineAction
    let resultKline: KlineData

    if (!currentKline || this.shouldCreateNew(currentKline, boundary)) {
      // 創建新K線
      action = 'create'
      resultKline = this.createNewKline(tick, boundary, interval)
      this.activeKlines.set(key, resultKline)
      this.performanceMetrics.totalJumps++
    } else {
      // 更新現有K線
      action = 'update'
      resultKline = this.updateKline(currentKline, tick)
      this.activeKlines.set(key, resultKline)
    }

    const latency = performance.now() - startTime
    this.performanceMetrics.jumpLatency.push(latency)

    return {
      action,
      kline: resultKline,
      metadata: {
        interval,
        symbol: tick.symbol,
        boundary: {
          start: boundary,
          end: boundary + this.getIntervalMs(interval),
          aligned: true,
        },
        latency,
      },
    }
  }

  /**
   * 🔧 預載入未來1000個時間邊界
   */
  private preloadBoundaries() {
    const intervals = ['1m', '5m', '15m', '1h']
    const now = Date.now()

    intervals.forEach((interval) => {
      const boundaries = this.calculateFutureBoundaries(now, interval, 1000)
      this.boundaryCache.set(interval, boundaries)
    })

    console.log('📅 邊界緩存已更新', {
      intervals,
      totalBoundaries: intervals.reduce(
        (sum, interval) =>
          sum + (this.boundaryCache.get(interval)?.length || 0),
        0
      ),
    })
  }

  /**
   * 🎯 零延遲邊界查找（二分搜索）
   */
  private findBoundary(timestamp: number, interval: string): number {
    const cached = this.boundaryCache.get(interval)

    if (!cached) {
      return this.calculateBoundary(timestamp, interval)
    }

    // 二分搜索
    let left = 0
    let right = cached.length - 1
    const intervalMs = this.getIntervalMs(interval)

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const boundary = cached[mid]

      if (timestamp >= boundary && timestamp < boundary + intervalMs) {
        return boundary
      } else if (timestamp < boundary) {
        right = mid - 1
      } else {
        left = mid + 1
      }
    }

    // 如果緩存中沒找到，動態計算
    return this.calculateBoundary(timestamp, interval)
  }

  /**
   * 🕐 精確計算時間邊界
   */
  private calculateBoundary(timestamp: number, interval: string): number {
    const date = new Date(timestamp)

    switch (interval) {
      case '1m':
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          date.getMinutes()
        ).getTime()

      case '5m':
        const minutes5 = Math.floor(date.getMinutes() / 5) * 5
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          minutes5
        ).getTime()

      case '15m':
        const minutes15 = Math.floor(date.getMinutes() / 15) * 15
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          minutes15
        ).getTime()

      case '1h':
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours()
        ).getTime()

      case '1d':
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        ).getTime()

      default:
        return timestamp
    }
  }

  /**
   * 📊 計算未來邊界時間
   */
  private calculateFutureBoundaries(
    startTime: number,
    interval: string,
    count: number
  ): number[] {
    const boundaries: number[] = []
    const intervalMs = this.getIntervalMs(interval)

    let current = this.calculateBoundary(startTime, interval)

    for (let i = 0; i < count; i++) {
      boundaries.push(current)
      current += intervalMs
    }

    return boundaries
  }

  /**
   * 🔍 判斷是否需要創建新K線
   */
  private shouldCreateNew(
    currentKline: KlineData,
    newBoundary: number
  ): boolean {
    const currentBoundary = new Date(currentKline.time).getTime()
    return currentBoundary !== newBoundary
  }

  /**
   * 🆕 創建新K線
   */
  private createNewKline(
    tick: TickData,
    boundary: number,
    interval: string
  ): KlineData {
    return {
      time: new Date(boundary).toISOString(),
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      volume: tick.volume || 0,
      ma5: null,
      ma10: null,
      ma20: null,
    }
  }

  /**
   * 🔄 更新現有K線
   */
  private updateKline(currentKline: KlineData, tick: TickData): KlineData {
    return {
      ...currentKline,
      high: Math.max(currentKline.high, tick.price),
      low: Math.min(currentKline.low, tick.price),
      close: tick.price,
      volume: currentKline.volume + (tick.volume || 0),
    }
  }

  /**
   * ⏱️ 獲取間隔毫秒數
   */
  private getIntervalMs(interval: string): number {
    switch (interval) {
      case '1m':
        return 60 * 1000
      case '5m':
        return 5 * 60 * 1000
      case '15m':
        return 15 * 60 * 1000
      case '1h':
        return 60 * 60 * 1000
      case '1d':
        return 24 * 60 * 60 * 1000
      case '1w':
        return 7 * 24 * 60 * 60 * 1000
      default:
        return 60 * 1000
    }
  }

  /**
   * 📈 獲取性能指標
   */
  getPerformanceMetrics() {
    const latencies = this.performanceMetrics.jumpLatency
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
        : 0

    return {
      averageJumpLatency: avgLatency.toFixed(3) + 'ms',
      totalJumps: this.performanceMetrics.totalJumps,
      missedJumps: this.performanceMetrics.missedJumps,
      accuracy:
        this.performanceMetrics.totalJumps > 0
          ? (
              ((this.performanceMetrics.totalJumps -
                this.performanceMetrics.missedJumps) /
                this.performanceMetrics.totalJumps) *
              100
            ).toFixed(2) + '%'
          : '100%',
      cacheStatus: {
        intervals: Array.from(this.boundaryCache.keys()),
        totalBoundaries: Array.from(this.boundaryCache.values()).reduce(
          (sum, arr) => sum + arr.length,
          0
        ),
      },
    }
  }

  /**
   * 🧹 清理過期緩存
   */
  cleanup() {
    const now = Date.now()

    this.boundaryCache.forEach((boundaries, interval) => {
      const intervalMs = this.getIntervalMs(interval)
      const filtered = boundaries.filter(
        (boundary) => boundary + intervalMs > now
      )
      this.boundaryCache.set(interval, filtered)
    })
  }
}

/**
 * 🎯 方案二：時間驅動K線管理器
 * 特點：使用定時器精確控制K線跳轉
 */
export class TimeDrivenKlineManager {
  private timers = new Map<string, NodeJS.Timeout>()
  private activeKlines = new Map<string, KlineData>()
  private eventHandlers = new Map<string, (event: KlineEvent) => void>()

  /**
   * 🚀 啟動間隔定時器
   */
  startInterval(symbol: string, interval: string) {
    const key = `${symbol}_${interval}`

    // 清除現有定時器
    this.stopInterval(symbol, interval)

    // 計算到下一個邊界的延遲
    const nextBoundary = this.getNextBoundary(interval)
    const delayMs = nextBoundary - Date.now()

    console.log(`⏰ 設置${interval}定時器`, {
      symbol,
      interval,
      nextBoundary: new Date(nextBoundary).toISOString(),
      delayMs,
    })

    // 設置初始定時器
    const initialTimer = setTimeout(() => {
      this.onTimeBoundary(symbol, interval)
      this.startRepeatingTimer(symbol, interval)
    }, delayMs)

    this.timers.set(key, initialTimer)
  }

  /**
   * 🔁 啟動重複定時器
   */
  private startRepeatingTimer(symbol: string, interval: string) {
    const key = `${symbol}_${interval}`
    const intervalMs = this.getIntervalMs(interval)

    const repeatingTimer = setInterval(() => {
      this.onTimeBoundary(symbol, interval)
    }, intervalMs)

    this.timers.set(key, repeatingTimer)
  }

  /**
   * 🎯 時間邊界觸發
   */
  private onTimeBoundary(symbol: string, interval: string) {
    const key = `${symbol}_${interval}`
    const currentKline = this.activeKlines.get(key)

    if (currentKline) {
      // 完成當前K線
      this.emitEvent({
        action: 'complete',
        kline: currentKline,
        metadata: {
          interval,
          symbol,
          boundary: {
            start: new Date(currentKline.time).getTime(),
            end: Date.now(),
            aligned: true,
          },
          latency: 0,
        },
      })
    }

    // 創建新K線（空K線，等待第一個tick）
    const newKline: KlineData = {
      time: new Date().toISOString(),
      open: currentKline?.close || 0,
      high: currentKline?.close || 0,
      low: currentKline?.close || 0,
      close: currentKline?.close || 0,
      volume: 0,
      ma5: null,
      ma10: null,
      ma20: null,
      predicted: true,
    }

    this.activeKlines.set(key, newKline)

    this.emitEvent({
      action: 'create',
      kline: newKline,
      metadata: {
        interval,
        symbol,
        boundary: {
          start: Date.now(),
          end: Date.now() + this.getIntervalMs(interval),
          aligned: true,
        },
        latency: 0,
      },
    })
  }

  /**
   * 📊 更新K線數據（由tick觸發）
   */
  updateWithTick(tick: TickData, symbol: string, interval: string) {
    const key = `${symbol}_${interval}`
    const currentKline = this.activeKlines.get(key)

    if (!currentKline) {
      // 如果沒有當前K線，創建一個
      this.startInterval(symbol, interval)
      return
    }

    const updatedKline: KlineData = {
      ...currentKline,
      high: Math.max(currentKline.high, tick.price),
      low: currentKline.predicted
        ? tick.price
        : Math.min(currentKline.low, tick.price),
      close: tick.price,
      volume: currentKline.volume + (tick.volume || 0),
      predicted: false,
    }

    // 如果是預測K線的第一個tick，設置開盤價
    if (currentKline.predicted) {
      updatedKline.open = tick.price
      updatedKline.high = tick.price
      updatedKline.low = tick.price
    }

    this.activeKlines.set(key, updatedKline)

    this.emitEvent({
      action: 'update',
      kline: updatedKline,
      metadata: {
        interval,
        symbol,
        boundary: {
          start: new Date(updatedKline.time).getTime(),
          end:
            new Date(updatedKline.time).getTime() +
            this.getIntervalMs(interval),
          aligned: true,
        },
        latency: 0,
      },
    })
  }

  /**
   * 🛑 停止間隔
   */
  stopInterval(symbol: string, interval: string) {
    const key = `${symbol}_${interval}`
    const timer = this.timers.get(key)

    if (timer) {
      clearTimeout(timer)
      clearInterval(timer)
      this.timers.delete(key)
    }
  }

  /**
   * 👂 註冊事件處理器
   */
  onKlineEvent(
    symbol: string,
    interval: string,
    handler: (event: KlineEvent) => void
  ) {
    const key = `${symbol}_${interval}`
    this.eventHandlers.set(key, handler)
  }

  /**
   * 📡 發送事件
   */
  private emitEvent(event: KlineEvent) {
    const key = `${event.metadata.symbol}_${event.metadata.interval}`
    const handler = this.eventHandlers.get(key)

    if (handler) {
      handler(event)
    }
  }

  /**
   * 🕐 獲取下一個邊界時間
   */
  private getNextBoundary(interval: string): number {
    const now = new Date()

    switch (interval) {
      case '1m':
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          now.getMinutes() + 1
        ).getTime()
      case '5m':
        const nextMinute5 = Math.ceil(now.getMinutes() / 5) * 5
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          nextMinute5
        ).getTime()
      case '15m':
        const nextMinute15 = Math.ceil(now.getMinutes() / 15) * 15
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          nextMinute15
        ).getTime()
      case '1h':
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours() + 1
        ).getTime()
      default:
        return Date.now() + 60000
    }
  }

  /**
   * ⏱️ 獲取間隔毫秒數
   */
  private getIntervalMs(interval: string): number {
    switch (interval) {
      case '1m':
        return 60 * 1000
      case '5m':
        return 5 * 60 * 1000
      case '15m':
        return 15 * 60 * 1000
      case '1h':
        return 60 * 60 * 1000
      default:
        return 60 * 1000
    }
  }

  /**
   * 🧹 清理所有定時器
   */
  cleanup() {
    this.timers.forEach((timer) => {
      clearTimeout(timer)
      clearInterval(timer)
    })
    this.timers.clear()
    this.activeKlines.clear()
    this.eventHandlers.clear()
  }
}

// 使用示例
export const createOptimizedKlineManager = (
  strategy: 'smart' | 'time-driven' = 'smart'
) => {
  if (strategy === 'smart') {
    return new SmartKlineManager()
  } else {
    return new TimeDrivenKlineManager()
  }
}
