# 🚀 Sinotrade 開發命令指南

## 新增的開發命令

### 🎯 單獨啟動命令

#### 1. 僅啟動前端
```bash
sinotrade frontend
```
- 啟動 Next.js 開發服務器
- 前端地址：http://localhost:3000
- 適用於：前端開發、UI 調試

#### 2. 僅啟動後端
```bash
sinotrade backend
```
- 啟動 FastAPI 開發服務器
- API 地址：http://localhost:8000
- API 文檔：http://localhost:8000/docs
- 適用於：API 開發、後端測試

#### 3. 全棧開發（推薦）
```bash
sinotrade fullstack
```
- **同時啟動前端和後端**
- 在兩個獨立的 CMD 窗口中運行
- 前端：http://localhost:3000
- 後端：http://localhost:8000
- 適用於：完整的全棧開發

### 🔄 向後兼容

#### 4. 傳統命令（僅後端）
```bash
sinotrade dev
```
- 保持舊版本兼容性
- 僅啟動後端服務器
- 會提示使用新命令

## 📋 完整命令列表

```bash
sinotrade help         # 顯示所有可用命令
sinotrade install      # 安裝後端依賴
sinotrade frontend     # 僅啟動前端
sinotrade backend      # 僅啟動後端
sinotrade fullstack    # 啟動前端+後端
sinotrade dev          # 傳統命令（僅後端）
sinotrade types        # 生成 TypeScript 類型
sinotrade clean        # 清理緩存文件
```

## 🛠️ 開發流程建議

### 全棧開發
```bash
# 推薦：一次啟動所有服務
sinotrade fullstack
```

### 前端專注開發
```bash
# 僅開發前端界面
sinotrade frontend
```

### 後端 API 開發
```bash
# 僅開發 API 和數據處理
sinotrade backend
```

### 測試 API
```bash
# 啟動後端後訪問
http://localhost:8000/docs  # Swagger UI
http://localhost:8000/redoc # ReDoc
```

## 🔧 故障排除

### 端口衝突
- 前端：3000
- 後端：8000
- 確保這些端口未被其他程序占用

### 依賴問題
```bash
# 重新安裝依賴
sinotrade install
cd frontend && pnpm install
```

### 清理緩存
```bash
sinotrade clean
```
