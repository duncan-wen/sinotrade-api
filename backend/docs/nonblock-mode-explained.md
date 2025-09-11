# Shioaji 非阻塞模式詳解

本文檔用最簡單的方式解釋 Shioaji 的阻塞與非阻塞模式差異,以及實際應用場景。

## 🔄 核心概念

### 什麼是阻塞？什麼是非阻塞？

#### 📞 阻塞模式（Blocking）- 像打電話
- **行為**:程式必須「等待」操作完成才能繼續
- **比喻**:打電話訂餐,必須在線上等店員確認完才能掛電話
- **程式表現**:`api.place_order()` 會停住直到收到交易所回應

#### 📱 非阻塞模式（Non-blocking）- 像發簡訊
- **行為**:程式「立刻」繼續執行,不等結果
- **比喻**:用 APP 訂餐,按下訂購後立刻可以做其他事
- **程式表現**:`api.place_order(timeout=0)` 立刻返回,真正結果稍後通知

---

## ⏱️ 時間差異對比

| 模式       | 單次下單時間 | 連續 10 次下單 | 優點     | 缺點     |
| ---------- | ------------ | -------------- | -------- | -------- |
| **阻塞**   | ~0.13 秒     | ~1.3 秒        | 結果確定 | 速度慢   |
| **非阻塞** | ~0.01 秒     | ~0.1 秒        | 速度快   | 結果延後 |

**效能提升:非阻塞模式比阻塞模式快 12 倍！**

---

## 💻 程式碼範例

### 基本使用

#### 阻塞模式（預設）
```python
import shioaji as sj

# 準備訂單
contract = api.Contracts.Futures.TXF['TXF202509']
order = api.Order(
    action='Buy',
    price=17800,
    quantity=1,
    price_type='LMT',
    order_type='ROD',
    account=api.futopt_account
)

# 阻塞模式下單（預設）
print("開始下單...")
trade = api.place_order(contract, order)  # 程式會在這裡等待
print(f"下單完成！訂單號:{trade.order.id}")
print(f"狀態:{trade.status.status}")
```

#### 非阻塞模式
```python
# 非阻塞模式下單
print("開始下單...")
trade = api.place_order(contract, order, timeout=0)  # 立刻返回
print(f"下單已送出！狀態:{trade.status.status}")  # 通常是 Inactive
print(f"訂單號:{getattr(trade.order, 'id', '尚未分配')}")

# 這時候訂單可能還沒有 ID,需要等待回調
```

### 使用回調函數處理結果

```python
from shioaji.order import Trade

def order_callback(trade: Trade):
    """當訂單真正處理完成時會呼叫這個函數"""
    print("=== 訂單處理完成 ===")
    print(f"訂單號:{trade.order.id}")
    print(f"狀態:{trade.status.status}")
    print(f"時間:{trade.status.order_datetime}")

# 非阻塞下單並設定回調
trade = api.place_order(
    contract,
    order,
    timeout=0,           # 非阻塞模式
    cb=order_callback    # 處理完成時的回調函數
)

print("下單請求已送出,程式繼續執行...")
# 程式可以繼續做其他事,不用等待
```

---

## 🚀 實際應用場景

### 1. 高頻交易策略

```python
def high_frequency_trading():
    """高頻交易:需要快速下多張單"""
    contracts = [
        api.Contracts.Stocks["2330"],
        api.Contracts.Stocks["2317"],
        api.Contracts.Stocks["3008"]
    ]

    # 阻塞模式:慢！
    start_time = time.time()
    for contract in contracts:
        order = create_order(contract)
        trade = api.place_order(contract, order)  # 每次等 0.13 秒
    blocking_time = time.time() - start_time
    print(f"阻塞模式耗時:{blocking_time:.3f} 秒")

    # 非阻塞模式:快！
    start_time = time.time()
    for contract in contracts:
        order = create_order(contract)
        api.place_order(contract, order, timeout=0)  # 每次只要 0.01 秒
    nonblocking_time = time.time() - start_time
    print(f"非阻塞模式耗時:{nonblocking_time:.3f} 秒")

    print(f"速度提升:{blocking_time/nonblocking_time:.1f} 倍")
```

