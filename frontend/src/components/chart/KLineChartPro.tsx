/**
 * KLineChartPro.tsx - 專業K線圖表組件
 *
 * 基於 KLineChart Pro 實現的專業級金融圖表
 * 支援所有主流技術指標:MA、KD、MACD、BBands等
 *
 * 🚀 安裝命令:
 * pnpm add klinecharts @klinecharts/pro
 *
 * 📊 特性:
 * - 內建技術指標支援
 * - 實時K線更新
 * - 專業金融UI設計
 * - 多時區支援
 * - 完整的數據接口
 */

'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  klineSocketIOService,
  KlineData,
  KlineMessage,
  TickData,
} from '@/services/klineSocketIO'
import {
  zhTWLocale,
  LOCALES,
  DEFAULT_LOCALE,
  languageOptions,
  themes,
  DEFAULT_THEME,
  type ThemeColors,
  timeIntervalOptions,
  indicatorOptions,
  type IndicatorName,
  type IndicatorType,
  createChartStyles,
  createIndicatorStyles,
  ChartButton,
} from './klinechart-pro'

// 💡 現在使用基本的 klinecharts 提供專業功能
let klinecharts: any = null

// 動態導入以避免SSR錯誤
const loadKLineChart = async () => {
  try {
    // 導入基本的 klinecharts
    const klineModule = await import('klinecharts')
    klinecharts = klineModule

    console.log('✅ KLineChart 基礎版載入成功')
    return true
  } catch (error) {
    console.error('❌ KLineChart 載入失敗:', error)
    console.log('💡 請先安裝套件: pnpm add klinecharts')
    return false
  }
}

export interface KLineData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
  ma5?: number | null
  ma10?: number | null
  ma20?: number | null
}

interface KLineChartProProps {
  symbol: string
  symbolName?: string // 股票名稱（如：台積電、南亞科）
  className?: string
  height?: number
  width?: number
  interval?: string
  enableRealtime?: boolean
  theme?: 'light' | 'dark'
  mainIndicators?: string[] // 主圖指標,如 ['MA', 'BOLL']
  subIndicators?: string[] // 副圖指標,如 ['MACD', 'KD']
  onIntervalChange?: (interval: string) => void
}

// 專業K線圖表實現(基於基礎klinecharts)
class ProfessionalChart {
  private chart: any = null
  private symbol: string = ''
  private interval: string = '5m'
  private container: HTMLElement | null = null
  private currentKline: any = null // 當前正在構建的 K 線
  private lastKlineStartTime: number = 0 // 最後一根 K 線的開始時間
  private klineDataCache: any[] = [] // 本地 K 線數據緩存
  private activeIndicators: Set<string> = new Set() // 🔧 追踪已啟用的指標
  private indicatorPanes: Map<string, string> = new Map() // 🔧 追踪指標的 pane ID
  private toggleInProgress: Set<string> = new Set() // 🔧 防止重複點擊
  private theme: keyof typeof themes = DEFAULT_THEME // 🎨 當前主題
  private colors: ThemeColors = themes[DEFAULT_THEME] // 🎨 當前色彩配置
  private indicatorStyles: ReturnType<typeof createIndicatorStyles> // 🎨 指標樣式配置

  constructor(container: HTMLElement, symbol: string, interval: string) {
    this.updateTheme(DEFAULT_THEME)
    this.container = container
    this.symbol = symbol
    this.interval = interval
    // 重置狀態
    this.currentKline = null
    this.lastKlineStartTime = 0
    this.klineDataCache = []
  }

  // 🎨 更新主題配置
  private updateTheme(themeName: keyof typeof themes) {
    this.theme = themeName
    this.colors = themes[themeName]
    this.indicatorStyles = createIndicatorStyles(this.colors)
  }

  // 🔧 獲取當前主題的MA配置
  private get MA_CONFIG() {
    return this.indicatorStyles.ma
  }

  // 🔧 獲取當前主題的MACD配置
  private get MACD_CONFIG() {
    return this.indicatorStyles.macd
  }

  // 🔧 獲取當前主題的KDJ配置
  private get KDJ_CONFIG() {
    return this.indicatorStyles.kdj
  }

  // 🔧 獲取當前主題的VOL配置
  private get VOL_CONFIG() {
    return this.indicatorStyles.vol
  }

