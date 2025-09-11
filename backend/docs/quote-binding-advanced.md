# Shioaji 綁訂報價模式進階應用

本文檔詳細說明 Shioaji 綁訂報價模式的概念、用途和實際應用場景。

## 🔄 什麼是綁訂報價模式？

**綁訂報價模式（Quote Binding）** 是 Shioaji 的進階功能，允許你將自定義物件（稱為 context）綁定到行情 callback 函數中，讓 callback 函數可以直接操作這個物件。

### 核心概念
```python
# 傳統方式：callback 函數無法直接存取外部物件
def callback(exchange, tick):
    # 只能在這裡處理行情，難以與外部系統整合
    print(tick)

# 綁訂模式：callback 函數的 self 參數就是你綁定的物件
@api.on_tick_fop_v1(bind=True)
def callback(self, exchange, tick):
    # self 就是你綁定的 context 物件
    self.process_tick(tick)  # 可以調用物件的方法
```

---

## 🎯 三大核心應用場景

### 1. 📦 訊息佇列存儲

#### 用途
將即時行情存儲到記憶體佇列中，供後續批量處理或分析使用。

#### 優點
- **高效能**：記憶體操作，延遲極低
- **批量處理**：累積一定數量後批量分析
- **資料完整性**：不會遺漏任何行情

#### 實作範例
```python
from collections import defaultdict, deque
from shioaji import TickFOPv1, Exchange

# 創建訊息佇列
msg_queue = defaultdict(deque)

# 綁定到 API context
api.set_context(msg_queue)

@api.on_tick_fop_v1(bind=True)
def quote_callback(self, exchange: Exchange, tick: TickFOPv1):
    # self 就是 msg_queue
    self[tick.code].append(tick)
    
    # 可以設定佇列最大長度，避免記憶體溢出
    if len(self[tick.code]) > 1000:
        self[tick.code].popleft()  # 移除最舊的資料

# 訂閱行情
api.quote.subscribe(
    api.Contracts.Futures.TXF['TXF202509'],
    quote_type=sj.constant.QuoteType.Tick,
    version=sj.constant.QuoteVersion.v1
)

# 後續處理
def process_queue():
    for code, ticks in msg_queue.items():
        if len(ticks) >= 10:  # 累積 10 筆後處理
            batch = [ticks.popleft() for _ in range(10)]
            analyze_ticks(batch)
```

#### 應用場景
- **技術分析**：計算移動平均線、RSI 等指標
- **套利交易**：比較不同商品的價差
- **市場監控**：監控異常交易量或價格跳動

---

### 2. 🚀 Redis Stream 推送

#### 用途
將行情資料即時推送到 Redis Stream，實現分布式系統的資料分發。

#### 優點
- **分布式**：多個服務可以同時消費行情
- **持久化**：資料不會因程序重啟而遺失
- **橫向擴展**：輕鬆添加更多消費者

#### 實作範例
```python
import redis
import json
from shioaji import TickFOPv1, Exchange

# 創建 Redis 連接
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# 綁定 Redis 連接到 API
api.set_context(r)

@api.on_tick_fop_v1(bind=True)
def quote_callback(self, exchange: Exchange, tick: TickFOPv1):
    # self 就是 Redis 連接
    channel = f'quotes:{tick.code}'
    tick_data = {
        'code': tick.code,
        'price': str(tick.close),
        'volume': tick.volume,
        'timestamp': tick.datetime.isoformat(),
        'exchange': exchange.value
    }
    
    # 推送到 Redis Stream
    self.xadd(channel, tick_data)
    
    # 設定 Stream 最大長度，避免無限增長
    self.xtrim(channel, maxlen=10000, approximate=True)
```

#### 消費端範例
```python
# 其他服務可以這樣消費行情
import redis

consumer = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# 消費 TXF 行情
streams = {'quotes:TXFG1': '$'}  # $ 表示從最新開始
while True:
    messages = consumer.xread(streams, block=1000)
    for stream, msgs in messages:
        for msg_id, fields in msgs:
            print(f"收到行情: {fields}")
            # 處理行情資料...
```

#### 應用場景
- **微服務架構**：將行情分發給不同的服務
- **即時儀表板**：網頁即時顯示行情
- **警報系統**：監控特定條件並發送通知

---

### 3. ⚡ 觸價委託單（Stop Order）

#### 用途
實現客戶端的觸價委託功能，當價格達到預設條件時自動執行委託單。

#### 優點
- **即時反應**：不依賴券商系統的觸價單
- **複雜邏輯**：可以實現自定義的觸發條件
- **靈活控制**：可以隨時修改或取消條件

