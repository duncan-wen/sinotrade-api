# SinoTrade API 技術指標文檔

## 📚 文檔索引

### 🏗️ 架構設計
- **[技術指標架構文檔](./technical-indicators-architecture.md)** - 完整的系統架構設計和組件說明
- **[Polars 高效能指南](./polars-performance-guide.md)** - Polars + polars_talib 性能優化指南

### 📡 API 使用
- **[技術指標 API 使用指南](./api-technical-indicators.md)** - 完整的 API 端點說明和使用範例

### 🔧 開發指南
- **[K線數據處理](./tick-vs-quote-kline.md)** - Tick、Quote、K線數據的處理說明
- **[市場數據類型](./market-data-types.md)** - 各種市場數據格式說明

## 🚀 快速開始

### 基本 API 呼叫

```bash
# 獲取台積電技術指標
curl -X GET "http://localhost:8000/api/chart/2330?indicators=ma,macd,rsi" \
  -H "X-API-KEY: viewer_api_key"
```

### 高效能多商品計算

```bash
# 同時計算多檔股票 (使用 Polars 引擎)
curl -X GET "http://localhost:8000/api/chart/multi?symbols=2330,2317,2454&indicators=ma,rsi" \
  -H "X-API-KEY: viewer_api_key"
```

## 🎯 核心特色

### ⚡ 雙引擎架構
- **Pandas 引擎**: 穩定相容,適合開發測試
- **Polars 引擎**: 高效能,3-10x 速度提升,適合生產環境

### 📊 完整技術指標
- **移動平均線 (MA)**: 5, 10, 20, 60, 120, 240 期
- **KD 隨機指標**: K, D, J 值
- **MACD 指標**: DIF, DEA, MACD, Histogram
- **布林通道**: 上軌, 中軌, 下軌, 通道寬度
- **RSI 指標**: 6, 12, 24 期

### 🔄 多商品並行
- 最多同時處理 20 個商品
- 自動多核心並行計算
- 記憶體效率優化

## 📈 性能對比

| 特性       | pandas 版本 | **Polars 版本** | 提升 |
| ---------- | ----------- | --------------- | ---- |
| 計算速度   | 基準        | **3-10x 更快**  | 🚀    |
| 記憶體使用 | 基準        | **50-80% 更少** | 💾    |
| 多核心支援 | 有限        | **自動並行**    | ⚡    |
| 多商品處理 | 序列        | **真正並行**    | 🔄    |

## 🛠️ 技術棧

### 後端
- **FastAPI**: 現代 Python Web 框架
- **Polars**: 高效能數據處理
- **polars_talib**: 技術指標計算庫
- **Shioaji**: 永豐金證券 API
- **Pydantic**: 數據驗證和序列化

### 前端
- **Next.js**: React 框架
- **Lightweight Charts**: TradingView 圖表庫
- **TypeScript**: 類型安全
- **Tailwind CSS**: 樣式框架

## 📊 支援的數據源

### 股票市場
- **台股**: TSE (台灣證券交易所)
- **櫃買**: OTC (櫃檯買賣中心)
- **興櫃**: ESB (興櫃股票)

### 衍生性商品
- **期貨**: 台指期、小台指、電子期、金融期
- **選擇權**: 台指選擇權、股票選擇權

### 時間間隔
- **分鐘線**: 1m, 5m, 15m, 30m
- **小時線**: 1h, 4h
- **日線**: 1d
- **週月線**: 1w, 1M

## 🔧 開發環境設定

### 後端設定

```bash
# 安裝依賴
cd backend
uv install

# 設定環境變數
cp .env.example .env
# 編輯 .env 填入 Shioaji API 金鑰

# 啟動服務
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端設定

```bash
# 安裝依賴
cd frontend
pnpm install

# 啟動開發服務
pnpm dev
```

## 📡 API 端點總覽

### 基礎行情
- `GET /api/quote/{symbol}` - 即時報價
- `GET /api/klines/{symbol}` - 歷史 K 線

### 技術指標
- `GET /api/chart/{symbol}` - 單商品技術指標
- `GET /api/chart/multi` - 多商品並行計算

### WebSocket
- `WS /api/ws/quotes` - 即時行情推送

## 🎨 前端整合

### React/TypeScript 範例

```typescript
import { TechnicalIndicatorClient } from '@/services/api';

const client = new TechnicalIndicatorClient();

// 獲取技術指標
const chartData = await client.getSingleChart('2330', {
  indicators: 'ma,macd,rsi',
  limit: 100,
  usePolars: true
});

// 轉換為圖表格式
const lightweightData = convertToLightweightChartsData(chartData.data);
```

### Lightweight Charts 整合

```typescript
// 設置 K 線圖
candlestickSeries.setData(lightweightData.candlestick);

// 設置技術指標
ma20Series.setData(lightweightData.ma['20']);
rsiSeries.setData(lightweightData.rsi['14']);
macdSeries.setData(lightweightData.macd.histogram);
```

## 🔍 故障排除

### 常見問題

1. **API 回應慢**
   - 使用 Polars 引擎 (`use_polars=true`)
   - 減少指標數量
   - 降低數據量 (`limit` 參數)

2. **記憶體不足**
   - 分批處理多商品
   - 使用流式處理
   - 檢查記憶體洩漏

3. **計算結果為 null**
   - 檢查數據量是否足夠
   - 確認指標參數設定
   - 查看日誌錯誤訊息

### 日誌查看

```bash
# 後端日誌
tail -f backend/logs/app.log

# 開發模式日誌
uv run uvicorn src.main:app --reload --log-level debug
```

## 🤝 貢獻指南

### 添加新技術指標

1. 更新數據模型 (`technical_indicators.py`)
2. 實作計算邏輯 (pandas + Polars 版本)
3. 更新 API 端點
4. 添加前端類型定義
5. 更新文檔

### 性能優化

1. 使用 Polars 懶惰求值
2. 實作並行計算 (`over()` 語法)
3. 優化數據類型
4. 添加快取機制

## 📞 技術支援

### 聯絡方式
- **GitHub Issues**: [項目 Issues](https://github.com/your-repo/issues)
- **文檔問題**: 請在對應文檔頁面提出
- **性能問題**: 請提供詳細的測試數據

### 相關資源
- [Shioaji 官方文檔](https://sinotrade.github.io/zh/)
- [Polars 官方文檔](https://pola-rs.github.io/polars/)
- [Lightweight Charts 文檔](https://tradingview.github.io/lightweight-charts/)

---

## 📄 授權條款

本項目採用 MIT 授權條款。詳見 [LICENSE](../LICENSE) 文件。

---

*最後更新: 2024-09-14*
*版本: 1.0.0*
