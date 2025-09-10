# src/services/shioaji_service.py

import os
import shioaji as sj
from shioaji import TickFOPv1, Exchange
from loguru import logger
from dotenv import load_dotenv

from src.models.domain import Quote, SimulatedOrder
from src.services.cache_service import set_cached_quote

load_dotenv()


class ShioajiService:
    def __init__(self):
        self.api = sj.Shioaji(simulation=True)  # Always use simulation for now
        self._login()

    def _login(self):
        api_key = os.getenv("API_KEY")
        secret_key = os.getenv("SECRET_KEY")
        if not api_key or not secret_key:
            raise ValueError("API_KEY and SECRET_KEY must be set in .env file")
        self.api.login(api_key=api_key, secret_key=secret_key)

    def subscribe_quote(self, symbol: str, callback):
        """Subscribes to a real-time quote for a given symbol."""
        try:
            contract = self.api.Contracts.Stocks[symbol]
            if not contract:
                contract = self.api.Contracts.Futures.TXF["TXF202509"]
            if not contract:
                contract = self.api.Contracts.Options[symbol]
        except KeyError:
            logger.error(f"Contract not found for symbol: {symbol}")
            return

        logger.info(f"Subscribing to quote for {symbol}")
        self.api.quote.subscribe(
            contract,
            quote_type=sj.constant.QuoteType.Tick,
            version=sj.constant.QuoteVersion.v1,
        )

        def quote_callback(exchange: Exchange, tick: TickFOPv1):
            print(f"Exchange: {exchange}, Tick: {tick}")

        # self.api.set_on_tick_stk_v1_callback(self._on_tick)
        self.api.quote.set_on_tick_fop_v1_callback(quote_callback)

    def _on_tick(self, _exchange: Exchange, tick: TickFOPv1):
        """Callback function to handle incoming ticks."""
        logger.info(f"Received tick: {tick}")

        # Create a Quote object from the tick data
        quote = Quote(
            symbol=tick.code,
            timestamp=tick.datetime,
            open=tick.open,
            close=tick.close,
            bid_price=tick.bid_price[0] if tick.bid_price else 0,
            ask_price=tick.ask_price[0] if tick.ask_price else 0,
            bid_volume=tick.bid_volume[0] if tick.bid_volume else 0,
            ask_volume=tick.ask_volume[0] if tick.ask_volume else 0,
            avg_price=tick.avg_price,
            underlying_price=getattr(tick, "underlying_price", None),
        )

        # Store the quote in the cache
        set_cached_quote(quote.symbol, quote)

    def place_order(self, order: SimulatedOrder) -> SimulatedOrder:
        """Places a simulated order."""
        logger.info(f"Placing order: {order}")
        contract = self.api.Contracts.Stocks[order.instrument_symbol]
        sj_order = sj.order.StockOrder(
            action=sj.constant.Action(order.action),
            price=order.price,
            quantity=order.quantity,
            price_type=sj.constant.StockPriceType(order.order_type),
            order_type=sj.constant.OrderType(order.time_in_force),
            account=self.api.stock_account,
        )

        trade = self.api.place_order(contract, sj_order)
        logger.info(f"Order placed. Trade: {trade}")

        order.status = "Pending"
        order.id = trade.order.id
        return order


# Singleton instance
shioaji_service = ShioajiService()
