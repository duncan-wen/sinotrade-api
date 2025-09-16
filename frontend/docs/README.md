# SinoTrade Frontend 文檔

歡迎來到 SinoTrade 交易平台前端文檔！

## 📚 文檔目錄

### 🎨 設計系統
- [響應式設計指南](./responsive-design.md) - RWD 實作與最佳實踐
- [佈局系統](./layout-system.md) - MainLayout 與 Sidebar 使用指南
- [元件庫指南](./components.md) - UI 元件使用說明

### 🛠️ 開發指南
- [開發環境設置](./development-setup.md) - 本地開發環境配置
- [程式碼規範](./coding-standards.md) - TypeScript/React 編碼規範
- [測試指南](./testing-guide.md) - 單元測試與 E2E 測試

### 📊 功能文檔
- [圖表系統](./chart-system.md) - TradingChart 元件使用指南
- [狀態管理](./state-management.md) - Zustand 狀態管理實踐
- [API 整合](./api-integration.md) - 後端 API 整合說明

## 🚀 快速開始

1. **安裝依賴**
   ```bash
   cd frontend
   npm install
   ```

2. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

3. **查看響應式設計**
   - 桌面版：http://localhost:3000 (1920px+)
   - 平板版：調整瀏覽器至 768px
   - 手機版：調整瀏覽器至 375px

## 🎯 核心特性

- ✅ **完全響應式設計** - 支援手機、平板、桌面
- ✅ **模組化元件架構** - 可重用的 UI 元件
- ✅ **TypeScript 支援** - 完整的類型安全
- ✅ **現代化技術棧** - Next.js 15 + React 18 + TailwindCSS
- ✅ **效能優化** - 代碼分割與懶加載
- ✅ **無障礙設計** - WCAG 2.1 AA 標準

## 📱 響應式斷點

| 裝置類型 | 螢幕寬度 | Tailwind 類別 | 主要特性 |
|---------|---------|-------------|---------|
| 手機 | < 640px | `(default)` | 單列佈局、覆蓋式側邊欄 |
| 小平板 | 640px+ | `sm:` | 雙列卡片、簡化導航 |
| 平板 | 768px+ | `md:` | 多列佈局、完整功能 |
| 小桌面 | 1024px+ | `lg:` | 固定側邊欄、大圖表 |
| 桌面 | 1280px+ | `xl:` | 最佳佈局、最大圖表 |
| 大桌面 | 1536px+ | `2xl:` | 寬螢幕優化 |

## 🔗 相關連結

- [產品需求文檔](../../docs/FRONTEND-TECH-STACK.md)
- [技術架構關係圖](../../docs/TECH-ARCHITECTURE-RELATIONSHIPS.md)
- [環境設置指南](../../docs/ENVIRONMENT-SETUP.md)

---

*最後更新：2024年9月*
