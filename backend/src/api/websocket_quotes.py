# src/api/websocket_quotes.py

import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger

from src.models.domain import Quote
from src.services.shioaji_service import shioaji_service


class WebSocketManager:
    """WebSocket 連接管理器"""

    def __init__(self):
        # 儲存所有活動的 WebSocket 連接
        self.active_connections: dict[str, WebSocket] = {}
        # 每個連接訂閱的股票
        self.subscriptions: dict[str, set[str]] = {}
        # 每個股票的訂閱者
        self.symbol_subscribers: dict[str, set[str]] = {}
        # 存儲待處理的任務引用
        self._pending_tasks: set = set()

    async def connect(self, websocket: WebSocket, client_id: str):
        """接受新的 WebSocket 連接"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.subscriptions[client_id] = set()
        logger.info(f"客戶端 {client_id} 已連接")

    def disconnect(self, client_id: str):
        """斷開 WebSocket 連接"""
        if client_id in self.active_connections:
            # 清理訂閱
            if client_id in self.subscriptions:
                for symbol in self.subscriptions[client_id]:
                    if symbol in self.symbol_subscribers:
                        self.symbol_subscribers[symbol].discard(client_id)
                        # 如果沒有人訂閱了,停止訂閱該股票
                        if not self.symbol_subscribers[symbol]:
                            self._unsubscribe_from_shioaji(symbol)

            # 清理連接
            del self.active_connections[client_id]
            if client_id in self.subscriptions:
                del self.subscriptions[client_id]

            logger.info(f"客戶端 {client_id} 已斷開")

    def cleanup_all_subscriptions(self):
        """清理所有訂閱 - 用於應用關閉時"""
        logger.info("[CLEANUP] 清理所有 WebSocket 訂閱...")

        # 取消所有 Shioaji 訂閱
        for symbol in list(self.symbol_subscribers.keys()):
            self._unsubscribe_from_shioaji(symbol)
            logger.info(f"取消 Shioaji 訂閱: {symbol}")

        # 取消所有待處理的任務
        remaining_tasks = len(self._pending_tasks)
        if remaining_tasks > 0:
            logger.warning(f"清理時取消 {remaining_tasks} 個待處理任務")
            for task in list(self._pending_tasks):
                if not task.done():
                    task.cancel()
            self._pending_tasks.clear()

        # 清理所有記錄
        self.active_connections.clear()
        self.subscriptions.clear()
        self.symbol_subscribers.clear()

        logger.info("[CLEANUP] 所有 WebSocket 訂閱已清理")

    def _normalize_symbol(self, symbol: str) -> str:
        """標準化symbol格式,將 TSE2330 等轉換為 2330"""
        if not symbol:
            return symbol

        # 移除常見的前綴
        prefixes = ["TSE", "OTC", "OES"]
        for prefix in prefixes:
            if symbol.startswith(prefix) and len(symbol) > len(prefix):
                # 檢查剩餘部分是否為數字(股票代號)
                remaining = symbol[len(prefix) :]
                if remaining.isdigit():
                    return remaining

        return symbol

    async def subscribe_symbol(self, client_id: str, symbol: str):
        """訂閱股票"""
        if client_id not in self.subscriptions:
            return False

        self.subscriptions[client_id].add(symbol)

        if symbol not in self.symbol_subscribers:
            self.symbol_subscribers[symbol] = set()
            # 第一個訂閱者,開始訂閱 Shioaji
            self._subscribe_to_shioaji(symbol)

        self.symbol_subscribers[symbol].add(client_id)
        logger.info(f"客戶端 {client_id} 訂閱了 {symbol}")
        return True

    async def unsubscribe_symbol(self, client_id: str, symbol: str):
        """取消訂閱股票"""
        if client_id in self.subscriptions:
            self.subscriptions[client_id].discard(symbol)

        if symbol in self.symbol_subscribers:
            self.symbol_subscribers[symbol].discard(client_id)
            # 如果沒有人訂閱了,停止訂閱該股票
            if not self.symbol_subscribers[symbol]:
                self._unsubscribe_from_shioaji(symbol)

        logger.info(f"客戶端 {client_id} 取消訂閱 {symbol}")

    def _subscribe_to_shioaji(self, symbol: str):
        """向 Shioaji 訂閱股票"""
        try:
            success = shioaji_service.subscribe_quote(symbol)
            if success:
                logger.info(f"開始從 Shioaji 訂閱 {symbol}")
            else:
                logger.error(f"訂閱 {symbol} 失敗")
        except Exception as e:
            logger.error(f"訂閱 {symbol} 時發生錯誤: {e}")

    def _unsubscribe_from_shioaji(self, symbol: str):
        """取消 Shioaji 訂閱"""
        try:
            success = shioaji_service.unsubscribe_quote(symbol)
            if success:
                logger.info(f"成功取消 Shioaji 訂閱 {symbol}")
            else:
                logger.warning(f"取消 Shioaji 訂閱失敗 {symbol}")
        except Exception as e:
            logger.error(f"取消 Shioaji 訂閱時發生錯誤 {symbol}: {e}")

    async def broadcast_tick(self, quote: Quote):
        """廣播 Tick 資料給訂閱的客戶端 (用於 K 線圖)"""
        logger.debug(
            f"[TICK] 收到tick數據: symbol={quote.symbol}, timestamp={quote.timestamp}"
        )

        # 檢查是否有任何客戶端訂閱了這個symbol
        # 考慮到symbol格式差異 (2330 vs TSE2330)
        has_subscribers = False

        # 直接匹配
        if quote.symbol in self.symbol_subscribers:
            has_subscribers = True
            logger.debug(f"[TICK] 直接匹配成功: {quote.symbol}")
        else:
            # 嘗試標準化symbol格式
            normalized_symbol = self._normalize_symbol(quote.symbol)
            if normalized_symbol in self.symbol_subscribers:
                has_subscribers = True
                logger.debug(
                    f"[TICK] 標準化匹配成功: {quote.symbol} -> {normalized_symbol}"
                )

        logger.debug(
            f"[TICK] 訂閱者檢查: has_subscribers={has_subscribers}, symbol_subscribers={list(self.symbol_subscribers.keys())}"
        )

        if not has_subscribers:
            logger.debug(f"[TICK] 沒有訂閱者,跳過廣播: {quote.symbol}")
            return

        # 確定用於查找訂閱者的symbol鍵
        target_symbol = quote.symbol
        if target_symbol not in self.symbol_subscribers:
            target_symbol = self._normalize_symbol(quote.symbol)

        # 驗證時間戳的有效性
        try:
            timestamp_iso = quote.timestamp.isoformat()
            if not timestamp_iso:
                logger.error(f"無效的tick時間戳,無法廣播: {quote.timestamp}")
                return
        except Exception as e:
            logger.error(f"tick時間戳處理錯誤,無法廣播: {e}")
            return

        message = {
            "type": "tick",
            "data": {
                "symbol": quote.symbol,
                "timestamp": timestamp_iso,
                "price": float(quote.close),  # 成交價
                "volume": quote.volume,  # 成交量
                "amount": float(quote.close) * quote.volume * 1000,  # 成交金額
                "total_volume": getattr(quote, "total_volume", 0),  # 累計成交量
            },
        }

        # 發送給所有訂閱該股票的客戶端
        logger.debug(
            f"[TICK] 廣播tick消息給 {len(self.symbol_subscribers[target_symbol])} 個客戶端"
        )
        disconnected_clients = []
        for client_id in self.symbol_subscribers[target_symbol]:
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_text(
                        json.dumps(message)
                    )
                    logger.debug(
                        f"[TICK] 成功發送tick給客戶端 {client_id}: price={message['data']['price']}"
                    )
                except Exception as e:
                    logger.error(f"發送消息給客戶端 {client_id} 失敗: {e}")
                    disconnected_clients.append(client_id)
            else:
                logger.debug(f"[TICK] 客戶端 {client_id} 不在活躍連接中")

        # 清理斷開的連接
        for client_id in disconnected_clients:
            self.disconnect(client_id)

    async def send_kline_update(self, symbol: str, kline_data: dict):
        """發送 K 線更新"""
        if symbol not in self.symbol_subscribers:
            return

        message = {
            "type": "kline",
            "data": {
                "symbol": symbol,
                "timestamp": kline_data["timestamp"],
                "open": kline_data["open"],
                "high": kline_data["high"],
                "low": kline_data["low"],
                "close": kline_data["close"],
                "volume": kline_data["volume"],
            },
        }

        # 發送給所有訂閱該股票的客戶端
        for client_id in self.symbol_subscribers[symbol]:
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_text(
                        json.dumps(message)
                    )
                except Exception as e:
                    logger.error(f"發送 K 線更新失敗: {e}")


# 全局 WebSocket 管理器
ws_manager = WebSocketManager()


# K 線聚合器
class KlineAggregator:
    """將 Tick 資料聚合成 K 線"""

    def __init__(self, interval_minutes: int = 5):
        self.interval_minutes = interval_minutes
        self.current_klines: dict[
            str, dict[datetime, dict[str, Any]]
        ] = {}  # symbol -> timestamp -> kline data

    def get_interval_timestamp(self, timestamp: datetime) -> datetime:
        """獲取時間間隔時間戳 (去除秒和毫秒,對齊到間隔)"""
        # 先去除秒和毫秒
        minute_timestamp = timestamp.replace(second=0, microsecond=0)
        # 計算當前間隔的開始時間
        minutes = minute_timestamp.minute
        interval_start_minute = (
            minutes // self.interval_minutes
        ) * self.interval_minutes
        return minute_timestamp.replace(minute=interval_start_minute)

    async def process_tick(self, quote: Quote):
        """處理 Tick 資料並更新 K 線"""
        symbol = quote.symbol
        interval_timestamp = self.get_interval_timestamp(quote.timestamp)

        if symbol not in self.current_klines:
            self.current_klines[symbol] = {}

        # 檢查是否是新的間隔 K 線
        if interval_timestamp not in self.current_klines[symbol]:
            # 新的 K 線
            new_kline = {
                "symbol": symbol,
                "timestamp": interval_timestamp.isoformat(),
                "open": float(quote.close),
                "high": float(quote.close),
                "low": float(quote.close),
                "close": float(quote.close),
                "volume": quote.volume,
            }
            self.current_klines[symbol][interval_timestamp] = new_kline

            # 廣播新的 K 線
            await ws_manager.send_kline_update(symbol, new_kline)
        else:
            # 更新現有 K 線
            kline = self.current_klines[symbol][interval_timestamp]
            kline["high"] = max(kline["high"], float(quote.close))
            kline["low"] = min(kline["low"], float(quote.close))
            kline["close"] = float(quote.close)
            kline["volume"] += quote.volume

            # 廣播更新的 K 線
            await ws_manager.send_kline_update(symbol, kline)


# 全局 K 線聚合器
kline_aggregator = KlineAggregator()


# 設定 Shioaji 的 tick callback 來處理數據
def tick_broadcast_callback(quote: Quote):
    """接收到新的 Tick 時處理並廣播(同步版本)"""
    logger.debug(
        f"[CALLBACK] tick_broadcast_callback 被調用: symbol={quote.symbol}, timestamp={quote.timestamp}"
    )
    try:
        # 創建新的事件循環來處理 async 操作
        import asyncio

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def async_broadcast():
            logger.debug("[CALLBACK] 開始廣播tick數據")
            # 廣播原始 Tick 資料
            await ws_manager.broadcast_tick(quote)
            # 處理 K 線聚合
            await kline_aggregator.process_tick(quote)
            logger.debug("[CALLBACK] tick數據廣播完成")

        loop.run_until_complete(async_broadcast())
        loop.close()
    except Exception as e:
        logger.error(f"同步廣播 tick 數據失敗: {e}")


# 註冊到 Shioaji service
# 注意:這需要在 ShioajiService 中添加 callback 註冊功能


router = APIRouter()


@router.websocket("/ws/quotes/{client_id}")
async def websocket_quotes_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket 端點用於即時報價"""
    await ws_manager.connect(websocket, client_id)

    try:
        while True:
            # 接收客戶端消息
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "subscribe":
                symbol = message["symbol"]
                await ws_manager.subscribe_symbol(client_id, symbol)
                # 發送確認消息
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "subscription_confirmed",
                            "symbol": symbol,
                            "status": "success",
                        }
                    )
                )

            elif message["type"] == "unsubscribe":
                symbol = message["symbol"]
                await ws_manager.unsubscribe_symbol(client_id, symbol)
                # 發送確認消息
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "unsubscription_confirmed",
                            "symbol": symbol,
                            "status": "success",
                        }
                    )
                )

    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket 錯誤: {e}")
        ws_manager.disconnect(client_id)


