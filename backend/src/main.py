# src/main.py


from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi_socketio import SocketManager
from loguru import logger

from src.api import orders, quotes
from src.services.shioaji_service import shioaji_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("[STARTUP] 應用啟動中...")
    try:
        # 初始化 Shioaji 服務
        success = shioaji_service.initialize()
        if success:
            logger.info("[SUCCESS] Shioaji 服務初始化成功")
        else:
            logger.error("[ERROR] Shioaji 服務初始化失敗")

        # 註冊 Socket.IO 回調來處理即時報價推送
        shioaji_service.add_quote_callback(socketio_tick_broadcast_callback)

        logger.info(
            f"[SUCCESS] Socket.IO 回調註冊完成,當前回調數量: {len(shioaji_service.quote_callbacks)}"
        )
        logger.info(
            f"[DEBUG] 回調列表: {[cb.__name__ for cb in shioaji_service.quote_callbacks]}"
        )
    except Exception as e:
        logger.error(f"[ERROR] 應用啟動失敗: {e}")
        raise

    yield

    # Shutdown
    logger.info("[SHUTDOWN] 應用關閉中,清理資源...")
    try:
        # 🚨 緊急清理所有訂閱管理器記錄
        try:
            symbols_to_cleanup = subscription_manager.cleanup_all_subscriptions()
            logger.info(
                f"[CLEANUP] 訂閱管理器清理完成,共清理 {len(symbols_to_cleanup)} 個商品"
            )

            # 向 Shioaji 取消所有剩餘訂閱
            for symbol in symbols_to_cleanup:
                try:
                    shioaji_service.unsubscribe_quote(symbol)
                except Exception as unsub_error:
                    logger.error(f"[ERROR] 無法取消訂閱 {symbol}: {unsub_error}")

        except Exception as cleanup_error:
            logger.error(f"[ERROR] 訂閱管理器清理失敗: {cleanup_error}")

        # 清理 Shioaji 訂閱和資源
        try:
            success = shioaji_service.cleanup()
            if success:
                logger.info("[SUCCESS] Shioaji 服務清理完成")
            else:
                logger.warning("[WARNING] Shioaji 服務清理可能有問題")
        except Exception as shioaji_error:
            logger.error(f"[ERROR] Shioaji 服務清理失敗: {shioaji_error}")

        # 清理 Socket.IO 相關資源
        try:
            # Socket.IO 會自動斷開所有連接
            logger.info("[CLEANUP] Socket.IO 資源清理完成")
        except Exception as socketio_error:
            logger.error(f"[ERROR] Socket.IO 清理失敗: {socketio_error}")

        logger.info("[SUCCESS] 應用清理完成")
    except Exception as e:
        logger.error(f"[CRITICAL] 應用清理過程發生嚴重錯誤: {e}")


app = FastAPI(
    title="Shioaji Trading API",
    description="An API for fetching real-time market data and placing simulated orders using the Shioaji library.",
    version="0.1.0",
    lifespan=lifespan,
    openapi_tags=[
        {
            "name": "Quotes",
            "description": "即時報價和歷史數據相關 API",
        },
        {
            "name": "Orders",
            "description": "模擬下單相關 API",
        },
        {
            "name": "WebSocket",
            "description": "即時數據推送 WebSocket 連接",
        },
    ],
)

# 整合 Socket.IO
socket_manager = SocketManager(app=app, mount_location="/socket.io")


