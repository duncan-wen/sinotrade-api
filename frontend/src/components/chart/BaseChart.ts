/**
 * BaseChart.ts - 基礎圖表類 (參考 KLineChartPro 架構)
 *
 * 🎯 設計理念:
 * - 參考 KLineChartPro.ProfessionalChart 的穩定架構
 * - 底層都使用 klinechart 庫
 * - 只在數據源和 WebSocket 部分差異化
 * - 保持核心邏輯的一致性
 */

import {
  zhTWLocale,
  LOCALES,
  DEFAULT_LOCALE,
  themes,
  DEFAULT_THEME,
  type ThemeColors,
  createChartStyles,
  createIndicatorStyles,
} from './klinechart-pro'

// 💡 與 KLineChartPro 完全相同的 klinechart 導入方式
let klinecharts: any = null

export const loadKLineChart = async () => {
  try {
    // 導入基本的 klinecharts - 與 KLineChartPro 完全一致
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

export interface BaseChartConfig {
  symbol: string
  interval: string
  apiEndpoint: string
  enableWebSocket?: boolean // 🔧 WebSocket 功能開關
}

/**
 * BaseChart - 參考 KLineChartPro.ProfessionalChart 的設計
 * 保持與 ProfessionalChart 相同的核心結構和方法
 */
export abstract class BaseChart {
  // 🔧 與 ProfessionalChart 相同的核心屬性
  protected chart: any = null
  protected container: HTMLElement | null = null
  protected symbol: string = ''
  protected interval: string = '1d'
  protected apiEndpoint: string = ''
  protected enableWebSocket: boolean = false

  // 🔧 與 ProfessionalChart 相同的狀態管理
  private currentKline: any = null // 當前正在構建的 K 線
  private lastKlineStartTime: number = 0 // 最後一根 K 線的開始時間
  private klineDataCache: any[] = [] // 本地 K 線數據緩存
  protected activeIndicators: Set<string> = new Set() // 🔧 追踪已啟用的指標
  protected indicatorPanes: Map<string, string> = new Map() // 🔧 追踪指標的 pane ID
  protected toggleInProgress: Set<string> = new Set() // 🔧 防止重複點擊

  // 🎨 與 ProfessionalChart 相同的主題管理
  private theme: keyof typeof themes = DEFAULT_THEME
  private colors: ThemeColors = themes[DEFAULT_THEME]
  private indicatorStyles: ReturnType<typeof createIndicatorStyles>

  constructor(container: HTMLElement, config: BaseChartConfig) {
    this.container = container
    this.symbol = config.symbol
    this.interval = config.interval
    this.apiEndpoint = config.apiEndpoint
    this.enableWebSocket = config.enableWebSocket ?? false

    // 🎨 與 ProfessionalChart 相同的主題初始化
    this.updateTheme(DEFAULT_THEME)

    // 重置狀態 - 與 ProfessionalChart 一致
    this.currentKline = null
    this.lastKlineStartTime = 0
    this.klineDataCache = []
  }

  // 🎨 與 ProfessionalChart 完全相同的主題管理
  private updateTheme(themeName: keyof typeof themes) {
    this.theme = themeName
    this.colors = themes[themeName]
    this.indicatorStyles = createIndicatorStyles(this.colors)
  }

  // 🔧 與 ProfessionalChart 完全相同的指標配置獲取
  protected get MA_CONFIG() {
    return this.indicatorStyles.ma
  }

  protected get MACD_CONFIG() {
    return this.indicatorStyles.macd
  }

  protected get KDJ_CONFIG() {
    return this.indicatorStyles.kdj
  }

  protected get VOL_CONFIG() {
    return this.indicatorStyles.vol
  }

  // 🚀 與 ProfessionalChart 相同的初始化流程
  async init() {
    if (!klinecharts || !this.container) {
      throw new Error('KLineChart not loaded or container not found')
    }

    try {
      // 🔧 與 ProfessionalChart 完全相同的語言包註冊
      klinecharts.registerLocale(LOCALES.ZH_TW, zhTWLocale)

      // 🔧 與 ProfessionalChart 完全相同的圖表創建
      this.chart = klinecharts.init(this.container, {
        locale: DEFAULT_LOCALE, // 設定使用繁體中文
      })

      console.log('📊 圖表實例創建成功:', this.chart)

      // 🎨 與 ProfessionalChart 完全相同的樣式配置
      this.chart.setStyles(createChartStyles(this.colors))

      // 載入數據 - 由子類實現
      await this.loadData()

      // 設置技術指標 - 與 ProfessionalChart 相同
      this.setupIndicators()

      // 初始化 WebSocket (如果啟用) - 由子類實現
      if (this.enableWebSocket) {
        this.initWebSocket?.()
      }

      console.log('✅ 基礎圖表初始化完成')
      return true
    } catch (error) {
      console.error('❌ 圖表初始化失敗:', error)
      throw error
    }
  }

  // 🔧 與 ProfessionalChart 完全相同的指標設置邏輯
  setupIndicators() {
    const mainPaneId = 'candle_pane' // klineChart主圖特殊paneId

    if (!this.chart) {
      console.warn('⚠️ 圖表實例不存在,跳過指標設置')
      return
    }

    try {
      // 🔧 與 ProfessionalChart 完全相同的 MA 指標創建
      const maPaneId = this.chart.createIndicator(this.MA_CONFIG, true, {
        id: mainPaneId,
      })

      console.log(`✅ MA指標創建成功在主圖,paneId: ${maPaneId}`)

      this.activeIndicators.add('MA')
      const actualPaneId = maPaneId || 'candle_pane'
      this.indicatorPanes.set('MA', actualPaneId)

      // 創建子圖指標
      this.createSubIndicators()

      console.log('✅ 技術指標設置完成')
    } catch (error) {
      console.error('❌ 技術指標設置失敗:', error)
    }
  }

  // 🔧 與 ProfessionalChart 完全相同的子圖指標創建
  private createSubIndicators() {
    // VOL 指標
    try {
      const paneId = this.chart.createIndicator(this.VOL_CONFIG, false)
      this.activeIndicators.add('VOL')
      if (paneId) {
        this.indicatorPanes.set('VOL', paneId)
      }
      console.log('✅ VOL指標創建成功(子圖)')
    } catch (e) {
      console.log('📊 VOL指標創建失敗:', e.message)
    }

    // MACD 指標
    try {
      const paneId = this.chart.createIndicator(this.MACD_CONFIG, false)
      this.activeIndicators.add('MACD')
      if (paneId) {
        this.indicatorPanes.set('MACD', paneId)
      }
      console.log('✅ MACD指標創建成功(子圖)')
    } catch (e) {
      console.log('📊 MACD指標創建失敗:', e.message)
    }

    // KDJ 指標
    try {
      const paneId = this.chart.createIndicator(this.KDJ_CONFIG, false)
      this.activeIndicators.add('KDJ')
      if (paneId) {
        this.indicatorPanes.set('KDJ', paneId)
      }
      console.log('✅ KDJ指標創建成功(子圖)')
    } catch (e) {
      console.log('📊 KDJ指標創建失敗:', e.message)
    }
  }

  // 🔧 與 ProfessionalChart 完全相同的指標切換邏輯
  toggleIndicator(
    indicatorName: string,
    type: 'main' | 'sub' = 'sub'
  ): boolean {
    if (!this.chart) {
      console.warn('⚠️ 圖表實例不存在')
      return false
    }

    if (this.toggleInProgress.has(indicatorName)) {
      console.warn(`⚠️ ${indicatorName} 指標正在切換中`)
      return false
    }

    this.toggleInProgress.add(indicatorName)
    const isActive = this.activeIndicators.has(indicatorName)

    try {
      if (isActive) {
        // 移除指標
        const cleanupSuccess = this.removeIndicatorSimple(indicatorName)
        if (cleanupSuccess) {
          this.activeIndicators.delete(indicatorName)
          this.indicatorPanes.delete(indicatorName)
          console.log(`✅ 指標移除成功: ${indicatorName}`)
        }
        this.toggleInProgress.delete(indicatorName)
        return cleanupSuccess
      } else {
        // 創建指標
        this.removeIndicatorSimple(indicatorName) // 先清理

        let paneId: string | undefined
        if (type === 'main') {
          if (indicatorName === 'BOLL') {
            paneId = this.chart.createIndicator('BOLL', true, {
              id: 'candle_pane',
            })
          } else {
            paneId = this.chart.createIndicator(this.MA_CONFIG, true, {
              id: 'candle_pane',
            })
          }
          if (!paneId) paneId = 'candle_pane'
        } else {
          // 副圖指標
          if (indicatorName === 'MACD') {
            paneId = this.chart.createIndicator(this.MACD_CONFIG, false)
          } else if (indicatorName === 'KDJ') {
            paneId = this.chart.createIndicator(this.KDJ_CONFIG, false)
          } else if (indicatorName === 'VOL') {
            paneId = this.chart.createIndicator(this.VOL_CONFIG, false)
          } else {
            paneId = this.chart.createIndicator(indicatorName, false)
          }
        }

        this.activeIndicators.add(indicatorName)
        if (paneId) {
          this.indicatorPanes.set(indicatorName, paneId)
        }
        console.log(`✅ 指標創建成功: ${indicatorName}`)
        this.toggleInProgress.delete(indicatorName)
        return true
      }
    } catch (error) {
      console.error(`❌ 指標切換失敗: ${indicatorName}`, error)
      this.toggleInProgress.delete(indicatorName)
      return false
    }
  }

  // 🔧 與 ProfessionalChart 完全相同的指標移除邏輯
  removeIndicatorSimple(indicatorName: string): boolean {
    if (!this.chart) return false

    try {
      const paneId = this.indicatorPanes.get(indicatorName)
      if (paneId) {
        const result = this.chart.removeIndicator(paneId, indicatorName)
        if (result !== false) {
          this.chart.resize()
          return true
        }
      }

      const result = this.chart.removeIndicator(indicatorName)
      if (result !== false) {
        this.chart.resize()
        return true
      }
      return false
    } catch (error) {
      console.error(`❌ 移除指標錯誤: ${indicatorName}`, error)
      return false
    }
  }

  // 🔧 檢查指標狀態
  isIndicatorActive(indicatorName: string): boolean {
    return this.activeIndicators.has(indicatorName)
  }

  getActiveIndicators(): string[] {
    return Array.from(this.activeIndicators)
  }

  // 🔧 設定語言 - 與 ProfessionalChart 相同
  setLocale(locale: string) {
    if (!this.chart || typeof this.chart.setLocale !== 'function') {
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

  // 🔧 更新股票代號
  async updateSymbol(newSymbol: string) {
    this.symbol = newSymbol
    await this.loadData()
  }

  // 🚀 與 ProfessionalChart 完全相同的銷毀方式
  destroy() {
    if (this.chart) {
      try {
        // 與 KLineChartPro 完全相同的銷毀邏輯
        if (typeof this.chart.dispose === 'function') {
          this.chart.dispose()
        } else if (typeof klinecharts.dispose === 'function') {
          klinecharts.dispose(this.container)
        }
        this.chart = null
        console.log('✅ 圖表銷毀成功')
      } catch (error) {
        console.error('❌ 圖表銷毀失敗:', error)
      }
    }

    // 清理狀態
    this.activeIndicators.clear()
    this.indicatorPanes.clear()
    this.toggleInProgress.clear()
  }

  // 🎯 抽象方法 - 由子類實現差異化功能
  abstract loadData(): Promise<void> // 數據載入 (台股 vs 美股)
  abstract initWebSocket?(): void // WebSocket 初始化 (有 vs 無)
}
