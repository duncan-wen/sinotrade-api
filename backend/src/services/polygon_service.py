# src/services/polygon_service.py

import os
import time
from datetime import datetime, timedelta
from typing import Any

import pytz
from dotenv import load_dotenv
from loguru import logger
from polygon import RESTClient
from polygon.rest.models import Sort, TickerTypes

from src.models.domain import Quote

load_dotenv()


class PolygonService:
    """
    Polygon.io 數據服務

    優勢:
    - 直接支援多種時間周期(分鐘、小時、日、週、月)
    - API 已預聚合,無需後端處理聚合邏輯
    - 快速響應、低延遲
    """

    def __init__(self) -> None:
        """初始化 Polygon.io 服務"""
        self.api_key = os.getenv("POLYGON_API_KEY")
        self.client: RESTClient | None = None

        if not self.api_key:
            logger.warning("⚠️ POLYGON_API_KEY 環境變數未設定,請設定後重新啟動")
        else:
            try:
                self.client = RESTClient(api_key=self.api_key)
                logger.info("🚀 Polygon.io 服務已初始化")
            except Exception as e:
                logger.error(f"❌ Polygon.io 初始化失敗: {e}")
                self.client = None

        # Rate limiting 配置 - 基於 GitHub issue #594 的經驗優化
        # 參考: https://github.com/polygon-io/client-python/issues/594
        self.last_request_time = 0.0
        self.min_request_interval = 20.0  # 20秒間隔,超級保守(基於 issue 經驗)
        self.request_count = 0
        self.request_window_start = time.time()
        self.max_requests_per_minute = 3  # 每分鐘最多3次,避免觸發長時間封鎖

    def _ensure_client(self) -> bool:
        """確保客戶端已初始化"""
        if self.client is None:
            logger.error("❌ Polygon.io 客戶端未初始化,請檢查 API 金鑰")
            return False
        return True

    def _rate_limit(self) -> None:
        """
        實施嚴格的 rate limiting

        Polygon.io 免費帳號限制:每分鐘最多 5 次 API 調用
        """
        current_time = time.time()

        # 重置請求計數器(每分鐘重置)
        if current_time - self.request_window_start >= 60:
            self.request_count = 0
            self.request_window_start = current_time
            logger.info("🔄 API 請求計數器已重置")

        # 檢查是否達到每分鐘限制
        if self.request_count >= self.max_requests_per_minute:
            wait_time = 60 - (current_time - self.request_window_start)
            if wait_time > 0:
                logger.warning(
                    f"🚫 達到 API 限制({self.max_requests_per_minute}次/分鐘)!等待 {wait_time:.1f} 秒後重試"
                )
                time.sleep(wait_time)
                # 重置計數器
                self.request_count = 0
                self.request_window_start = time.time()

        # 確保請求間隔
        time_since_last_request = current_time - self.last_request_time
        if time_since_last_request < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last_request
            logger.debug(f"⏱️ Rate limiting: 等待 {sleep_time:.1f} 秒")
            time.sleep(sleep_time)

        # 更新狀態
        self.last_request_time = time.time()
        self.request_count += 1
        logger.info(
            f"📊 API 請求計數: {self.request_count}/{self.max_requests_per_minute} (本分鐘內)"
        )

        # 如果接近限制,發出警告
        if self.request_count >= self.max_requests_per_minute - 1:
            logger.warning("⚠️ 接近 API 請求限制!建議暫停新的 API 調用")

    def _retry_request(self, func, *args, max_retries: int = 3, **kwargs):
        """
        重試機制處理 429 錯誤

        Args:
            func: 要執行的函數
            max_retries: 最大重試次數
            *args, **kwargs: 函數參數
        """
        for attempt in range(max_retries + 1):
            try:
                self._rate_limit()  # 實施 rate limiting
                return func(*args, **kwargs)
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "too many" in error_str.lower():
                    if attempt < max_retries:
                        wait_time = (2**attempt) * 5  # 適度的指數退避: 5s, 10s, 20s
                        logger.warning(
                            f"⚠️ 遇到 429 錯誤,{wait_time} 秒後重試 (第 {attempt + 1}/{max_retries} 次)"
                        )
                        time.sleep(wait_time)
                        continue
                    else:
                        logger.error(f"❌ 超過最大重試次數,放棄請求: {e}")
                        raise
                else:
                    # 非 429 錯誤,直接拋出
                    raise

    def get_historical_klines(
        self,
        symbol: str,
        interval: str,
        limit: int = 500,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict[str, Any]:
        """
        獲取歷史 K 線數據

        Args:
            symbol: 股票代號 (如: AAPL, MSFT, TSLA)
            interval: 時間間隔 (1m, 5m, 15m, 30m, 1h, 1d, 1w, 1M)
            limit: 返回數據量
            start_date: 開始日期 (YYYY-MM-DD)
            end_date: 結束日期 (YYYY-MM-DD)

        Returns:
            包含 K 線數據的字典
        """
        if not self._ensure_client():
            return {"error": "Polygon.io 客戶端未初始化", "data": []}

        try:
            # 映射時間間隔到 Polygon.io 格式
            timespan, multiplier = self._parse_interval(interval)

            # 設定預設日期範圍 (使用交易日邏輯,排除週末)
            if not start_date or not end_date:
                start_date, end_date = self._get_trading_date_range(interval)

            logger.info(
                f"📈 獲取 Polygon.io K線數據: {symbol} {interval} ({start_date} ~ {end_date})"
            )

            # 調用 Polygon.io API (使用重試機制)
            def get_aggs():
                aggs = []
                logger.info(
                    f"🔍 獲取 Polygon.io K線數據: {symbol} {multiplier} {timespan} ({start_date} ~ {end_date} {limit})"
                )
                for agg in self.client.list_aggs(
                    ticker=symbol,
                    multiplier=multiplier,
                    timespan=timespan,
                    from_=start_date,
                    to=end_date,
                    limit=limit,
                ):
                    aggs.append(agg)
                return aggs

            aggs = self._retry_request(get_aggs)

            if not aggs:
                logger.warning(f"⚠️ {symbol} 無數據 ({interval})")
                return {
                    "symbol": symbol,
                    "interval": interval,
                    "data": [],
                    "count": 0,
                    "source": "polygon_api",
                }

            # 轉換為標準格式,添加數據驗證
            klines = []
            for i, agg in enumerate(aggs):
                try:
                    # 驗證必要欄位
                    if not hasattr(agg, "timestamp") or agg.timestamp is None:
                        logger.warning(f"⚠️ 第 {i} 筆數據缺少 timestamp,跳過")
                        continue

                    if not all(
                        hasattr(agg, field) and getattr(agg, field) is not None
                        for field in ["open", "high", "low", "close", "volume"]
                    ):
                        logger.warning(f"⚠️ 第 {i} 筆數據欄位不完整,跳過")
                        continue

                    # 安全轉換數據
                    timestamp_ms = float(agg.timestamp)
                    if timestamp_ms <= 0:
                        logger.warning(f"⚠️ 第 {i} 筆數據時間戳無效: {timestamp_ms}")
                        continue

                    kline = {
                        "time": datetime.fromtimestamp(timestamp_ms / 1000).isoformat(),
                        "open": float(agg.open),
                        "high": float(agg.high),
                        "low": float(agg.low),
                        "close": float(agg.close),
                        "volume": int(agg.volume),
                    }

                    # 類型檢查:確保數值類型正確
                    assert isinstance(kline["open"], int | float)
                    assert isinstance(kline["high"], int | float)
                    assert isinstance(kline["low"], int | float)
                    assert isinstance(kline["close"], int | float)
                    assert isinstance(kline["volume"], int | float)

                    # 驗證數據合理性
                    price_values = [
                        kline["open"],
                        kline["high"],
                        kline["low"],
                        kline["close"],
                    ]
                    if any(float(val) < 0 for val in price_values):
                        logger.warning(f"⚠️ 第 {i} 筆數據包含負數價格,跳過")
                        continue

                    if int(kline["volume"]) < 0:
                        logger.warning(f"⚠️ 第 {i} 筆數據包含負數成交量,跳過")
                        continue

                    klines.append(kline)

                except Exception as e:
                    logger.error(f"❌ 處理第 {i} 筆數據時發生錯誤: {e}")
                    continue

            logger.info(f"✅ 成功獲取 {len(klines)} 筆 K線數據")

            return {
                "symbol": symbol,
                "interval": interval,
                "data": klines,
                "count": len(klines),
                "source": "polygon_api",
                "date_range": {"start": start_date, "end": end_date},
            }

        except Exception as e:
            logger.error(f"❌ 獲取 K線數據失敗: {e}")
            return {
                "error": str(e),
                "symbol": symbol,
                "interval": interval,
                "data": [],
                "count": 0,
            }

    def get_real_time_quote(self, symbol: str) -> Quote | None:
        """
        獲取即時報價

        Args:
            symbol: 股票代號

        Returns:
            即時報價數據
        """
        if not self._ensure_client():
            return None

        try:
            logger.info(f"📊 獲取即時報價: {symbol}")

            # 獲取最新交易 (使用重試機制)
            def get_last_trade_data():
                return self.client.get_last_trade(ticker=symbol)

            last_trade = self._retry_request(get_last_trade_data)

            # 獲取最新報價 (使用重試機制)
            def get_last_quote_data():
                return self.client.get_last_quote(ticker=symbol)

            last_quote = self._retry_request(get_last_quote_data)

            # 轉換為標準格式
            quote = Quote(
                symbol=symbol,
                timestamp=datetime.fromtimestamp(
                    last_trade.participant_timestamp / 1000000000
                ),
                open=0,  # Polygon.io 單筆報價不包含開盤價
                close=float(last_trade.price),
                bid_price=float(last_quote.bid),
                ask_price=float(last_quote.ask),
                bid_volume=int(last_quote.bid_size),
                ask_volume=int(last_quote.ask_size),
                volume=int(last_trade.size),
                avg_price=float(last_trade.price),
            )

            logger.info(f"✅ 成功獲取即時報價: {symbol} ${last_trade.price}")
            return quote

        except Exception as e:
            logger.error(f"❌ 獲取即時報價失敗: {e}")
            return None

    def get_market_status(self) -> dict[str, Any]:
        """
        獲取市場狀態

        Returns:
            市場狀態資訊
        """
        if not self._ensure_client():
            return {"error": "客戶端未初始化"}

        try:

            def get_status():
                return self.client.get_market_status()

            status = self._retry_request(get_status)

            # 安全地訪問屬性,處理可能不存在的屬性
            result = {
                "market": "US",
                "last_updated": datetime.now().isoformat(),
            }

            # 檢查並添加可用的屬性
            if hasattr(status, "market"):
                result["status"] = status.market

            if hasattr(status, "early_hours"):
                result["early_hours"] = status.early_hours
            elif hasattr(status, "earlyHours"):
                result["early_hours"] = status.earlyHours
            else:
                result["early_hours"] = "unknown"

            if hasattr(status, "after_hours"):
                result["after_hours"] = status.after_hours
            elif hasattr(status, "afterHours"):
                result["after_hours"] = status.afterHours
            else:
                result["after_hours"] = "unknown"

            if hasattr(status, "currencies"):
                result["currencies"] = status.currencies

            return result
        except Exception as e:
            logger.error(f"❌ 獲取市場狀態失敗: {e}")
            return {"error": str(e)}

    def search_tickers(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        """
        搜尋股票代號

        Args:
            query: 搜尋關鍵字
            limit: 返回數量限制

        Returns:
            搜尋結果列表
        """
        if not self._ensure_client():
            return []

        try:
            logger.info(f"🔍 搜尋股票: {query}")

            def search_ticker_data():
                tickers = []
                for ticker in self.client.list_tickers(
                    search=query,
                    type_=TickerTypes.CS,  # Common Stock
                    limit=limit,
                    sort=Sort.TICKER,
                ):
                    tickers.append(
                        {
                            "ticker": ticker.ticker,
                            "name": ticker.name,
                            "market": ticker.market,
                            "locale": ticker.locale,
                            "primary_exchange": ticker.primary_exchange,
                            "type": ticker.type,
                            "active": ticker.active,
                            "currency_name": ticker.currency_name,
                        }
                    )
                return tickers

            tickers = self._retry_request(search_ticker_data)
            logger.info(f"✅ 找到 {len(tickers)} 個結果")
            return tickers

        except Exception as e:
            logger.error(f"❌ 搜尋股票失敗: {e}")
            return []

    def _parse_interval(self, interval: str) -> tuple[str, int]:
        """
        解析時間間隔為 Polygon.io 格式

        Args:
            interval: 時間間隔 (1m, 5m, 15m, 30m, 1h, 1d, 1w, 1M)

        Returns:
            (timespan, multiplier) 元組
        """
        interval_mapping = {
            "1m": ("minute", 1),
            "5m": ("minute", 5),
            "15m": ("minute", 15),
            "30m": ("minute", 30),
            "1h": ("hour", 1),
            "4h": ("hour", 4),
            "1d": ("day", 1),
            "1w": ("week", 1),
            "1M": ("month", 1),
        }

        if interval not in interval_mapping:
            logger.warning(f"⚠️ 不支援的時間間隔: {interval}, 預設使用 1d")
            return ("day", 1)

        return interval_mapping[interval]

    def _get_default_days(self, interval: str) -> int:
        """
        根據時間間隔獲取預設天數

        ⚠️ 重要:短週期數據必須使用極小範圍,避免 Polygon.io 分頁觸發 429 錯誤

        Args:
            interval: 時間間隔

        Returns:
            預設天數
        """
        days_mapping = {
            "1m": 1,  # 1分鐘:1天 (390筆,單個交易日)
            "5m": 3,  # 5分鐘:3天 (234筆,確保有充足數據) ← 適度放寬
            "15m": 5,  # 15分鐘:5天 (130筆,跨越週末確保有數據) ← 放寬
            "30m": 7,  # 30分鐘:7天 (91筆,一週數據)
            "1h": 6,  # 1小時:5天 (32筆,一週數據) ← 進一步縮短避免429
            "4h": 30,  # 4小時:30天
            "1d": 365,  # 1日:365天 (保持不變,日線穩定)
            "1w": 730,  # 1週:2年
            "1M": 1825,  # 1月:5年
        }

        return days_mapping.get(interval, 365)

    def _get_last_trading_day(self, date: datetime | None = None) -> datetime:
        """
        獲取最近的交易日(排除週末)- 使用美國東部時間

        Args:
            date: 指定日期,預設為美國東部時間的今天

        Returns:
            最近的交易日
        """
        if date is None:
            # 使用美國東部時間而不是本地時間
            eastern = pytz.timezone("US/Eastern")
            date = datetime.now(eastern).replace(tzinfo=None)

        # 週末處理:週六(5)回到週五,週日(6)回到週五
        while date.weekday() >= 5:  # 5=週六, 6=週日
            date = date - timedelta(days=1)

        return date

    def _get_trading_date_range(self, interval: str) -> tuple[str, str]:
        """
        獲取交易日期範圍(排除週末)

        Args:
            interval: 時間間隔

        Returns:
            (start_date, end_date) 字符串格式 YYYY-MM-DD
        """
        # 獲取最近的交易日作為結束日期
        end_date = self._get_last_trading_day()

        # 根據間隔獲取起始日期
        days = self._get_default_days(interval)
        start_date = end_date - timedelta(days=days)

        # 確保起始日期也是交易日
        start_date = self._get_last_trading_day(start_date)

        logger.debug(
            f"📅 交易日期範圍: {start_date.strftime('%Y-%m-%d')} ~ {end_date.strftime('%Y-%m-%d')} ({interval})"
        )

        return start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")

    def get_api_usage_status(self) -> dict:
        """
        獲取當前 API 使用狀態

        Returns:
            API 使用狀態資訊
        """
        current_time = time.time()
        time_in_window = current_time - self.request_window_start
        time_remaining = max(0, 60 - time_in_window)

        return {
            "requests_used": self.request_count,
            "requests_limit": self.max_requests_per_minute,
            "requests_remaining": max(
                0, self.max_requests_per_minute - self.request_count
            ),
            "time_window_remaining": round(time_remaining, 1),
            "next_reset_in": round(time_remaining, 1) if time_remaining > 0 else 0,
            "usage_percentage": round(
                (self.request_count / self.max_requests_per_minute) * 100, 1
            ),
            "is_rate_limited": self.request_count >= self.max_requests_per_minute,
            "last_request": datetime.fromtimestamp(self.last_request_time).isoformat()
            if self.last_request_time > 0
            else None,
            "message": f"⚠️ 免費帳號每分鐘最多 {self.max_requests_per_minute} 次 API 調用"
            if self.request_count >= self.max_requests_per_minute - 1
            else "✅ API 使用正常",
        }


# 全域服務實例
polygon_service = PolygonService()