@router.websocket("/ws/klines/{client_id}")
async def websocket_klines_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket 端點用於即時 K 線"""
    await ws_manager.connect(websocket, f"kline_{client_id}")

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "subscribe_kline":
                symbol = message["symbol"]
                interval = message.get("interval", "5m")  # 默認 5 分鐘

                await ws_manager.subscribe_symbol(f"kline_{client_id}", symbol)

                # 測試用:發送一個測試tick消息來驗證WebSocket連接
                import asyncio
                from datetime import datetime

                from src.models.domain import Quote

                async def send_test_tick(captured_symbol: str):
                    await asyncio.sleep(2)  # 等待2秒
                    test_quote = Quote(
                        symbol=captured_symbol,
                        timestamp=datetime.now(),
                        open=1270.0,
                        close=1275.0,
                        bid_price=1274.0,
                        ask_price=1276.0,
                        bid_volume=100,
                        ask_volume=200,
                        volume=150,
                        avg_price=1272.0,
                        underlying_price=None,
                    )
                    logger.info(
                        f"🧪 發送測試tick數據: {captured_symbol} - {test_quote.close}"
                    )
                    await ws_manager.broadcast_tick(test_quote)

                task = asyncio.create_task(send_test_tick(symbol))
                # 存儲任務引用以防止垃圾回收
                ws_manager._pending_tasks.add(task)
                task.add_done_callback(ws_manager._pending_tasks.discard)

                # 發送歷史 K 線數據
                historical_klines = await get_historical_klines(symbol, interval, 100)
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "historical_klines",
                            "symbol": symbol,
                            "interval": interval,
                            "data": historical_klines,
                        }
                    )
                )

            elif message["type"] == "unsubscribe_kline":
                symbol = message["symbol"]
                await ws_manager.unsubscribe_symbol(f"kline_{client_id}", symbol)
                # 發送確認消息
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "unsubscription_confirmed",
                            "symbol": symbol,
                            "status": "success",
                        }
                    )
                )

    except WebSocketDisconnect:
        ws_manager.disconnect(f"kline_{client_id}")
    except Exception as e:
        logger.error(f"K 線 WebSocket 錯誤: {e}")
        ws_manager.disconnect(f"kline_{client_id}")


async def get_historical_klines(symbol: str, interval: str, limit: int) -> list[dict]:
    """獲取歷史 K 線資料"""
    try:
        historical_data = shioaji_service.get_historical_klines(symbol, interval, limit)
        logger.info(f"Retrieved {len(historical_data)} historical klines for {symbol}")
        return historical_data
    except Exception as e:
        logger.error(f"Failed to get historical klines: {e}")
        return []
