# src/models/domain.py

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class APIUser(BaseModel):
    id: str
    api_key: str
    role: Literal["viewer", "trader"]


class FinancialInstrument(BaseModel):
    symbol: str
    type: Literal["Stock", "Future", "Option"]
    exchange: str  # e.g., "TSE" for Taiwan Stock Exchange, "TAIFEX" for Taiwan Futures Exchange
    # Optional fields for derivatives
    delivery_month: str | None = None  # e.g., "202310"
    strike_price: float | None = None
    option_type: Literal["Call", "Put"] | None = None


class Quote(BaseModel):
    symbol: str
    timestamp: datetime
    open: float
    close: float
    bid_price: float
    ask_price: float
    bid_volume: int
    ask_volume: int
    volume: int  # 總成交量
    avg_price: float
    underlying_price: float | None = None  # For derivatives


class SimulatedOrder(BaseModel):
    id: str
    user_id: str
    instrument_symbol: str
    action: Literal["Buy", "Sell"]
    price: float
    quantity: int
    order_type: Literal["LMT", "MKT"]  # Limit or Market
    time_in_force: Literal[
        "ROD", "IOC", "FOK"
    ]  # Rest of Day, Immediate or Cancel, Fill or Kill
    status: Literal["Pending", "Filled", "Cancelled", "Failed"]
    created_at: datetime
