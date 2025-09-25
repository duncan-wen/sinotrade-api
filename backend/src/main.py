# src/main.py

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_socketio import SocketManager
from loguru import logger

from src.api import options_quotes, orders, polygon_quotes, quotes, scanners, usage
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
        # 🚨 統一使用新的強制清理邏輯,確保一致性
        try:
            logger.info("[CLEANUP] 使用統一清理邏輯...")

            # 1. 先同步檢查兩個訂閱系統的狀態
            manager_symbols = set(subscription_manager.shioaji_subscriptions)
            service_symbols = set(shioaji_service.active_subscriptions)

            logger.info(f"[SYNC] 管理器記錄的訂閱: {sorted(manager_symbols)}")
            logger.info(f"[SYNC] 服務實際的訂閱: {sorted(service_symbols)}")

            if manager_symbols != service_symbols:
                logger.warning("[SYNC] 檢測到訂閱不同步！")
                logger.warning(
                    f"[SYNC] 僅在管理器中: {sorted(manager_symbols - service_symbols)}"
                )
                logger.warning(
                    f"[SYNC] 僅在服務中: {sorted(service_symbols - manager_symbols)}"
                )

            # 2. 使用統一的強制清理方法（以實際 API 訂閱為準）
            shioaji_service.force_cleanup_for_restart()
            logger.info("[SUCCESS] Shioaji 服務統一清理完成")

            # 3. 清理訂閱管理器記錄（在 Shioaji 清理後）
            symbols_to_cleanup = subscription_manager.cleanup_all_subscriptions()
            logger.info(
                f"[CLEANUP] 訂閱管理器清理完成,共清理 {len(symbols_to_cleanup)} 個商品記錄"
            )

        except Exception as cleanup_error:
            logger.error(f"[ERROR] 統一清理流程失敗: {cleanup_error}")

            # 降級使用緊急登出
            try:
                shioaji_service._emergency_logout()
                logger.info("[FALLBACK] 緊急登出完成")
            except Exception as emergency_error:
                logger.error(f"[CRITICAL] 緊急登出也失敗: {emergency_error}")

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
    title="SinoTrade Multi-Source API",
    description="整合多資料源的金融 API:台股數據使用 Shioaji,美股數據使用 Polygon.io,提供即時報價、歷史數據和模擬下單功能。",
    version="0.1.0",
    lifespan=lifespan,
    openapi_tags=[
        {
            "name": "Quotes",
            "description": "台股即時報價和歷史數據 API (Shioaji)",
        },
        {
            "name": "Polygon.io",
            "description": "美股即時報價和歷史數據 API (Polygon.io)",
        },
        {
            "name": "Orders",
            "description": "模擬下單相關 API",
        },
        {
            "name": "Scanners",
            "description": "台股排行榜數據 API (漲跌幅、成交量等排行)",
        },
        {
            "name": "Usage",
            "description": "Shioaji API 使用量統計",
        },
        {
            "name": "Options",
            "description": "台指選擇權即時報價、歷史數據和合約資訊 API",
        },
        {
            "name": "WebSocket",
            "description": "即時數據推送 WebSocket 連接",
        },
    ],
)

# 添加 CORS 中間件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 前端開發服務器
    allow_credentials=True,
    allow_methods=["*"],  # 允許所有 HTTP 方法,包括 OPTIONS
    allow_headers=["*"],  # 允許所有請求頭
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
app.include_router(polygon_quotes.router, prefix="/api", tags=["Polygon.io"])
app.include_router(scanners.router, prefix="/api", tags=["Scanners"])
app.include_router(usage.router, prefix="/api", tags=["Usage"])
app.include_router(options_quotes.router, prefix="/api", tags=["Options"])


@app.get("/")
def read_root() -> dict[str, str]:
    return {
        "message": "Welcome to the SinoTrade Multi-Source API - 台股 (Shioaji) + 美股 (Polygon.io)"
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    """健康檢查端點"""
    return {"status": "healthy", "service": "SinoTrade Multi-Source API"}


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
                "is_logged_in": shioaji_service.is_logged_in(),
                "is_initialized": shioaji_service.lifecycle._is_initialized,
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


@app.get("/api/logout")
def logout() -> dict[str, Any]:
    """登出 Shioaji"""
    shioaji_service.logout(force=True)
    return {"status": "success"}


@app.get("/api/debug/fix-callbacks")
def fix_websocket_callbacks() -> dict[str, Any]:
    """修復 WebSocket 回調註冊 - 調試用"""
    try:
        from src.services.socketio_manager import SocketIOTickBroadcaster

        # 檢查當前回調數量
        current_callbacks = len(shioaji_service.quote_callbacks)

        # 創建新的廣播器
        tick_broadcaster = SocketIOTickBroadcaster(socket_manager)

        # 檢查是否已註冊
        broadcast_method = tick_broadcaster.broadcast_tick_data
        is_registered = broadcast_method in shioaji_service.quote_callbacks

        if not is_registered:
            # 重新註冊
            shioaji_service.add_quote_callback(broadcast_method)

        new_callbacks = len(shioaji_service.quote_callbacks)

        return {
            "status": "success",
            "message": "WebSocket 回調檢查完成",
            "before_callbacks": current_callbacks,
            "after_callbacks": new_callbacks,
            "was_registered": is_registered,
            "action": "重新註冊" if not is_registered else "已存在",
            "callback_list": [cb.__name__ for cb in shioaji_service.quote_callbacks],
        }

    except Exception as e:
        return {"status": "error", "message": f"修復失敗: {e}"}


# Socket.IO 相關功能已移至獨立模組
