# src/main.py

from fastapi import FastAPI
from loguru import logger

from src.api import orders, quotes, websocket_quotes
from src.services.shioaji_service import shioaji_service

app = FastAPI(
    title="Shioaji Trading API",
    description="An API for fetching real-time market data and placing simulated orders using the Shioaji library.",
    version="0.1.0",
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

app.include_router(quotes.router, prefix="/api", tags=["Quotes"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])
app.include_router(websocket_quotes.router, tags=["WebSocket"])


@app.on_event("startup")
async def startup_event():
    """應用啟動時的初始化"""
    logger.info("[STARTUP] 應用啟動中...")

    try:
        # 初始化 Shioaji 服務
        success = shioaji_service.initialize()
        if success:
            logger.info("[SUCCESS] Shioaji 服務初始化成功")
        else:
            logger.error("[ERROR] Shioaji 服務初始化失敗")

        # 註冊 WebSocket 回調來處理即時報價推送
        shioaji_service.add_quote_callback(websocket_quotes.tick_broadcast_callback)
        logger.info("[SUCCESS] WebSocket 回調註冊完成")

    except Exception as e:
        logger.error(f"[ERROR] 應用啟動失敗: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """應用關閉時的清理"""
    logger.info("[SHUTDOWN] 應用關閉中,清理資源...")

    try:
        # 清理所有 WebSocket 訂閱
        websocket_quotes.ws_manager.cleanup_all_subscriptions()
        logger.info("[SUCCESS] WebSocket 訂閱清理完成")

        # 關閉 Shioaji 連接
        success = shioaji_service.cleanup()
        if success:
            logger.info("[SUCCESS] Shioaji 服務清理完成")
        else:
            logger.warning("[WARNING] Shioaji 服務清理可能有問題")

        logger.info("[SUCCESS] 應用清理完成")

    except Exception as e:
        logger.error(f"[ERROR] 應用清理失敗: {e}")


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Welcome to the Shioaji Trading API"}


@app.get("/health")
def health_check() -> dict[str, str]:
    """健康檢查端點"""
    return {"status": "healthy", "service": "Shioaji Trading API"}
