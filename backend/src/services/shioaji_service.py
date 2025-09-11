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

    def get_historical_klines(
        self,
        symbol: str,
        interval: str = "1m",
        limit: int = 100,
        use_kbar_api: bool = False,
    ) -> list:
        """
        獲取歷史 K 線資料

        Args:
            symbol: 商品代號
            interval: 時間間隔 (1m, 5m, 15m, 1h, 1d, 1w, 1M)
            limit: 回傳的 K 線數量
            use_kbar_api: 是否使用官方 KBar API (僅支援日線)
        """
        contract = self._get_contract(symbol)
        if not contract:
            logger.error(f"Cannot find contract for symbol: {symbol}")
            return []

        # 策略選擇：
        # 1. 日線：優先使用官方 KBar API
        # 2. 周線/月線：從日線資料聚合 (效能較好)
        # 3. 其他：從 Ticks 聚合 (精確度最高)

        if use_kbar_api and interval == "1d":
            return self._get_kbars_from_api(contract, symbol, limit)
        elif interval in ["1w", "1M"]:
            return self._get_klines_from_daily_aggregation(
                contract, symbol, interval, limit
            )
        else:
            return self._get_klines_from_ticks(contract, symbol, interval, limit)

    def _get_kbars_from_api(self, contract, symbol: str, limit: int) -> list:
        """使用官方 KBar API 獲取日線資料 (效能較好)"""
        try:
            from datetime import datetime, timedelta
            import pandas as pd

            end_date = datetime.now()
            start_date = end_date - timedelta(days=limit + 10)

            logger.info(f"Using official KBar API for {symbol}")

            kbars = self.api.kbars(
                contract=contract,
                start=start_date.strftime("%Y-%m-%d"),
                end=end_date.strftime("%Y-%m-%d"),
            )

            if not kbars or len(kbars.ts) == 0:
                logger.warning(f"No KBar data found for {symbol}")
                return []

            # 轉換官方 KBar 格式
            klines = []
            for i in range(len(kbars.ts)):
                kline = {
                    "timestamp": pd.to_datetime(kbars.ts[i], unit="ns").isoformat(),
                    "open": float(kbars.Open[i]),
                    "high": float(kbars.High[i]),
                    "low": float(kbars.Low[i]),
                    "close": float(kbars.Close[i]),
                    "volume": int(kbars.Volume[i]),
                }
                klines.append(kline)

            return klines[-limit:] if len(klines) > limit else klines

        except Exception as e:
            logger.error(f"Failed to get KBars from official API: {e}")
            return []

    def _get_klines_from_daily_aggregation(
        self, contract, symbol: str, interval: str, limit: int
    ) -> list:
        """從日線資料聚合生成周線/月線 (效能較好)"""
        try:
            from datetime import datetime, timedelta
            import pandas as pd

            # 周線和月線需要更多的日線資料
            if interval == "1w":
                # 周線：獲取足夠的日線資料 (每周5個交易日)
                daily_limit = limit * 7 + 20  # 多取一些緩衝
                start_date = datetime.now() - timedelta(weeks=limit + 8)
            elif interval == "1M":
                # 月線：獲取足夠的日線資料 (每月約22個交易日)
                daily_limit = limit * 30 + 30  # 多取一些緩衝
                start_date = datetime.now() - timedelta(days=limit * 35 + 60)
            else:
                return []

            logger.info(f"Aggregating {interval} from daily data for {symbol}")

            # 使用官方 KBar API 獲取日線資料
            end_date = datetime.now()
            kbars = self.api.kbars(
                contract=contract,
                start=start_date.strftime("%Y-%m-%d"),
                end=end_date.strftime("%Y-%m-%d"),
            )

            if not kbars or len(kbars.ts) == 0:
                logger.warning(f"No daily KBar data found for {symbol}")
                return []

            # 轉換為 DataFrame
            df = pd.DataFrame(
                {
                    "datetime": pd.to_datetime(kbars.ts, unit="ns"),
                    "open": kbars.Open,
                    "high": kbars.High,
                    "low": kbars.Low,
                    "close": kbars.Close,
                    "volume": kbars.Volume,
                }
            )

            df.set_index("datetime", inplace=True)

            # 重新採樣聚合
            if interval == "1w":
                # 周線：從週一到週日 (W-MON 表示週日結束)
                resampler = df.resample("W-SUN")
            elif interval == "1M":
                # 月線：月末結束
                resampler = df.resample("M")
            else:
                return []

            # 聚合 OHLC 和 Volume
            agg_data = resampler.agg(
                {
                    "open": "first",  # 第一個交易日的開盤價
                    "high": "max",  # 期間內最高價
                    "low": "min",  # 期間內最低價
                    "close": "last",  # 最後一個交易日的收盤價
                    "volume": "sum",  # 期間內總成交量
                }
            ).dropna()

            # 轉換為標準格式
            klines = []
            for timestamp, row in agg_data.iterrows():
                kline = {
                    "timestamp": timestamp.isoformat(),
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": int(row["volume"]),
                }
                klines.append(kline)

            # 返回最新的 limit 根
            return klines[-limit:] if len(klines) > limit else klines

        except Exception as e:
            logger.error(f"Failed to aggregate {interval} from daily data: {e}")
            return []

    def _get_klines_from_ticks(
        self, contract, symbol: str, interval: str, limit: int
    ) -> list:
        """從 Ticks 聚合生成 K 線 (支援所有時間間隔)"""
        try:
            from datetime import datetime, timedelta
            import pandas as pd

            # 計算查詢時間範圍
            end_date = datetime.now()

            # 根據需要的根數和時間間隔計算開始時間
            if interval == "1m":
                start_date = end_date - timedelta(minutes=limit + 10)
            elif interval == "5m":
                start_date = end_date - timedelta(minutes=limit * 5 + 50)
            elif interval == "15m":
                start_date = end_date - timedelta(minutes=limit * 15 + 150)
            elif interval == "1h":
                start_date = end_date - timedelta(hours=limit + 10)
            elif interval == "1d":
                start_date = end_date - timedelta(days=limit + 10)
            elif interval == "1w":
                start_date = end_date - timedelta(weeks=limit + 4)  # 周線
            elif interval == "1M":
                start_date = end_date - timedelta(
                    days=limit * 35 + 30
                )  # 月線 (35天一個月含緩衝)
            else:
                start_date = end_date - timedelta(minutes=limit + 10)

            logger.info(
                f"Fetching Ticks data for {symbol} from {start_date} to {end_date}"
            )

            # 使用 Shioaji Ticks API (按照官方文檔)
            if hasattr(contract, "exchange") and contract.exchange:
                # 股票歷史資料
                ticks = self.api.ticks(
                    contract=contract,
                    date=start_date.strftime("%Y-%m-%d"),
                    query_type=sj.constant.TicksQueryType.LastCount,
                    last_cnt=10000,
                )
            else:
                # 期貨選擇權歷史資料
                ticks = self.api.ticks(
                    contract=contract,
                    date=start_date.strftime("%Y-%m-%d"),
                    query_type=sj.constant.TicksQueryType.LastCount,
                    last_cnt=10000,
                )

            if not ticks or len(ticks) == 0:
                logger.warning(f"No tick data found for {symbol}")
                return []

            # 按照官方文檔轉換為 DataFrame
            df = pd.DataFrame({**ticks})

            if df.empty:
                return []

            # 按照官方文檔處理時間戳
            if "ts" in df.columns:
                df["datetime"] = pd.to_datetime(df["ts"], unit="ns")
            elif "datetime" in df.columns:
                df["datetime"] = pd.to_datetime(df["datetime"])
            else:
                logger.error("Cannot find datetime column in historical data")
                return []

            df.set_index("datetime", inplace=True)

            # 重新採樣生成 K 線
            interval_map = {
                "1m": "1T",  # 1分鐘
                "5m": "5T",  # 5分鐘
                "15m": "15T",  # 15分鐘
                "1h": "1H",  # 1小時
                "1d": "1D",  # 日線
                "1w": "1W",  # 周線 (週日結束)
                "1M": "1M",  # 月線 (月末結束)
            }

            resample_interval = interval_map.get(interval, "1T")

            # 按照官方文檔的欄位名稱
            price_col = "close" if "close" in df.columns else "price"
            volume_col = "volume" if "volume" in df.columns else "qty"

            if price_col not in df.columns:
                logger.error(f"Price column not found in data: {df.columns.tolist()}")
                return []

            # 重新採樣生成 OHLC
            ohlc = df[price_col].resample(resample_interval).ohlc()
            volume = (
                df[volume_col].resample(resample_interval).sum()
                if volume_col in df.columns
                else None
            )

            # 組合成標準 K 線格式
            klines = []
            for timestamp, row in ohlc.iterrows():
                if pd.isna(row["open"]):
                    continue

                kline = {
                    "timestamp": timestamp.isoformat(),
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": (
                        float(volume.loc[timestamp])
                        if volume is not None and timestamp in volume.index
                        else 0
                    ),
                }
                klines.append(kline)

            return klines[-limit:] if len(klines) > limit else klines

        except Exception as e:
            logger.error(f"Failed to get klines from ticks: {e}")
            return []

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