# 🚀 全域訂閱管理器 - 防止重複訂閱
class GlobalSubscriptionManager:
    """全域訂閱管理器 - 確保同一商品只訂閱一次"""

    def __init__(self):
        self.symbol_subscribers: dict[str, set[str]] = {}  # symbol -> {client_ids}
        self.shioaji_subscriptions: set[str] = set()  # 已向 Shioaji 訂閱的商品

    def add_subscriber(self, symbol: str, client_id: str) -> bool:
        """添加訂閱者,返回是否需要向 Shioaji 訂閱"""
        if symbol not in self.symbol_subscribers:
            self.symbol_subscribers[symbol] = set()

        self.symbol_subscribers[symbol].add(client_id)

        # 如果是第一個訂閱者,需要向 Shioaji 訂閱
        if symbol not in self.shioaji_subscriptions:
            self.shioaji_subscriptions.add(symbol)
            logger.info(f"🎯 首次訂閱 {symbol},向 Shioaji 發起訂閱")
            return True
        else:
            logger.info(
                f"📊 {symbol} 已有訂閱,直接加入廣播列表 (訂閱者: {len(self.symbol_subscribers[symbol])})"
            )
            return False

    def remove_subscriber(self, symbol: str, client_id: str) -> bool:
        """移除訂閱者,返回是否需要向 Shioaji 取消訂閱"""
        if symbol not in self.symbol_subscribers:
            return False

        self.symbol_subscribers[symbol].discard(client_id)

        # 如果沒有訂閱者了,需要向 Shioaji 取消訂閱
        if not self.symbol_subscribers[symbol]:
            del self.symbol_subscribers[symbol]
            self.shioaji_subscriptions.discard(symbol)
            logger.info(f"🗑️ {symbol} 無訂閱者,向 Shioaji 取消訂閱")
            return True
        else:
            logger.info(
                f"📊 {symbol} 仍有 {len(self.symbol_subscribers[symbol])} 個訂閱者"
            )
            return False

    def get_subscribers(self, symbol: str) -> set[str]:
        """獲取指定商品的所有訂閱者"""
        return self.symbol_subscribers.get(symbol, set())

    def cleanup_client(self, client_id: str) -> list[str]:
        """清理客戶端的所有訂閱,返回需要取消 Shioaji 訂閱的商品列表"""
        symbols_to_unsubscribe = []

        for symbol in list(self.symbol_subscribers.keys()):
            if client_id in self.symbol_subscribers[symbol]:
                if self.remove_subscriber(symbol, client_id):
                    symbols_to_unsubscribe.append(symbol)

        return symbols_to_unsubscribe

    def cleanup_all_subscriptions(self) -> list[str]:
        """🚨 緊急清理所有訂閱 - 用於服務關閉時"""
        symbols_to_unsubscribe = list(self.shioaji_subscriptions)

        logger.warning(f"🧹 緊急清理所有訂閱: {symbols_to_unsubscribe}")

        # 清空所有記錄
        self.symbol_subscribers.clear()
        self.shioaji_subscriptions.clear()

        return symbols_to_unsubscribe

    def get_subscription_status(self) -> dict[str, Any]:
        """獲取當前訂閱狀態 - 用於監控和除錯"""
        return {
            "total_symbols": len(self.shioaji_subscriptions),
            "active_symbols": list(self.shioaji_subscriptions),
            "subscriber_counts": {
                symbol: len(subscribers)
                for symbol, subscribers in self.symbol_subscribers.items()
            },
            "total_subscribers": sum(
                len(subs) for subs in self.symbol_subscribers.values()
            ),
        }


# 創建全域訂閱管理器實例
subscription_manager = GlobalSubscriptionManager()