  // 計算 K 線邊界時間
  private calculateKlineBoundary(tickTime: Date, intervalStr: string) {
    const tickDate = new Date(tickTime)

    switch (intervalStr) {
      case '1m': {
        const klineStartTime = new Date(tickDate)
        klineStartTime.setSeconds(0, 0)
        return {
          startTime: klineStartTime,
          endTime: new Date(klineStartTime.getTime() + 60 * 1000),
        }
      }
      case '5m': {
        const minutes = tickDate.getMinutes()
        const alignedMinutes = Math.floor(minutes / 5) * 5
        const klineStartTime = new Date(tickDate)
        klineStartTime.setMinutes(alignedMinutes, 0, 0)
        return {
          startTime: klineStartTime,
          endTime: new Date(klineStartTime.getTime() + 5 * 60 * 1000),
        }
      }
      case '15m': {
        const minutes = tickDate.getMinutes()
        const alignedMinutes = Math.floor(minutes / 15) * 15
        const klineStartTime = new Date(tickDate)
        klineStartTime.setMinutes(alignedMinutes, 0, 0)
        return {
          startTime: klineStartTime,
          endTime: new Date(klineStartTime.getTime() + 15 * 60 * 1000),
        }
      }
      case '60m':
      case '1h': {
        const klineStartTime = new Date(tickDate)
        klineStartTime.setMinutes(0, 0, 0)
        return {
          startTime: klineStartTime,
          endTime: new Date(klineStartTime.getTime() + 60 * 60 * 1000),
        }
      }
      default: {
        // 默認1分鐘
        const klineStartTime = new Date(tickDate)
        klineStartTime.setSeconds(0, 0)
        return {
          startTime: klineStartTime,
          endTime: new Date(klineStartTime.getTime() + 60 * 1000),
        }
      }
    }
  }

  // 初始化圖表
  async init() {
    if (!klinecharts || !this.container) {
      throw new Error('KLineChart not loaded or container not found')
    }

    try {
      // 🔧 註冊繁體中文語言包 (zh-TW)
      klinecharts.registerLocale(LOCALES.ZH_TW, zhTWLocale)
      //   console.log('✅ 繁體中文語言包註冊成功')

      // 🔧 創建圖表實例並設定繁體中文語言
      this.chart = klinecharts.init(this.container, {
        locale: DEFAULT_LOCALE, // 設定使用繁體中文
      })

      console.log('📊 圖表實例創建成功:', this.chart)

      // 🎨 配置圖表樣式 (使用主題化配置)
      this.chart.setStyles(createChartStyles(this.colors))

      // 載入數據
      await this.loadData()

      // 設置技術指標
      this.setupIndicators()

      console.log('✅ 專業圖表初始化完成')
      return true
    } catch (error) {
      console.error('❌ 圖表初始化失敗:', error)
      throw error
    }
  }

  // 載入歷史數據
  async loadData() {
    try {
      // 根據時間週期調整數據量：短週期需要更多數據
      const limitMap: Record<string, number> = {
        '1m': 500, // 1分鐘：500根 ≈ 8小時
        '5m': 500, // 5分鐘：500根 ≈ 2天
        '15m': 500, // 15分鐘：500根 ≈ 5天
        '30m': 300, // 30分鐘：300根 ≈ 6天
        '60m': 300, // 1小時：300根 ≈ 12天
        '1h': 300,
        '1d': 200, // 日線：200根 ≈ 8個月
        '1w': 200, // 週線：200根 ≈ 4年
      }
      const limit = limitMap[this.interval] || 300

      const apiUrl = `/api/klines/${this.symbol}?interval=${this.interval}&limit=${limit}&ma_periods=5,10,20&include_indicators=true`
      console.log(`🔗 載入數據 [${this.interval}]: ${limit}根`, apiUrl)

      const response = await fetch(apiUrl)
      const result = await response.json()

      if (result.data && result.data.length > 0) {
        // 轉換為 KLineChart 格式
        const klineData = result.data.map((d: any) => {
          let dataItem: any

          if (d.kline) {
            // 新格式
            dataItem = {
              timestamp: new Date(d.timestamp).getTime(),
              open: d.kline.open,
              high: d.kline.high,
              low: d.kline.low,
              close: d.kline.close,
              volume: d.kline.volume || 0,
            }
          } else {
            // 舊格式
            dataItem = {
              timestamp: new Date(d.time || d.timestamp).getTime(),
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
              volume: d.volume || 0,
            }
          }

          return dataItem
        })

        // 保存數據到本地緩存
        this.klineDataCache = [...klineData]

        // 設置數據到圖表 - 檢查可用的 API 方法
        if (typeof this.chart.applyNewData === 'function') {
          this.chart.applyNewData(klineData)
        } else if (typeof this.chart.loadData === 'function') {
          this.chart.loadData(klineData)
        } else {
          console.warn('⚠️ 無可用的數據載入方法')
        }

        // 初始化最後一根 K 線的狀態(用於實時更新)
        if (klineData.length > 0) {
          const lastKline = klineData[klineData.length - 1]
          this.lastKlineStartTime = lastKline.timestamp
          this.currentKline = {
            timestamp: lastKline.timestamp,
            open: lastKline.open,
            high: lastKline.high,
            low: lastKline.low,
            close: lastKline.close,
            volume: lastKline.volume,
          }
          console.log(
            '📊 [KLineChart Pro] 初始化最後一根K線:',
            this.currentKline
          )
        }

        console.log('✅ 數據載入完成:', klineData.length, '條')
      }
    } catch (error) {
      console.error('❌ 數據載入失敗:', error)
      throw error
    }
  }

