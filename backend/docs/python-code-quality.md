# Python 程式碼品質指南

本文檔說明了專案中使用的 Python 程式碼品質工具和最佳實踐。

## 📋 工具總覽

### 主要工具

- **Black** - 程式碼格式化器
- **Ruff** - 快速的 Python Linter 和格式化器
- **MyPy** - 靜態類型檢查器
- **Pre-commit** - Git hooks 管理工具

### 配置文件

- `pyproject.toml` - 主要配置（Black, Ruff）
- `mypy.ini` - MyPy 配置
- `.pre-commit-config.yaml` - Pre-commit hooks 配置

## 🚀 使用方式

### 命令列使用

```bash
# 格式化程式碼
scripts lint format

# 檢查程式碼品質
scripts lint check

# 自動修復可修復的問題
scripts lint fix

# 類型檢查
scripts lint mypy

# 運行所有 pre-commit hooks
scripts lint pre-commit
```

### IDE 整合

#### VS Code

在 `settings.json` 中添加:

```json
{
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.ruffEnabled": true,
  "python.linting.mypyEnabled": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.ruff": "explicit"
  }
}
```

#### PyCharm

1. 設置 Black 作為格式化器
2. 設置 Ruff 作為外部工具
3. 啟用 MyPy 類型檢查

## 📏 程式碼風格標準

### Black 格式化規則

- 行長度:88 個字符
- 字串引號:雙引號優先
- 尾隨逗號:保留在多行結構中

### Ruff 檢查規則

啟用的規則:

- **E, W** - pycodestyle 錯誤和警告
- **F** - pyflakes
- **I** - isort 匯入排序
- **B** - flake8-bugbear
- **C4** - flake8-comprehensions
- **UP** - pyupgrade

忽略的規則:

- **E501** - 行長度（由 Black 處理）
- **B008** - 參數預設值中的函數呼叫
- **C901** - 複雜度過高

## 🔧 開發工作流程

### 新功能開發

1. 創建功能分支
2. 編寫程式碼
3. 運行格式化和檢查:`scripts lint format && scripts lint check`
4. 修復任何問題
5. 提交程式碼（pre-commit hooks 會自動運行）

### 程式碼審查前

```bash
# 確保所有檢查都通過
scripts lint format
scripts lint check
scripts lint mypy
```

### CI/CD 整合

在 GitHub Actions 或其他 CI 系統中:

```yaml
- name: Run Python Code Quality Checks
  run: |
    scripts lint format --check
    scripts lint check
    scripts lint mypy
```

## 🎯 最佳實踐

### 程式碼組織

```python
# ✅ 好的匯入順序
import os
import sys
from typing import Optional, List

import pandas as pd
import fastapi
from fastapi import HTTPException

from src.models.domain import User
from src.services.auth_service import get_current_user

# ❌ 避免的匯入順序
from src.services.auth_service import get_current_user
import pandas as pd
import os
from fastapi import HTTPException
import sys
```

### 類型提示

```python
# ✅ 使用完整的類型提示
def get_user(user_id: int) -> Optional[User]:
    pass

def process_data(data: List[Dict[str, Any]]) -> pd.DataFrame:
    pass

# ❌ 避免的做法
def get_user(user_id):  # 缺少類型提示
    pass
```

### 錯誤處理

```python
# ✅ 具體的異常類型
try:
    result = risky_operation()
except ValueError as e:
    logger.error(f"Invalid value: {e}")
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")

# ❌ 過於寬泛的異常處理
try:
    result = risky_operation()
except:  # 不要這樣做
    pass
```

## 🔍 常見問題解決

### Ruff 錯誤修復

```bash
# 查看具體錯誤
scripts lint check

# 自動修復
scripts lint fix

# 查看剩餘問題
scripts lint check
```

### MyPy 類型錯誤

```bash
# 查看類型錯誤
scripts lint mypy

# 常見修復方式:
# 1. 添加類型提示
# 2. 使用 Union 類型
# 3. 添加 # type: ignore 註釋（最後手段）
```

### Pre-commit 失敗

```bash
# 查看失敗的 hooks
scripts lint pre-commit

# 修復後重新運行
scripts lint pre-commit
```

## 📚 參考資源

- [Black 官方文檔](https://black.readthedocs.io/)
- [Ruff 規則說明](https://docs.astral.sh/ruff/rules/)
- [MyPy 文檔](https://mypy.readthedocs.io/)
- [PEP 8 風格指南](https://peps.python.org/pep-0008/)
- [Google Python 風格指南](https://google.github.io/styleguide/pyguide.html)
