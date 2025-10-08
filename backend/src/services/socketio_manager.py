# src/services/socketio_manager.py

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from dotenv import load_dotenv
from fastapi_socketio import SocketManager
from loguru import logger

from src.services.subscription_manager import subscription_manager
from src.utils.symbol_mapping import get_symbol_mapping

load_dotenv()


# 註解 PolygonWebSocketManager 類 - 免費計劃不支援 WebSocket
# class PolygonWebSocketManager:
#     """Polygon.io WebSocket 管理器, 整合到 SocketIO 架構"""
#
#     def __init__(self, socket_manager: SocketManager):
#         self.socket_manager = socket_manager
#         self.api_key = os.getenv("POLYGON_API_KEY")
#         self.ws_url = "wss://delayed.polygon.io/stocks"
#         self.connection_delay = 10
#         self.websocket = None
#         self.is_connected = False
#         self.is_authenticated = False
#         self._listen_task = None
#         self.us_subscriptions = set()
#         self.us_clients = {}
#         self.reconnect_attempts = 0
#         self.max_reconnect_attempts = 5
#         self.reconnect_delay = 5


class SocketIOTickBroadcaster:
    """Socket.IO tick 數據廣播器"""

    def __init__(self, socket_manager: SocketManager):
        self.socket_manager = socket_manager

    def broadcast_tick_data(self, tick_data: Any) -> None:
        """Socket.IO tick 數據廣播回調 (同步版本避免事件循環問題)"""
        logger.info(f"🔥 [DEBUG] broadcast_tick_data 被調用: {type(tick_data)}")
        try:
            # tick_data 可能是 Quote 物件或字典,需要統一處理
            if hasattr(tick_data, "symbol"):
                # Quote 物件
                original_symbol = tick_data.symbol
                close_price = getattr(tick_data, "close", 0)
                timestamp = getattr(tick_data, "timestamp", "")
                volume = getattr(tick_data, "volume", 0)

                # 轉換為字典格式
                data_dict = {
                    "symbol": original_symbol,
                    "price": close_price,
                    "close": close_price,
                    "timestamp": str(timestamp),
                    "volume": volume,
                    "amount": close_price * volume if volume else 0,
                    "total_volume": volume,
                }
            elif isinstance(tick_data, dict):
                # 字典格式
                original_symbol = tick_data.get("symbol")
                data_dict = tick_data
            else:
                logger.error(f"未知的 tick_data 類型: {type(tick_data)}")
                return

            # 獲取映射後的符號
            mapped_symbol = get_symbol_mapping(original_symbol)

            # 創建廣播數據,使用映射後的符號
            broadcast_data = {
                **data_dict,
                "symbol": mapped_symbol,
                "original_symbol": original_symbol,
            }

            # 使用多種方法嘗試 Socket.IO 廣播
            success = self._try_broadcast(
                broadcast_data, original_symbol, mapped_symbol
            )

            if success:
                logger.info(
                    f"📡 Socket.IO 廣播 tick 數據: {original_symbol} -> {mapped_symbol}"
                )
            else:
                logger.warning(
                    f"⚠️ 無法廣播 Socket.IO 數據: {original_symbol} -> {mapped_symbol}"
                )

        except Exception as e:
            logger.error(f"❌ Socket.IO tick 廣播失敗: {e}")

    def _try_broadcast(
        self, broadcast_data: dict, original_symbol: str, mapped_symbol: str
    ) -> bool:
        """嘗試多種方法進行 Socket.IO 廣播"""
        success = False

        # 🆕 只廣播給訂閱該商品的客戶端
        from src.services.subscription_manager import subscription_manager

        subscribers = subscription_manager.get_subscribers(mapped_symbol)
        if not subscribers:
            logger.debug(f"⚠️ {mapped_symbol} 沒有訂閱者,跳過廣播")
            return True  # 沒有訂閱者不算錯誤

        subscriber_list = list(subscribers)

        # 方法1: 嘗試使用現有事件循環
        try:
            loop = asyncio.get_running_loop()
            if not loop.is_closed():
                _ = asyncio.run_coroutine_threadsafe(
                    self.socket_manager.emit(
                        "kline_tick", broadcast_data, room=subscriber_list
                    ),
                    loop,
                )
                success = True
                logger.debug(
                    f"✅ 使用現有事件循環廣播: {original_symbol} -> {mapped_symbol} (訂閱者: {len(subscriber_list)})"
                )
        except RuntimeError:
            pass  # 沒有運行中的事件循環

        # 方法2: 嘗試獲取事件循環
        if not success:
            try:
                loop = asyncio.get_event_loop()
                if not loop.is_closed():
                    _ = asyncio.run_coroutine_threadsafe(
                        self.socket_manager.emit(
                            "kline_tick", broadcast_data, room=subscriber_list
                        ),
                        loop,
                    )
                    success = True
                    logger.debug(
                        f"✅ 使用獲取的事件循環廣播: {original_symbol} -> {mapped_symbol} (訂閱者: {len(subscriber_list)})"
                    )
            except RuntimeError:
                pass

        # 方法3: 使用線程池執行器 (最後手段)
        if not success:
            try:

                def run_async_emit():
                    async def async_emit():
                        await self.socket_manager.emit(
                            "kline_tick", broadcast_data, room=subscriber_list
                        )

                    asyncio.run(async_emit())

                # 在單獨線程中執行,避免阻塞
                with ThreadPoolExecutor(max_workers=1) as executor:
                    executor.submit(run_async_emit)
                    success = True
                    logger.debug(
                        f"✅ 使用線程池廣播: {original_symbol} -> {mapped_symbol} (訂閱者: {len(subscriber_list)})"
                    )
            except Exception as e:
                logger.error(f"線程池廣播失敗: {e}")

        return success


