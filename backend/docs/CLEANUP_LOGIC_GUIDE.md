# Shioaji 服務清理邏輯指南

## 🎯 概述

本指南說明了 Shioaji 服務在開發環境中的資源清理邏輯,特別針對：
- **Ctrl+C 退出**
- **Hot Reload 重啟**
- **正常程序退出**
- **連線數控制**

## 🏗️ 清理架構

### 1. 多層清理保障

```
┌─────────────────────────────────────────┐
│            清理觸發來源                   │
├─────────────────────────────────────────┤
│ • Ctrl+C (SIGINT)                      │
│ • SIGTERM                              │
│ • 正常程序退出 (atexit)                  │
│ • 物件銷毀 (__del__)                    │
│ • Hot Reload                           │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         統一清理入口                      │
│     cleanup_shioaji_service()          │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│       專用開發環境清理                    │
│  force_cleanup_for_restart()           │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         緊急登出保障                      │
│      _emergency_logout()               │
└─────────────────────────────────────────┘
```

### 2. 清理優先級（已修復！）

```
📡 取消 API 訂閱 (最高優先級)
   ↓
🔐 登出
   ↓
⏳ 等待連線釋放
   ↓
🗂️ 清理任務
   ↓
🔄 重置狀態
```

**重要改進：** 現在會在登錄狀態下先取消所有 API 訂閱,避免登出後無法取消訂閱的問題！

## 🛠️ 核心方法說明

### `force_cleanup_for_restart()`
**專為開發環境設計的強制清理方法**

```python
def force_cleanup_for_restart(self) -> None:
    # 1. 最優先：取消所有 API 訂閱（在登錄狀態下）
    if hasattr(self, "active_subscriptions") and self.active_subscriptions:
        if hasattr(self, "lifecycle") and self.lifecycle.is_logged_in():
            logger.info("📡 [PRIORITY] 取消 API 訂閱...")
            self._batch_unsubscribe_all()  # 批量取消所有訂閱
        else:
            self.active_subscriptions.clear()  # 僅清理本地記錄

    # 2. 登出（釋放連線）
    if hasattr(self, "lifecycle") and self.lifecycle.is_logged_in():
        logger.info("🔐 強制登出以釋放連線...")
        self.lifecycle.logout(force=True)
        time.sleep(1.0)  # 等待連線釋放

    # 3. 清理任務
    if hasattr(self, "_pending_tasks"):
        for task in list(self._pending_tasks):
            if not task.done():
                task.cancel()
        self._pending_tasks.clear()
```

### `_batch_unsubscribe_all()`
**批量取消所有訂閱**

```python
def _batch_unsubscribe_all(self) -> None:
    # 複製訂閱列表,避免在迭代過程中修改
    subscriptions_to_cancel = list(self.active_subscriptions)

    for symbol in subscriptions_to_cancel:
        try:
            # 直接調用 API 取消訂閱
            self.api.unsubscribe(
                self.api.Contracts.Stocks[symbol],
                quote_type="tick",
                intraday_odd=True
            )
            # 從本地記錄中移除
            self.active_subscriptions.discard(symbol)
        except Exception as e:
            # 即使 API 取消失敗,也要清理本地記錄
            self.active_subscriptions.discard(symbol)
```

### `_emergency_logout()`
**最後的保障機制**

```python
def _emergency_logout(self) -> None:
    try:
        if hasattr(self, "api") and self.api:
            self.api.logout()  # 直接調用 API 登出
    except Exception:
        pass  # 靜默處理,確保不拋出異常
```

### 信號處理器
**處理 Ctrl+C 和 SIGTERM**

```python
def signal_handler(signum: int, frame) -> None:
    signal_name = signal.Signals(signum).name
    logger.info(f"🚨 [SIGNAL] 收到信號 {signal_name}")

    cleanup_shioaji_service()  # 執行清理
    time.sleep(0.5)           # 給清理時間
    sys.exit(0)               # 確保退出
```

## 🧪 測試場景

### 1. 正常操作測試
```bash
cd backend
python test_cleanup_scenarios.py
```

### 2. Hot Reload 測試
```bash
cd backend
python test_hot_reload.py
```

### 3. Ctrl+C 測試
在運行任何腳本時按 `Ctrl+C`,觀察清理日誌。

### 4. 生命週期測試
```bash
cd backend
python test_lifecycle.py
```

### 5. 訂閱清理順序測試 🆕
```bash
cd backend
python test_unsubscribe_order.py
```

這個新測試驗證：
- ✅ 在登錄狀態下正確取消 API 訂閱
- ✅ 登出後無法取消訂閱的問題
- ✅ 批量取消訂閱功能
- ✅ 完整的清理流程順序

### 6. 訂閱同步問題測試 🆕
```bash
cd backend
python test_subscription_sync.py
```

