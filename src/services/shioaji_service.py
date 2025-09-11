# src/services/shioaji_service.py

import os
import atexit
import shioaji as sj
from shioaji import TickSTKv1, TickFOPv1, Exchange
from loguru import logger
from dotenv import load_dotenv
from typing import Union, Optional

from src.models.domain import Quote, SimulatedOrder
from src.services.cache_service import set_cached_quote

load_dotenv()


class ShioajiService:
    def __init__(self):
        self.api = sj.Shioaji(simulation=True)  # Always use simulation for now
        self._login()
        self._setup_callbacks()

    def __del__(self):
        """當物件被垃圾回收時自動登出"""
        try:
            if hasattr(self, "api") and self.api:
                logger.info("ShioajiService is being destroyed, logging out...")
                self.api.logout()
        except Exception as e:
            logger.error(f"Error during logout in __del__: {e}")

    def logout(self):
        """手動登出方法"""
        try:
            if self.api:
                logger.info("Manually logging out from Shioaji...")
                self.api.logout()
                self.api = None
        except Exception as e:
            logger.error(f"Error during manual logout: {e}")
            raise

    def _login(self):
        api_key = os.getenv("API_KEY")
        secret_key = os.getenv("SECRET_KEY")
        if not api_key or not secret_key:
            raise ValueError("API_KEY and SECRET_KEY must be set in .env file")
        self.api.login(api_key=api_key, secret_key=secret_key)

    def _setup_callbacks(self):
        """設置各種商品類型的 callback"""
        self.api.quote.set_on_tick_stk_v1_callback(self._on_stock_tick)
        self.api.quote.set_on_tick_fop_v1_callback(self._on_futures_options_tick)

    def _get_contract(
        self, symbol: str
    ) -> Optional[Union[sj.contracts.Stock, sj.contracts.Future, sj.contracts.Option]]:
        """
        智能獲取合約，支持多種格式：
        - 股票: "2330", "TSE2330"
        - 期貨: "TXFA3", "TXF202509" 或自動獲取最近月份
        - 選擇權: "TXO18000R3", "TXO20230618000P"
        """
        contract = None

        try:
            # 1. 嘗試股票合約
            if symbol.isdigit() or (
                len(symbol) >= 4 and symbol[:3] in ["TSE", "OTC", "OES"]
            ):
                stock_code = symbol[-4:] if len(symbol) > 4 else symbol
                contract = self.api.Contracts.Stocks[stock_code]
                if contract:
                    logger.info(f"Found stock contract: {contract.symbol}")
                    return contract

        except (KeyError, AttributeError):
            pass

        try:
            # 2. 嘗試期貨合約
            if "TXF" in symbol or "F" in symbol:
                # 如果是完整的期貨代碼 (如 TXF202509)
                if len(symbol) > 5:
                    contract = self.api.Contracts.Futures[symbol]
                    if contract:
                        logger.info(f"Found futures contract: {contract.symbol}")
                        return contract

                # 如果只是期貨類別，獲取最近月份合約
                if symbol.startswith("TXF"):
                    # 獲取 TXF 最近月份合約
                    txf_contracts = [
                        c
                        for c in self.api.Contracts.Futures.TXF
                        if c.code.startswith("TXF")
                    ]
                    if txf_contracts:
                        # 選擇最近的交割月份
                        nearest_contract = min(
                            txf_contracts, key=lambda x: x.delivery_date
                        )
                        logger.info(
                            f"Found nearest TXF contract: {nearest_contract.symbol}"
                        )
                        return nearest_contract

        except (KeyError, AttributeError):
            pass

        try:
            # 3. 嘗試選擇權合約
            if "TXO" in symbol or "O" in symbol:
                contract = self.api.Contracts.Options[symbol]
                if contract:
                    logger.info(f"Found options contract: {contract.symbol}")
                    return contract

        except (KeyError, AttributeError):
            pass

        logger.error(f"Contract not found for symbol: {symbol}")
        return None

    def subscribe_quote(self, symbol: str, callback=None):
        """Subscribes to a real-time quote for a given symbol."""
        contract = self._get_contract(symbol)
        if not contract:
            return False

        logger.info(f"Subscribing to quote for {symbol} -> {contract.symbol}")

        try:
            self.api.quote.subscribe(
                contract,
                quote_type=sj.constant.QuoteType.Tick,
                version=sj.constant.QuoteVersion.v1,
            )
            return True
        except Exception as e:
            logger.error(f"Failed to subscribe to {symbol}: {e}")
            return False

    def _on_stock_tick(self, exchange: Exchange, tick: TickSTKv1):
        """處理股票 tick 資料"""
        logger.info(f"Received stock tick: {tick.code} - {tick.close}")

        quote = Quote(
            symbol=tick.code,
            timestamp=tick.datetime,
            open=tick.open,
            close=tick.close,
            bid_price=tick.bid_price[0] if tick.bid_price else 0,
            ask_price=tick.ask_price[0] if tick.ask_price else 0,
            bid_volume=tick.bid_volume[0] if tick.bid_volume else 0,
            ask_volume=tick.ask_volume[0] if tick.ask_volume else 0,
            avg_price=getattr(tick, "avg_price", None),
            underlying_price=None,  # 股票沒有標的價格
        )

        set_cached_quote(quote.symbol, quote)

    def _on_futures_options_tick(self, exchange: Exchange, tick: TickFOPv1):
        """處理期貨和選擇權 tick 資料"""
        logger.info(f"Received F/O tick: {tick.code} - {tick.close}")

        quote = Quote(
            symbol=tick.code,
            timestamp=tick.datetime,
            open=tick.open,
            close=tick.close,
            bid_price=tick.bid_price[0] if tick.bid_price else 0,
            ask_price=tick.ask_price[0] if tick.ask_price else 0,
            bid_volume=tick.bid_volume[0] if tick.bid_volume else 0,
            ask_volume=tick.ask_volume[0] if tick.ask_volume else 0,
            avg_price=getattr(tick, "avg_price", None),
            underlying_price=getattr(tick, "underlying_price", None),
        )

        set_cached_quote(quote.symbol, quote)

    def place_order(self, order: SimulatedOrder) -> SimulatedOrder:
        """Places a simulated order."""
        logger.info(f"Placing order: {order}")

        contract = self._get_contract(order.instrument_symbol)
        if not contract:
            raise ValueError(
                f"Contract not found for symbol: {order.instrument_symbol}"
            )

        # 根據合約類型創建對應的訂單
        if hasattr(contract, "exchange") and contract.exchange:
            # 股票訂單
            sj_order = sj.order.StockOrder(
                action=sj.constant.Action(order.action),
                price=order.price,
                quantity=order.quantity,
                price_type=sj.constant.StockPriceType(order.order_type),
                order_type=sj.constant.OrderType(order.time_in_force),
                account=self.api.stock_account,
            )
        else:
            # 期貨選擇權訂單 (如果需要的話)
            logger.warning("Futures/Options order not fully implemented yet")
            raise NotImplementedError("Futures/Options orders not supported yet")

        try:
            trade = self.api.place_order(contract, sj_order)
            logger.info(f"Order placed. Trade: {trade}")

            order.status = "Pending"
            order.id = trade.order.id
            return order
        except Exception as e:
            logger.error(f"Failed to place order: {e}")
            order.status = "Failed"
            raise


# Singleton instance
shioaji_service = ShioajiService()


# 確保程式結束時自動登出
def cleanup_shioaji():
    """程式結束時的清理函數"""
    try:
        shioaji_service.logout()
        logger.info("Shioaji service cleaned up successfully")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")


# 註冊程式結束時的清理函數
atexit.register(cleanup_shioaji)
