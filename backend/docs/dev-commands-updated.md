# 🚀 Sinotrade API 開發命令指南

## 📋 更新內容 (2025年)

### 🔧 重要變更
- **依賴管理**: 統一使用 `uv sync --extra dev` 安裝完整開發環境
- **Python 版本**: 升級到 Python 3.13.5 支援
- **程式碼品質**: 新增 MyPy、Ruff、Black 等工具

## 🎯 快速命令

### 主要命令 (從專案根目錄)
```bash
# 📦 安裝依賴
sinotrade install          # 安裝所有依賴 (包含開發工具)

# 🚀 開發服務
sinotrade dev              # 啟動開發服務器

# 🔧 類型生成
sinotrade types            # 生成 TypeScript 類型定義

# 🧹 清理
sinotrade clean            # 清理快取和生成的檔案

# ❓ 幫助
sinotrade help             # 顯示幫助訊息
```

### 進階命令
```bash
# 進入 scripts-windows 目錄執行
cd scripts-windows

# 📦 安裝選項
scripts install             # 安裝前端+後端依賴
scripts install-backend     # 只安裝後端依賴
scripts install-frontend    # 只安裝前端依賴

# 🚀 開發服務
scripts dev                 # 同時啟動前後端
scripts dev-backend         # 只啟動後端
scripts dev-frontend        # 只啟動前端

# 🐍 程式碼品質
scripts lint                # 顯示所有 lint 選項
scripts lint format         # 使用 Black 格式化
scripts lint check          # 使用 Ruff 檢查
scripts lint fix            # 使用 Ruff 自動修復
scripts lint mypy           # 使用 MyPy 類型檢查

# 🔧 其他工具
scripts types               # 生成 TypeScript 類型
scripts clean               # 清理檔案
```

## 🛠️ 程式碼品質工具

### 新增的程式碼品質檢查
```bash
# 格式化程式碼
scripts lint format

# 檢查程式碼品質
scripts lint check

# 自動修復問題
scripts lint fix

# 類型檢查
scripts lint mypy

# 運行所有檢查
scripts lint format && scripts lint check && scripts lint mypy
```

### 配置檔案位置
- `backend/pyproject.toml` - Ruff 和 Black 配置
- `backend/mypy.ini` - MyPy 類型檢查配置
- `backend/.isort.cfg` - Import 排序配置
- `.pre-commit-config.yaml` - Git hooks 配置

## 📦 依賴管理

### 新的安裝策略
```bash
# ✅ 推薦:完整開發環境
uv sync --extra dev

# 基本依賴 (不含開發工具)
uv sync

# 生產環境
uv sync --no-extra dev
```

### 依賴結構
```toml
# pyproject.toml
[dependencies]
# 生產依賴: fastapi, uvicorn, shioaji, pandas...

[project.optional-dependencies]
dev = [
    # 開發工具: pytest, mypy, black, ruff, pre-commit...
    "ipykernel>=6.30.1"  # Jupyter 支援
]
```

## 🐍 Python 3.13.5 特性

### 新功能支援
- ✅ 更好的錯誤訊息
- ✅ JIT 編譯器優化
- ✅ 改進的類型檢查
- ✅ 增強的 asyncio 功能

### MyPy 配置
```ini
# backend/mypy.ini
[mypy]
python_version = 3.13
# 嚴格類型檢查設定...

# 第三方庫忽略
[mypy-shioaji.*]
ignore_missing_imports = True
```

## 🔧 VS Code 配置

### 建議的設定
```json
// .vscode/settings.json
{
  "files.associations": {
    "*.py": "python"
  },
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    "**/.venv": true
  }
}
```

### 推薦擴充功能
- Python (ms-python.python)
- Ruff (charliermarsh.ruff)
- Black Formatter (ms-python.black-formatter)
- MyPy Type Checker (ms-python.mypy-type-checker)

## 🚀 開發工作流程

### 建議的工作流程
1. **環境設置**
   ```bash
   sinotrade install      # 安裝依賴
   ```

2. **開發階段**
   ```bash
   sinotrade dev         # 啟動服務器
   # 編寫程式碼...
   scripts lint format   # 格式化
   scripts lint check    # 檢查
   ```

3. **提交前檢查**
   ```bash
   scripts lint format && scripts lint check && scripts lint mypy
   ```

### API 測試
- 📖 API 文檔: http://localhost:8000/docs
- 🧪 測試端點: http://localhost:8000/api/quote/2330
- 🔍 OpenAPI Schema: http://localhost:8000/openapi.json

## 📝 常見問題

### Q: 為什麼需要 --extra dev？
A: 開發工具 (mypy, black, ruff) 在 optional-dependencies 中,需要明確安裝。

### Q: MyPy 報錯怎麼辦？
A: 檢查 `backend/mypy.ini` 配置,第三方庫錯誤通常已被忽略。

### Q: 如何更新依賴？
A: 使用 `uv sync --upgrade --extra dev`

### Q: 程式碼格式化不一致？
A: 統一使用 `scripts lint format` 而非 IDE 自動格式化。

## 🎯 下一步

1. **前端開發**: 設置 React/Next.js 前端
2. **API 擴展**: 添加更多交易相關端點
3. **測試完善**: 增加單元測試和整合測試
4. **部署配置**: 設置 Docker 和 CI/CD

---

**💡 提示**: 這個文檔反映了最新的專案配置。如有疑問,請參考各個配置檔案的實際內容。