def setup_socketio_events(socket_manager: SocketManager):
    """設置 Socket.IO 事件處理器"""

    # 註解: 創建 Polygon.io WebSocket 管理器 - 免費計劃不支援
    # polygon_manager = PolygonWebSocketManager(socket_manager)

    # 註解: 延遲啟動 Polygon.io WebSocket 連接 - 免費計劃不支援
    # async def delayed_polygon_connect():
    #     await asyncio.sleep(polygon_manager.connection_delay)
    #     logger.info(f"⏰ {polygon_manager.connection_delay} 秒延遲後啟動 Polygon.io WebSocket")
    #     await polygon_manager.connect()
    #
    # _polygon_task = asyncio.create_task(delayed_polygon_connect())

    @socket_manager.on("connect")
    async def handle_connect(sid, environ):
        logger.info(f"✅ Socket.IO 客戶端連接: {sid}")

        # 發送連接確認和當前狀態
        from src.services.shioaji_service import shioaji_service

        await socket_manager.emit(
            "connection_status",
            {
                "status": "connected",
                "sid": sid,
                "timestamp": str(__import__("datetime").datetime.now()),
                "server_info": {
                    "shioaji_logged_in": shioaji_service.is_logged_in(),
                    "shioaji_initialized": shioaji_service.lifecycle._is_initialized,
                    # 註解: polygon WebSocket 狀態 - 免費計劃不支援
                    "polygon_connected": False,
                    "polygon_authenticated": False,
                },
            },
            room=sid,
        )

    @socket_manager.on("disconnect")
    async def handle_disconnect(sid):
        logger.info(f"🔌 Socket.IO 客戶端斷線: {sid}")

        try:
            # 清理客戶端的所有訂閱 (台股)
            symbols_to_unsubscribe = subscription_manager.cleanup_client(sid)

            logger.info(f"客戶端 {sid} 需要清理的台股訂閱: {symbols_to_unsubscribe}")

            # 向 Shioaji 取消訂閱沒有其他訂閱者的商品
            from src.services.shioaji_service import shioaji_service

            for symbol in symbols_to_unsubscribe:
                try:
                    success = shioaji_service.unsubscribe_quote(symbol)
                    if success:
                        logger.info(f"✅ Shioaji 取消訂閱成功: {symbol}")
                    else:
                        logger.warning(f"⚠️ Shioaji 取消訂閱失敗: {symbol}")
                except Exception as e:
                    logger.error(f"❌ Shioaji 取消訂閱錯誤 {symbol}: {e}")

            # 註解: 清理客戶端的美股訂閱 - 免費計劃不支援
            # await polygon_manager.cleanup_client_us_subscriptions(sid)

        except Exception as e:
            logger.error(f"❌ 客戶端斷線清理失敗 {sid}: {e}")

    @socket_manager.on("connect_error")
    async def handle_connect_error(sid, data):
        logger.error(f"❌ Socket.IO 連接錯誤: {sid} -> {data}")

    @socket_manager.on("disconnect_error")
    async def handle_disconnect_error(sid, data):
        logger.error(f"❌ Socket.IO 斷線錯誤: {sid} -> {data}")

        # 即使發生錯誤也要嘗試清理
        try:
            symbols_to_unsubscribe = subscription_manager.cleanup_client(sid)
            from src.services.shioaji_service import shioaji_service

            for symbol in symbols_to_unsubscribe:
                try:
                    shioaji_service.unsubscribe_quote(symbol)
                    logger.info(f"🔧 錯誤處理中強制取消訂閱: {symbol}")
                except Exception as cleanup_error:
                    logger.error(f"錯誤處理中清理失敗 {symbol}: {cleanup_error}")
        except Exception as e:
            logger.error(f"錯誤處理中清理客戶端失敗 {sid}: {e}")

    @socket_manager.on("subscribe_klines")
    async def handle_subscribe_klines(sid, data):
        symbol = data.get("symbol")
        interval = data.get("interval", "5m")
        logger.info(f"📊 客戶端 {sid} 訂閱K線: {symbol} ({interval})")

        # 使用訂閱管理器,避免重複訂閱
        need_shioaji_subscription = subscription_manager.add_subscriber(symbol, sid)

        if need_shioaji_subscription:
            # 只有在首次訂閱時才向 Shioaji 發起訂閱
            try:
                from src.services.shioaji_service import shioaji_service

                success = shioaji_service.subscribe_quote(symbol)
                if success:
                    logger.info(f"✅ Shioaji 訂閱成功: {symbol}")
                else:
                    logger.warning(f"⚠️ Shioaji 訂閱失敗: {symbol}")
            except Exception as e:
                logger.error(f"❌ Shioaji 訂閱錯誤: {e}")

        # 發送訂閱確認
        await socket_manager.emit(
            "subscription_status",
            {
                "type": "klines",
                "symbol": symbol,
                "interval": interval,
                "status": "subscribed",
                "subscribers_count": len(subscription_manager.get_subscribers(symbol)),
            },
            room=sid,
        )

        # 發送歷史K線數據 (如果需要)
        await socket_manager.emit(
            "historical_klines",
            {
                "symbol": symbol,
                "interval": interval,
                "klines": [],
                "timestamp": str(__import__("datetime").datetime.now()),
            },
            room=sid,
        )

    @socket_manager.on("unsubscribe_klines")
    async def handle_unsubscribe_klines(sid, data):
        symbol = data.get("symbol")
        logger.info(f"📊 客戶端 {sid} 取消訂閱K線: {symbol}")

        # 使用訂閱管理器處理取消訂閱
        need_shioaji_unsubscription = subscription_manager.remove_subscriber(
            symbol, sid
        )

        if need_shioaji_unsubscription:
            # 只有在沒有其他訂閱者時才向 Shioaji 取消訂閱
            try:
                from src.services.shioaji_service import shioaji_service

                success = shioaji_service.unsubscribe_quote(symbol)
                if success:
                    logger.info(f"✅ Shioaji 取消訂閱成功: {symbol}")
                else:
                    logger.warning(f"⚠️ Shioaji 取消訂閱失敗: {symbol}")
            except Exception as e:
                logger.error(f"❌ Shioaji 取消訂閱錯誤: {e}")

        await socket_manager.emit(
            "subscription_status",
            {
                "type": "klines",
                "symbol": symbol,
                "status": "unsubscribed",
                "subscribers_count": len(subscription_manager.get_subscribers(symbol)),
            },
            room=sid,
        )

    # 註解: 美股專用事件處理器 - 免費計劃不支援 WebSocket
    # @socket_manager.on("subscribe_us_klines")
    # async def handle_subscribe_us_klines(sid, data):
    #     """處理美股 K線訂閱"""
    #     symbol = data.get("symbol", "").upper()
    #     interval = data.get("interval", "1m")
    #     logger.info(f"🇺🇸 客戶端 {sid} 訂閱美股K線: {symbol} ({interval})")
    #     # ... (其餘代碼已註解)

    # @socket_manager.on("unsubscribe_us_klines")
    # async def handle_unsubscribe_us_klines(sid, data):
    #     """處理美股 K線取消訂閱"""
    #     # ... (代碼已註解)

    # @socket_manager.on("get_polygon_status")
    # async def handle_get_polygon_status(sid, data):
    #     """獲取 Polygon.io 連接狀態"""
    #     # ... (代碼已註解)
