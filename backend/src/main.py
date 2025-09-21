# src/main.py

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi_socketio import SocketManager
from loguru import logger

from src.api import orders, quotes
from src.services.shioaji_service import shioaji_service
from src.services.socketio_manager import SocketIOTickBroadcaster, setup_socketio_events
from src.services.subscription_manager import subscription_manager


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

        # Socket.IO 回調已在模組層級註冊

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

# 設置 Socket.IO 事件處理器
setup_socketio_events(socket_manager)

# 創建廣播器並註冊回調
tick_broadcaster = SocketIOTickBroadcaster(socket_manager)
shioaji_service.add_quote_callback(tick_broadcaster.broadcast_tick_data)


# 訂閱管理器已從 src.services.subscription_manager 導入

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


# Socket.IO 相關功能已移至獨立模組
