export interface Quote {
  symbol: string;
  timestamp: string;
  open: number;
  close: number;
  bid_price: number;
  ask_price: number;
  bid_volume: number;
  ask_volume: number;
  volume: number;
  avg_price: number;
  underlying_price: number | null;
}

export type OrderAction = "Buy" | "Sell";
export type OrderType = "LMT" | "MKT";
export type TimeInForce = "ROD" | "IOC" | "FOK";
export type OrderStatus = "Pending" | "Filled" | "Cancelled" | "Failed";

export interface SimulatedOrder {
  id: string;
  user_id: string;
  instrument_symbol: string;
  action: OrderAction;
  price: number;
  quantity: number;
  order_type: OrderType;
  time_in_force: TimeInForce;
  status: OrderStatus;
  created_at: string;
}
