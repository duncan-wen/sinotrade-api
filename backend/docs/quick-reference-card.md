# 🚀 SinoTrade API - 快速參考卡

## 📊 常用期貨代碼

### 🏆 熱門期貨 (Top 10)

```bash
TXFR1  # 台指期貨近月      ⭐⭐⭐⭐⭐
MXFR1  # 小台指期貨近月    ⭐⭐⭐⭐⭐
CDFR1  # 台積電期貨近月    ⭐⭐⭐⭐⭐
HAFR1  # 鴻海期貨近月      ⭐⭐⭐⭐
PAFR1  # 長榮期貨近月      ⭐⭐⭐⭐
CAFR1  # 富邦金期貨近月    ⭐⭐⭐
GAFR1  # 聯發科期貨近月    ⭐⭐⭐
TMFR1  # 台泥期貨近月      ⭐⭐
CBFR1  # 中信金期貨近月    ⭐⭐
CGFR1  # 台塑期貨近月      ⭐⭐
```

### 📈 股票代碼

```bash
2330   # 台積電            ⭐⭐⭐⭐⭐
2317   # 鴻海              ⭐⭐⭐⭐
2454   # 聯發科            ⭐⭐⭐⭐
2603   # 長榮              ⭐⭐⭐⭐
2881   # 富邦金            ⭐⭐⭐
1101   # 台泥              ⭐⭐
2891   # 中信金            ⭐⭐
1301   # 台塑              ⭐⭐
```

---

## ⚡ API 快速使用

### 📈 K 線數據

```bash
# 期貨日K
GET /api/klines/CDFR1?interval=1d&limit=100

# 股票5分K
GET /api/klines/2330?interval=5m&limit=200

# 技術指標
GET /api/chart-data/TXFR1?interval=1h&limit=50
```

### 🔌 Socket.IO

```javascript
// 連接
import { klineSocketIOService } from "@/services/klineSocketIO";

// 訂閱
klineSocketIOService.subscribe("CDFR1");

// 取消訂閱
klineSocketIOService.unsubscribe();
```

---

## 🕐 時間週期

| 代碼  | 週期    | 代碼 | 週期 |
| ----- | ------- | ---- | ---- |
| `1m`  | 1 分鐘  | `1d` | 日線 |
| `5m`  | 5 分鐘  | `1w` | 週線 |
| `15m` | 15 分鐘 | `1M` | 月線 |
| `1h`  | 1 小時  |      |      |

---

## 🔄 代碼映射

```bash
實際合約     →   標準化代碼
CDFJ5       →   CDFR1
TXFK5       →   TXFR1
HAFV5       →   HAFR1
PAFX5       →   PAFR1
```

---

## ❌ 常見錯誤

| 錯誤                  | 原因     | 解決         |
| --------------------- | -------- | ------------ |
| `Contract not found`  | 代碼錯誤 | 使用標準格式 |
| `Invalid symbol`      | 格式錯誤 | 檢查 R1/R2   |
| `Subscription failed` | 連接問題 | 重新連接     |

---

## 📞 快速測試

### 前端即時報價頁面

```bash
http://localhost:3001/tw-futures
```

### API 文檔

```bash
http://localhost:8000/docs
```

### 健康檢查

```bash
GET http://localhost:8000/health
```

---

## 🔧 開發命令

```bash
# 啟動後端
cd backend && python -m uvicorn src.main:app --reload

# 啟動前端
cd frontend && npm run dev

# 檢查類型
cd backend && python -m mypy src/
```

---

_快速參考 v1.0 | 2025-09-18_
