# src/services/socketio_service.py

import socketio
from loguru import logger


class SocketIOManager:
    """Socket.IO 連接管理器"""

    def __init__(self):
        # 創建 Socket.IO 服務器
        self.sio = socketio.AsyncServer(
            cors_allowed_origins="*", logger=False, engineio_logger=False
        )

        # 客戶端連接管理
        self.clients: dict[str, str] = {}  # session_id -> room_name
        self.quote_subscribers: dict[str, set[str]] = {}  # symbol -> {session_ids}
        self.kline_subscribers: dict[str, set[str]] = {}  # symbol -> {session_ids}

        self._setup_events()

    def _setup_events(self):
        """設置 Socket.IO 事件處理器"""

        @self.sio.event
        async def connect(sid, environ):
            """客戶端連接"""
            logger.info(f"✅ Socket.IO 客戶端連接: {sid}")
            self.clients[sid] = ""
            await self.sio.emit(
                "connection_status",
                {
                    "status": "connected",
                    "sid": sid,
                    "timestamp": str(
                        logger.info.__globals__.get(
                            "datetime", __import__("datetime")
                        ).datetime.now()
                    ),
                },
                room=sid,
            )

        @self.sio.event
        async def disconnect(sid):
            """客戶端斷線"""
            logger.info(f"🔌 Socket.IO 客戶端斷線: {sid}")

            # 清理訂閱
            await self._cleanup_client_subscriptions(sid)

            # 移除客戶端記錄
            if sid in self.clients:
                del self.clients[sid]

        @self.sio.event
        async def subscribe_quotes(sid, data):
            """訂閱報價數據"""
            try:
                symbols = data.get("symbols", [])
                logger.info(f"📈 客戶端 {sid} 訂閱報價: {symbols}")

                for symbol in symbols:
                    if symbol not in self.quote_subscribers:
                        self.quote_subscribers[symbol] = set()
                    self.quote_subscribers[symbol].add(sid)

                await self.sio.emit(
                    "subscription_status",
                    {"type": "quotes", "symbols": symbols, "status": "subscribed"},
                    room=sid,
                )

            except Exception as e:
                logger.error(f"❌ 訂閱報價失敗: {e}")
                await self.sio.emit("error", {"message": f"訂閱失敗: {e!s}"}, room=sid)

        @self.sio.event
        async def unsubscribe_quotes(sid, data):
            """取消訂閱報價數據"""
            try:
                symbols = data.get("symbols", [])
                logger.info(f"📉 客戶端 {sid} 取消訂閱報價: {symbols}")

                for symbol in symbols:
                    if symbol in self.quote_subscribers:
                        self.quote_subscribers[symbol].discard(sid)
                        if not self.quote_subscribers[symbol]:
                            del self.quote_subscribers[symbol]

                await self.sio.emit(
                    "subscription_status",
                    {"type": "quotes", "symbols": symbols, "status": "unsubscribed"},
                    room=sid,
                )

            except Exception as e:
                logger.error(f"❌ 取消訂閱報價失敗: {e}")

        @self.sio.event
        async def subscribe_klines(sid, data):
            """訂閱K線數據"""
            try:
                symbol = data.get("symbol")
                interval = data.get("interval", "1m")

                logger.info(f"📊 客戶端 {sid} 訂閱K線: {symbol} ({interval})")

                if symbol not in self.kline_subscribers:
                    self.kline_subscribers[symbol] = set()
                self.kline_subscribers[symbol].add(sid)

                await self.sio.emit(
                    "subscription_status",
                    {
                        "type": "klines",
                        "symbol": symbol,
                        "interval": interval,
                        "status": "subscribed",
                    },
                    room=sid,
                )

                # 發送歷史K線數據 (如果需要)
                await self._send_historical_klines(sid, symbol, interval)

            except Exception as e:
                logger.error(f"❌ 訂閱K線失敗: {e}")
                await self.sio.emit(
                    "error", {"message": f"訂閱K線失敗: {e!s}"}, room=sid
                )

        @self.sio.event
        async def unsubscribe_klines(sid, data):
            """取消訂閱K線數據"""
            try:
                symbol = data.get("symbol")
                logger.info(f"📊 客戶端 {sid} 取消訂閱K線: {symbol}")

                if symbol in self.kline_subscribers:
                    self.kline_subscribers[symbol].discard(sid)
                    if not self.kline_subscribers[symbol]:
                        del self.kline_subscribers[symbol]

                await self.sio.emit(
                    "subscription_status",
                    {"type": "klines", "symbol": symbol, "status": "unsubscribed"},
                    room=sid,
                )

            except Exception as e:
                logger.error(f"❌ 取消訂閱K線失敗: {e}")

    async def _cleanup_client_subscriptions(self, sid: str):
        """清理客戶端的所有訂閱"""
        # 清理報價訂閱
        for symbol in list(self.quote_subscribers.keys()):
            if sid in self.quote_subscribers[symbol]:
                self.quote_subscribers[symbol].discard(sid)
                if not self.quote_subscribers[symbol]:
                    del self.quote_subscribers[symbol]

        # 清理K線訂閱
        for symbol in list(self.kline_subscribers.keys()):
            if sid in self.kline_subscribers[symbol]:
                self.kline_subscribers[symbol].discard(sid)
                if not self.kline_subscribers[symbol]:
                    del self.kline_subscribers[symbol]

    async def _send_historical_klines(self, sid: str, symbol: str, interval: str):
        """發送歷史K線數據"""
        try:
            # 這裡可以從數據庫或快取獲取歷史數據
            # 暫時發送空的歷史數據作為示例
            await self.sio.emit(
                "historical_klines",
                {
                    "symbol": symbol,
                    "interval": interval,
                    "klines": [],
                    "timestamp": str(__import__("datetime").datetime.now()),
                },
                room=sid,
            )

        except Exception as e:
            logger.error(f"❌ 發送歷史K線失敗: {e}")

    async def broadcast_quote(self, quote_data: dict):
        """廣播報價數據"""
        try:
            symbol = quote_data.get("symbol")
            if symbol and symbol in self.quote_subscribers:
                subscribers = list(self.quote_subscribers[symbol])
                if subscribers:
                    await self.sio.emit("quote_update", quote_data, room=subscribers)

        except Exception as e:
            logger.error(f"❌ 廣播報價失敗: {e}")

    async def broadcast_kline_tick(self, tick_data: dict):
        """廣播K線tick數據"""
        try:
            symbol = tick_data.get("symbol")
            if symbol and symbol in self.kline_subscribers:
                subscribers = list(self.kline_subscribers[symbol])
                if subscribers:
                    await self.sio.emit("kline_tick", tick_data, room=subscribers)

        except Exception as e:
            logger.error(f"❌ 廣播K線tick失敗: {e}")

    async def broadcast_kline_update(self, kline_data: dict):
        """廣播K線更新數據"""
        try:
            symbol = kline_data.get("symbol")
            if symbol and symbol in self.kline_subscribers:
                subscribers = list(self.kline_subscribers[symbol])
                if subscribers:
                    await self.sio.emit("kline_update", kline_data, room=subscribers)

        except Exception as e:
            logger.error(f"❌ 廣播K線更新失敗: {e}")

    def get_stats(self) -> dict:
        """獲取連接統計"""
        return {
            "total_clients": len(self.clients),
            "quote_subscriptions": len(self.quote_subscribers),
            "kline_subscriptions": len(self.kline_subscribers),
            "quote_subscribers_detail": {
                k: len(v) for k, v in self.quote_subscribers.items()
            },
            "kline_subscribers_detail": {
                k: len(v) for k, v in self.kline_subscribers.items()
            },
        }


# 創建全局實例
socketio_manager = SocketIOManager()