### 2. 同時查詢多種資料

```python
def parallel_data_fetching():
    """同時取得多種資料,不互相等待"""

    print("開始並行查詢...")

    # 所有查詢都是非阻塞,可以同時進行
    api.list_positions(timeout=0)           # 查持倉
    api.list_profit_loss(timeout=0)         # 查損益
    api.settlements(timeout=0)              # 查結算
    api.margin(timeout=0)                   # 查保證金

    print("所有查詢請求已送出,等待結果...")

    # 結果會透過各自的回調函數處理
```

### 3. 觸價單批量設定

```python
def setup_stop_orders():
    """設定多個觸價單"""
    stop_levels = [17800, 17850, 17900, 17950, 18000]

    # 非阻塞模式快速設定多個訂單
    for stop_price in stop_levels:
        order = api.Order(
            action='Sell',
            price=stop_price,
            quantity=1,
            price_type='LMT',
            order_type='ROD',
            account=api.futopt_account
        )

        # 非阻塞下單,不等待
        api.place_order(contract, order, timeout=0, cb=stop_order_callback)

    print(f"已設定 {len(stop_levels)} 個觸價單")

def stop_order_callback(trade):
    print(f"觸價單 {trade.order.id} 設定完成,價格 {trade.order.price}")
```

---

## ⚠️ 注意事項與最佳實踐

### 1. 資料不完整問題

```python
# 非阻塞模式的訂單初始狀態
trade = api.place_order(contract, order, timeout=0)

# ❌ 錯誤:這些資料可能還沒有
print(trade.order.id)          # 可能是 None
print(trade.status.status)     # 可能是 Inactive
print(trade.status.order_datetime)  # 可能是 None

# ✅ 正確:檢查資料是否存在
if hasattr(trade.order, 'id') and trade.order.id:
    print(f"訂單號:{trade.order.id}")
else:
    print("訂單號尚未分配,請等待回調")
```

### 2. 錯誤處理

```python
def robust_order_callback(trade: Trade):
    """健全的訂單回調處理"""
    try:
        if trade.status.status == 'Submitted':
            print(f"✅ 訂單成功:{trade.order.id}")
        elif trade.status.status == 'Failed':
            print(f"❌ 訂單失敗:{trade.status.status_code}")
        else:
            print(f"📋 訂單狀態:{trade.status.status}")

    except Exception as e:
        print(f"❌ 處理訂單回調時發生錯誤:{e}")

# 使用健全的回調
api.place_order(contract, order, timeout=0, cb=robust_order_callback)
```

### 3. 訂單追蹤管理

```python
class OrderTracker:
    """訂單追蹤器"""
    def __init__(self):
        self.pending_orders = {}
        self.completed_orders = {}

    def place_order_with_tracking(self, contract, order):
        """下單並追蹤"""
        # 生成追蹤 ID
        tracking_id = f"order_{int(time.time() * 1000)}"

        # 記錄待處理訂單
        self.pending_orders[tracking_id] = {
            'contract': contract,
            'order': order,
            'timestamp': time.time()
        }

        # 非阻塞下單
        def callback(trade):
            self._handle_order_result(tracking_id, trade)

        api.place_order(contract, order, timeout=0, cb=callback)
        return tracking_id

    def _handle_order_result(self, tracking_id, trade):
        """處理訂單結果"""
        if tracking_id in self.pending_orders:
            order_info = self.pending_orders.pop(tracking_id)
            self.completed_orders[tracking_id] = {
                **order_info,
                'trade': trade,
                'completed_time': time.time()
            }
            print(f"訂單 {tracking_id} 處理完成:{trade.order.id}")

# 使用追蹤器
tracker = OrderTracker()
tracking_id = tracker.place_order_with_tracking(contract, order)
print(f"訂單已送出,追蹤編號:{tracking_id}")
```

---

## 🔧 在專案中整合非阻塞模式