app.include_router(quotes.router, prefix="/api", tags=["Quotes"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Welcome to the Shioaji Trading API"}


@app.get("/health")
def health_check() -> dict[str, str]:
    """健康檢查端點"""
    return {"status": "healthy", "service": "Shioaji Trading API"}


@app.get("/api/subscriptions/status")
def get_subscription_status() -> dict[str, Any]:
    """🔍 獲取當前訂閱狀態 - 用於監控和除錯"""
    try:
        status = subscription_manager.get_subscription_status()
        shioaji_active_subs = list(shioaji_service.active_subscriptions)

        return {
            "status": "ok",
            "timestamp": str(__import__("datetime").datetime.now()),
            "subscription_manager": status,
            "shioaji_service": {
                "active_subscriptions": shioaji_active_subs,
                "total_active": len(shioaji_active_subs),
                "is_logged_in": shioaji_service._is_logged_in,
                "is_initialized": shioaji_service._is_initialized,
            },
            "consistency_check": {
                "manager_symbols": set(status["active_symbols"]),
                "shioaji_symbols": set(shioaji_active_subs),
                "is_consistent": set(status["active_symbols"])
                == set(shioaji_active_subs),
            },
        }
    except Exception as e:
        logger.error(f"取得訂閱狀態失敗: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": str(__import__("datetime").datetime.now()),
        }


@app.post("/api/subscriptions/force-cleanup")
def force_cleanup_subscriptions() -> dict[str, Any]:
    """🚨 強制清理所有訂閱 - 僅限緊急情況使用"""
    try:
        logger.warning("🚨 收到強制清理請求")

        # 記錄清理前狀態
        before_status = subscription_manager.get_subscription_status()

        # 強制清理訂閱管理器
        symbols_to_cleanup = subscription_manager.cleanup_all_subscriptions()

        # 向 Shioaji 取消所有訂閱
        cleanup_results = []
        for symbol in symbols_to_cleanup:
            try:
                success = shioaji_service.unsubscribe_quote(symbol)
                cleanup_results.append(
                    {"symbol": symbol, "success": success, "error": None}
                )
                logger.info(
                    f"強制取消訂閱: {symbol} -> {'成功' if success else '失敗'}"
                )
            except Exception as e:
                cleanup_results.append(
                    {"symbol": symbol, "success": False, "error": str(e)}
                )
                logger.error(f"強制取消訂閱失敗: {symbol} -> {e}")

        # 記錄清理後狀態
        after_status = subscription_manager.get_subscription_status()

        return {
            "status": "completed",
            "timestamp": str(__import__("datetime").datetime.now()),
            "cleaned_symbols": symbols_to_cleanup,
            "cleanup_results": cleanup_results,
            "before_status": before_status,
            "after_status": after_status,
            "message": f"強制清理完成,共處理 {len(symbols_to_cleanup)} 個商品",
        }

    except Exception as e:
        logger.error(f"強制清理失敗: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": str(__import__("datetime").datetime.now()),
        }


# 🔄 動態符號映射 - 將實際合約代碼映射到標準化符號
def get_symbol_mapping(original_symbol: str) -> str:
    """
    通用期貨動態映射 - 將實際合約代碼映射到標準化符號

    例如:
    - CDFJ5 -> CDFR1 (台積電期貨)
    - TXFJ5 -> TXFR1 (台指期貨)
    - MXFJ5 -> MXFR1 (小台指期貨)
    - TMFK5 -> TMFR1 (台泥期貨)
    """
    # 如果已經是標準化符號(*R1/*R2),直接返回
    if original_symbol.endswith(("R1", "R2")):
        return original_symbol

    # 通用期貨映射邏輯
    # 期貨代碼格式: [期貨群組][月份代碼][年份代碼] (例如: CDFJ5, TXFK5)
    if len(original_symbol) >= 4:
        # 提取期貨群組名稱 (移除最後2-3個字符的月份+年份代碼)
        if original_symbol[-3:].isalnum() and original_symbol[-2].isalpha():
            # 格式: XXXYZ5 (3字符群組 + 月份代碼 + 年份代碼)
            group_name = original_symbol[:-2]
        elif original_symbol[-4:].isalnum() and original_symbol[-3:-1].isalpha():
            # 格式: XXXYYZ5 (4字符群組等其他格式)
            group_name = original_symbol[:-2]
        else:
            # 無法識別的格式,保持原樣
            return original_symbol

        # 所有期貨合約默認映射到近月 (*R1)
        mapped_symbol = f"{group_name}R1"

        logger.debug(f"期貨映射: {original_symbol} -> {mapped_symbol}")
        return mapped_symbol

    # 非期貨或無法識別的符號保持原樣
    return original_symbol


# Socket.IO tick 廣播回調 (同步版本)
def socketio_tick_broadcast_callback(tick_data):
    """Socket.IO tick 數據廣播回調 (同步版本避免事件循環問題)"""
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
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        success = False

        # 方法1: 嘗試使用現有事件循環
        try:
            loop = asyncio.get_running_loop()
            if not loop.is_closed():
                _ = asyncio.run_coroutine_threadsafe(
                    socket_manager.emit("kline_tick", broadcast_data), loop
                )
                success = True
                logger.debug(
                    f"✅ 使用現有事件循環廣播: {original_symbol} -> {mapped_symbol}"
                )
        except RuntimeError:
            pass  # 沒有運行中的事件循環

        # 方法2: 嘗試獲取事件循環
        if not success:
            try:
                loop = asyncio.get_event_loop()
                if not loop.is_closed():
                    _ = asyncio.run_coroutine_threadsafe(
                        socket_manager.emit("kline_tick", broadcast_data), loop
                    )
                    success = True
                    logger.debug(
                        f"✅ 使用獲取的事件循環廣播: {original_symbol} -> {mapped_symbol}"
                    )
            except RuntimeError:
                pass

        # 方法3: 使用線程池執行器 (最後手段)
        if not success:
            try:

                def run_async_emit():
                    async def async_emit():
                        await socket_manager.emit("kline_tick", broadcast_data)

                    asyncio.run(async_emit())

                # 在單獨線程中執行,避免阻塞
                with ThreadPoolExecutor(max_workers=1) as executor:
                    executor.submit(run_async_emit)
                    success = True
                    logger.debug(
                        f"✅ 使用線程池廣播: {original_symbol} -> {mapped_symbol}"
                    )
            except Exception as e:
                logger.error(f"線程池廣播失敗: {e}")

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


# Socket.IO 事件處理器
@socket_manager.on("connect")
async def handle_connect(sid, environ):
    logger.info(f"✅ Socket.IO 客戶端連接: {sid}")

    # 發送連接確認和當前狀態
    await socket_manager.emit(
        "connection_status",
        {
            "status": "connected",
            "sid": sid,
            "timestamp": str(__import__("datetime").datetime.now()),
            "server_info": {
                "shioaji_logged_in": shioaji_service._is_logged_in,
                "shioaji_initialized": shioaji_service._is_initialized,
            },
        },
        room=sid,
    )


@socket_manager.on("disconnect")
async def handle_disconnect(sid):
    logger.info(f"🔌 Socket.IO 客戶端斷線: {sid}")

    try:
        # 🚀 清理客戶端的所有訂閱
        symbols_to_unsubscribe = subscription_manager.cleanup_client(sid)

        logger.info(f"客戶端 {sid} 需要清理的訂閱: {symbols_to_unsubscribe}")

        # 向 Shioaji 取消訂閱沒有其他訂閱者的商品
        for symbol in symbols_to_unsubscribe:
            try:
                success = shioaji_service.unsubscribe_quote(symbol)
                if success:
                    logger.info(f"✅ Shioaji 取消訂閱成功: {symbol}")
                else:
                    logger.warning(f"⚠️ Shioaji 取消訂閱失敗: {symbol}")
            except Exception as e:
                logger.error(f"❌ Shioaji 取消訂閱錯誤 {symbol}: {e}")

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

    # 🚀 使用訂閱管理器,避免重複訂閱
    need_shioaji_subscription = subscription_manager.add_subscriber(symbol, sid)

    if need_shioaji_subscription:
        # 只有在首次訂閱時才向 Shioaji 發起訂閱
        try:
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

    # 🚀 使用訂閱管理器處理取消訂閱
    need_shioaji_unsubscription = subscription_manager.remove_subscriber(symbol, sid)

    if need_shioaji_unsubscription:
        # 只有在沒有其他訂閱者時才向 Shioaji 取消訂閱
        try:
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
