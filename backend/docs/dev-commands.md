# Sinotrade API 開發指令

## 🚀 啟動服務

### 開發模式(自動重載) - 推薦
```bash
uv run python scripts/dev.py
```
或
```bash
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 生產模式
```bash
uv run python scripts/start.py
```
或
```bash
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### 自定義端口
```bash
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 3000
```

### 快速啟動 (最簡潔)
```bash
# 開發模式 (推薦)
uv run python scripts/dev.py

# Windows 使用者更簡潔的方式
dev.bat

# 或者直接用 uvicorn
uv run uvicorn src.main:app --reload
```

### Windows 專用簡化指令
```bash
# 開發模式
dev.bat

# 生產模式
start.bat
```

## 🧪 測試相關

### 運行所有測試
```bash
uv run pytest
```

### 運行特定測試檔案
```bash
uv run pytest tests/contract/test_contracts.py
```

### 運行測試並顯示覆蓋率
```bash
uv run pytest --cov=src
```

### 運行測試(詳細輸出)
```bash
uv run pytest -v
```

## 🔧 代碼品質

### 格式化代碼(Black)
```bash
uv run black src/ tests/
```

### 檢查代碼格式
```bash
uv run black --check src/ tests/
```

### 代碼檢查(Ruff)
```bash
uv run ruff check src/ tests/
```

### 自動修復 Ruff 問題
```bash
uv run ruff check --fix src/ tests/
```

### 格式化 + 檢查(一次完成)
```bash
uv run black src/ tests/ && uv run ruff check src/ tests/
```

## 📊 Jupyter Notebook

### 啟動 Jupyter
```bash
uv run jupyter notebook
```

### 啟動 JupyterLab
```bash
uv run jupyter lab
```

## 🔍 依賴管理

### 安裝依賴
```bash
uv sync
```

### 安裝開發依賴
```bash
uv sync --group dev
```

### 添加新依賴
```bash
uv add <package-name>
```

### 添加開發依賴
```bash
uv add --group dev <package-name>
```

### 移除依賴
```bash
uv remove <package-name>
```

### 更新依賴
```bash
uv sync --upgrade
```

### 查看依賴樹
```bash
uv tree
```

## 🐍 Python 環境

### 檢查 Python 版本
```bash
uv run python --version
```

### 進入 Python REPL
```bash
uv run python
```

### 執行 Python 腳本
```bash
uv run python script.py
```

## 🔥 常用組合指令

### 完整代碼檢查和啟動
```bash
uv run black src/ tests/ && uv run ruff check --fix src/ tests/ && uv run python scripts/dev.py
```

### 測試 + 代碼檢查
```bash
uv run pytest && uv run black --check src/ tests/ && uv run ruff check src/ tests/
```

### 快速重置和啟動
```bash
uv sync && uv run python scripts/dev.py
```

## 🌐 API 相關

### 查看 API 文檔
啟動服務後訪問:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 測試 API 端點
```bash
# 測試根端點
curl http://localhost:8000/

# 測試健康檢查
curl http://localhost:8000/health
```

## 🐛 除錯相關

### 啟動除錯模式
```bash
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 --log-level debug
```

### 查看詳細日誌
```bash
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 --access-log
```
