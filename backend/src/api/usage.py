# src/api/usage.py

from fastapi import APIRouter, HTTPException
from loguru import logger

from src.models.domain import UsageStats
from src.services.shioaji_service import shioaji_service

router = APIRouter()


@router.get("/usage", response_model=UsageStats)
def get_api_usage() -> UsageStats:
    """
    獲取 Shioaji API 使用量統計

    Returns:
        UsageStats: API 使用量統計資料,包含：
        - connections: 連接次數
        - bytes_used: 已使用流量 (MB)
        - bytes_limit: 流量限制 (MB)
        - bytes_remaining: 剩餘流量 (MB)
        - usage_rate: 使用率 (%)
        - warning_message: 警告訊息 (如果有)
        - status: 狀態
        - raw_data: 原始使用量數據

    Raises:
        HTTPException: 當服務未登錄或獲取失敗時
    """
    try:
        logger.info("🔍 API 請求使用量統計")

        # 獲取使用量統計
        usage_stats = shioaji_service.get_usage_stats()

        # 檢查狀態
        if usage_stats.status == "error":
            logger.error(f"❌ 獲取使用量統計失敗: {usage_stats.warning_message}")
            raise HTTPException(
                status_code=503,
                detail=usage_stats.warning_message or "服務暫時無法使用",
            )

        logger.info("✅ API 回傳使用量統計")
        return usage_stats

    except HTTPException:
        # 重新拋出 HTTP 異常
        raise
    except RuntimeError as e:
        logger.error(f"❌ 服務錯誤: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"❌ 未知錯誤: {e}")
        raise HTTPException(status_code=500, detail="內部服務器錯誤")


@router.get("/usage/summary")
def get_usage_summary() -> dict:
    """
    獲取 API 使用量摘要（簡化版本）

    Returns:
        dict: 簡化的使用量摘要
    """
    try:
        logger.info("🔍 API 請求使用量摘要")

        usage_stats = shioaji_service.get_usage_stats()

        # 創建簡化摘要
        summary = {
            "status": usage_stats.status,
            "connections": usage_stats.connections,
            "usage_mb": round(usage_stats.bytes_used or 0, 2),
            "limit_mb": round(usage_stats.bytes_limit or 0, 2),
            "remaining_mb": round(usage_stats.bytes_remaining or 0, 2)
            if usage_stats.bytes_remaining is not None
            else None,
            "usage_percentage": round(usage_stats.usage_rate or 0, 1),
            "warning": usage_stats.warning_message,
            "is_over_limit": usage_stats.is_over_limit,
            "is_near_limit": usage_stats.is_near_limit,
        }

        logger.info("✅ API 回傳使用量摘要")
        return summary

    except Exception as e:
        logger.error(f"❌ 獲取使用量摘要失敗: {e}")
        return {
            "status": "error",
            "error": str(e),
            "connections": None,
            "usage_mb": 0,
            "limit_mb": 0,
            "remaining_mb": None,
            "usage_percentage": 0,
            "warning": f"獲取使用量摘要失敗: {e!s}",
            "is_over_limit": False,
            "is_near_limit": False,
        }
