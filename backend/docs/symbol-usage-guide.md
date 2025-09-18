# 📈 SinoTrade API - 商品代碼使用手冊

## 📋 目錄

- [期貨代碼規範](#期貨代碼規範)
- [股票代碼規範](#股票代碼規範)
- [API 使用範例](#api-使用範例)
- [Socket.IO 訂閱](#socketio-訂閱)
- [錯誤處理](#錯誤處理)
- [常見問題](#常見問題)

---

## 🔄 期貨代碼規範

### 標準化期貨代碼格式

本系統採用 **`群組名稱 + R1/R2`** 的標準化格式：

| 格式    | 說明     | 範例             |
| ------- | -------- | ---------------- |
| `xxxR1` | 近月合約 | `TXFR1`, `CDFR1` |
| `xxxR2` | 次月合約 | `TXFR2`, `CDFR2` |

### 🏆 主要期貨商品

#### **指數期貨**

```
TXFR1  # 台指期貨近月
TXFR2  # 台指期貨次月
MXFR1  # 小台指期貨近月
MXFR2  # 小台指期貨次月
```

#### **個股期貨**

```
CDFR1  # 台積電期貨近月 (2330)
CDFR2  # 台積電期貨次月 (2330)
TMFR1  # 台泥期貨近月 (1101)
TMFR2  # 台泥期貨次月 (1101)
PAFR1  # 長榮期貨近月 (2603)
PAFR2  # 長榮期貨次月 (2603)
```

#### **其他期貨商品**

```
# 電子業
GAFR1  # 聯發科期貨近月 (2454)
HAFR1  # 鴻海期貨近月 (2317)

# 金融業
CAFR1  # 富邦金期貨近月 (2881)
CBFR1  # 中信金期貨近月 (2891)

# 石化業
CGFR1  # 台塑期貨近月 (1301)
CHFR1  # 南亞期貨近月 (1303)
```

### 🔄 自動映射機制

系統會自動將實際合約代碼映射到標準化符號：

```
實際合約代碼 → 標準化符號
CDFJ5       → CDFR1  (台積電期貨10月)
TXFK5       → TXFR1  (台指期貨11月)
MXFL5       → MXFR1  (小台指期貨12月)
```

### 📅 月份代碼對照表

| 月份 | 代碼 | 月份  | 代碼 |
| ---- | ---- | ----- | ---- |
| 1 月 | A    | 7 月  | G    |
| 2 月 | B    | 8 月  | H    |
| 3 月 | C    | 9 月  | I    |
| 4 月 | D    | 10 月 | J    |
| 5 月 | E    | 11 月 | K    |
| 6 月 | F    | 12 月 | L    |

---

## 📊 股票代碼規範

### 標準股票代碼

```
2330  # 台積電
2317  # 鴻海
2454  # 聯發科
1101  # 台泥
2603  # 長榮
2881  # 富邦金
2891  # 中信金
```

### 市場分類

#### **上市股票 (TSE)**

```
2330  # 台積電
2317  # 鴻海
2454  # 聯發科
1101  # 台泥
```

#### **上櫃股票 (OTC)**

```
6488  # 環球晶圓
4968  # 立積電子
6279  # 胡連電子
```

---

## 🚀 API 使用範例

### 📈 歷史 K 線數據

```bash
# 期貨 K 線
GET /api/klines/CDFR1?interval=1d&limit=100
GET /api/klines/TXFR1?interval=5m&limit=200

# 股票 K 線
GET /api/klines/2330?interval=1d&limit=100
GET /api/klines/2317?interval=1h&limit=50
```

### 📊 技術指標數據

```bash
# 期貨技術指標
GET /api/chart-data/CDFR1?interval=1d&limit=100
GET /api/chart-data/TXFR1?interval=5m&limit=200

# 股票技術指標
GET /api/chart-data/2330?interval=1d&limit=100
GET /api/chart-data/2317?interval=1h&limit=50
```

### 🔍 支援的時間週期

| 週期代碼 | 說明    | 週期代碼 | 說明 |
| -------- | ------- | -------- | ---- |
| `1m`     | 1 分鐘  | `1d`     | 日線 |
| `5m`     | 5 分鐘  | `1w`     | 週線 |
| `15m`    | 15 分鐘 | `1M`     | 月線 |
| `1h`     | 1 小時  |          |      |

---

## ⚡ Socket.IO 訂閱

### 🔌 連接建立

```javascript
import { klineSocketIOService } from "@/services/klineSocketIO";

// 檢查連接狀態
const isConnected = klineSocketIOService.isConnected();
```

### 📡 期貨訂閱

```javascript
// 訂閱台積電期貨
klineSocketIOService.subscribe("CDFR1");

// 訂閱台指期貨
klineSocketIOService.subscribe("TXFR1");

// 取消訂閱
klineSocketIOService.unsubscribe();
```

### 📡 股票訂閱

```javascript
// 訂閱台積電股票
klineSocketIOService.subscribe("2330");

// 訂閱鴻海股票
klineSocketIOService.subscribe("2317");
```

### 📨 消息處理

```javascript
// 監聽 K 線更新
klineSocketIOService.onKlineUpdate((message) => {
  console.log("K線更新:", message);
  // message.symbol - 商品代碼
  // message.data - K線數據
});

// 監聽 Tick 更新
klineSocketIOService.onTickUpdate((message) => {
  console.log("Tick更新:", message);
  // message.tick.price - 最新價格
  // message.tick.volume - 成交量
});
```

---

## ❌ 錯誤處理

### 常見錯誤代碼

| 錯誤碼                  | 說明         | 解決方案             |
| ----------------------- | ------------ | -------------------- |
| `Contract not found`    | 找不到合約   | 檢查代碼格式是否正確 |
| `Invalid symbol format` | 代碼格式錯誤 | 使用標準化格式       |
| `Subscription failed`   | 訂閱失敗     | 檢查網路連接和權限   |

### 錯誤處理範例

```javascript
try {
  await klineSocketIOService.subscribe("CDFR1");
} catch (error) {
  if (error.message.includes("Contract not found")) {
    console.error("期貨合約不存在，請檢查代碼");
  } else if (error.message.includes("Subscription failed")) {
    console.error("訂閱失敗，請重試");
  }
}
```

---

## ❓ 常見問題

### Q: 如何知道某個期貨是否支援？

A: 系統支援 Shioaji 提供的所有期貨商品（200+ 種）。如果不確定，可以嘗試使用標準化格式 `群組名R1`。

### Q: 為什麼我用 `CDFJ5` 卻收到 `CDFR1` 的數據？

A: 系統會自動將實際合約代碼映射到標準化符號，這樣可以確保數據的一致性和連續性。

### Q: 近月和次月合約有什麼區別？

A:

- **近月 (R1)**：最接近到期的合約，流動性通常較好
- **次月 (R2)**：下一個到期的合約，適合長期持有

### Q: 如何切換不同的期貨商品？

A: 在前端測試頁面使用下拉選單選擇，或直接使用 API 傳入不同的標準化代碼。

### Q: 系統會自動處理合約轉倉嗎？

A: 是的，系統會根據交割日期自動選擇最合適的合約，無需手動處理。

---

## 📝 更新日誌

### 版本 1.0.0 (2025-09-18)

- ✅ 新增通用期貨處理邏輯
- ✅ 支援標準化 `*R1/*R2` 格式
- ✅ 自動實際合約映射
- ✅ 完整的錯誤處理機制
- ✅ Socket.IO 即時訂閱支援

---

## 📞 技術支援

如有任何問題，請參考：

- [API 文檔](./api-technical-indicators.md)
- [開發指令](./dev-commands.md)
- [即時圖表實作](./realtime-chart-implementation.md)

---

_最後更新：2025-09-18_