  // 設置技術指標
  setupIndicators() {
    const mainPaneId = 'candle_pane' //  klineChart主圖特殊paneId

    if (!this.chart) {
      console.warn('⚠️ 圖表實例不存在,跳過指標設置')
      return
    }

    try {
      let maPaneId: string | undefined

      // 🔧 正確的 API 調用方式創建 MA 指標在主圖上,使用統一配置
      maPaneId = this.chart.createIndicator(this.MA_CONFIG, true, {
        id: mainPaneId,
      }) // true 類似產生圖層 + candle_pane = 添加到主圖,返回也是主圖paneId maPaneId = mainPaneId

      console.log(`✅ MA指標創建成功在主圖,paneId: ${maPaneId}`)

      // 🔧 創建其他指標在子圖中
      this.activeIndicators.add('MA')
      // 🔧 修復:使用實際返回的 paneId,如果沒有則使用預設值
      const actualPaneId = maPaneId || 'candle_pane'
      this.indicatorPanes.set('MA', actualPaneId)

      this.createSubIndicators()

      console.log('✅ 技術指標設置完成')
    } catch (error) {
      console.error('❌ 技術指標設置失敗:', error)
    }
  }

  // 創建子圖指標的輔助方法
  private createSubIndicators() {
    // VOL 指標 - 創建在新的子圖中,使用統一配置
    try {
      const paneId = this.chart.createIndicator(this.VOL_CONFIG, false) // false = 創建新子圖

      this.activeIndicators.add('VOL')
      if (paneId) {
        this.indicatorPanes.set('VOL', paneId)
      }
      console.log('✅ VOL指標創建成功(子圖)')
    } catch (e) {
      console.log('📊 VOL指標創建失敗:', e.message)
    }

    // MACD 指標 - 創建在新的子圖中,使用統一配置
    try {
      const paneId = this.chart.createIndicator(this.MACD_CONFIG, false) // false = 創建新子圖

      this.activeIndicators.add('MACD')
      if (paneId) {
        this.indicatorPanes.set('MACD', paneId)
      }
      console.log('✅ MACD指標創建成功(子圖)', paneId)
    } catch (e) {
      console.log('📊 MACD指標不支援或創建失敗:', e.message)
    }

    // KDJ/KD 指標 - 創建在新的子圖中,使用統一配置
    try {
      const paneId = this.chart.createIndicator(this.KDJ_CONFIG, false) // false = 創建新子圖

      this.activeIndicators.add('KDJ')
      if (paneId) {
        this.indicatorPanes.set('KDJ', paneId)
      }
      console.log('✅ KDJ指標創建成功(子圖)')
    } catch (e) {
      console.log('📊 KDJ指標創建失敗:', e.message)
    }
  }

