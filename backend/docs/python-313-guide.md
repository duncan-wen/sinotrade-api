# Python 3.13.5 配置指南

本文檔說明專案針對 Python 3.13.5 的特別配置和最佳實踐。

## 📋 Python 3.13.5 新特性

### 主要改進

- **更好的錯誤訊息**: 更清晰的異常追蹤和錯誤描述
- **性能優化**: JIT 編譯器改進,全域解釋器鎖 (GIL) 優化
- **新的語言特性**: 更好的模式匹配、類型參數語法改進
- **標準庫改進**: asyncio、typing、pathlib 等模組的增強

### 對開發的影響

- 更快的程式執行速度
- 更好的開發體驗(錯誤訊息)
- 新的語言語法支援
- 改進的並發處理能力

## 🔧 配置調整

### 工具版本更新

所有工具已更新以支援 Python 3.13:

```toml
# pyproject.toml
requires-python = ">=3.13"
target-version = "py313"  # Black 和 Ruff
```

```ini
# mypy.ini
python_version = 3.13
```

```yaml
# .pre-commit-config.yaml
language_version: python3.13
```

### 新增的 Lint 規則

針對 Python 3.13 新增的規則:

```toml
[tool.ruff.lint]
select = [
    # ... 現有規則
    "RUF", # ruff-specific rules (包含 Python 3.13 支援)
    "FA",  # flake8-future-annotations
    "T10", # flake8-debugger
    "T20", # flake8-print
]
```

### MyPy 增強配置

```ini
[mypy]
# ... 現有配置
enable_error_code = [
    "truthy-bool",
    "redundant-expr",
    "possibly-unbound-variable",
    "used-before-def",
]
extra_checks = True
```

## 🚀 Python 3.13 最佳實踐

### 1. 利用新的類型語法

```python
# ✅ Python 3.13 支援的泛型語法
from typing import TypeVar, Generic

T = TypeVar('T')

class Container(Generic[T]):
    def __init__(self, value: T) -> None:
        self.value = value

    def get(self) -> T:
        return self.value

# ✅ 更好的類型別名
type Point = tuple[float, float]
type Points = list[Point]
```

### 2. 使用改進的錯誤處理

Python 3.13 的錯誤訊息更加清晰:

```python
# 錯誤訊息會更精確地指出問題位置
def process_data(data: list) -> dict:
    try:
        # 一些處理邏輯
        result = {}
        for item in data:
            if not isinstance(item, dict):
                raise ValueError(f"Expected dict, got {type(item)}")
            result.update(item)
        return result
    except Exception as e:
        # Python 3.13 會提供更好的錯誤上下文
        raise RuntimeError(f"Data processing failed: {e}") from e
```

### 3. 利用 asyncio 改進

```python
import asyncio
from typing import AsyncGenerator

# ✅ 更好的異步生成器支援
async def async_data_stream() -> AsyncGenerator[dict, None]:
    for i in range(100):
        yield {"id": i, "data": f"item_{i}"}
        await asyncio.sleep(0.1)

# ✅ 使用 TaskGroup (Python 3.11+ 增強)
async def process_multiple_tasks():
    async with asyncio.TaskGroup() as tg:
        for i in range(5):
            tg.create_task(process_item(i))
```

### 4. 模式匹配增強

```python
# ✅ 更強大的模式匹配
def handle_response(response):
    match response:
        case {"status": "success", "data": data}:
            return process_success(data)
        case {"status": "error", "message": msg, "code": code}:
            return handle_error(code, msg)
        case {"status": status, **rest} if status not in ["success", "error"]:
            return handle_unknown_status(status, rest)
        case _:
            raise ValueError("Invalid response format")
```

### 5. 更好的路徑處理

```python
from pathlib import Path

# ✅ 使用 Path 的新方法
def process_files(directory: str | Path) -> list[Path]:
    dir_path = Path(directory)

    # Python 3.13 中更高效的路徑操作
    return [
        file for file in dir_path.rglob("*.py")
        if file.stat().st_size > 0  # 更好的檔案資訊獲取
    ]
```

## 🔍 程式碼品質檢查

### 新的 Lint 規則說明

#### RUF (Ruff 特定規則)

- `RUF001`: 檢查不必要的空白
- `RUF002`: 檢查隱藏的測試
- `RUF003`: 檢查多餘的 else 語句

#### FA (Future Annotations)

- 檢查是否正確使用 `from __future__ import annotations`
- 確保類型註解的一致性

#### T10/T20 (Debugger/Print)

- 防止在生產程式碼中留下 `print()` 語句
- 檢查 `pdb` 或 `breakpoint()` 的使用

### MyPy 新增檢查

#### enable_error_code 新增項目:

- `truthy-bool`: 檢查布林值使用的一致性
- `redundant-expr`: 檢查重複的表達式
- `possibly-unbound-variable`: 檢查可能未綁定的變數
- `used-before-def`: 檢查在定義前使用的變數

## 🐛 常見問題與解決方案

### 1. 相容性問題

```python
# 如果遇到舊版程式庫不相容的問題
# 可以臨時降級 Python 版本要求
# pyproject.toml
requires-python = ">=3.11,<3.14"  # 允許 3.11-3.13
```

### 2. 第三方庫支援

某些舊版第三方庫可能還沒有完全支援 Python 3.13:

```ini
# mypy.ini - 針對特定庫忽略檢查
[mypy-some_old_library.*]
ignore_missing_imports = True
follow_imports = skip
```

### 3. 性能調優

```python
# 利用 Python 3.13 的 JIT 優化
import sys

if sys.version_info >= (3, 13):
    # 使用新的優化特性
    pass
```

## 📊 性能監控

### 建議的監控指標

1. **程式啟動時間**: Python 3.13 的 JIT 應該會有更好的冷啟動性能
2. **記憶體使用**: GIL 優化可能減少記憶體佔用
3. **異步操作效能**: asyncio 改進應該提升並發性能

### 性能測試腳本

```python
# scripts/performance_test.py
import time
import asyncio
import sys

def benchmark_sync_operations():
    """測試同步操作性能"""
    start = time.perf_counter()
    # 測試程式碼
    end = time.perf_counter()
    print(f"Python {sys.version}: Sync operations took {end - start:.4f}s")

async def benchmark_async_operations():
    """測試異步操作性能"""
    start = time.perf_counter()
    # 測試程式碼
    end = time.perf_counter()
    print(f"Python {sys.version}: Async operations took {end - start:.4f}s")
```

## 🔄 遷移檢查清單

- [ ] 更新所有 Python 版本需求為 `>=3.13`
- [ ] 測試所有第三方庫的 Python 3.13 相容性
- [ ] 更新 CI/CD pipeline 中的 Python 版本
- [ ] 檢查 IDE 和開發工具的 Python 3.13 支援
- [ ] 更新文檔中的 Python 版本要求
- [ ] 執行完整的測試套件
- [ ] 監控生產環境的性能指標

## 📚 參考資源

- [Python 3.13 發行說明](https://docs.python.org/3.13/whatsnew/3.13.html)
- [Python 3.13 性能改進](https://docs.python.org/3.13/howto/perf_profiling.html)
- [Typing 模組更新](https://docs.python.org/3.13/library/typing.html)
- [Asyncio 改進](https://docs.python.org/3.13/library/asyncio.html)
