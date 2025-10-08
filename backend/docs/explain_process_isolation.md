# 🔍 Python 進程隔離說明

## 問題分析

您遇到的問題確實是因為 **進程隔離** 導致的。這是 Python 多進程架構的正常行為。

### 🏗️ 架構說明

```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│     FastAPI 進程             │    │    Jupyter Notebook 進程     │
│  (uvicorn process)          │    │   (ipython kernel process)  │
│                             │    │                             │
│  ┌─────────────────────────┐ │    │  ┌─────────────────────────┐ │
│  │   shioaji_service       │ │    │  │   shioaji_service       │ │
│  │   _is_logged_in = True  │ │    │  │   _is_logged_in = False │ │
│  │   實例 ID: 0x7f8a...    │ │    │  │   實例 ID: 0x7f9b...    │ │
│  └─────────────────────────┘ │    │  └─────────────────────────┘ │
│                             │    │                             │
│  獨立的內存空間              │    │  獨立的內存空間              │
└─────────────────────────────┘    └─────────────────────────────┘
```

## 🎯 核心概念

### 1. **單例模式限制**

```python
# 在同一個進程內,shioaji_service 是單例
# 但不同進程間的單例是完全獨立的

# FastAPI 進程中:
shioaji_service._is_logged_in = True   # ✅ 已登錄

# Jupyter 進程中:
shioaji_service._is_logged_in = False  # ❌ 未登錄 (不同實例!)
```

### 2. **進程隔離特性**

- ✅ **內存獨立**: 每個進程有自己的內存空間
- ✅ **狀態獨立**: 變數狀態不會跨進程共享
- ✅ **實例獨立**: 物件實例在不同進程中是獨立的
- ✅ **安全性**: 一個進程崩潰不會影響另一個進程

## 💡 解決方案

### 方案 1: 在 Jupyter 中重新登錄 (推薦)

```python
# 在 Jupyter notebook 中執行:
from src.services.shioaji_service import shioaji_service

# 檢查登錄狀態
print(f"登錄狀態: {shioaji_service._is_logged_in}")

# 重新登錄
shioaji_service.ensure_logged_in()
# 或
shioaji_service.initialize()

print(f"登錄後狀態: {shioaji_service._is_logged_in}")
```

### 方案 2: 使用 FastAPI 的 HTTP API

```python
# 在 Jupyter 中通過 HTTP 調用 FastAPI 服務
import requests

# 調用 scanners API
response = requests.get("http://localhost:8000/api/scanners/ChangePercentRank?count=5")
data = response.json()
print(data)
```

### 方案 3: 共享數據庫或快取

```python
# 使用 Redis 或數據庫來共享狀態
# 但對於 Shioaji 的連接狀態,這不是最佳方案
```

## 🚀 最佳實踐

### 對於開發測試:

1. **FastAPI 服務**: 用於提供 API 接口
2. **Jupyter Notebook**: 用於數據分析和測試,獨立登錄

### 對於生產環境:

1. **單一服務**: 只在 FastAPI 中登錄 Shioaji
2. **API 通信**: 所有操作都通過 HTTP API 進行

## 🔗 驗證進程獨立性

```python
import os

print(f"當前進程 PID: {os.getpid()}")
print(f"ShioajiService 實例 ID: {id(shioaji_service)}")
```

## 📝 總結

您的理解完全正確!這是 Python 多進程的正常行為:

- ✅ FastAPI 和 Jupyter 是不同的進程
- ✅ 每個進程有獨立的 shioaji_service 實例
- ✅ 登錄狀態不會跨進程共享
- ✅ 需要在每個進程中分別登錄

這種設計確保了:

- **安全性**: 進程間互不干擾
- **穩定性**: 一個進程出問題不影響其他進程
- **可維護性**: 每個進程可以獨立管理自己的狀態