  // 更新數據
  updateData(data: any, isNewKline: boolean = false) {
    if (this.chart && data) {
      try {
        // 轉換數據格式為 klinecharts 格式
        const klineData = {
          timestamp: data.timestamp,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: data.volume,
        }

        console.log('📊 [KLineChart Pro] 更新數據:', {
          ...klineData,
          是否新K線: isNewKline,
          當前緩存長度: this.klineDataCache.length,
        })

        // 更新本地緩存
        if (isNewKline) {
          // 新 K 線:追加到緩存末尾
          this.klineDataCache.push(klineData)
          console.log(
            '📊 追加新 K 線到緩存,新長度:',
            this.klineDataCache.length
          )
        } else {
          // 更新現有 K 線:替換最後一個元素
          if (this.klineDataCache.length > 0) {
            this.klineDataCache[this.klineDataCache.length - 1] = klineData
            console.log('📊 更新緩存中的最後一根 K 線')
          } else {
            // 如果緩存為空,當作新 K 線處理
            this.klineDataCache.push(klineData)
            console.log('📊 緩存為空,追加為新 K 線')
          }
        }

        // 使用完整緩存更新圖表 - 檢查可用的 API 方法
        if (typeof this.chart.applyNewData === 'function') {
          this.chart.applyNewData(this.klineDataCache)
        } else if (typeof this.chart.loadData === 'function') {
          this.chart.loadData(this.klineDataCache)
        } else {
          console.warn('⚠️ 無可用的數據更新方法')
        }
      } catch (error) {
        console.error('❌ 數據更新失敗:', error)
        console.error('❌ 錯誤詳情:', error.message)
      }
    }
  }

  // 處理 tick 數據並累積到正確的 K 線
  private processTickData(tickData: any) {
    if (!tickData || !tickData.price || !tickData.timestamp) return

    const tickTime = new Date(tickData.timestamp)
    const tickPrice = parseFloat(tickData.price)
    const tickVolume = tickData.volume || 0

    // 計算這個 tick 應該歸屬的 K 線邊界
    const boundary = this.calculateKlineBoundary(tickTime, this.interval)
    const klineStartTime = boundary.startTime.getTime()

    console.log('🔍 [KLineChart Pro] tick處理:', {
      間隔: this.interval,
      tick時間: tickTime.toISOString(),
      K線開始時間: boundary.startTime.toISOString(),
      當前K線開始時間: this.lastKlineStartTime,
      是否新K線: klineStartTime !== this.lastKlineStartTime,
      tickPrice,
      tickVolume,
    })

    // 判斷是否需要創建新 K 線
    if (klineStartTime !== this.lastKlineStartTime || !this.currentKline) {
      // 創建新 K 線
      console.log('📊 [KLineChart Pro] 創建新 K 線')
      this.currentKline = {
        timestamp: klineStartTime,
        open: tickPrice,
        high: tickPrice,
        low: tickPrice,
        close: tickPrice,
        volume: tickVolume,
      }
      this.lastKlineStartTime = klineStartTime

      // 更新圖表(新 K 線)
      this.updateData(this.currentKline, true)
    } else {
      // 更新現有 K 線
      console.log('📊 [KLineChart Pro] 更新現有 K 線:', {
        舊高: this.currentKline.high,
        新高: Math.max(this.currentKline.high, tickPrice),
        舊低: this.currentKline.low,
        新低: Math.min(this.currentKline.low, tickPrice),
        舊量: this.currentKline.volume,
        新量: this.currentKline.volume + tickVolume,
      })

      this.currentKline.high = Math.max(this.currentKline.high, tickPrice)
      this.currentKline.low = Math.min(this.currentKline.low, tickPrice)
      this.currentKline.close = tickPrice
      this.currentKline.volume += tickVolume // 累積成交量

      // 更新圖表(更新現有 K 線)
      this.updateData(this.currentKline, false)
    }
  }

  // 訂閱實時數據
  subscribeRealtime() {
    if (!klineSocketIOService) return

    const handleKlineMessage = (message: KlineMessage) => {
      if (message.type === 'tick') {
        // 使用新的 tick 處理邏輯
        this.processTickData(message.tick)
      } else if (message.type === 'kline_update') {
        const klineData = message.kline
        if (klineData) {
          const updateData = {
            timestamp: new Date(klineData.timestamp).getTime(),
            open: klineData.open,
            high: klineData.high,
            low: klineData.low,
            close: klineData.close,
            volume: klineData.volume || 0,
          }
          this.updateData(updateData)
        }
      }
    }

    console.log(
      '🔄 [KLineChart Pro] 訂閱實時數據:',
      this.symbol,
      '間隔:',
      this.interval
    )
    klineSocketIOService.subscribe(
      this.symbol,
      handleKlineMessage,
      this.interval
    )
  }