#### 實作範例
```python
import time
from typing import List, Dict
import shioaji as sj

class StopOrderExecutor:
    def __init__(self, api):
        self.api = api
        self._stop_orders: Dict[str, List[dict]] = {}
    
    def on_quote(self, quote):
        """處理行情並檢查觸價條件"""
        code = quote.code
        if code not in self._stop_orders:
            return
            
        current_price = float(quote.close)
        
        for stop_order in self._stop_orders[code][:]:  # 複製清單避免修改問題
            if stop_order['executed']:
                continue
                
            stop_price = stop_order['stop_price']
            ref_price = stop_order['ref_price']
            
            is_triggered = False
            
            # 向上突破（買進停損）
            if stop_price >= ref_price and current_price >= stop_price:
                is_triggered = True
            # 向下突破（賣出停損）
            elif stop_price < ref_price and current_price <= stop_price:
                is_triggered = True
            
            if is_triggered:
                try:
                    # 執行委託單
                    trade = self.api.place_order(
                        stop_order['contract'], 
                        stop_order['order']
                    )
                    
                    stop_order['executed'] = True
                    stop_order['ts_executed'] = time.time()
                    stop_order['trade'] = trade
                    
                    print(f"✅ 觸價委託已執行: {code} @ {current_price}")
                    
                except Exception as e:
                    print(f"❌ 觸價委託執行失敗: {e}")
    
    def add_stop_order(self, contract, stop_price: float, order):
        """添加觸價委託"""
        code = contract.code
        
        # 獲取當前價格作為參考
        snap = self.api.snapshots([contract])[0]
        ref_price = 0.5 * (snap.buy_price + snap.sell_price)
        
        stop_order = {
            'code': code,
            'contract': contract,
            'order': order,
            'stop_price': stop_price,
            'ref_price': ref_price,
            'executed': False,
            'ts_create': time.time(),
            'ts_executed': None
        }
        
        if code not in self._stop_orders:
            self._stop_orders[code] = []
        
        self._stop_orders[code].append(stop_order)
        print(f"📝 已添加觸價委託: {code} 觸價={stop_price} 參考價={ref_price:.2f}")

# 使用範例
executor = StopOrderExecutor(api)

# 設定 context 並綁定
api.set_context(executor)

@api.on_tick_fop_v1(bind=True)
def quote_callback(self, exchange, tick):
    # self 就是 executor
    self.on_quote(tick)

# 添加觸價委託
contract = api.Contracts.Futures.TXF['TXF202509']
order = api.Order(
    action='Buy',
    price=17800,
    quantity=1,
    price_type='LMT',
    order_type='ROD',
    account=api.futopt_account
)

executor.add_stop_order(contract, stop_price=17850, order=order)
```

#### 應用場景
- **停損單**：當虧損達到一定程度時自動平倉
- **追漲停板**：價格突破關鍵位置時自動進場
- **網格交易**：在不同價位設定買賣條件

---

## 🔧 在專案中整合綁訂報價模式

### 修改 `shioaji_service.py`

```python
class ShioajiService:
    def __init__(self):
        self.api = sj.Shioaji(simulation=True)
        self._login()
        self._setup_callbacks()
        
        # 添加進階功能支援
        self.quote_queue = defaultdict(deque)
        self.stop_order_executor = None
        
    def enable_quote_queue(self, max_size: int = 1000):
        """啟用行情佇列功能"""
        self.api.set_context(self.quote_queue)
        
        @self.api.on_tick_stk_v1(bind=True)
        def stock_queue_callback(self, exchange, tick):
            self[tick.code].append(tick)
            if len(self[tick.code]) > max_size:
                self[tick.code].popleft()
    
    def enable_redis_stream(self, redis_host='localhost', redis_port=6379):
        """啟用 Redis Stream 推送"""
        import redis
        r = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        self.api.set_context(r)
        
        @self.api.on_tick_stk_v1(bind=True)
        def redis_callback(self, exchange, tick):
            channel = f'quotes:{tick.code}'
            self.xadd(channel, {
                'price': str(tick.close),
                'volume': tick.volume,
                'timestamp': tick.datetime.isoformat()
            })
    
    def enable_stop_orders(self):
        """啟用觸價委託功能"""
        self.stop_order_executor = StopOrderExecutor(self.api)
        self.api.set_context(self.stop_order_executor)
        
        @self.api.on_tick_stk_v1(bind=True)
        def stop_order_callback(self, exchange, tick):
            self.on_quote(tick)
```

---

## 💡 選擇建議

### 使用 **訊息佇列** 當你需要：
- ✅ 即時技術分析計算
- ✅ 批量處理行情資料
- ✅ 單機高效能處理

### 使用 **Redis Stream** 當你需要：
- ✅ 分散式系統架構
- ✅ 多個服務消費同一行情
- ✅ 行情資料持久化

### 使用 **觸價委託** 當你需要：
- ✅ 自動化交易策略
- ✅ 風險管理機制
- ✅ 複雜的觸發條件

---

## ⚠️ 注意事項

1. **效能考量**：綁訂模式會增加 callback 的處理時間
2. **記憶體管理**：注意佇列大小，避免記憶體溢出
3. **錯誤處理**：callback 中的異常會中斷行情接收
4. **網路延遲**：Redis 操作可能增加延遲

---

## 🔗 參考資料

- [Shioaji 綁訂報價模式官方文檔](https://sinotrade.github.io/zh/tutor/advanced/quote_binding/)
- [Redis Streams 文檔](https://redis.io/topics/streams-intro)

---

*最後更新: 2025年9月*
