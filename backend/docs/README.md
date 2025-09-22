# 📚 SinoTrade API - 文檔中心

歡迎來到 SinoTrade API 文檔中心!這裡包含了所有你需要的技術文檔和使用指南。

## 📋 文檔目錄

### 🚀 快速開始

- **[快速參考卡](./quick-reference-card.md)** - 最常用的代碼和 API,一頁搞定
- **[商品代碼使用手冊](./symbol-usage-guide.md)** - 完整的期貨和股票代碼使用指南

### 📊 商品代碼參考

- **[期貨商品代碼完整參考](./futures-symbols-reference.md)** - 200+ 種期貨商品詳細列表
- **[股票代碼規範](./symbol-usage-guide.md#股票代碼規範)** - 上市上櫃股票代碼說明

### 🛠️ 開發指南

- **[後端開發參考](./backend-development-reference.md)** - 後端開發環境和工具使用指南

## 📈 支援的商品類型

### 🔄 期貨商品

| 類別     | 數量 | 代碼格式   | 範例             |
| -------- | ---- | ---------- | ---------------- |
| 指數期貨 | 10+  | `xxxR1/R2` | `TXFR1`, `MXFR1` |
| 個股期貨 | 100+ | `xxxR1/R2` | `CDFR1`, `HAFR1` |
| ETF 期貨 | 20+  | `xxxR1/R2` | `ETFR1`          |
| 商品期貨 | 50+  | `xxxR1/R2` | `GCFR1`          |
| 外匯期貨 | 10+  | `xxxR1/R2` | `USDR1`          |

### 📊 股票商品

| 市場           | 數量 | 代碼格式  | 範例           |
| -------------- | ---- | --------- | -------------- |
| 上市股票 (TSE) | 900+ | `4位數字` | `2330`, `2317` |
| 上櫃股票 (OTC) | 700+ | `4位數字` | `6488`, `4968` |

## 🔗 API 端點概覽

### 📈 K 線數據

```
GET /api/klines/{symbol}?interval={period}&limit={count}
```

### 📊 技術指標

```
GET /api/chart-data/{symbol}?interval={period}&limit={count}
```

### ⚡ 即時訂閱

```javascript
// Socket.IO 訂閱
klineSocketIOService.subscribe(symbol);
```

## 🎯 使用場景

### 💼 交易策略開發

- 即時價格監控
- 技術指標分析
- 歷史數據回測

### 📊 金融數據分析

- 多商品比較
- 趨勢分析
- 風險評估

### 🔄 自動化交易

- 程式交易
- 套利策略
- 風險管理

## 🚀 快速體驗

### 1️⃣ 啟動服務

```bash
# 後端
cd backend && python -m uvicorn src.main:app --reload

# 前端
cd frontend && npm run dev
```

### 2️⃣ 測試 API

```bash
# 取得台積電期貨日K線
curl "http://localhost:8000/api/klines/CDFR1?interval=1d&limit=10"
```

### 3️⃣ 前端測試

訪問:`http://localhost:3000/test-socketio`

## 📞 技術支援

### 🐛 問題回報

如遇到問題,請提供:

- 使用的商品代碼
- API 請求內容
- 錯誤訊息
- 預期結果

### 📖 相關資源

- [Shioaji API 官方文檔](https://sinotrade.github.io/)
- [台灣期貨交易所](https://www.taifex.com.tw/)
- [臺灣證券交易所](https://www.twse.com.tw/)

## 🔄 版本資訊

| 版本   | 日期       | 主要功能                     |
| ------ | ---------- | ---------------------------- |
| v1.0.0 | 2025-09-18 | 通用期貨支援、標準化代碼格式 |

## 📝 貢獻指南

歡迎貢獻文檔改進:

1. 發現錯誤或遺漏
2. 提出功能建議
3. 分享使用經驗
4. 補充代碼範例

---

_📅 最後更新:2025-09-18_
_🏢 SinoTrade API 開發團隊_
