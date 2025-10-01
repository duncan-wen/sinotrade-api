# src/models/domain.py

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, computed_field


class APIUser(BaseModel):
    id: str
    api_key: str
    role: Literal["viewer", "trader"] = Field(..., description="角色")


class SimulatedOrder(BaseModel):
    id: str
    user_id: str
    instrument_symbol: str
    action: Literal["Buy", "Sell"]
    price: float = Field(..., description="價格")
    quantity: int
    order_type: Literal["LMT", "MKT"]  # Limit or Market
    time_in_force: Literal[
        "ROD", "IOC", "FOK"
    ]  # Rest of Day, Immediate or Cancel, Fill or Kill
    status: Literal["Pending", "Filled", "Cancelled", "Failed"]
    created_at: datetime = Field(..., description="建立時間")


class Quote(BaseModel):
    """即時報價數據模型"""

    symbol: str = Field(..., description="股票代號")
    timestamp: datetime = Field(..., description="時間戳")
    open: float = Field(..., description="開盤價")
    close: float = Field(..., description="收盤價")
    bid_price: float = Field(..., description="買價")
    ask_price: float = Field(..., description="賣價")
    bid_volume: int = Field(..., description="買量")
    ask_volume: int = Field(..., description="賣量")
    volume: int = Field(..., description="總成交量")
    avg_price: float = Field(..., description="均價")
    underlying_price: float | None = Field(None, description="標的價格")


class ScannerType(str, Enum):
    """排行掃描器類型"""

    ChangePercentRank = "ChangePercentRank"  # 依價格漲跌幅排序
    ChangePriceRank = "ChangePriceRank"  # 依價格漲跌排序
    DayRangeRank = "DayRangeRank"  # 依高低價差排序
    VolumeRank = "VolumeRank"  # 依成交量排序
    AmountRank = "AmountRank"  # 依成交金額排序


class SortingMode(str, Enum):
    """詳細排序模式"""

    # 基本排序
    ASC = "asc"  # 由小到大
    DESC = "desc"  # 由大到小

    # 針對漲跌幅的詳細排序
    GAIN_ASC = "gain_asc"  # 漲幅由小到大 (1% -> 5% -> 10%)
    GAIN_DESC = "gain_desc"  # 漲幅由大到小 (10% -> 5% -> 1%)
    LOSS_ASC = "loss_asc"  # 跌幅由小到大 (-1% -> -5% -> -10%)
    LOSS_DESC = "loss_desc"  # 跌幅由大到小 (-10% -> -5% -> -1%)

    # 針對價格的詳細排序
    PRICE_HIGH_LOW = "price_high_low"  # 價格由高到低
    PRICE_LOW_HIGH = "price_low_high"  # 價格由低到高

    # 針對其他指標的詳細排序
    VALUE_HIGH_LOW = "value_high_low"  # 數值由大到小
    VALUE_LOW_HIGH = "value_low_high"  # 數值由小到大


class ScannerData(BaseModel):
    """股票排行資料模型"""

    date: str = Field(..., description="交易日")
    code: str = Field(..., description="股票代號")
    name: str = Field(..., description="股票名稱")
    ts: int = Field(..., description="時間戳記 (nanoseconds)")
    open: float = Field(..., description="開盤價")
    high: float = Field(..., description="最高價")
    low: float = Field(..., description="最低價")
    close: float = Field(..., description="收盤價")
    price_range: float = Field(..., description="價格區間(最高價-最低價)")
    tick_type: int = Field(..., description="內外盤別 {1: 內盤, 2: 外盤, 0: 無法判定}")
    change_price: float = Field(..., description="價格漲跌")
    change_type: int = Field(..., description="漲跌類型")
    average_price: float = Field(..., description="均價")
    volume: int = Field(..., description="成交量")
    total_volume: int = Field(..., description="總成交量")
    amount: float = Field(..., description="成交金額")
    total_amount: float = Field(..., description="總成交金額")
    yesterday_volume: int = Field(..., description="昨日總成交量")
    volume_ratio: float = Field(..., description="總成交量/昨日總成交量")
    buy_price: float = Field(..., description="委買價")
    buy_volume: int = Field(..., description="委買量")
    sell_price: float = Field(..., description="委賣價")
    sell_volume: int = Field(..., description="委賣量")
    bid_orders: int = Field(..., description="內盤總成交單量")
    bid_volumes: int = Field(..., description="內盤總成交量")
    ask_orders: int = Field(..., description="外盤總成交單量")
    ask_volumes: int = Field(..., description="外盤總成交量")

    @computed_field
    @property
    def change_percent(self) -> float:
        """計算漲跌百分比"""
        if self.close == 0:
            return 0.0
        previous_close = self.close - self.change_price
        if previous_close == 0:
            return 0.0
        return (self.change_price / previous_close) * 100

    @computed_field
    @property
    def timestamp_datetime(self) -> str:
        """將時間戳轉換為可讀格式"""
        try:
            # 將 nanoseconds 轉換為 seconds
            timestamp_seconds = self.ts / 1_000_000_000
            dt = datetime.fromtimestamp(timestamp_seconds)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            return "Unknown"


class UsageStats(BaseModel):
    """Shioaji API 使用量統計模型"""

    connections: int | None = Field(None, description="連接次數")
    bytes_used: float | None = Field(None, description="已使用流量 (MB)")
    bytes_limit: float | None = Field(None, description="流量限制 (MB)")
    bytes_remaining: float | None = Field(None, description="剩餘流量 (MB)")
    usage_rate: float | None = Field(None, description="使用率 (%)")
    warning_message: str | None = Field(None, description="警告訊息")
    status: str = Field(..., description="狀態")
    raw_data: dict[str, Any] = Field(default_factory=dict, description="原始使用量數據")

    @computed_field
    @property
    def is_over_limit(self) -> bool:
        """是否超過流量限制"""
        return self.usage_rate is not None and self.usage_rate > 100

    @computed_field
    @property
    def is_near_limit(self) -> bool:
        """是否接近流量限制"""
        return self.usage_rate is not None and self.usage_rate > 90


# 為了向後兼容,保留原有的模型定義...
# (這些可能在其他地方被使用)
