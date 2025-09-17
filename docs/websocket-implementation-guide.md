# WebSocket 實現指南

本文檔詳細說明了即時 K 線圖系統的 WebSocket 實現,包括前端和後端的完整架構、特點、注意事項和使用方法。

## 📋 **目錄**

- [架構概述](#架構概述)
- [後端實現](#後端實現)
- [前端實現](#前端實現)
- [數據流程](#數據流程)
- [重連機制](#重連機制)
- [注意事項](#注意事項)
- [故障排除](#故障排除)
- [性能優化](#性能優化)

---

## 🏗️ **架構概述**

### **技術棧**
- **後端**: FastAPI 原生 WebSocket + asyncio
- **前端**: 原生 WebSocket API + TypeScript
- **協議**: WebSocket over HTTP (ws://)
- **數據格式**: JSON

### **核心組件**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Shioaji API   │ -> │   後端處理       │ -> │   前端圖表       │
│                 │    │                 │    │                 │
│ • Tick 數據     │    │ • K線聚合       │    │ • 即時更新      │
│ • 即時推送     │    │ • WebSocket推送 │    │ • 數據合併      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🔧 **後端實現**

### **WebSocket 管理器** (`WebSocketManager`)

#### **核心功能**
- **連接管理**: 處理客戶端連接的建立和斷開
- **訂閱管理**: 管理股票訂閱和取消訂閱
- **廣播機制**: 向所有訂閱者推送數據
- **資源清理**: 自動清理斷開的連接和訂閱

#### **特點**
```python
class WebSocketManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.subscriptions: dict[str, set[str]] = {}  # client_id -> symbols
        self.symbol_subscribers: dict[str, set[str]] = {}  # symbol -> client_ids
```

### **K線聚合器** (`KlineAggregator`)

#### **核心功能**
- **時間間隔對齊**: 將 tick 數據聚合為指定間隔的 K 線
- **即時聚合**: 實時更新當前 K 線的 OHLCV 數據
- **廣播更新**: 新 K 線或更新現有 K 線時廣播

#### **特點**
```python
class KlineAggregator:
    def __init__(self, interval_minutes: int = 5):
        self.interval_minutes = interval_minutes
        self.current_klines: dict[str, dict[datetime, dict[str, Any]]] = {}
```

#### **時間間隔計算**
```python
def get_interval_timestamp(self, timestamp: datetime) -> datetime:
    """獲取時間間隔時間戳 (去除秒和毫秒,對齊到間隔)"""
    minute_timestamp = timestamp.replace(second=0, microsecond=0)
    minutes = minute_timestamp.minute
    interval_start_minute = (minutes // self.interval_minutes) * self.interval_minutes
    return minute_timestamp.replace(minute=interval_start_minute)
```

### **WebSocket 端點**

#### **K線端點** (`/ws/klines/{client_id}`)
```python
@router.websocket("/ws/klines/{client_id}")
async def websocket_klines_endpoint(websocket: WebSocket, client_id: str):
    await ws_manager.connect(websocket, f"kline_{client_id}")

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "subscribe_kline":
                symbol = message["symbol"]
                interval = message.get("interval", "5m")

                await ws_manager.subscribe_symbol(f"kline_{client_id}", symbol)
                # 發送歷史數據...

            elif message["type"] == "unsubscribe_kline":
                symbol = message["symbol"]
                await ws_manager.unsubscribe_symbol(f"kline_{client_id}", symbol)
                # 發送確認消息...

    except WebSocketDisconnect:
        ws_manager.disconnect(f"kline_{client_id}")
```

---

## 🎨 **前端實現**

### **K線 WebSocket 服務** (`KlineWebSocketService`)

#### **核心功能**
- **連接管理**: 建立和維護 WebSocket 連接
- **消息處理**: 解析和分發服務器消息
- **自動重連**: 連接斷開時自動重連
- **訂閱管理**: 管理股票訂閱狀態

#### **特點**
```typescript
class KlineWebSocketService {
  private ws: WebSocket | null = null
  private clientId: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private subscriptions = new Map<string, (message: KlineMessage) => void>()
}
```

#### **智能訂閱管理**
```typescript
subscribe(symbol: string, callback: (message: KlineMessage) => void): void {
  // 如果已經訂閱了其他股票,先取消舊訂閱
  const currentSubscriptions = Array.from(this.subscriptions.keys())
  currentSubscriptions.forEach((oldSymbol) => {
    if (oldSymbol !== symbol) {
      this.unsubscribe(oldSymbol)
    }
  })

  // 然後訂閱新股票
  this.subscriptions.set(symbol, callback)
  // 發送訂閱消息到服務器...
}
```

### **消息格式**

#### **歷史數據**
```typescript
interface KlineMessage {
  type: 'historical_klines'
  symbol: string
  interval: string
  data: KlineData[]
}
```

#### **即時更新**
```typescript
interface KlineMessage {
  type: 'kline'
  symbol: string
  data: KlineData
}
```

### **數據合併邏輯**

#### **歷史數據 + 即時更新**
```typescript
const handleKlineMessage = (message: KlineMessage) => {
  if (message.type === 'historical_klines') {
    // 合併歷史數據,避免重複
    const existingTimestamps = new Set(prevData.map(d => d.time))
    const newData = historicalData.filter(d => !existingTimestamps.has(d.timestamp))
    return [...prevData, ...newData.map(transformData)]
  } else if (message.type === 'kline') {
    // 更新或新增 K 線
    const existingIndex = prevData.findIndex(d => d.time === newKline.time)
    if (existingIndex >= 0) {
      // 更新現有 K 線
      updatedData[existingIndex] = newKline
    } else {
      // 新增 K 線並排序
      return [...prevData, newKline].sort(byTime).slice(-200)
    }
  }
}
```

---

## 🔄 **重連機制**

### **前端重連策略**
- **指數退避**: 每次重連延遲逐漸增加 (1000ms * 嘗試次數)
- **最大重試**: 最多嘗試 5 次
- **自動恢復**: 重連成功後重新訂閱所有股票

```typescript
private handleReconnect(): void {
  if (this.reconnectAttempts < this.maxReconnectAttempts) {
    this.reconnectAttempts++
    setTimeout(() => {
      this.connect().then(() => this.resubscribeAll())
    }, this.reconnectDelay * this.reconnectAttempts)
  }
}
```

### **後端連接清理**
- **資源回收**: 自動清理斷開的連接和訂閱
- **Shioaji 取消訂閱**: 沒有客戶端訂閱時停止數據源

```python
def disconnect(self, client_id: str):
    """斷開 WebSocket 連接並清理資源"""
    for symbol in self.subscriptions[client_id]:
        self.symbol_subscribers[symbol].discard(client_id)
        if not self.symbol_subscribers[symbol]:
            self._unsubscribe_from_shioaji(symbol)
```

#### **Shioaji 取消訂閱實現**
```python
def _unsubscribe_from_shioaji(self, symbol: str):
    """取消 Shioaji 訂閱"""
    try:
        success = shioaji_service.unsubscribe_quote(symbol)
        if success:
            logger.info(f"成功取消 Shioaji 訂閱 {symbol}")
        else:
            logger.warning(f"取消 Shioaji 訂閱失敗 {symbol}")
    except Exception as e:
        logger.error(f"取消 Shioaji 訂閱時發生錯誤 {symbol}: {e}")

def unsubscribe_quote(self, symbol: str) -> bool:
    """Unsubscribes from a real-time quote for a given symbol."""
    contract = self._get_contract(symbol)
    if not contract:
        return False

    try:
        self.api.quote.unsubscribe(
            contract,
            quote_type=sj.constant.QuoteType.Tick,
            version=sj.constant.QuoteVersion.v1,
        )
        return True
    except Exception as e:
        logger.error(f"Failed to unsubscribe from {symbol}: {e}")
        return False
```

---

## ⚠️ **注意事項**

### **線程安全**
- **Shioaji 回調**: 在不同線程中執行,使用 `asyncio.run_coroutine_threadsafe`
- **事件循環**: 避免在錯誤的線程中創建任務

### **數據一致性**
- **時間戳對齊**: K線時間戳必須精確對齊到間隔邊界
- **重複數據**: 合併歷史數據時檢查時間戳避免重複
- **數據限制**: 前端最多保留 200 根 K 線

### **記憶體管理**
- **連接清理**: 及時清理斷開的 WebSocket 連接
- **訂閱清理**: 取消不必要的股票訂閱
- **K線清理**: 定期清理過期的 K 線數據

### **錯誤處理**
- **連接失敗**: 優雅降級到靜態模式
- **解析錯誤**: 跳過無效的 WebSocket 消息
- **廣播失敗**: 清理斷開的客戶端連接

---

## 🔧 **故障排除**

### **常見問題**

#### **1. 連接失敗 (403 Forbidden)**
**原因**: WebSocket 路由未註冊
**解決**: 確保 `main.py` 中包含 `websocket_quotes.router`

#### **2. 數據不更新**
**原因**: 前端未訂閱或後端未推送
**解決**: 檢查訂閱消息和 Shioaji 回調

#### **3. 記憶體洩漏**
**原因**: 連接未正確清理
**解決**: 確保組件卸載時調用 `disconnect()`

#### **4. 時間戳不對齊**
**原因**: K線間隔計算錯誤
**解決**: 檢查 `get_interval_timestamp()` 邏輯

### **調試方法**
```javascript
// 前端調試
console.log('WebSocket 狀態:', ws.readyState)
console.log('訂閱狀態:', subscriptions.size)

// 後端調試
logger.info(f"活動連接數: {len(ws_manager.active_connections)}")
logger.info(f"訂閱統計: {dict(ws_manager.symbol_subscribers)}")
```

---

## 🚀 **性能優化**

### **後端優化**
- **異步處理**: 所有 I/O 操作使用 async/await
- **連接池**: WebSocket 連接重用
- **數據壓縮**: 考慮使用 WebSocket 壓縮

### **前端優化**
- **防抖更新**: 使用 `requestAnimationFrame` 限制更新頻率
- **數據限制**: 只保留必要的歷史數據
- **記憶體清理**: 及時清理舊的 K 線數據

### **網路優化**
- **心跳機制**: 定期發送 ping/pong 保持連接
- **批量更新**: 合併多個小的數據更新
- **增量同步**: 只發送變化的數據

---

## 📚 **相關文檔**

- [FastAPI WebSocket 文檔](https://fastapi.tiangolo.com/advanced/websockets/)
- [WebSocket API 標準](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Shioaji API 文檔](https://sinotrade.github.io/)
- [即時圖表實現指南](./realtime-chart-implementation.md)

---

## 🎯 **總結**

這個 WebSocket 實現提供了完整的即時 K 線圖功能,具有以下特點:

✅ **完整重連機制**: 前端自動重連,後端資源清理
✅ **智能訂閱管理**: 切換股票時自動取消舊訂閱,避免數據混亂
✅ **高效聚合**: 實時將 tick 數據聚合為 K 線
✅ **數據一致性**: 歷史數據 + 即時更新的無縫合併
✅ **資源管理**: 自動清理連接和記憶體,包含 Shioaji 訂閱取消
✅ **錯誤處理**: 優雅降級和詳細日誌
✅ **線程安全**: 異步回調在不同線程中的安全處理

關鍵設計決策:
- 使用 FastAPI 原生 WebSocket(而不是 Socket.IO)以獲得更好性能
- 前端使用原生 WebSocket API,保持簡單直接
- 實現完整的訂閱管理,避免不必要的數據傳輸
- 注重資源清理,防止記憶體洩漏

---

## 🚀 **應用生命週期管理**

### 啟動事件 (`startup`)
- 初始化 Shioaji 服務連接
- 註冊 WebSocket 回調函數
- 驗證服務可用性

### 關閉事件 (`shutdown`)
- 清理所有 WebSocket 訂閱
- 取消所有 Shioaji 股票訂閱
- 安全登出 Shioaji 連接
- 釋放系統資源

### 資源清理流程
```
應用關閉 → WebSocket管理器清理 → Shioaji訂閱取消 → 服務登出 → 資源釋放
```

### 關鍵特性
- ✅ **優雅關閉**: 確保所有資源正確釋放
- ✅ **訂閱清理**: 防止資源洩漏和持續計費
- ✅ **錯誤處理**: 關閉過程中的異常不會阻擋清理
- ✅ **日誌記錄**: 完整的清理過程追蹤

*最後更新: 2025年9月 - 新增應用生命週期管理和資源清理功能*
