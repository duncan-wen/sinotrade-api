# src/models/domain.py

from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime

class APIUser(BaseModel):
    id: str
    api_key: str
    role: Literal["viewer", "trader"]

class FinancialInstrument(BaseModel):
    symbol: str
    type: Literal["Stock", "Future", "Option"]
    exchange: str  # e.g., "TSE" for Taiwan Stock Exchange, "TAIFEX" for Taiwan Futures Exchange
    # Optional fields for derivatives
    delivery_month: Optional[str] = None # e.g., "202310"
    strike_price: Optional[float] = None
    option_type: Optional[Literal["Call", "Put"]] = None

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
    underlying_price: Optional[float] = None # For derivatives

class SimulatedOrder(BaseModel):
    id: str
    user_id: str
    instrument_symbol: str
    action: Literal["Buy", "Sell"]
    price: float
    quantity: int
    order_type: Literal["LMT", "MKT"] # Limit or Market
    time_in_force: Literal["ROD", "IOC", "FOK"] # Rest of Day, Immediate or Cancel, Fill or Kill
    status: Literal["Pending", "Filled", "Cancelled", "Failed"]
    created_at: datetime
