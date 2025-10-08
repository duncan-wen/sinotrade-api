# src/services/shioaji_service.py

import asyncio
import atexit
import re
import signal
import sys
from collections.abc import Callable
from typing import Any, cast

import pandas as pd
import shioaji as sj  # type: ignore
from dotenv import load_dotenv
from loguru import logger
from shioaji import Exchange, TickFOPv1, TickSTKv1  # type: ignore

from src.models.domain import (
    Quote,
    ScannerData,
    ScannerType,
    SimulatedOrder,
    SortingMode,
    UsageStats,
)
from src.services.cache_service import set_cached_quote
from src.services.lifecycle_management import LifecycleManager

load_dotenv()


class ShioajiService:
    def __init__(self) -> None:
        self.api = sj.Shioaji(simulation=True)  # Always use simulation for now
        self.quote_callbacks: list[Callable] = []  # WebSocket 回調函數列表
        self.active_subscriptions: set[str] = set()  # 記錄實際訂閱的股票代號
        self._pending_tasks: set = set()  # 存儲待處理的任務引用

        # 初始化生命週期管理器
        self.lifecycle = LifecycleManager(
            api=self.api,
            active_subscriptions=self.active_subscriptions,
            pending_tasks=self._pending_tasks,
        )

        # 設置取消訂閱回調
        self.lifecycle.set_unsubscribe_callback(self.unsubscribe_quote)

        # ✅ 延遲初始化: 避免在__init__中執行可能阻塞的操作
        # 改為按需登錄, 提高服務啟動速度
        logger.info("🚀 Shioaji 服務已創建, 等待首次使用時登錄")

    def __del__(self) -> None:
        """當物件被垃圾回收時進行最終清理"""
        try:
            logger.debug("[DESTROY] ShioajiService 物件被銷毀...")
            # 只調用 lifecycle.destroy(),避免重複清理
            if hasattr(self, "lifecycle") and not self.lifecycle.is_destroyed():
                self.lifecycle.destroy()
        except Exception:
            # __del__ 中不拋出異常,靜默處理
            pass

    def force_cleanup_for_restart(self) -> None:
        """
        專為開發環境重啟設計的強制清理方法
        確保在 hot reload 或 Ctrl+C 時能快速且安全地清理資源
        正確順序: 取消訂閱 > 登出 > 等待釋放 > 清理任務
        """
        try:
            logger.info("🔄 [DEV] 執行開發環境強制清理...")

            # 1. 最優先:取消所有 API 訂閱(在登錄狀態下)
            if hasattr(self, "active_subscriptions") and self.active_subscriptions:
                if hasattr(self, "lifecycle") and self.lifecycle.is_logged_in():
                    sub_count = len(self.active_subscriptions)
                    logger.info(f"📡 [PRIORITY] 取消 {sub_count} 個 API 訂閱...")

                    # 批量取消所有訂閱
                    self._batch_unsubscribe_all()
                    logger.info("✅ API 訂閱取消完成")
                else:
                    logger.warning("⚠️ 服務未登錄,無法正確取消 API 訂閱,僅清理本地記錄")
                    self.active_subscriptions.clear()

            # 2. 登出(釋放連線)
            if hasattr(self, "lifecycle") and self.lifecycle.is_logged_in():
                logger.info("🔐 強制登出以釋放連線...")
                self.lifecycle.logout(force=True)
                logger.info("✅ 登出完成")

                # 3. 等待連線釋放(給伺服器一點時間處理)
                logger.info("⏳ 等待連線釋放...")
                import time

                time.sleep(1.0)  # 等待 1 秒讓伺服器處理登出
                logger.debug("✅ 連線釋放等待完成")

            # 4. 清理任務
            if hasattr(self, "_pending_tasks") and self._pending_tasks:
                task_count = len(self._pending_tasks)
                logger.info(f"🧹 取消 {task_count} 個待處理任務...")
                for task in list(self._pending_tasks):
                    if not task.done():
                        task.cancel()
                self._pending_tasks.clear()
                logger.debug(f"✅ 已取消 {task_count} 個任務")

            logger.info("✅ [DEV] 開發環境強制清理完成")

        except Exception as e:
            logger.error(f"❌ [DEV] 開發環境清理失敗: {e}")
            # 即使清理失敗,也要確保登出
            self._emergency_logout()

    def _batch_unsubscribe_all(self) -> None:
        """
        批量取消所有訂閱
        在登錄狀態下安全地取消所有 API 訂閱
        """
        try:
            # 複製訂閱列表,避免在迭代過程中修改
            subscriptions_to_cancel = list(self.active_subscriptions)
            success_count = 0

            for symbol in subscriptions_to_cancel:
                try:
                    # 直接調用 API 取消訂閱,跳過狀態檢查
                    if hasattr(self, "api") and self.api:
                        self.api.unsubscribe(
                            self.api.Contracts.Stocks[symbol],
                            quote_type="tick",
                            intraday_odd=True,
                        )
                        success_count += 1
                        logger.debug(f"✅ 已取消訂閱: {symbol}")

                    # 從本地記錄中移除
                    self.active_subscriptions.discard(symbol)

                except Exception as e:
                    logger.warning(f"⚠️ 取消訂閱 {symbol} 失敗: {e}")
                    # 即使 API 取消失敗,也要清理本地記錄
                    self.active_subscriptions.discard(symbol)

            logger.debug(
                f"📊 批量取消訂閱完成: {success_count}/{len(subscriptions_to_cancel)} 成功"
            )

        except Exception as e:
            logger.error(f"❌ 批量取消訂閱異常: {e}")
            # 發生異常時,清空所有本地記錄
            self.active_subscriptions.clear()

    def _emergency_logout(self) -> None:
        """緊急登出 - 最後的保障機制"""
        try:
            logger.warning("🚨 執行緊急登出...")
            if hasattr(self, "api") and self.api:
                self.api.logout()
                logger.info("✅ 緊急登出成功")
        except Exception as e:
            logger.error(f"💥 緊急登出失敗: {e}")
            # 即使失敗也不拋出異常

    def add_quote_callback(self, callback: Callable) -> None:
        """添加報價回調函數"""
        self.quote_callbacks.append(callback)
        logger.info(f"Added quote callback: {callback.__name__}")

    def initialize(self) -> bool:
        """初始化 Shioaji 服務"""
        if self.lifecycle.is_destroyed():
            logger.error("服務已被銷毀,無法重新初始化")
            return False

        if self.lifecycle._is_initialized:
            logger.info("服務已經初始化,跳過重複初始化")
            return True

        try:
            logger.info("初始化 Shioaji 服務...")

            # 檢查API物件是否有效
            if not self.api:
                logger.error("Shioaji API 物件無效")
                return False

            # 使用按需登錄機制
            if not self.ensure_logged_in():
                logger.error("登錄失敗, 無法初始化")
                return False

            # 🔥 修復:設置 Shioaji 事件回調處理器
            logger.info("[INIT] 設置 Shioaji 事件回調處理器...")
            self._setup_callbacks()
            logger.info("[INIT] Shioaji 事件回調處理器設置完成")

            self.lifecycle._is_initialized = True
            logger.info("[INIT] Shioaji 服務初始化成功")
            return True

        except Exception as e:
            logger.error(f"[ERROR] Shioaji 服務初始化失敗: {e}")
            self.lifecycle._is_initialized = False
            return False

    # ==================== 生命週期管理 ====================

    def login(self) -> bool:
        """登錄 Shioaji 服務"""
        return self.lifecycle.login()

    def logout(self, force: bool = False) -> bool:
        """登出 Shioaji 服務"""
        return self.lifecycle.logout(force=force)

    def cleanup(self) -> bool:
        """清理資源但保持服務可用"""
        return self.lifecycle.cleanup()

    def destroy(self) -> bool:
        """完全銷毀服務"""
        return self.lifecycle.destroy()

    def is_logged_in(self) -> bool:
        """檢查是否已登錄"""
        return self.lifecycle.is_logged_in()

    def ensure_logged_in(self) -> bool:
        """確保已登錄,如果未登錄則嘗試登錄"""
        return self.lifecycle.ensure_logged_in()

    def get_current_price(self, symbol: str) -> float | None:
        """
        獲取商品當前價格 (使用 snapshot API, 快速高效)

        Args:
            symbol: 商品代號 (如: TXFR1, 2330)

        Returns:
            當前價格,失敗時返回 None
        """
        if not self.ensure_logged_in():
            logger.error("登錄失敗, 無法獲取當前價格")
            return None

        contract = self._get_contract(symbol)
        if not contract:
            logger.error(f"找不到合約: {symbol}")
            return None

        try:
            logger.info(f"🔍 使用 snapshot 獲取 {symbol} 當前價格...")

            # 使用 Shioaji snapshot API 獲取即時價格
            snapshots = self.api.snapshots([contract])

            if not snapshots:
                logger.warning(f"未獲取到 {symbol} 的 snapshot 數據")
                return None

            snapshot = snapshots[0]
            current_price = float(snapshot.close)

            logger.info(f"✅ {symbol} 當前價格: {current_price}")
            return current_price

        except Exception as e:
            logger.error(f"❌ 獲取 {symbol} snapshot 失敗: {e}")
            return None

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
        # ✅ 確保已登錄
        if not self.ensure_logged_in():
            logger.error("登錄失敗, 無法獲取K線數據")
            return {"contract": {"symbol": symbol, "name": symbol}, "data": []}
        contract = self._get_contract(symbol)
        if not contract:
            logger.error(f"Cannot find contract for symbol: {symbol}")
            return {"contract": {"symbol": symbol, "name": symbol}, "data": []}

        # 計算實際需要的數據量(考慮均線計算需求)
        actual_limit = self._calculate_data_limit(limit, ma_periods)
        logger.info(
            f"Requested {limit} bars, fetching {actual_limit} bars for MA calculation"
        )

        # 統一策略: 基於 KBar API 的多時間間隔支援
        # 1. 所有間隔都使用官方 KBar API (穩定, 完整)
        # 2. 1m: 直接返回分鐘數據
        # 3. 其他: 從分鐘數據聚合到目標間隔
        # 4. 支援: 1m, 5m, 15m, 60m, 1d, 1w, 1M

        supported_intervals = ["1m", "5m", "15m", "60m", "1d", "1w", "1M"]
        if interval in supported_intervals:
            # 統一使用 KBar API + 聚合策略
            all_data = self._get_kbars_from_api(
                contract, symbol, actual_limit, interval
            )
        else:
            # 不支援的間隔回退到 Ticks 聚合
            logger.warning(f"不支援的時間間隔 {interval}, 回退到 Tick 聚合")
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
        self, contract: Any, symbol: str, limit: int, interval: str = "1d"
    ) -> list[dict[str, Any]]:
        """使用官方 KBar API 獲取分鐘資料並聚合成指定間隔 (支援所有時間間隔)"""
        try:
            from datetime import datetime, timedelta

            end_date = datetime.now()

            # 統一的時間間隔配置 - 針對不同用途優化資料長度
            interval_mapping = {
                "1m": {
                    "days": 3,
                    "pandas_rule": None,
                    "desc": "1-minute",
                },  # 1分鐘:3天確保獲得足夠數據(約720根K線)
                "5m": {
                    "days": 5,
                    "pandas_rule": "5T",
                    "desc": "5-minute",
                },  # 5分鐘:5天確保獲得足夠數據(約240根K線)
                "15m": {
                    "days": 7,
                    "pandas_rule": "15T",
                    "desc": "15-minute",
                },  # 15分鐘:7天(約134根K線)
                "60m": {
                    "days": 30,
                    "pandas_rule": "60T",
                    "desc": "1-hour",
                },  # 1小時:30天(約120根K線,每天4根)
                "1d": {"days": limit + 30, "pandas_rule": "1D", "desc": "daily"},
                "1w": {"days": limit * 7 + 60, "pandas_rule": "1W", "desc": "weekly"},
                "1M": {"days": limit * 30 + 90, "pandas_rule": "1M", "desc": "monthly"},
            }

            if interval in interval_mapping:
                config = interval_mapping[interval]
            else:
                config = interval_mapping["1d"]
            start_date = end_date - timedelta(days=cast(dict, config)["days"])
            target_interval = cast(dict, config)["pandas_rule"]
            interval_desc = cast(dict, config)["desc"]

            logger.info(
                f"Using official KBar API for {symbol} (returns minute data, will aggregate to {interval_desc})"
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

            # 詳細檢查原始 KBar 數據
            logger.info("📊 KBar API 原始數據檢查:")
            logger.info(f"   總條數: {len(kbars.ts)}")
            logger.info(
                f"   時間範圍: {pd.to_datetime(kbars.ts[0], unit='ns')} ~ {pd.to_datetime(kbars.ts[-1], unit='ns')}"
            )

            # 檢查最近10條數據
            if len(kbars.ts) >= 10:
                logger.info("📊 最近10條原始數據:")
                for i in range(-10, 0):
                    ts = pd.to_datetime(kbars.ts[i], unit="ns")
                    logger.info(
                        f"   {ts}: O={kbars.Open[i]}, H={kbars.High[i]}, L={kbars.Low[i]}, C={kbars.Close[i]}, V={kbars.Volume[i]}"
                    )

            # 檢查零成交量分鐘
            zero_volume_count = sum(1 for v in kbars.Volume if v == 0)
            logger.info(f"📊 零成交量分鐘數: {zero_volume_count}/{len(kbars.Volume)}")

            # 檢查時間間隔連續性
            if len(kbars.ts) >= 2:
                time_diffs = []
                for i in range(1, min(20, len(kbars.ts))):  # 檢查前20個間隔
                    diff_ns = kbars.ts[i] - kbars.ts[i - 1]
                    diff_minutes = diff_ns / (60 * 1e9)  # 轉換為分鐘
                    time_diffs.append(diff_minutes)

                logger.info(f"📊 時間間隔分析 (分鐘): {time_diffs[:10]}")
                avg_diff = sum(time_diffs) / len(time_diffs)
                logger.info(f"📊 平均時間間隔: {avg_diff:.1f} 分鐘")

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

            logger.info(
                f"Received {len(df)} minute bars, aggregating to {interval_desc}"
            )

            # 設置時間索引
            df.set_index("datetime", inplace=True)

            # 聚合成指定間隔
            if target_interval is None:
                # 1分鐘數據直接返回,不需要聚合
                aggregated_data = df
            else:
                # 其他間隔需要聚合
                aggregated_data = (
                    df.resample(target_interval)
                    .agg(
                        {
                            "open": "first",  # 間隔內第一筆的開盤價
                            "high": "max",  # 間隔內最高價
                            "low": "min",  # 間隔內最低價
                            "close": "last",  # 間隔內最後一筆的收盤價
                            "volume": "sum",  # 間隔內總成交量
                        }
                    )
                    .dropna()
                )

            # 轉換為標準格式
            klines = []
            for timestamp, row in aggregated_data.iterrows():
                kline = {
                    "timestamp": cast(pd.Timestamp, timestamp).isoformat(),
                    "time": cast(pd.Timestamp, timestamp).isoformat(),  # 添加time字段
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": int(row["volume"]),
                }
                klines.append(kline)

            logger.info(f"Aggregated to {len(klines)} {interval_desc} bars")
            return klines[-limit:] if len(klines) > limit else klines

        except Exception as e:
            logger.error(f"Failed to get KBars from official API: {e}")
            return []

    def _get_klines_hybrid_5m(
        self, contract: Any, symbol: str, limit: int
    ) -> list[dict[str, Any]]:
        """混合策略: 使用 KBar API 獲取歷史5分鐘數據 + Tick聚合獲取最新數據"""
        try:
            from datetime import datetime

            logger.info(f"使用混合策略獲取 {symbol} 的5分鐘K線")

            # 1. 使用 KBar API 獲取歷史5分鐘數據
            historical_data = self._get_kbars_from_api(contract, symbol, limit, "5m")
            logger.info(f"KBar API 獲取到 {len(historical_data)} 條歷史5分鐘數據")

            if not historical_data:
                logger.warning("KBar API 未獲取到數據,回退到tick聚合")
                return self._get_klines_from_ticks(contract, symbol, "5m", limit)

            # 2. 獲取最新的tick數據,生成當前未完成的5分鐘K線
            current_5m_data = self._get_klines_from_ticks(contract, symbol, "5m", 1)

            # 3. 合併數據:檢查最新的歷史數據和當前tick數據是否為同一時段
            if current_5m_data and len(current_5m_data) > 0:
                current_bar = current_5m_data[0]
                current_time = datetime.fromisoformat(
                    current_bar.get("time", current_bar.get("timestamp", ""))
                )

                # 檢查最後一條歷史數據的時間
                if historical_data:
                    last_historical = historical_data[-1]
                    last_time = datetime.fromisoformat(
                        last_historical.get(
                            "time", last_historical.get("timestamp", "")
                        )
                    )

                    # 如果tick數據的時間段與最後一條歷史數據相同,則替換
                    # 5分鐘K線的時間邊界:例如 13:05 包含 13:05:00 - 13:09:59
                    current_5m_start = current_time.replace(
                        minute=(current_time.minute // 5) * 5, second=0, microsecond=0
                    )
                    last_5m_start = last_time.replace(
                        minute=(last_time.minute // 5) * 5, second=0, microsecond=0
                    )

                    if current_5m_start == last_5m_start:
                        # 同一個5分鐘時段,用tick數據替換歷史數據
                        logger.info(f"用tick數據更新當前5分鐘K線: {current_5m_start}")
                        historical_data[-1] = current_bar
                    else:
                        # 不同時段,append新的K線
                        logger.info(f"添加新的5分鐘K線: {current_5m_start}")
                        historical_data.append(current_bar)
                else:
                    # 沒有歷史數據,直接使用tick數據
                    historical_data = current_5m_data

            logger.info(f"混合策略最終獲取到 {len(historical_data)} 條5分鐘K線")
            return (
                historical_data[-limit:]
                if len(historical_data) > limit
                else historical_data
            )

        except Exception as e:
            logger.error(f"混合策略失敗,回退到tick聚合: {e}")
            return self._get_klines_from_ticks(contract, symbol, "5m", limit)

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

                # ✅ 通用連續期貨合約處理 (動態支援所有R1/R2)
                if symbol.endswith(("R1", "R2")):
                    # 提取期貨群組名稱 (如: TXFR1 -> TXF, CDFR1 -> CDF)
                    group_name = symbol[:-2]

                    try:
                        # 動態獲取期貨群組
                        futures_group = getattr(self.api.Contracts.Futures, group_name)

                        # 嘗試直接獲取官方R1/R2合約
                        contract = getattr(futures_group, symbol)

                        if contract:
                            # 顯示詳細資訊包含target_code
                            target_info = getattr(contract, "target_code", "無")
                            logger.info(
                                f"✅ 獲取連續期貨合約: {symbol} -> {contract.code}"
                            )
                            logger.info(
                                f"   📍 目標合約: {target_info}, 交割日: {contract.delivery_date}"
                            )
                            return contract
                        else:
                            logger.error(f"❌ 連續期貨合約不存在: {symbol}")
                            return None

                    except AttributeError as e:
                        logger.error(
                            f"❌ 期貨群組 {group_name} 不存在或無R1/R2合約: {e}"
                        )
                        return None
                    except Exception as e:
                        logger.error(f"❌ 處理連續期貨合約失敗 {symbol}: {e}")
                        return None

        except (KeyError, AttributeError):
            pass

        try:
            # 4. 嘗試選擇權合約 - 支援各種台指選擇權類型
            option_types = [
                "TXO",
                "TX1",
                "TX2",
                "TX4",
                "TX5",
                "TXU",
                "TXV",
                "TXX",
                "TXY",
                "TXZ",
            ]

            for opt_type in option_types:
                if opt_type in symbol:
                    try:
                        # 先嘗試直接通過選擇權類型獲取
                        option_group = getattr(self.api.Contracts.Options, opt_type)
                        contract = getattr(option_group, symbol)

                        if contract:
                            logger.info(
                                f"✅ 獲取選擇權合約: {symbol} -> {contract.code} ({opt_type})"
                            )
                            return contract

                    except (KeyError, AttributeError):
                        continue

            # 如果上面方法失敗, 嘗試傳統方式
            if any(
                opt in symbol
                for opt in [
                    "TXO",
                    "TX1",
                    "TX2",
                    "TX4",
                    "TX5",
                    "TXU",
                    "TXV",
                    "TXX",
                    "TXY",
                    "TXZ",
                ]
            ):
                contract = self.api.Contracts.Options[symbol]
                if contract:
                    logger.info(f"✅ 獲取選擇權合約 (傳統方式): {contract.symbol}")
                    return contract

        except (KeyError, AttributeError):
            pass

        logger.error(f"Contract not found for symbol: {symbol}")
        return None

    def subscribe_quote(self, symbol: str, callback: Any = None) -> bool:
        """訂閱股票報價,帶有完整的防護機制"""
        if self.lifecycle.is_destroyed():
            logger.error(f"服務已被銷毀,無法訂閱 {symbol}")
            return False

        if not symbol or not isinstance(symbol, str):
            logger.error(f"無效的股票代號: {symbol}")
            return False

        # 檢查是否已經訂閱
        if symbol in self.active_subscriptions:
            logger.debug(f"股票 {symbol} 已經訂閱,跳過重複訂閱")
            return True

        # ✅ 確保已登錄
        if not self.ensure_logged_in():
            logger.error(f"登錄失敗, 無法訂閱 {symbol}")
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
        if self.lifecycle.is_destroyed():
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
        if not self.lifecycle._is_initialized or not self.lifecycle.is_logged_in():
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
        logger.info(
            f"🔥 [DEBUG] 準備調用 {len(self.quote_callbacks)} 個回調,符號: {quote.symbol}"
        )
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
                    logger.info(f"🔥 [DEBUG] 調用同步回調: {callback.__name__}")
                    callback(quote)
            except Exception as e:
                logger.error(f"執行報價回調失敗: {e}")

    def _on_futures_options_tick(self, exchange: Exchange, tick: TickFOPv1) -> None:
        """處理期貨和選擇權 tick 資料"""
        logger.info(
            f"📊 [期貨TICK] {tick.code} - 價格: {tick.close}, 交易所: {exchange}, 時間: {tick.datetime}"
        )
        logger.info("🔥 [DEBUG] _on_futures_options_tick 被調用,準備處理回調...")

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
        logger.info(
            f"🔥 [DEBUG] 準備調用 {len(self.quote_callbacks)} 個回調,符號: {quote.symbol}"
        )
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
                    logger.info(f"🔥 [DEBUG] 調用同步回調: {callback.__name__}")
                    callback(quote)
            except Exception as e:
                logger.error(f"執行報價回調失敗: {e}")

    def get_scanners(
        self,
        scanner_type: ScannerType,
        ascending: bool = True,
        sorting_mode: SortingMode = SortingMode.GAIN_DESC,
        count: int = 100,
        date: str | None = None,
        timeout: int = 30000,
    ) -> list[ScannerData]:
        """
        獲取股票排行資料
        Args:
            scanner_type: 排行類型 (漲跌幅, 漲跌, 高低價差, 成交量, 成交金額)
            ascending: 排序方式, True 為由大到小, False 為由小到大
            count: 排行數量 (0-200)
            date: 指定日期, 預設為當日
            timeout: 超時時間 (毫秒)

        Returns:
            排行資料列表

        Raises:
            Exception: 當 API 調用失敗時
        """
        if not self.ensure_logged_in():
            raise RuntimeError("Shioaji 服務未登錄")

        if count < 0 or count > 200:
            raise ValueError("count 必須在 0-200 之間")

        try:
            # 將我們的 ScannerType 枚舉轉換為 Shioaji 的常數
            sj_scanner_type = getattr(sj.constant.ScannerType, scanner_type.value)

            # 總是請求 200 筆數據 (最大值)
            # 原因1: 需要先過濾成交量 > 500, 再取前 N 筆, 確保過濾後仍有足夠數據
            # 原因2: 某些排序模式需要更多數據才能找到正確的極值
            api_count = 200

            # 根據排序模式智能調整 ascending 參數
            # Shioaji API 邏輯:
            # - ascending=True: 漲幅榜 (正值, 由大到小)
            # - ascending=False: 跌幅榜 (負值, 由大到小的絕對值)
            api_ascending = ascending  # 預設使用原始參數
            if (
                sorting_mode
                in [
                    SortingMode.GAIN_DESC,  # 漲幅大→小: 用 ascending=True
                    SortingMode.GAIN_ASC,  # 漲幅小→大: 用 ascending=True 取得漲幅榜, 後端再處理
                    SortingMode.VALUE_HIGH_LOW,
                    SortingMode.PRICE_HIGH_LOW,
                ]
            ):
                api_ascending = True  # 取得漲幅榜
            elif (
                sorting_mode
                in [
                    SortingMode.LOSS_DESC,  # 跌幅大→小: 用 ascending=False
                    SortingMode.LOSS_ASC,  # 跌幅小→大: 用 ascending=False 取得跌幅榜, 後端再處理
                    SortingMode.VALUE_LOW_HIGH,
                    SortingMode.PRICE_LOW_HIGH,
                ]
            ):
                api_ascending = False  # 取得跌幅榜

            logger.info(
                f"🔍 獲取排行資料: {scanner_type.value}, 排序模式: {sorting_mode.value}, API數量: {api_count}, 最終數量: {count}, API ascending: {api_ascending}"
            )

            # 調用 Shioaji API
            scanners = self.api.scanners(
                scanner_type=sj_scanner_type,
                ascending=api_ascending,
                date=date,
                count=api_count,
                timeout=timeout,
            )

            if not scanners:
                logger.warning("未獲取到任何排行資料")
                return []

            # 轉換為我們的數據模型
            scanner_data_list = []
            for scanner in scanners:
                try:
                    scanner_data = ScannerData(
                        date=scanner.date,
                        code=scanner.code,
                        name=scanner.name,
                        ts=scanner.ts,
                        open=scanner.open,
                        high=scanner.high,
                        low=scanner.low,
                        close=scanner.close,
                        price_range=scanner.price_range,
                        tick_type=scanner.tick_type,
                        change_price=scanner.change_price,
                        change_type=scanner.change_type,
                        average_price=scanner.average_price,
                        volume=scanner.volume,
                        total_volume=scanner.total_volume,
                        amount=scanner.amount,
                        total_amount=scanner.total_amount,
                        yesterday_volume=scanner.yesterday_volume,
                        volume_ratio=scanner.volume_ratio,
                        buy_price=scanner.buy_price,
                        buy_volume=scanner.buy_volume,
                        sell_price=scanner.sell_price,
                        sell_volume=scanner.sell_volume,
                        bid_orders=scanner.bid_orders,
                        bid_volumes=scanner.bid_volumes,
                        ask_orders=scanner.ask_orders,
                        ask_volumes=scanner.ask_volumes,
                    )
                    scanner_data_list.append(scanner_data)
                except Exception as e:
                    logger.error(f"轉換排行資料失敗: {scanner}, 錯誤: {e}")
                    continue

            # 過濾成交量太小的股票(總成交量 > 500)
            original_count = len(scanner_data_list)
            scanner_data_list = [
                data for data in scanner_data_list if data.total_volume > 500
            ]
            filtered_count = original_count - len(scanner_data_list)
            if filtered_count > 0:
                logger.info(f"🔍 過濾掉 {filtered_count} 筆成交量 ≤ 500 的資料")

            logger.info(f"📊 過濾完成,剩餘 {len(scanner_data_list)} 筆數據")

            # 根據排序模式進行自定義排序
            scanner_data_list = self._apply_custom_sorting(
                scanner_data_list, scanner_type, sorting_mode, count
            )

            logger.info(f"✅ 成功獲取 {len(scanner_data_list)} 筆排行資料")
            return scanner_data_list
        except Exception as e:
            logger.error(f"❌ 獲取排行資料失敗: {e}")
            raise

    def _apply_custom_sorting(
        self,
        scanner_data_list: list[ScannerData],
        scanner_type: ScannerType,
        sorting_mode: SortingMode,
        requested_count: int,
    ) -> list[ScannerData]:
        """
        根據排序模式對掃描器數據進行自定義排序

        Args:
            scanner_data_list: 掃描器數據列表
            scanner_type: 掃描器類型
            sorting_mode: 排序模式
            requested_count: 用戶請求的數量

        Returns:
            排序後的數據列表
        """
        if not scanner_data_list:
            logger.warning("⚠️ 排序數據列表為空")
            return scanner_data_list

        logger.info(
            f"📊 開始自定義排序: 類型={scanner_type.value}, 模式={sorting_mode.value}, 數量={requested_count}, 輸入數據={len(scanner_data_list)}筆"
        )

        # 針對不同掃描器類型和排序模式進行自定義排序
        if scanner_type == ScannerType.ChangePercentRank:
            logger.info("🎯 使用漲跌幅排序邏輯")
            return self._sort_by_change_percent(
                scanner_data_list, sorting_mode, requested_count
            )
        elif scanner_type == ScannerType.ChangePriceRank:
            return self._sort_by_change_price(
                scanner_data_list, sorting_mode, requested_count
            )
        elif scanner_type == ScannerType.DayRangeRank:
            return self._sort_by_price_range(
                scanner_data_list, sorting_mode, requested_count
            )
        elif scanner_type in [ScannerType.VolumeRank, ScannerType.AmountRank]:
            return self._sort_by_value(
                scanner_data_list, scanner_type, sorting_mode, requested_count
            )

        # 預設返回原數據
        return scanner_data_list

    def _sort_by_change_percent(
        self,
        scanner_data_list: list[ScannerData],
        sorting_mode: SortingMode,
        requested_count: int,
    ) -> list[ScannerData]:
        """
        按漲跌幅進行詳細排序

        注意: scanner_data_list 已經是 API 排序好的數據
        - ascending=True: 漲幅由大到小 (10% → 0.1%)
        - ascending=False: 跌幅由大到小 (-10% → -0.1%)
        """

        def get_change_percent(item: ScannerData) -> float:
            return item.change_percent  # type: ignore[return-value]

        if sorting_mode == SortingMode.GAIN_DESC:
            # 漲幅由大到小: API 已用 ascending=True 排序, 直接取前 N 筆
            logger.info(
                f"✅ GAIN_DESC: 總數據 {len(scanner_data_list)} 筆, 取前 {requested_count} 筆"
            )
            return scanner_data_list[:requested_count]

        elif sorting_mode == SortingMode.GAIN_ASC:
            # 漲幅由小到大: API 用 ascending=True 排序(大→小), 取後 N 筆再反轉
            logger.info(f"🔍 GAIN_ASC: 總數據 {len(scanner_data_list)} 筆")
            result = scanner_data_list[-requested_count:]  # 取最後 N 筆(最小的漲幅)
            result.reverse()  # 反轉成小→大
            logger.info(f"✅ GAIN_ASC: 取後 {len(result)} 筆並反轉")
            return result
        elif sorting_mode == SortingMode.LOSS_DESC:
            # 跌幅由大到小: API 已用 ascending=False 排序, 直接取前 N 筆
            logger.info(
                f"✅ LOSS_DESC: 總數據 {len(scanner_data_list)} 筆, 取前 {requested_count} 筆"
            )
            return scanner_data_list[:requested_count]

        elif sorting_mode == SortingMode.LOSS_ASC:
            # 跌幅由小到大: API 用 ascending=False 排序(大→小), 取後 N 筆再反轉
            logger.info(f"🔍 LOSS_ASC: 總數據 {len(scanner_data_list)} 筆")
            result = scanner_data_list[-requested_count:]  # 取最後 N 筆(最小的跌幅)
            result.reverse()  # 反轉成小→大
            logger.info(f"✅ LOSS_ASC: 取後 {len(result)} 筆並反轉")
            return result

        return scanner_data_list

    def _sort_by_change_price(
        self,
        scanner_data_list: list[ScannerData],
        sorting_mode: SortingMode,
        requested_count: int,
    ) -> list[ScannerData]:
        """按價格漲跌進行詳細排序"""

        def get_change_price(item: ScannerData) -> float:
            return item.change_price

        if sorting_mode == SortingMode.PRICE_HIGH_LOW:
            sorted_data = sorted(scanner_data_list, key=get_change_price, reverse=True)
            return sorted_data[:requested_count]
        elif sorting_mode == SortingMode.PRICE_LOW_HIGH:
            sorted_data = sorted(scanner_data_list, key=get_change_price)
            return sorted_data[:requested_count]
        elif sorting_mode == SortingMode.GAIN_ASC:
            gains = [item for item in scanner_data_list if get_change_price(item) > 0]
            sorted_gains = sorted(gains, key=get_change_price)
            return sorted_gains[:requested_count]
        elif sorting_mode == SortingMode.GAIN_DESC:
            gains = [item for item in scanner_data_list if get_change_price(item) > 0]
            sorted_gains = sorted(gains, key=get_change_price, reverse=True)
            return sorted_gains[:requested_count]
        elif sorting_mode == SortingMode.LOSS_ASC:
            losses = [item for item in scanner_data_list if get_change_price(item) < 0]
            sorted_losses = sorted(losses, key=get_change_price, reverse=True)
            return sorted_losses[:requested_count]
        elif sorting_mode == SortingMode.LOSS_DESC:
            losses = [item for item in scanner_data_list if get_change_price(item) < 0]
            sorted_losses = sorted(losses, key=get_change_price)
            return sorted_losses[:requested_count]

        return scanner_data_list

    def _sort_by_price_range(
        self,
        scanner_data_list: list[ScannerData],
        sorting_mode: SortingMode,
        requested_count: int,
    ) -> list[ScannerData]:
        """按高低價差進行詳細排序"""

        def get_price_range(item: ScannerData) -> float:
            return item.price_range

        if sorting_mode == SortingMode.VALUE_HIGH_LOW:
            sorted_data = sorted(scanner_data_list, key=get_price_range, reverse=True)
            return sorted_data[:requested_count]
        elif sorting_mode == SortingMode.VALUE_LOW_HIGH:
            sorted_data = sorted(scanner_data_list, key=get_price_range)
            return sorted_data[:requested_count]

        return scanner_data_list

    def _sort_by_value(
        self,
        scanner_data_list: list[ScannerData],
        scanner_type: ScannerType,
        sorting_mode: SortingMode,
        requested_count: int,
    ) -> list[ScannerData]:
        """按數值進行詳細排序 (成交量、成交金額等)"""

        def get_value(item: ScannerData) -> float:
            if scanner_type == ScannerType.VolumeRank:
                return item.total_volume
            elif scanner_type == ScannerType.AmountRank:
                return item.total_amount
            return 0.0

        if sorting_mode == SortingMode.VALUE_HIGH_LOW:
            sorted_data = sorted(scanner_data_list, key=get_value, reverse=True)
            return sorted_data[:requested_count]
        elif sorting_mode == SortingMode.VALUE_LOW_HIGH:
            sorted_data = sorted(scanner_data_list, key=get_value)
            return sorted_data[:requested_count]

        return scanner_data_list

    def get_usage_stats(self) -> UsageStats:
        """
        獲取 Shioaji API 使用量統計

        Returns:
            UsageStats: API 使用量統計資料

        Raises:
            RuntimeError: 當 API 未登錄時
            Exception: 當獲取使用量失敗時
        """
        if not self.ensure_logged_in():
            raise RuntimeError("Shioaji 服務未登錄")

        try:
            logger.info("🔍 獲取 API 使用量統計")

            # 獲取原始使用量數據
            usage_data = list(self.api.usage())
            usage_dict = dict(usage_data)

            # 初始化統計資料
            stats = UsageStats(
                status="success",
                raw_data=usage_dict,
                connections=0,
                bytes_used=0,
                bytes_limit=0,
                bytes_remaining=0,
                usage_rate=0,
                warning_message=None,
            )

            # 處理連接次數
            if "connections" in usage_dict:
                stats.connections = usage_dict["connections"]

            # 處理流量統計
            if "bytes" in usage_dict:
                stats.bytes_used = usage_dict["bytes"] / (1024 * 1024)  # 轉換為 MB

            if "limit_bytes" in usage_dict:
                stats.bytes_limit = usage_dict["limit_bytes"] / (
                    1024 * 1024
                )  # 轉換為 MB

            if "remaining_bytes" in usage_dict:
                remaining = usage_dict["remaining_bytes"] / (1024 * 1024)  # 轉換為 MB
                stats.bytes_remaining = remaining

            # 計算使用率
            if stats.bytes_used is not None and stats.bytes_limit is not None:
                stats.usage_rate = (stats.bytes_used / stats.bytes_limit) * 100

                # 設置警告訊息
                if stats.usage_rate > 100:
                    stats.warning_message = "🚨 警告: 已超過流量限制!"
                elif stats.usage_rate > 90:
                    stats.warning_message = "⚠️ 警告: 接近流量限制!"

            logger.info("✅ 成功獲取 API 使用量統計")
            return stats

        except Exception as e:
            logger.error(f"❌ 獲取 API 使用量統計失敗: {e}")
            return UsageStats(
                status="error",
                warning_message=f"獲取使用量失敗: {e!s}",
                raw_data={},
                connections=0,
                bytes_used=0,
                bytes_limit=0,
                bytes_remaining=0,
                usage_rate=0,
            )

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


# ==================== 全域清理管理 ====================


def cleanup_shioaji_service() -> None:
    """
    統一的 Shioaji 服務清理函數
    適用於所有退出場景:正常退出、Ctrl+C、SIGTERM、hot reload
    """
    try:
        logger.info("🔧 [CLEANUP] 開始全域清理 Shioaji 服務...")

        # 檢查服務是否存在且可用
        if "shioaji_service" in globals() and shioaji_service:
            # 使用專門的開發環境清理方法
            shioaji_service.force_cleanup_for_restart()
        else:
            logger.warning("⚠️ Shioaji 服務實例不存在或已被清理")

        logger.info("✅ [CLEANUP] 全域清理完成")

    except Exception as e:
        logger.error(f"❌ [CLEANUP] 全域清理失敗: {e}")
        # 不拋出異常,確保程序能正常退出


def signal_handler(signum: int, frame: Any) -> None:
    """
    信號處理器 - 處理 Ctrl+C (SIGINT) 和 SIGTERM
    確保在任何情況下都能正確清理資源
    """
    try:
        signal_name = signal.Signals(signum).name
    except (AttributeError, ValueError):
        signal_name = f"SIGNAL_{signum}"
    logger.info(f"🚨 [SIGNAL] 收到信號 {signal_name} ({signum}),開始清理...")

    try:
        # 執行清理
        cleanup_shioaji_service()

        # 給一點時間完成清理
        import time

        time.sleep(0.5)

        logger.info(f"✅ [SIGNAL] 信號 {signal_name} 處理完成,退出程序")

    except Exception as e:
        logger.error(f"❌ [SIGNAL] 信號處理失敗: {e}")
    finally:
        # 確保程序退出
        sys.exit(0)


# 註冊信號處理器
try:
    # 處理 Ctrl+C (SIGINT)
    signal.signal(signal.SIGINT, signal_handler)

    # 處理 SIGTERM (Docker 容器停止等)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.debug("📡 信號處理器註冊成功 (SIGINT, SIGTERM)")

except Exception as e:
    logger.warning(f"⚠️ 信號處理器註冊失敗: {e}")

# 註冊程式正常結束時的清理函數
atexit.register(cleanup_shioaji_service)
logger.debug("📝 atexit 清理函數已註冊")
