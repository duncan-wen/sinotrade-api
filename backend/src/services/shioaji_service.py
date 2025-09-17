# src/services/shioaji_service.py

import asyncio
import atexit
import os
import re
from collections.abc import Callable
from typing import Any, cast

import pandas as pd
import shioaji as sj  # type: ignore
from dotenv import load_dotenv
from loguru import logger
from shioaji import Exchange, TickFOPv1, TickSTKv1  # type: ignore

from src.models.domain import Quote, SimulatedOrder
from src.services.cache_service import set_cached_quote

load_dotenv()


class ShioajiService:
    def __init__(self) -> None:
        self.api = sj.Shioaji(simulation=True)  # Always use simulation for now
        self.quote_callbacks: list[Callable] = []  # WebSocket 回調函數列表
        self.active_subscriptions: set[str] = set()  # 記錄實際訂閱的股票代號
        self._pending_tasks: set = set()  # 存儲待處理的任務引用
        self._is_logged_in = False  # 登入狀態標記
        self._is_initialized = False  # 初始化狀態標記
        self._is_destroyed = False  # 銷毀狀態標記
        self._login()
        self._setup_callbacks()

    def __del__(self) -> None:
        """當物件被垃圾回收時進行完整清理"""
        # 標記物件已被銷毀,防止進一步操作
        self._is_destroyed = True

        try:
            logger.info("[DESTROY] ShioajiService 物件被銷毀,執行最終清理...")

            # 如果還沒有被清理過,執行完整清理
            if hasattr(self, "active_subscriptions") and self.active_subscriptions:
                logger.warning(f"物件銷毀時仍有活躍訂閱: {self.active_subscriptions}")

            # 調用完整的清理流程
            if hasattr(self, "cleanup"):
                try:
                    self.cleanup()
                    logger.info("[DESTROY] 物件銷毀時清理完成")
                except Exception as cleanup_error:
                    logger.error(f"物件銷毀時清理失敗: {cleanup_error}")
                    # 如果清理失敗,至少嘗試登出
                    try:
                        if hasattr(self, "api") and self.api:
                            self.api.logout()
                    except Exception as logout_error:
                        logger.error(f"最終登出失敗: {logout_error}")

        except Exception as e:
            # __del__ 中的異常不會被正確處理,只記錄錯誤
            try:
                logger.error(f"物件銷毀清理異常: {e}")
            except Exception:
                # 如果連logger都不可用,靜默失敗
                pass

    def add_quote_callback(self, callback: Callable) -> None:
        """添加報價回調函數"""
        self.quote_callbacks.append(callback)
        logger.info(f"Added quote callback: {callback.__name__}")

    def initialize(self) -> bool:
        """初始化 Shioaji 服務"""
        if self._is_destroyed:
            logger.error("服務已被銷毀,無法重新初始化")
            return False

        if self._is_initialized:
            logger.info("服務已經初始化,跳過重複初始化")
            return True

        try:
            logger.info("初始化 Shioaji 服務...")

            # 檢查API物件是否有效
            if not self.api:
                logger.error("Shioaji API 物件無效")
                return False

            # 檢查登入狀態
            if not self._is_logged_in:
                logger.warning("Shioaji 未登入,先執行登入...")
                self._login()

            # 驗證登入狀態
            if not hasattr(self.api, "login") or not self.api.login:
                logger.error("Shioaji 登入狀態無效")
                self._is_logged_in = False
                return False

            self._is_initialized = True
            logger.info("[INIT] Shioaji 服務初始化成功")
            return True

        except Exception as e:
            logger.error(f"[ERROR] Shioaji 服務初始化失敗: {e}")
            self._is_initialized = False
            return False

    def cleanup(self) -> bool:
        """清理 Shioaji 服務資源"""
        try:
            logger.info("清理 Shioaji 服務資源...")
            logger.info(f"需要取消訂閱的股票數量: {len(self.active_subscriptions)}")

            # 只取消實際訂閱過的股票
            failed_unsubscribes = []
            for symbol in list(self.active_subscriptions):
                try:
                    success = self.unsubscribe_quote(symbol)
                    if not success:
                        failed_unsubscribes.append(symbol)
                        logger.warning(f"清理時取消訂閱失敗: {symbol}")
                    else:
                        logger.debug(f"清理時成功取消訂閱: {symbol}")
                except Exception as e:
                    failed_unsubscribes.append(symbol)
                    logger.error(f"清理時取消訂閱異常: {symbol} - {e}")

            if failed_unsubscribes:
                logger.warning(f"以下股票取消訂閱失敗: {failed_unsubscribes}")
            else:
                logger.info("✅ 所有活躍訂閱已成功取消")

            # 強制清理記錄,即使有些取消失敗
            remaining_subs = len(self.active_subscriptions)
            if remaining_subs > 0:
                logger.warning(f"清理後仍有 {remaining_subs} 個訂閱記錄,強制清理")
                self.active_subscriptions.clear()

            # 取消所有待處理的任務
            remaining_tasks = len(self._pending_tasks)
            if remaining_tasks > 0:
                logger.warning(f"清理時取消 {remaining_tasks} 個待處理任務")
                for task in list(self._pending_tasks):
                    if not task.done():
                        task.cancel()
                self._pending_tasks.clear()

            # 登出
            self.logout()
            logger.info("✅ Shioaji 服務清理完成")
            return True

        except Exception as e:
            logger.error(f"Shioaji 服務清理失敗: {e}")
            return False

    def logout(self) -> None:
        """手動登出方法,帶有完整的防護機制"""
        if self._is_destroyed:
            logger.warning("服務已被銷毀,無法再次登出")
            return

        if not self._is_logged_in:
            logger.info("服務未登入,無需登出")
            return

        if not self.api:
            logger.warning("API 物件為空,無法登出")
            self._is_logged_in = False
            return

        try:
            logger.info("🔐 正在登出 Shioaji...")

            # 檢查是否有活躍訂閱,在登出前取消
            if self.active_subscriptions:
                logger.warning(
                    f"登出時仍有 {len(self.active_subscriptions)} 個活躍訂閱,強制取消"
                )
                for symbol in list(self.active_subscriptions):
                    try:
                        self.unsubscribe_quote(symbol)
                    except Exception as unsub_error:
                        logger.error(f"登出前取消訂閱失敗 {symbol}: {unsub_error}")

                # 執行登出
                self.api.logout()
            self._is_logged_in = False
            self._is_initialized = False
            logger.info("✅ Shioaji 登出成功")

        except AttributeError as e:
            # API 物件可能已經被破壞
            logger.error(f"API 物件狀態異常,強制清理狀態: {e}")
            self._force_cleanup_state()

        except ConnectionError as e:
            # 網路連接問題
            logger.error(f"登出時網路連接錯誤: {e}")
            self._force_cleanup_state()

        except Exception as e:
            logger.error(f"❌ 登出失敗: {e}")
            # 即使登出失敗,也清理狀態標記
            self._force_cleanup_state()
            raise

    def _force_cleanup_state(self) -> None:
        """強制清理內部狀態,當API操作失敗時使用"""
        logger.warning("🔧 強制清理 Shioaji 服務狀態")
        self._is_logged_in = False
        self._is_initialized = False
        self.active_subscriptions.clear()
        self._pending_tasks.clear()
        try:
            self.api = None
        except Exception:
            pass  # 忽略清理API物件時的錯誤

    def get_historical_klines(
        self,
        symbol: str,
        interval: str = "1m",
        limit: int = 100,
        ma_periods: list[int] | None = None,
    ) -> dict[str, Any]:
        """
        獲取歷史 K 線資料

        Args:
            symbol: 商品代號
            interval: 時間間隔 (1m, 5m, 15m, 1h, 1d, 1w, 1M)
            limit: 回傳的 K 線數量
            ma_periods: 均線週期列表,用於計算額外需要的數據量 (如 [5, 20, 60])
        """
        contract = self._get_contract(symbol)
        if not contract:
            logger.error(f"Cannot find contract for symbol: {symbol}")
            return {"contract": {"symbol": symbol, "name": symbol}, "data": []}

        # 計算實際需要的數據量(考慮均線計算需求)
        actual_limit = self._calculate_data_limit(limit, ma_periods)
        logger.info(
            f"Requested {limit} bars, fetching {actual_limit} bars for MA calculation"
        )

        # 策略選擇:
        # 1. 日線:優先使用官方 KBar API (更穩定)
        # 2. 周線/月線:從日線資料聚合 (效能較好)
        # 3. 其他:從 Ticks 聚合 (精確度最高,但可能不穩定)

        if interval == "1d":
            # 日線優先使用 KBar API
            all_data = self._get_kbars_from_api(contract, symbol, actual_limit)
        elif interval in ["1w", "1M"]:
            all_data = self._get_klines_from_daily_aggregation(
                contract, symbol, interval, actual_limit
            )
        else:
            # 分鐘線等其他時間間隔使用 Ticks 聚合
            all_data = self._get_klines_from_ticks(
                contract, symbol, interval, actual_limit
            )

        # 返回最後 limit 筆數據(用於顯示),但保留所有數據供均線計算
        klines_data = all_data[-limit:] if len(all_data) > limit else all_data

        # 返回包含合約資訊和數據的字典
        return {
            "contract": {
                "symbol": contract.symbol,
                "name": getattr(contract, "name", symbol),
                "code": getattr(contract, "code", symbol),
                "exchange": str(getattr(contract, "exchange", "")),
            },
            "data": klines_data,
        }

    def _calculate_data_limit(self, limit: int, ma_periods: list[int] | None) -> int:
        """
        計算實際需要的數據量,考慮均線計算需求

        Args:
            limit: 要顯示的K線數量
            ma_periods: 均線週期列表 (如 [5, 20, 60])

        Returns:
            實際需要獲取的數據量
        """
        if not ma_periods:
            return limit

        # 找出最大的均線週期
        max_ma_period = max(ma_periods)

        # 實際需要的數據量 = 顯示數量 + 最大均線週期 - 1
        # 例如:顯示60天 + MA60 = 需要119天數據
        actual_limit = limit + max_ma_period - 1

        logger.info(f"MA periods: {ma_periods}, max period: {max_ma_period}")
        logger.info(f"Display limit: {limit}, actual data needed: {actual_limit}")

        return actual_limit

    def _get_kbars_from_api(
        self, contract: Any, symbol: str, limit: int
    ) -> list[dict[str, Any]]:
        """使用官方 KBar API 獲取分鐘資料並聚合成日線 (修正版)"""
        try:
            from datetime import datetime, timedelta

            end_date = datetime.now()
            # KBar API 返回的是分鐘數據,需要更多天數來獲取足夠的日線
            start_date = end_date - timedelta(days=limit + 30)

            logger.info(
                f"Using official KBar API for {symbol} (returns minute data, will aggregate to daily)"
            )
            logger.info(f"Start date: {start_date.strftime('%Y-%m-%d')}")
            logger.info(f"End date: {end_date.strftime('%Y-%m-%d')}")

            kbars = self.api.kbars(
                contract=contract,
                start=start_date.strftime("%Y-%m-%d"),
                end=end_date.strftime("%Y-%m-%d"),
            )

            if not kbars or len(kbars.ts) == 0:
                logger.warning(f"No KBar data found for {symbol}")
                return []

            # 轉換為 DataFrame (這些是分鐘數據)
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

            logger.info(f"Received {len(df)} minute bars, aggregating to daily")

            # 設置時間索引
            df.set_index("datetime", inplace=True)

            # 聚合成日線 (按日期分組)
            daily_data = (
                df.resample("1D")
                .agg(
                    {
                        "open": "first",  # 當日第一筆的開盤價
                        "high": "max",  # 當日最高價
                        "low": "min",  # 當日最低價
                        "close": "last",  # 當日最後一筆的收盤價
                        "volume": "sum",  # 當日總成交量
                    }
                )
                .dropna()
            )

            # 轉換為標準格式
            klines = []
            for timestamp, row in daily_data.iterrows():
                kline = {
                    "timestamp": cast(pd.Timestamp, timestamp).isoformat(),
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": int(row["volume"]),
                }
                klines.append(kline)

            logger.info(f"Aggregated to {len(klines)} daily bars")
            return klines[-limit:] if len(klines) > limit else klines

        except Exception as e:
            logger.error(f"Failed to get KBars from official API: {e}")
            return []

    def _get_klines_from_daily_aggregation(
        self, contract: Any, symbol: str, interval: str, limit: int
    ) -> list[dict[str, Any]]:
        """從日線資料聚合生成周線/月線 (效能較好)"""
        try:
            from datetime import datetime, timedelta

            # 周線和月線需要更多的日線資料
            if interval == "1w":
                # 周線:獲取足夠的日線資料 (每周5個交易日)
                start_date = datetime.now() - timedelta(weeks=limit + 8)
            elif interval == "1M":
                # 月線:獲取足夠的日線資料 (每月約22個交易日)
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
                # 周線:從週一到週日 (W-MON 表示週日結束)
                resampler = df.resample("W-SUN")
            elif interval == "1M":
                # 月線:月末結束
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
                    "timestamp": cast(pd.Timestamp, timestamp).isoformat(),
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
        self, contract: Any, symbol: str, interval: str, limit: int
    ) -> list[dict[str, Any]]:
        """從 Ticks 聚合生成 K 線 (支援所有時間間隔)"""
        try:
            from datetime import datetime, timedelta

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
            logger.info(f"Requesting ticks for contract: {contract.symbol}")

            try:
                # 統一使用 Ticks API,不區分股票和期貨
                ticks = self.api.ticks(
                    contract=contract,
                    date=start_date.strftime("%Y-%m-%d"),
                    query_type=sj.constant.TicksQueryType.LastCount,
                    last_cnt=5000,  # 減少數量避免超時
                )
                logger.info(f"Received ticks object type: {type(ticks)}")

                # 檢查 ticks 物件的屬性
                if hasattr(ticks, "__dict__"):
                    logger.info(f"Ticks attributes: {list(ticks.__dict__.keys())}")

            except Exception as e:
                logger.error(f"Failed to fetch ticks: {e}")
                return []

            if not ticks:
                logger.warning(f"No tick data found for {symbol}")
                return []

            # 按照官方文檔轉換為 DataFrame
            try:
                df = pd.DataFrame({**ticks})
            except Exception as e:
                logger.error(f"Failed to convert ticks to DataFrame: {e}")
                # 嘗試其他轉換方式
                try:
                    if hasattr(ticks, "ts") and hasattr(ticks, "close"):
                        df = pd.DataFrame(
                            {
                                "ts": ticks.ts,
                                "close": ticks.close,
                                "volume": getattr(ticks, "volume", []),
                                "price": getattr(ticks, "price", ticks.close),
                                "qty": getattr(
                                    ticks, "qty", getattr(ticks, "volume", [])
                                ),
                            }
                        )
                    else:
                        logger.error(f"Unsupported ticks format: {type(ticks)}")
                        return []
                except Exception as e2:
                    logger.error(f"Failed alternative conversion: {e2}")
                    return []

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

            # 重新採樣生成 K 線 (使用新的 Pandas 時間別名)
            interval_map = {
                "1m": "1min",  # 1分鐘 (新格式)
                "5m": "5min",  # 5分鐘 (新格式)
                "15m": "15min",  # 15分鐘 (新格式)
                "1h": "1H",  # 1小時
                "1d": "1D",  # 日線
                "1w": "1W",  # 周線 (週日結束)
                "1M": "1M",  # 月線 (月末結束)
            }

            resample_interval = interval_map.get(interval, "1min")

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
                    "timestamp": cast(pd.Timestamp, timestamp).isoformat(),
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": (
                        float(volume.loc[cast(pd.Timestamp, timestamp)])
                        if volume is not None
                        and cast(pd.Timestamp, timestamp) in volume.index
                        else 0
                    ),
                }
                klines.append(kline)

            return klines[-limit:] if len(klines) > limit else klines

        except Exception as e:
            logger.error(f"Failed to get klines from ticks: {e}")

            # 備用方案:如果是日線,嘗試使用官方 KBar API
            if interval == "1d":
                logger.info(f"Falling back to KBar API for {symbol}")
                return self._get_kbars_from_api(contract, symbol, limit)

            return []

    def _login(self) -> None:
        """登入 Shioaji 並設置狀態標記"""
        if self._is_logged_in:
            logger.warning("已經登入,跳過重複登入")
            return

        try:
            api_key = os.getenv("SHIOAJI_API_KEY")
            secret_key = os.getenv("SHIOAJI_SECRET_KEY")
            if not api_key or not secret_key:
                raise ValueError("API_KEY and SECRET_KEY must be set in .env file")

            logger.info("正在登入 Shioaji...")
            self.api.login(api_key=api_key, secret_key=secret_key)
            self._is_logged_in = True
            logger.info("✅ Shioaji 登入成功")

        except Exception as e:
            logger.error(f"❌ Shioaji 登入失敗: {e}")
            self._is_logged_in = False
            raise

    def _setup_callbacks(self) -> None:
        """設置各種商品類型的 callback"""
        self.api.quote.set_on_tick_stk_v1_callback(self._on_stock_tick)
        self.api.quote.set_on_tick_fop_v1_callback(self._on_futures_options_tick)

    def _get_contract(self, symbol: str) -> Any:
        """
        智能獲取合約,支持多種格式:
        - 股票: "2330", "TSE2330"
        - 期貨: "code:TXFA3", "symbol:TXF202509" 或 TXF自動獲取最近月份
        - 選擇權: "TXO18000R3", "TXO20230618000P"
        - 指數: "TSE001", "001" (加權指數)
        """
        contract = None

        try:
            # 1. 先嘗試指數合約 (TSE001, 001 等)
            if symbol.lower().startswith("tse") or re.match(r"^[0-9]{3}$", symbol):
                index_code = symbol[-3:] if symbol.lower().startswith("tse") else symbol
                contract = self.api.Contracts.Indexs.TSE[index_code]
                if contract:
                    logger.info(f"Found index contract: {contract.symbol}")
                    return contract

        except (KeyError, AttributeError):
            logger.debug(f"Index contract not found for {symbol}")

        try:
            # 2. 嘗試股票合約
            if symbol.isdigit() or (
                len(symbol) >= 4 and symbol[:3] in ["TSE", "OTC", "OES"]
            ):
                stock_code = symbol[-4:] if len(symbol) > 4 else symbol
                contract = self.api.Contracts.Stocks[stock_code]
                if contract:
                    logger.info(
                        f"Found stock contract: {contract.symbol} - {contract.name}"
                    )
                    return contract

        except (KeyError, AttributeError):
            pass

        try:
            # 3. 嘗試期貨合約
            if "TXF" in symbol or "MXF" in symbol or "F" in symbol:
                # 如果是完整的期貨代碼 (如 TXF202510),使用 code 查找
                if len(symbol) > 5:
                    try:
                        contract = self.api.Contracts.Futures[symbol]
                        if contract:
                            logger.info(
                                f"Found futures contract by code: {contract.code} -> {contract.symbol}"
                            )
                            return contract
                    except KeyError:
                        logger.warning(f"Futures contract not found by code: {symbol}")

                # 🚀 簡化期貨處理 - 使用標準化近月/遠月符號
                if symbol in ["TXFR1", "TXFR2"]:  # 大台指近月/遠月
                    # TXF 大台指期貨處理邏輯
                    try:
                        # 使用官方文檔的方式:api.Contracts.Futures.TXF
                        txf_group = self.api.Contracts.Futures.TXF

                        # 動態選擇當前主力合約:根據結算日期規則
                        # 每月第三個星期三下午3點換合約
                        import calendar
                        from datetime import datetime

                        def get_current_txf_contract():
                            now = datetime.now()
                            current_year = now.year
                            current_month = now.month

                            # 計算當月第三個星期三
                            wednesdays_in_month = []
                            for week in calendar.monthcalendar(
                                current_year, current_month
                            ):
                                if week[2] != 0:  # 星期三是索引 2,0 表示該週沒有這一天
                                    wednesdays_in_month.append(week[2])

                            # 取第三個星期三(索引 2)
                            if len(wednesdays_in_month) >= 3:
                                third_wednesday = wednesdays_in_month[2]
                            else:
                                # 如果當月沒有第三個星期三,使用最後一個
                                third_wednesday = (
                                    wednesdays_in_month[-1]
                                    if wednesdays_in_month
                                    else 1
                                )

                            # 第三個星期三下午3點的時間戳
                            settlement_time = datetime(
                                current_year, current_month, third_wednesday, 15, 0
                            )

                            # 判斷是否已過結算時間
                            if now >= settlement_time:
                                # 已過結算,使用下個月合約
                                if current_month == 12:
                                    target_month = 1
                                    target_year = current_year + 1
                                else:
                                    target_month = current_month + 1
                                    target_year = current_year
                            else:
                                # 未過結算,使用當月合約
                                target_month = current_month
                                target_year = current_year

                            # 格式化為期貨合約代碼:TXF202510
                            # 期貨月份代碼映射
                            month_codes = {
                                1: "F",
                                2: "G",
                                3: "H",
                                4: "J",
                                5: "K",
                                6: "M",
                                7: "N",
                                8: "Q",
                                9: "U",
                                10: "V",
                                11: "X",
                                12: "Z",
                            }
                            month_code = month_codes[target_month]
                            year_code = str(target_year)[-1]  # 只取年份最後一位
                            contract_code = f"TXF{month_code}{year_code}"
                            logger.info(
                                f"計算出的主力合約: {contract_code} (當前時間: {now}, 結算時間: {settlement_time})"
                            )
                            return contract_code

                        # 🚀 簡化邏輯:根據 symbol 選擇近月或遠月
                        try:
                            txf_contracts = list(txf_group)
                            logger.info(
                                f"Available TXF contracts: {[c.code for c in txf_contracts[:5]]}"
                            )

                            if txf_contracts:
                                # 按交割日期排序,選擇近月或遠月
                                sorted_contracts = sorted(
                                    [c for c in txf_contracts if c.delivery_date],
                                    key=lambda x: x.delivery_date,
                                )

                                if symbol == "TXFR1" and len(sorted_contracts) >= 1:
                                    # 近月合約
                                    selected_contract = sorted_contracts[0]
                                    logger.info(
                                        f"✅ 大台指近月: {selected_contract.code}"
                                    )
                                    return selected_contract
                                elif symbol == "TXFR2" and len(sorted_contracts) >= 2:
                                    # 遠月合約
                                    selected_contract = sorted_contracts[1]
                                    logger.info(
                                        f"✅ 大台指遠月: {selected_contract.code}"
                                    )
                                    return selected_contract
                                else:
                                    # 回退到第一個可用合約
                                    selected_contract = (
                                        sorted_contracts[0]
                                        if sorted_contracts
                                        else txf_contracts[0]
                                    )
                                    logger.info(
                                        f"✅ 大台指回退: {selected_contract.code}"
                                    )
                                    return selected_contract
                        except Exception as e:
                            logger.error(f"Error accessing TXF contracts: {e}")

                    except Exception as e:
                        logger.error(f"Error accessing TXF group: {e}")
                        return None

                elif symbol in ["MXFR1", "MXFR2"]:  # 小台指近月/遠月
                    # 🚀 小台指期貨簡化邏輯
                    try:
                        # 嘗試 MXF 群組
                        try:
                            mxf_group = self.api.Contracts.Futures.MXF
                            mxf_contracts = list(mxf_group)
                            logger.info(
                                f"Available MXF contracts: {[c.code for c in mxf_contracts[:5]]}"
                            )

                            if mxf_contracts:
                                # 按交割日期排序,選擇近月或遠月
                                sorted_contracts = sorted(
                                    [c for c in mxf_contracts if c.delivery_date],
                                    key=lambda x: x.delivery_date,
                                )

                                if symbol == "MXFR1" and len(sorted_contracts) >= 1:
                                    # 近月合約
                                    selected_contract = sorted_contracts[0]
                                    logger.info(
                                        f"✅ 小台指近月: {selected_contract.code}"
                                    )
                                    return selected_contract
                                elif symbol == "MXFR2" and len(sorted_contracts) >= 2:
                                    # 遠月合約
                                    selected_contract = sorted_contracts[1]
                                    logger.info(
                                        f"✅ 小台指遠月: {selected_contract.code}"
                                    )
                                    return selected_contract
                                else:
                                    # 回退到第一個可用合約
                                    selected_contract = (
                                        sorted_contracts[0]
                                        if sorted_contracts
                                        else mxf_contracts[0]
                                    )
                                    logger.info(
                                        f"✅ 小台指回退: {selected_contract.code}"
                                    )
                                    return selected_contract
                        except Exception as e:
                            logger.error(f"Error accessing MXF group: {e}")
                            return None

                    except Exception as e:
                        logger.error(f"Error in MXF processing: {e}")
                        return None

        except (KeyError, AttributeError):
            pass

        try:
            # 4. 嘗試選擇權合約
            if "TXO" in symbol or "O" in symbol:
                contract = self.api.Contracts.Options[symbol]
                if contract:
                    logger.info(f"Found options contract: {contract.symbol}")
                    return contract

        except (KeyError, AttributeError):
            pass

        logger.error(f"Contract not found for symbol: {symbol}")
        return None

    def subscribe_quote(self, symbol: str, callback: Any = None) -> bool:
        """訂閱股票報價,帶有完整的防護機制"""
        if self._is_destroyed:
            logger.error(f"服務已被銷毀,無法訂閱 {symbol}")
            return False

        if not symbol or not isinstance(symbol, str):
            logger.error(f"無效的股票代號: {symbol}")
            return False

        # 檢查是否已經訂閱
        if symbol in self.active_subscriptions:
            logger.debug(f"股票 {symbol} 已經訂閱,跳過重複訂閱")
            return True

        # 檢查服務狀態
        if not self._is_initialized or not self._is_logged_in:
            logger.error(f"服務未初始化或未登入,無法訂閱 {symbol}")
            return False

        if not self.api:
            logger.error(f"API 物件為空,無法訂閱 {symbol}")
            return False

        contract = self._get_contract(symbol)
        if not contract:
            logger.error(f"找不到合約: {symbol},無法訂閱")
            return False

        try:
            # 檢查是股票還是期貨
            contract_type = "期貨" if hasattr(contract, "delivery_date") else "股票"
            logger.info(
                f"📈 訂閱{contract_type}: {symbol} -> {contract.code} ({getattr(contract, 'name', 'N/A')})"
            )

            # 檢查quote屬性是否存在
            if not hasattr(self.api, "quote") or not self.api.quote:
                logger.error(f"Quote API 不可用,無法訂閱 {symbol}")
                return False

            # 執行訂閱
            self.api.quote.subscribe(
                contract,
                quote_type=sj.constant.QuoteType.Tick,
                version=sj.constant.QuoteVersion.v1,
            )

            # 記錄成功訂閱的股票
            self.active_subscriptions.add(symbol)
            logger.info(
                f"✅ 成功訂閱{contract_type}並記錄: {symbol} -> {contract.code}"
            )

            # 顯示當前活躍訂閱和回調狀態
            logger.info(f"📊 活躍訂閱: {self.active_subscriptions}")
            logger.info(f"📞 回調數量: {len(self.quote_callbacks)}")

            return True

        except AttributeError as e:
            # API 物件或方法不存在
            logger.error(f"API 屬性錯誤,無法訂閱 {symbol}: {e}")
            return False

        except ConnectionError as e:
            # 網路連接問題
            logger.error(f"訂閱時網路連接錯誤 {symbol}: {e}")
            return False

        except Exception as e:
            logger.error(f"❌ 訂閱失敗 {symbol}: {e}")
            return False

    def unsubscribe_quote(self, symbol: str) -> bool:
        """取消訂閱股票報價,帶有完整的防護機制"""
        if self._is_destroyed:
            logger.warning(f"服務已被銷毀,無法取消訂閱 {symbol}")
            return False

        if not symbol or not isinstance(symbol, str):
            logger.error(f"無效的股票代號: {symbol}")
            return False

        # 檢查是否真的訂閱過
        if symbol not in self.active_subscriptions:
            logger.debug(f"股票 {symbol} 未在活躍訂閱列表中,跳過取消訂閱")
            return True

        # 檢查服務狀態
        if not self._is_initialized or not self._is_logged_in:
            logger.warning(f"服務未初始化或未登入,無法取消訂閱 {symbol}")
            # 即使無法取消,也從記錄中移除
            self.active_subscriptions.discard(symbol)
            return False

        if not self.api:
            logger.error(f"API 物件為空,無法取消訂閱 {symbol}")
            self.active_subscriptions.discard(symbol)
            return False

        contract = self._get_contract(symbol)
        if not contract:
            logger.warning(f"找不到合約: {symbol},無法取消訂閱")
            # 即使找不到合約,也從記錄中移除
            self.active_subscriptions.discard(symbol)
            return False

        try:
            logger.info(f"❌ 取消訂閱: {symbol} -> {contract.symbol}")

            # 檢查quote屬性是否存在
            if not hasattr(self.api, "quote") or not self.api.quote:
                logger.error(f"Quote API 不可用,無法取消訂閱 {symbol}")
                self.active_subscriptions.discard(symbol)
                return False

            # 執行取消訂閱
            self.api.quote.unsubscribe(
                contract,
                quote_type=sj.constant.QuoteType.Tick,
                version=sj.constant.QuoteVersion.v1,
            )

            # 成功取消,從記錄中移除
            self.active_subscriptions.discard(symbol)
            logger.debug(f"✅ 成功取消訂閱並移除記錄: {symbol}")
            return True

        except AttributeError as e:
            # API 物件或方法不存在
            logger.error(f"API 屬性錯誤,無法取消訂閱 {symbol}: {e}")
            self.active_subscriptions.discard(symbol)
            return False

        except ConnectionError as e:
            # 網路連接問題
            logger.error(f"取消訂閱時網路連接錯誤 {symbol}: {e}")
            self.active_subscriptions.discard(symbol)
            return False

        except Exception as e:
            logger.error(f"❌ 取消訂閱失敗 {symbol}: {e}")
            # 即使取消失敗,也從記錄中移除,因為我們已經嘗試過了
            self.active_subscriptions.discard(symbol)
            return False

    def _on_stock_tick(self, exchange: Exchange, tick: TickSTKv1) -> None:
        """處理股票 tick 資料"""
        logger.info(f"Received stock tick: {tick.code} - {tick.close}")

        # 驗證tick數據的有效性
        if not tick.datetime or not hasattr(tick.datetime, "isoformat"):
            logger.error(f"無效的tick時間戳: {tick.datetime}")
            return

        try:
            # 驗證時間戳是否有效
            timestamp_iso = tick.datetime.isoformat()
            if not timestamp_iso:
                logger.error(f"無法生成有效的ISO時間戳: {tick.datetime}")
                return
        except Exception as e:
            logger.error(f"時間戳處理錯誤: {e}")
            return

        # TickSTKv1 沒有買賣價信息,設置為當前成交價
        quote = Quote(
            symbol=tick.code,
            timestamp=tick.datetime,
            open=tick.open,
            close=tick.close,
            bid_price=float(tick.close),  # 使用成交價作為買價
            ask_price=float(tick.close),  # 使用成交價作為賣價
            bid_volume=0,  # TickSTKv1 沒有買賣量信息
            ask_volume=0,  # TickSTKv1 沒有買賣量信息
            volume=getattr(tick, "volume", 0),
            avg_price=float(getattr(tick, "avg_price", 0)),
            underlying_price=None,  # 股票沒有標的價格
        )

        set_cached_quote(quote.symbol, quote)

        # 調用所有註冊的 WebSocket 回調函數
        for callback in self.quote_callbacks:
            try:
                # 在主事件循環中執行 async callback
                if asyncio.iscoroutinefunction(callback):
                    try:
                        loop = asyncio.get_running_loop()
                        # 在運行中的循環中創建任務並存儲引用
                        task = asyncio.create_task(callback(quote))
                        self._pending_tasks.add(task)
                        # 任務完成後自動清理引用
                        task.add_done_callback(self._pending_tasks.discard)
                    except RuntimeError:
                        # 沒有運行中的循環,嘗試獲取主循環
                        try:
                            loop = asyncio.get_event_loop()
                            if not loop.is_closed():
                                asyncio.run_coroutine_threadsafe(callback(quote), loop)
                            else:
                                logger.warning(
                                    f"事件循環已關閉,跳過 async 回調: {callback.__name__}"
                                )
                        except Exception as e2:
                            logger.error(f"無法執行 async 回調: {e2}")
                else:
                    callback(quote)
            except Exception as e:
                logger.error(f"執行報價回調失敗: {e}")

    def _on_futures_options_tick(self, exchange: Exchange, tick: TickFOPv1) -> None:
        """處理期貨和選擇權 tick 資料"""
        logger.info(
            f"📊 [期貨TICK] {tick.code} - 價格: {tick.close}, 交易所: {exchange}, 時間: {tick.datetime}"
        )

        # 驗證tick數據的有效性
        if not tick.datetime or not hasattr(tick.datetime, "isoformat"):
            logger.error(f"無效的期貨tick時間戳: {tick.datetime}")
            return

        try:
            # 驗證時間戳是否有效
            timestamp_iso = tick.datetime.isoformat()
            if not timestamp_iso:
                logger.error(f"無法生成有效的ISO時間戳: {tick.datetime}")
                return
        except Exception as e:
            logger.error(f"期貨tick時間戳處理錯誤: {e}")
            return

        # TickFOPv1 可能也沒有完整的買賣價信息,設置適當的默認值
        quote = Quote(
            symbol=tick.code,
            timestamp=tick.datetime,
            open=tick.open,
            close=tick.close,
            bid_price=float(tick.close),  # 使用成交價作為買價
            ask_price=float(tick.close),  # 使用成交價作為賣價
            bid_volume=0,  # 設置默認值
            ask_volume=0,  # 設置默認值
            volume=getattr(tick, "volume", 0),
            avg_price=float(getattr(tick, "avg_price", 0)),
            underlying_price=getattr(tick, "underlying_price", None),
        )

        set_cached_quote(quote.symbol, quote)

        # 調用所有註冊的 WebSocket 回調函數
        for callback in self.quote_callbacks:
            try:
                # 在主事件循環中執行 async callback
                if asyncio.iscoroutinefunction(callback):
                    try:
                        loop = asyncio.get_running_loop()
                        # 在運行中的循環中創建任務並存儲引用
                        task = asyncio.create_task(callback(quote))
                        self._pending_tasks.add(task)
                        # 任務完成後自動清理引用
                        task.add_done_callback(self._pending_tasks.discard)
                    except RuntimeError:
                        # 沒有運行中的循環,嘗試獲取主循環
                        try:
                            loop = asyncio.get_event_loop()
                            if not loop.is_closed():
                                asyncio.run_coroutine_threadsafe(callback(quote), loop)
                            else:
                                logger.warning(
                                    f"事件循環已關閉,跳過 async 回調: {callback.__name__}"
                                )
                        except Exception as e2:
                            logger.error(f"無法執行 async 回調: {e2}")
                else:
                    callback(quote)
            except Exception as e:
                logger.error(f"執行報價回調失敗: {e}")

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
def cleanup_shioaji() -> None:
    """程式結束時的清理函數"""
    try:
        shioaji_service.logout()
        logger.info("Shioaji service cleaned up successfully")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")


# 註冊程式結束時的清理函數
atexit.register(cleanup_shioaji)
