# 階段 1: 資料模型

**日期**: 2025-09-10

本文件定義了應用程式的核心資料模型，這些模型將被實作為 Pydantic 模型。這些模型基於 `spec.md` 中定義的實體以及 `research.md` 中的研究發現。

## 1. `APIUser`

代表一個已通過 API 驗證的使用者。

```python
from pydantic import BaseModel
from typing import Literal

class APIUser(BaseModel):
    id: str
    api_key: str
    role: Literal["viewer", "trader"]
```

## 2. `FinancialInstrument`

代表一個可交易的金融商品。這是一個彈性的模型，可以代表股票、期貨或選擇權。

```python
from pydantic import BaseModel
from typing import Literal, Optional

class FinancialInstrument(BaseModel):
    symbol: str
    type: Literal["Stock", "Future", "Option"]
    exchange: str  # 例如: "TSE" 代表台灣證券交易所, "TAIFEX" 代表台灣期貨交易所
    # 衍生性商品的選擇性欄位
    delivery_month: Optional[str] = None # 例如: "202310"
    strike_price: Optional[float] = None
    option_type: Optional[Literal["Call", "Put"]] = None
```

## 3. `Quote`

代表一個金融商品的即時市場數據。這些欄位基於 `TickFOPv1` 的研究發現，並為所有商品類型進行了通用化。

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Quote(BaseModel):
    symbol: str
    timestamp: datetime
    open: float
    close: float
    bid_price: float
    ask_price: float
    bid_volume: int
    ask_volume: int
    avg_price: float
    underlying_price: Optional[float] = None # 適用於衍生性商品
```

## 4. `SimulatedOrder`

代表由 `trader` 下達的模擬訂單。

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Literal

class SimulatedOrder(BaseModel):
    id: str
    user_id: str
    instrument_symbol: str
    action: Literal["Buy", "Sell"]
    price: float
    quantity: int
    order_type: Literal["LMT", "MKT"] # 限價或市價
    time_in_force: Literal["ROD", "IOC", "FOK"] # 當日有效、立即成交否則取消、全部成交否則取消
    status: Literal["Pending", "Filled", "Cancelled", "Failed"]
    created_at: datetime
```