這個測試驗證：
- ✅ subscription_manager 和 shioaji_service 的同步狀態
- ✅ 直接調用 API 導致的不同步問題
- ✅ 同步檢查和修復機制

### 7. 訂閱同步修復工具 🆕
```bash
cd backend
python fix_subscription_sync.py
```

這個工具提供：
- 🔍 訂閱狀態檢查
- 🔄 同步記錄修復
- 🧹 統一清理功能

## 🔧 開發環境使用

### FastAPI 開發服務器
```bash
cd backend
uv run python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

**行為：**
- 檔案修改時會觸發 hot reload
- 清理邏輯會自動執行
- 連線數會被正確釋放

### 手動測試連線數
```bash
# 啟動服務
curl http://localhost:8000/api/usage

# 修改任一 Python 檔案觸發 hot reload
# 再次檢查連線數
curl http://localhost:8000/api/usage
```

## 📊 連線數監控

### 使用量 API
```bash
# 詳細統計
GET /api/usage

# 簡化摘要
GET /api/usage/summary
```

### 強制登出 API
```bash
# 開發環境緊急登出
GET /api/logout
```

## ⚡ 關鍵改進

### 之前的問題
- ❌ `__del__` 方法重複清理
- ❌ 沒有信號處理器
- ❌ Hot Reload 時連線數累積
- ❌ 清理邏輯分散
- ❌ **先登出再取消訂閱導致 API 調用失敗** 🚨

### 現在的解決方案
- ✅ 統一的清理入口
- ✅ 多重保障機制
- ✅ **正確的清理順序：先取消訂閱再登出** 🎯
- ✅ 批量取消訂閱機制
- ✅ 專門的開發環境清理
- ✅ 緊急登出保障
- ✅ 完整的信號處理
- ✅ 連線釋放等待機制

### 🔥 最重要的修復

#### 問題 1: 清理順序錯誤
**問題：** `unsubscribe_quote()` 需要檢查 `is_logged_in()` 狀態,如果先登出就無法取消訂閱！

**解決：** 新的清理順序確保在登錄狀態下完成所有 API 訂閱取消,然後才登出。

#### 問題 2: 清理邏輯不一致
**問題：**
- 正常退出使用 `cleanup()` (不登出)
- Ctrl+C 使用 `force_cleanup_for_restart()` (會登出)
- main.py 中重複的取消訂閱操作

**解決：** 統一所有退出場景都使用 `force_cleanup_for_restart()`,確保一致的清理行為。

#### 問題 3: 訂閱系統不同步 🆕
**問題：**
- `subscription_manager.shioaji_subscriptions` (WebSocket 客戶端管理)
- `shioaji_service.active_subscriptions` (實際 API 訂閱)
- 兩個系統獨立維護,可能不同步

**解決：**
- 在 main.py 中加入同步檢查
- 以實際 API 訂閱為準進行清理
- 提供同步修復工具

## 🚨 重要注意事項

1. **連線數限制**
   - Shioaji API 有連線數限制
   - 確保每次重啟都正確登出
   - 使用 usage API 監控連線數

2. **開發環境**
   - Hot Reload 會重新載入模組
   - 信號處理器確保 Ctrl+C 時清理
   - `force_cleanup_for_restart()` 專為此設計

3. **生產環境**
   - 正常的 `cleanup()` 和 `logout()` 方法
   - atexit 處理程序正常退出
   - 容器環境的 SIGTERM 處理

4. **測試**
   - 提供多個測試腳本
   - 覆蓋各種退出場景
   - 驗證連線數釋放

## 🔍 除錯指南

### 檢查清理是否生效
```python
# 檢查登錄狀態
shioaji_service.is_logged_in()

# 檢查訂閱數
len(shioaji_service.active_subscriptions)

# 檢查使用量
usage_stats = shioaji_service.get_usage_stats()
print(f"連線數: {usage_stats.connections}")
```

### 常見問題
1. **連線數持續增加**
   - 檢查是否正確登出
   - 使用強制清理方法
   - 檢查信號處理器是否生效

2. **Hot Reload 後無法登錄**
   - 可能達到連線限制
   - 等待一段時間後重試
   - 使用緊急登出 API

3. **清理日誌不出現**
   - 檢查 logger 配置
   - 確認信號處理器註冊成功
   - 檢查 atexit 是否註冊

## 📈 效果驗證

運行完整測試後,您應該看到：
- ✅ 所有清理場景都有相應的日誌
- ✅ 連線數在清理後正確釋放
- ✅ Ctrl+C 能正確觸發清理
- ✅ Hot Reload 不會累積連線數
- ✅ 程序退出時資源完全清理

這樣就確保了開發環境的穩定性和資源的正確管理！