  // 更新間隔並重新載入數據
  async updateInterval(newInterval: string) {
    console.log(
      '🔄 [KLineChart Pro] 更新間隔:',
      this.interval,
      '->',
      newInterval
    )

    // 更新間隔
    this.interval = newInterval

    // 重置狀態
    this.currentKline = null
    this.lastKlineStartTime = 0
    this.klineDataCache = []

    // 重新載入數據
    try {
      await this.loadData()
      console.log('✅ [KLineChart Pro] 間隔更新完成')
    } catch (error) {
      console.error('❌ [KLineChart Pro] 間隔更新失敗:', error)
      throw error
    }
  }

  // 🔧 設定語言
  setLocale(locale: string) {
    if (!this.chart) {
      console.warn('⚠️ 圖表實例不存在')
      return
    }

    if (typeof this.chart.setLocale !== 'function') {
      console.warn('⚠️ setLocale 方法不存在')
      return
    }

    try {
      this.chart.setLocale(locale)
      console.log(`✅ 語言切換成功: ${locale}`)
    } catch (error) {
      console.error('❌ 語言切換失敗:', error)
    }
  }

  // 🔧 切換指標顯示/隱藏(Toggle)
  toggleIndicator(
    indicatorName: string,
    type: 'main' | 'sub' = 'sub'
  ): boolean {
    if (!this.chart) {
      console.warn('⚠️ 圖表實例不存在')
      return false
    }

    // 🔧 防止重複點擊
    if (this.toggleInProgress.has(indicatorName)) {
      console.warn(`⚠️ ${indicatorName} 指標正在切換中,請稍候...`)
      return false
    }

    // 標記為進行中
    this.toggleInProgress.add(indicatorName)

    const isActive = this.activeIndicators.has(indicatorName)
    console.log(
      `📊 Toggle ${indicatorName}: 當前狀態=${isActive}, 將切換為=${!isActive}`
    )

    try {
      if (isActive) {
        // 移除指標 - 使用徹底清理方法
        console.log(`📊 開始移除指標: ${indicatorName} (類型: ${type})`)

        // 🔧 使用簡化版移除方法
        const cleanupSuccess = this.removeIndicatorSimple(indicatorName)
        if (cleanupSuccess) {
          // 只有在成功移除後才更新內部狀態
          this.activeIndicators.delete(indicatorName)
          this.indicatorPanes.delete(indicatorName)
          console.log(`✅ 指標移除成功: ${indicatorName}`)
          this.toggleInProgress.delete(indicatorName)
          return true
        } else {
          console.error(`❌ 指標移除失敗: ${indicatorName} - 清理方法失敗`)
          this.toggleInProgress.delete(indicatorName)
          return false
        }
      } else {
        // 創建指標 - 先清理可能存在的同名指標
        console.log(`📊 開始創建指標: ${indicatorName} (類型: ${type})`)

        // 🔧 先清理可能已存在的同名指標,防止重複
        console.log(`🧹 創建前先清理可能存在的 ${indicatorName} 指標`)
        this.removeIndicatorSimple(indicatorName)
        try {
          let paneId: string | undefined

          if (type === 'main') {
            // 主圖指標
            if (indicatorName === 'BOLL') {
              paneId = this.chart.createIndicator('BOLL', true, {
                id: 'candle_pane',
              })
            } else {
              // MA指標使用統一配置
              paneId = this.chart.createIndicator(this.MA_CONFIG, true, {
                id: 'candle_pane',
              })
            }
            if (!paneId) paneId = 'candle_pane'
          } else {
            // 副圖指標 - 根據指標名稱動態創建
            if (indicatorName === 'MACD') {
              paneId = this.chart.createIndicator(this.MACD_CONFIG, false) // false = 創建新子圖
            } else if (indicatorName === 'KDJ') {
              paneId = this.chart.createIndicator(this.KDJ_CONFIG, false) // false = 創建新子圖
            } else if (indicatorName === 'VOL') {
              paneId = this.chart.createIndicator(this.VOL_CONFIG, false) // false = 創建新子圖
            } else {
              // 其他副圖指標使用簡單創建方式
              paneId = this.chart.createIndicator(indicatorName, false)
            }
          }

          // 只有在成功創建後才更新內部狀態
          this.activeIndicators.add(indicatorName)
          if (paneId) {
            this.indicatorPanes.set(indicatorName, paneId)
          }
          console.log(`✅ 指標創建成功: ${indicatorName}, paneId: ${paneId}`)
          this.toggleInProgress.delete(indicatorName)
          return true
        } catch (createError) {
          console.error(`❌ 指標創建失敗 (${indicatorName}):`, createError)
          this.toggleInProgress.delete(indicatorName)
          return false
        }
      }
    } catch (error) {
      console.error(`❌ 指標切換失敗 (${indicatorName}):`, error)
      this.toggleInProgress.delete(indicatorName)
      return false
    }
  }

