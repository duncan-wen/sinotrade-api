# 開發環境設置

本文檔說明如何設置 SinoTrade 交易平台前端的開發環境,包括必要的工具安裝、環境配置和開發工作流程。

## 📋 目錄

- [系統需求](#系統需求)
- [環境安裝](#環境安裝)
- [專案設置](#專案設置)
- [開發工具](#開發工具)
- [常用指令](#常用指令)
- [除錯指南](#除錯指南)

## 💻 系統需求

### 最低需求

- **作業系統**:Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **Node.js**:v18.17.0 或更新版本
- **記憶體**:8GB RAM
- **儲存空間**:5GB 可用空間
- **瀏覽器**:Chrome 90+, Firefox 88+, Safari 14+

### 推薦配置

- **Node.js**:v20.x LTS
- **記憶體**:16GB RAM
- **儲存空間**:SSD 硬碟
- **螢幕解析度**:1920x1080 或更高

## 🛠️ 環境安裝

### 1. Node.js 安裝

#### 使用 Node Version Manager (推薦)

```bash
# 安裝 nvm (Linux/macOS)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安裝 nvm (Windows - 使用 nvm-windows)
# 下載並安裝:https://github.com/coreybutler/nvm-windows

# 安裝 Node.js LTS
nvm install --lts
nvm use --lts

# 驗證安裝
node --version  # v20.x.x
npm --version   # 10.x.x
```

#### 直接安裝

```bash
# 下載並安裝 Node.js LTS
# https://nodejs.org/

# 驗證安裝
node --version
npm --version
```

### 2. 套件管理器安裝

```bash
# 安裝 pnpm (推薦)
npm install -g pnpm

# 或使用 yarn
npm install -g yarn

# 驗證安裝
pnpm --version  # 8.x.x
```

### 3. 開發工具

#### Visual Studio Code (推薦)

```bash
# 下載並安裝 VS Code
# https://code.visualstudio.com/

# 必要擴充套件
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension ms-playwright.playwright
```

#### 其他編輯器

- **WebStorm**:完整的 IDE 支援
- **Sublime Text**:輕量級編輯器
- **Vim/Neovim**:終端編輯器

## 📁 專案設置

### 1. 複製專案

```bash
# 複製專案
git clone https://github.com/your-org/sinotrade-api.git
cd sinotrade-api

# 切換到前端目錄
cd frontend
```

### 2. 安裝依賴

```bash
# 使用 pnpm (推薦)
pnpm install

# 或使用 npm
npm install

# 或使用 yarn
yarn install
```

### 3. 環境變數設置

```bash
# 複製環境變數範本
cp .env.example .env.local

# 編輯環境變數
# 設置 API 端點、第三方服務金鑰等
```

### 4. 啟動開發伺服器

```bash
# 啟動前端開發伺服器
pnpm dev

# 或
npm run dev

# 前端將在 http://localhost:3000 啟動
```

## 🔧 開發工具

### VS Code 設置

#### 必要擴充套件

```json
// .vscode/extensions.json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-playwright.playwright",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

#### 工作區設置

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.experimental.classRegex": [
    ["className\\s*=\\s*[\"']([^\"']*)[\"']", "([^\"']*)"]
  ],
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### Prettier 設置

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### ESLint 設置

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

## 🚀 常用指令

### 開發指令

```bash
# 啟動開發伺服器
pnpm dev

# 建構生產版本
pnpm build

# 啟動生產伺服器
pnpm start

# 型別檢查
pnpm type-check

# 程式碼檢查
pnpm lint

# 程式碼格式化
pnpm format

# 執行測試
pnpm test

# 執行 E2E 測試
pnpm test:e2e
```

### 專案管理指令

```bash
# 新增依賴
pnpm add package-name

# 新增開發依賴
pnpm add -D package-name

# 移除依賴
pnpm remove package-name

# 更新依賴
pnpm update

# 檢查過時依賴
pnpm outdated
```

### Git 工作流程

```bash
# 建立新功能分支
git checkout -b feature/new-feature

# 提交變更
git add .
git commit -m "feat: add new trading chart component"

# 推送到遠端
git push origin feature/new-feature

# 建立 Pull Request
# 透過 GitHub/GitLab 介面
```

## 🔍 除錯指南

### 1. 常見問題

#### Node.js 版本問題

```bash
# 檢查 Node.js 版本
node --version

# 如果版本過舊,升級到 LTS
nvm install --lts
nvm use --lts
```

#### 依賴安裝問題

```bash
# 清除 node_modules 和鎖定檔案
rm -rf node_modules
rm pnpm-lock.yaml

# 重新安裝
pnpm install
```

#### TypeScript 錯誤

```bash
# 重新啟動 TypeScript 服務
# VS Code: Ctrl+Shift+P -> "TypeScript: Restart TS Server"

# 檢查型別
pnpm type-check
```

#### 樣式問題

```bash
# 重新建構 TailwindCSS
pnpm dev  # 開發模式會自動重建
```

### 2. 開發伺服器問題

```bash
# 檢查連接埠是否被佔用
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# 使用不同連接埠
pnpm dev -- --port 3001
```

### 3. 瀏覽器偵錯

```javascript
// 在元件中加入偵錯點
console.log('Debug info:', { data, props })

// 使用 React DevTools
// Chrome 擴充套件:React Developer Tools
```

### 4. 效能分析

```bash
# 分析打包大小
pnpm build
pnpm analyze

# 檢查運行時效能
# Chrome DevTools -> Performance tab
```

## 📊 監控與分析

### 1. 建構分析

```bash
# 分析打包檔案大小
pnpm build && pnpm analyze

# 檢查未使用的依賴
npx depcheck
```

### 2. 效能監控

```typescript
// 使用 Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getFCP(console.log)
getLCP(console.log)
getTTFB(console.log)
```

### 3. 錯誤追蹤

```typescript
// 錯誤邊界元件
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // 發送到錯誤追蹤服務
  }
}
```

## 🔐 安全性設置

### 1. 環境變數管理

```bash
# .env.local (不要提交到版本控制)
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-here
```

### 2. 依賴安全性檢查

```bash
# 檢查已知漏洞
npm audit

# 自動修復
npm audit fix

# 使用 pnpm
pnpm audit
```

## 📚 參考資源

### 官方文檔

- [Next.js 文檔](https://nextjs.org/docs)
- [React 文檔](https://react.dev/)
- [TailwindCSS 文檔](https://tailwindcss.com/docs)
- [TypeScript 文檔](https://www.typescriptlang.org/docs/)

### 社群資源

- [React Native Web](https://necolas.github.io/react-native-web/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/)

### 工具與服務

- [Vercel](https://vercel.com/) - 部署平台
- [Playwright](https://playwright.dev/) - E2E 測試
- [Prettier](https://prettier.io/) - 程式碼格式化
- [ESLint](https://eslint.org/) - 程式碼檢查

---

*最後更新:2024年9月*
*責任工程師:Frontend Team*