### 修改 `shioaji_service.py`

```python
class ShioajiService:
    def __init__(self):
        self.api = sj.Shioaji(simulation=True)
        self._login()
        self._setup_callbacks()

        # 訂單追蹤
        self.pending_orders = {}
        self.order_callbacks = {}

    def place_order_async(self, order: SimulatedOrder, callback=None) -> str:
        """非阻塞下單"""
        contract = self._get_contract(order.instrument_symbol)
        if not contract:
            raise ValueError(f"Contract not found: {order.instrument_symbol}")

        # 創建 Shioaji 訂單
        sj_order = sj.order.StockOrder(
            action=sj.constant.Action(order.action),
            price=order.price,
            quantity=order.quantity,
            price_type=sj.constant.StockPriceType(order.order_type),
            order_type=sj.constant.OrderType(order.time_in_force),
            account=self.api.stock_account,
        )

        # 生成追蹤 ID
        tracking_id = f"order_{int(time.time() * 1000)}"

        # 設定回調
        def order_callback(trade):
            self._handle_async_order_result(tracking_id, trade, callback)

        # 非阻塞下單
        try:
            trade = self.api.place_order(
                contract,
                sj_order,
                timeout=0,  # 非阻塞模式
                cb=order_callback
            )

            # 記錄待處理訂單
            self.pending_orders[tracking_id] = {
                'original_order': order,
                'trade': trade,
                'timestamp': time.time()
            }

            order.status = "Pending"
            logger.info(f"非阻塞訂單已送出,追蹤ID:{tracking_id}")
            return tracking_id

        except Exception as e:
            logger.error(f"非阻塞下單失敗:{e}")
            order.status = "Failed"
            raise

    def _handle_async_order_result(self, tracking_id, trade, user_callback):
        """處理非阻塞訂單結果"""
        if tracking_id in self.pending_orders:
            order_info = self.pending_orders.pop(tracking_id)
            original_order = order_info['original_order']

            # 更新訂單狀態
            if trade.status.status == 'Submitted':
                original_order.status = "Submitted"
                original_order.id = trade.order.id
                logger.info(f"訂單成功:{trade.order.id}")
            else:
                original_order.status = "Failed"
                logger.error(f"訂單失敗:{trade.status.status}")

            # 執行用戶回調
            if user_callback:
                try:
                    user_callback(original_order, trade)
                except Exception as e:
                    logger.error(f"用戶回調執行失敗:{e}")

    def get_pending_orders(self):
        """取得待處理訂單列表"""
        return list(self.pending_orders.keys())
```

---

## 📊 支援非阻塞模式的函數

根據官方文檔,以下函數支援 `timeout=0` 非阻塞模式:

### 交易相關
- `place_order` - 下單
- `update_order` - 修改訂單
- `cancel_order` - 取消訂單

### 查詢相關
- `update_status` - 更新狀態
- `list_positions` - 查詢持倉
- `list_position_detail` - 查詢持倉明細
- `list_profit_loss` - 查詢損益
- `list_profit_loss_detail` - 查詢損益明細
- `list_profit_loss_summary` - 查詢損益摘要
- `settlements` - 查詢結算
- `margin` - 查詢保證金

### 行情相關
- `ticks` - 查詢即時報價
- `kbars` - 查詢 K 線資料

---

## 🎯 選擇建議

### 使用 **阻塞模式** 當你需要:
- ✅ 確保訂單處理完成才繼續
- ✅ 簡單的單次操作
- ✅ 學習階段,邏輯較簡單

### 使用 **非阻塞模式** 當你需要:
- ✅ 高頻交易,追求速度
- ✅ 批量操作多個訂單
- ✅ 同時查詢多種資料
- ✅ 避免程式被 I/O 阻塞

---

## 🔗 參考資料

- [Shioaji 非阻塞模式官方文檔](https://sinotrade.github.io/zh/tutor/advanced/nonblock/)
- [Python 異步程式設計概念](https://docs.python.org/3/library/asyncio.html)

---

*最後更新: 2025年9月*