  // 🔧 檢查指標是否啟用
  isIndicatorActive(indicatorName: string): boolean {
    return this.activeIndicators.has(indicatorName)
  }

  // 🔧 獲取所有啟用的指標
  getActiveIndicators(): string[] {
    return Array.from(this.activeIndicators)
  }

  // 🔧 簡化版指標移除 - 根據 KLineChart 官方文檔
  removeIndicatorSimple(indicatorName: string): boolean {
    if (!this.chart) return false

    console.log(`🧹 開始移除指標: ${indicatorName}`)
    try {
      // 🔧 方法1:使用保存的 pane ID 精確移除
      const paneId = this.indicatorPanes.get(indicatorName)
      if (paneId) {
        console.log(`📊 使用保存的 paneId: ${paneId} 移除 ${indicatorName}`)
        // 🔧 修復:正確的參數順序是 (paneId, name)
        const result = this.chart.removeIndicator(paneId, indicatorName)
        if (result !== false) {
          console.log(`✅ 使用 paneId 成功移除指標: ${indicatorName}`)
          // 強制刷新圖表
          this.chart.resize()
          return true
        }
      }

      // 🔧 方法2:嘗試直接移除指標(只傳入名稱)
      console.log(`📊 嘗試直接移除指標: ${indicatorName}`)
      const result = this.chart.removeIndicator(indicatorName)
      if (result !== false) {
        console.log(`✅ 直接移除成功: ${indicatorName}`)
        // 強制刷新圖表
        this.chart.resize()
        return true
      }

      console.log(`⚠️ 無法移除指標: ${indicatorName}`)
      return false
    } catch (error) {
      console.error(`❌ 移除指標時發生錯誤 (${indicatorName}):`, error)
      return false
    }
  }

  // 銷毀圖表
  destroy() {
    if (this.chart) {
      try {
        // 銷毀圖表實例 - 嘗試不同的銷毀方法
        if (typeof this.chart.dispose === 'function') {
          this.chart.dispose()
        } else if (typeof klinecharts.dispose === 'function') {
          klinecharts.dispose(this.container)
        } else {
          console.warn('⚠️ 無可用的圖表銷毀方法,嘗試手動清理')
          // 手動清理
          this.chart = null
          return
        }
        this.chart = null
        console.log('✅ 圖表銷毀成功')
      } catch (error) {
        console.error('❌ 圖表銷毀失敗:', error)
      }
    }

    if (klineSocketIOService) {
      klineSocketIOService.unsubscribe()
    }
  }
}

