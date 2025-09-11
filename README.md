# 🚀 Sinotrade API - 程式交易平台

基於 **FastAPI + Next.js** 的金融交易 API 和前端界面,支援台股、期貨、選擇權即時報價與模擬下單。

## 📁 專案結構 (Monorepo)

```
sinotrade-api/
├── backend/                 # Python FastAPI 後端
│   ├── src/                 # 源代碼
│   ├── tests/               # 測試檔案
│   ├── docs/                # 後端文檔
│   ├── scripts/             # 開發腳本
│   └── pyproject.toml       # Python 依賴
├── frontend/                # Next.js React 前端 (規劃中)
│   ├── src/
│   ├── public/
│   └── package.json
├── shared/                  # 共享資源
│   ├── schemas/             # OpenAPI schemas
│   └── types/               # TypeScript 類型定義
├── scripts-windows/         # Windows 批次檔案
│   ├── install.bat
│   ├── dev.bat
│   └── ...
├── sinotrade.bat           # Windows 快速指令
└── Makefile                # Linux/macOS 開發指令
```

## 🛠️ 快速開始

### 安裝依賴
```bash
# Windows (Quick Commands)
sinotrade install          # 安裝後端依賴
# OR: scripts-windows\install.bat

# Linux/macOS
make install               # 安裝所有依賴
make install-backend       # 只安裝後端
```

### 開發服務器
```bash
# Windows (Quick Commands)
sinotrade dev              # 啟動後端開發服務器 (http://localhost:8000)
# OR: scripts-windows\dev.bat

# Linux/macOS
make dev-backend           # http://localhost:8000
make dev-frontend          # http://localhost:3000 (規劃中)
```

### 類型同步
```bash
# Windows (Quick Commands)
sinotrade types            # 從 Python 模型生成 TypeScript 類型
# OR: scripts-windows\types.bat

# Linux/macOS
make types                 # 生成 TypeScript 類型
make types-watch           # 監控模型變更並自動生成
```

### 清理檔案
```bash
# Windows (Quick Commands)
sinotrade clean            # 清理生成的檔案和快取
# OR: scripts-windows\clean.bat

# Linux/macOS
make clean                 # 清理生成的檔案和快取
```

## 🔧 技術棧

### 後端 (已完成)
- **框架**: FastAPI + Uvicorn
- **程式交易**: Shioaji Python SDK
- **資料模型**: Pydantic
- **快取**: 記憶體快取 (可擴展至 Redis)
- **即時數據**: WebSocket

### 前端 (規劃中)
- **框架**: Next.js 14 + TypeScript
- **UI 庫**: Chakra UI v3
- **狀態管理**: Zustand / TanStack Query
- **圖表**: TradingView Charting Library
- **即時數據**: WebSocket 客戶端

### 共享
- **類型安全**: OpenAPI → TypeScript 自動生成
- **API 規範**: OpenAPI 3.1
- **開發工具**: 統一的 Makefile 指令

## 📊 API 功能

### 即時報價
- ✅ 單一商品報價 `/api/quote/{symbol}`
- ✅ 歷史 K 線數據 `/api/klines/{symbol}`
- ✅ WebSocket 即時推送

### 模擬下單 (交易員權限)
- ✅ 市價單 / 限價單
- ✅ 訂單狀態追蹤

### 支援商品
- 📈 **台股**: TSE (上市)、OTC (上櫃)
- 📊 **期貨**: TAIFEX (台指期、小台、電子期等)
- 🎯 **選擇權**: 台指選擇權

## 🔐 認證與權限

- **API 金鑰認證**: `X-API-Key` header
- **角色控制**:
  - `viewer`: 查看報價
  - `trader`: 查看報價 + 模擬下單

## 🚧 開發狀態

| 模組               | 狀態     | 說明                |
| ------------------ | -------- | ------------------- |
| 後端 API           | ✅ 完成   | FastAPI + Shioaji   |
| WebSocket 即時數據 | ✅ 完成   | 報價 + K線推送      |
| 前端界面           | 🚧 規劃中 | Next.js + Chakra UI |
| 交易儀表板         | 📋 待開發 | 即時圖表 + 下單面板 |
| 技術指標           | 📋 待開發 | MACD, RSI, KD       |

## 📝 相關文檔

- [API 文檔](http://localhost:8000/docs) (啟動後端後查看)
- [跨平台開發指南](docs/CROSS-PLATFORM.md) - Windows & Linux/macOS
- [Windows 快速指南](docs/START-HERE-WINDOWS.md) - Windows 專用
- [技術指標架構](backend/docs/technical-indicators-architecture.md)
- [即時圖表實作](backend/docs/realtime-chart-implementation.md)

## 🤝 貢獻

請查看 [開發指南](backend/docs/dev-commands.md) 了解詳細的開發流程。

---

**📧 聯絡**: Sinotrade Team
**🔗 版本**: v0.1.0