export default function KLineChartProComponent({
  symbol,
  symbolName,
  className = '',
  height = 500,
  width,
  interval = '5m',
  enableRealtime = true,
  theme = 'light',
  mainIndicators = ['MA5', 'MA10', 'MA20'], // 🔧 MA線在主圖上
  subIndicators = ['VOL', 'MACD', 'KDJ'], // 🔧 其他指標在子圖中
  onIntervalChange,
}: KLineChartProProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<ProfessionalChart | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isKLineChartReady, setIsKLineChartReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentInterval, setCurrentInterval] = useState(interval)
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(
    new Set() // 🔧 初始化為空,將從圖表實例同步狀態
  )
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean
    reconnectAttempts: number
    lastError: string | null
  }>({
    connected: false,
    reconnectAttempts: 0,
    lastError: null,
  })

  // 載入 KLineChart 基礎版
  useEffect(() => {
    const loadChart = async () => {
      try {
        setIsLoading(true)
        const success = await loadKLineChart()
        if (success) {
          setIsKLineChartReady(true)
          setError(null)
        } else {
          setError('KLineChart 載入失敗,請檢查套件是否已安裝')
        }
      } catch (err) {
        console.error('載入圖表失敗:', err)
        setError('圖表載入失敗')
      } finally {
        setIsLoading(false)
      }
    }

    loadChart()
  }, [])

  // 初始化圖表
  useEffect(() => {
    if (!isKLineChartReady || !chartContainerRef.current || !klinecharts) {
      return
    }

    const initChart = async () => {
      try {
        console.log('🚀 初始化專業K線圖表:', {
          symbol,
          interval: currentInterval,
        })

        // 創建專業圖表實例
        const chart = new ProfessionalChart(
          chartContainerRef.current!,
          symbol,
          currentInterval
        )

        // 初始化圖表
        await chart.init()

        // 設置實時訂閱
        if (enableRealtime) {
          chart.subscribeRealtime()
        }

        chartInstanceRef.current = chart

        // 🔧 同步圖表指標狀態到 UI
        const chartActiveIndicators = chart.getActiveIndicators()
        setActiveIndicators(new Set(chartActiveIndicators))
        console.log(
          '✅ 專業K線圖表初始化完成,同步指標狀態:',
          chartActiveIndicators
        )
      } catch (error) {
        console.error('❌ 圖表初始化失敗:', error)
        setError('圖表初始化失敗: ' + error.message)
      }
    }

    initChart()

    // 清理函數
    return () => {
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.destroy()
          chartInstanceRef.current = null
        } catch (error) {
          console.error('圖表清理失敗:', error)
        }
      }
    }
  }, [isKLineChartReady, symbol, currentInterval, enableRealtime])

  // 處理時間間隔變更
  const handleIntervalChange = useCallback(
    async (newInterval: string) => {
      if (newInterval === currentInterval) return

      console.log('🔄 切換時間間隔:', currentInterval, '->', newInterval)

      // 如果圖表已存在,使用 updateInterval 方法
      if (chartInstanceRef.current) {
        try {
          await chartInstanceRef.current.updateInterval(newInterval)
          setCurrentInterval(newInterval)
          onIntervalChange?.(newInterval)
        } catch (error) {
          console.error('❌ 間隔更新失敗:', error)
          // 如果更新失敗,fallback 到重新創建圖表
          setCurrentInterval(newInterval)
          onIntervalChange?.(newInterval)
        }
      } else {
        // 如果圖表不存在,直接更新狀態(會觸發 useEffect 創建圖表)
        setCurrentInterval(newInterval)
        onIntervalChange?.(newInterval)
      }
    },
    [currentInterval, onIntervalChange]
  )

  // 監聽外部 interval prop 變更
  useEffect(() => {
    if (interval !== currentInterval && chartInstanceRef.current) {
      console.log('🔄 外部 interval 變更:', currentInterval, '->', interval)
      handleIntervalChange(interval)
    }
  }, [interval, currentInterval, handleIntervalChange])

  // 🔧 監聽 Socket.IO 連接狀態
  useEffect(() => {
    if (!klineSocketIOService || !enableRealtime) return

    const checkConnection = () => {
      const status = klineSocketIOService.stats
      setConnectionStatus({
        connected: klineSocketIOService.isConnected,
        reconnectAttempts: status.reconnectAttempts,
        lastError: status.lastError,
      })
    }

    // 初始檢查
    checkConnection()

    // 定期檢查連接狀態
    const statusTimer = setInterval(checkConnection, 3000)

    return () => {
      clearInterval(statusTimer)
    }
  }, [enableRealtime])

  // 🔧 手動重連處理函數
  const handleManualReconnect = useCallback(() => {
    if (klineSocketIOService) {
      console.log('🔄 用戶手動觸發重連')
      klineSocketIOService.forceReconnect()
    }
  }, [])

  // 如果套件未安裝,顯示安裝提示
  if (error) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 ${className}`}
      >
        <div className="p-8 text-center">
          <div className="text-red-500 text-lg font-semibold mb-4">
            ❌ {error}
          </div>
          <div className="text-gray-600 space-y-2">
            <p>請先安裝 KLineChart 套件:</p>
            <code className="bg-gray-100 px-3 py-1 rounded text-sm">
              pnpm add klinecharts
            </code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 圖表標題欄 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {symbol} {symbolName && `(${symbolName})`} 專業K線圖
            </h3>
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-500">
                {currentInterval} K線 • 專業版 (基於 KLineChart) • 台股顏色 •
                繁體中文
                {enableRealtime && ' • 即時更新'}
              </p>

              {/* 🔧 連接狀態指示器 */}
              {enableRealtime && (
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      connectionStatus.connected
                        ? 'bg-green-500'
                        : 'bg-red-500 animate-pulse'
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      connectionStatus.connected
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {connectionStatus.connected ? '已連接' : '連接中斷'}
                  </span>

                  {/* 重連次數顯示 */}
                  {connectionStatus.reconnectAttempts > 0 && (
                    <span className="text-xs text-orange-600">
                      (重連: {connectionStatus.reconnectAttempts})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 控制按鈕群 */}
          <div className="flex space-x-4">
            {/* 時間間隔按鈕 */}
            <div className="flex space-x-2">
              {[
                { value: '1m', label: '1分' },
                { value: '5m', label: '5分' },
                { value: '15m', label: '15分' },
                { value: '60m', label: '1小時' },
                { value: '1d', label: '日線' },
                // { value: '1w', label: '週線' },
                // { value: '1M', label: '月線' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleIntervalChange(item.value)}
                  className={`px-3 py-1 text-xs rounded hover:bg-gray-200 transition-all ${
                    currentInterval === item.value
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* 指標切換按鈕 */}
            <div className="flex space-x-1 border-l pl-4">
              {indicatorOptions.map((item) => {
                const isActive = activeIndicators.has(item.name)
                return (
                  <ChartButton
                    key={item.name}
                    variant="toggle"
                    isActive={isActive}
                    title={`${isActive ? '關閉' : '開啟'} ${item.label} 指標`}
                    onClick={() => {
                      if (chartInstanceRef.current) {
                        // 🔧 呼叫 toggleIndicator 並根據返回值決定是否更新 UI 狀態
                        const success =
                          chartInstanceRef.current.toggleIndicator(
                            item.name,
                            item.type
                          )

                        if (success) {
                          // 🔧 同步圖表實際狀態到 UI
                          const chartActiveIndicators =
                            chartInstanceRef.current.getActiveIndicators()
                          setActiveIndicators(new Set(chartActiveIndicators))
                          console.log(
                            `📊 ${item.name} 指標切換成功,同步狀態:`,
                            chartActiveIndicators
                          )
                        } else {
                          console.warn(`⚠️ ${item.name} 指標切換失敗`)
                        }
                      }
                    }}
                  >
                    {isActive ? '●' : '○'} {item.label}
                  </ChartButton>
                )
              })}
            </div>

            {/* 語言切換按鈕 */}
            <div className="flex space-x-1 border-l pl-4">
              {languageOptions.map((item) => (
                <ChartButton
                  key={item.value}
                  variant="action"
                  title={`切換至${item.label}`}
                  onClick={() => {
                    if (chartInstanceRef.current) {
                      chartInstanceRef.current.setLocale(item.value)
                    }
                  }}
                  className="flex items-center space-x-1"
                >
                  <span>{item.flag}</span>
                  <span>{item.label}</span>
                </ChartButton>
              ))}
            </div>

            {/* 🔧 連接控制按鈕 */}
            {enableRealtime && (
              <div className="flex space-x-1 border-l pl-4">
                <ChartButton
                  variant="action"
                  title="手動重新連接 Socket.IO"
                  onClick={handleManualReconnect}
                  className={`flex items-center space-x-1 ${
                    !connectionStatus.connected
                      ? 'bg-red-100 hover:bg-red-200 text-red-700'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <span>🔄</span>
                  <span>重連</span>
                </ChartButton>

                {connectionStatus.lastError && (
                  <ChartButton
                    variant="action"
                    title={`錯誤信息: ${connectionStatus.lastError}`}
                    onClick={() => {
                      console.log('連接錯誤:', connectionStatus.lastError)
                    }}
                    className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                  >
                    ⚠️
                  </ChartButton>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 圖表容器 */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-gray-500">載入專業圖表中...</div>
          </div>
        )}

        <div
          ref={chartContainerRef}
          className="w-full"
          style={{
            height: `${height}px`,
            width: width ? `${width}px` : '100%',
          }}
        />
      </div>

      {/* 指標說明 */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">主圖指標:</span>
            <div className="flex space-x-2">
              {mainIndicators.map((indicator) => (
                <span
                  key={indicator}
                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                >
                  {indicator}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-600">副圖指標:</span>
            <div className="flex space-x-2">
              {subIndicators.map((indicator) => (
                <span
                  key={indicator}
                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                >
                  {indicator}
                </span>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-500">
            🚀 專業K線圖表 • 基於 KLineChart • 上漲紅⬆️ 下跌綠⬇️
          </div>
        </div>
      </div>
    </div>
  )
}
