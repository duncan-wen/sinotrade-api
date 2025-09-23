# src/services/lifecycle_management.py
"""
Shioaji 服務生命週期管理模組
重新組織登錄、登出、清理、銷毀等相關邏輯
"""

import os
from typing import Any

from loguru import logger


class LifecycleManager:
    """Shioaji 服務生命週期管理器"""

    def __init__(self, api: Any, active_subscriptions: set[str], pending_tasks: set):
        self.api = api
        self.active_subscriptions = active_subscriptions
        self.pending_tasks = pending_tasks
        self._is_logged_in = False
        self._is_initialized = False
        self._is_destroyed = False
        self._unsubscribe_callback = None  # 注入的取消訂閱回調

    def set_unsubscribe_callback(self, callback):
        """設置取消訂閱的回調函數"""
        self._unsubscribe_callback = callback

    # ==================== 狀態檢查 ====================

    def is_logged_in(self) -> bool:
        """檢查是否已登錄"""
        return self._is_logged_in and not self._is_destroyed

    def is_destroyed(self) -> bool:
        """檢查是否已銷毀"""
        return self._is_destroyed

    def ensure_logged_in(self) -> bool:
        """確保已登錄,如果未登錄則嘗試登錄"""
        if self._is_destroyed:
            logger.error("服務已銷毀,無法登錄")
            return False

        if self._is_logged_in:
            return True

        return self.login()

    # ==================== 登錄管理 ====================

    def login(self) -> bool:
        """
        登錄 Shioaji 服務

        Returns:
            bool: 登錄是否成功
        """
        if self._is_destroyed:
            logger.error("服務已銷毀,無法登錄")
            return False

        if self._is_logged_in:
            logger.info("✅ 已經登錄,跳過重複登錄")
            return True

        try:
            api_key = os.getenv("SHIOAJI_API_KEY")
            secret_key = os.getenv("SHIOAJI_SECRET_KEY")

            if not api_key or not secret_key:
                raise ValueError("API_KEY and SECRET_KEY must be set in .env file")

            logger.info("🔐 正在登錄 Shioaji...")
            self.api.login(api_key=api_key, secret_key=secret_key)

            self._is_logged_in = True
            self._is_initialized = True

            logger.info("✅ Shioaji 登錄成功")
            return True

        except Exception as e:
            logger.error(f"❌ Shioaji 登錄失敗: {e}")
            self._is_logged_in = False
            self._is_initialized = False
            return False

    # ==================== 登出管理 ====================

    def logout(self, force: bool = False) -> bool:
        """
        登出 Shioaji 服務

        Args:
            force: 是否強制登出（忽略錯誤）

        Returns:
            bool: 登出是否成功
        """
        if self._is_destroyed:
            logger.warning("服務已銷毀,無需登出")
            return True

        if not self._is_logged_in:
            logger.info("服務未登錄,無需登出")
            return True

        if force:
            return self._force_logout()
        else:
            return self._safe_logout()

    def _safe_logout(self) -> bool:
        """安全登出（處理錯誤但不忽略）"""
        try:
            logger.info("🔐 正在安全登出 Shioaji...")

            # 1. 清理訂閱
            self._cleanup_subscriptions()

            # 2. 清理任務
            self._cleanup_tasks()

            # 3. 執行登出
            if self.api:
                self.api.logout()

            # 4. 重置狀態
            self._reset_state()

            logger.info("✅ Shioaji 安全登出成功")
            return True

        except Exception as e:
            logger.error(f"❌ 安全登出失敗: {e}")
            # 安全登出失敗時,強制清理狀態
            self._reset_state()
            return False

    def _force_logout(self) -> bool:
        """強制登出（忽略所有錯誤）"""
        logger.info("🚨 正在強制登出 Shioaji...")

        try:
            # 嘗試調用取消訂閱回調（如果存在）
            if self._unsubscribe_callback and self.active_subscriptions:
                try:
                    logger.debug("🔄 嘗試通過回調批量取消訂閱...")
                    # 這會調用 ShioajiService._batch_unsubscribe_all()
                    subscriptions_copy = list(self.active_subscriptions)
                    for symbol in subscriptions_copy:
                        try:
                            self._unsubscribe_callback(symbol)
                        except Exception as e:
                            logger.warning(f"回調取消訂閱 {symbol} 失敗: {e}")
                except Exception as e:
                    logger.warning(f"回調批量取消訂閱失敗: {e}")

            # 強制清理所有資源,忽略錯誤
            self._force_cleanup_all()

            # 嘗試登出 API
            if self.api:
                try:
                    self.api.logout()
                except Exception as e:
                    logger.warning(f"強制登出時 API 錯誤（已忽略）: {e}")

            # 重置狀態
            self._reset_state()

            logger.info("✅ Shioaji 強制登出完成")
            return True

        except Exception as e:
            logger.error(f"強制登出異常: {e}")
            # 即使強制登出失敗,也要重置狀態
            self._reset_state()
            return True  # 強制登出總是返回成功

    # ==================== 清理管理 ====================

    def cleanup(self) -> bool:
        """
        清理資源但保持服務可用

        Returns:
            bool: 清理是否成功
        """
        if self._is_destroyed:
            logger.warning("服務已銷毀,無需清理")
            return True

        try:
            logger.info("🧹 正在清理 Shioaji 服務資源...")

            # 清理訂閱
            cleanup_success = self._cleanup_subscriptions()

            # 清理任務
            self._cleanup_tasks()

            if cleanup_success:
                logger.info("✅ Shioaji 服務資源清理完成")
            else:
                logger.warning("⚠️ Shioaji 服務資源清理部分失敗")

            return cleanup_success

        except Exception as e:
            logger.error(f"❌ 清理 Shioaji 服務資源失敗: {e}")
            return False

    def destroy(self) -> bool:
        """
        完全銷毀服務

        Returns:
            bool: 銷毀是否成功
        """
        if self._is_destroyed:
            logger.info("服務已銷毀,無需重複銷毀")
            return True

        try:
            logger.info("💥 正在銷毀 Shioaji 服務...")

            # 1. 強制登出
            self.logout(force=True)

            # 2. 標記為已銷毀
            self._is_destroyed = True

            # 3. 清理 API 對象
            try:
                self.api = None
            except Exception as e:
                logger.warning(f"清理 API 對象時出錯: {e}")

            logger.info("✅ Shioaji 服務已完全銷毀")
            return True

        except Exception as e:
            logger.error(f"❌ 銷毀 Shioaji 服務失敗: {e}")
            self._is_destroyed = True  # 即使失敗也標記為已銷毀
            return False

    # ==================== 私有清理方法 ====================

    def _cleanup_subscriptions(self) -> bool:
        """清理所有訂閱"""
        if not self.active_subscriptions:
            logger.debug("無活躍訂閱需要清理")
            return True

        logger.info(f"清理 {len(self.active_subscriptions)} 個活躍訂閱...")

        failed_unsubscribes = []

        for symbol in list(self.active_subscriptions):
            try:
                # 使用注入的取消訂閱回調
                if self._unsubscribe_callback:
                    success = self._unsubscribe_callback(symbol)
                    if not success:
                        failed_unsubscribes.append(symbol)
                    else:
                        logger.debug(f"已清理訂閱: {symbol}")
                else:
                    # 如果沒有回調,直接從集合中移除
                    self.active_subscriptions.discard(symbol)
                    logger.debug(f"已清理訂閱: {symbol}")

            except Exception as e:
                failed_unsubscribes.append(symbol)
                logger.error(f"清理訂閱失敗 {symbol}: {e}")

        if failed_unsubscribes:
            logger.warning(f"以下訂閱清理失敗: {failed_unsubscribes}")
            return False
        else:
            logger.info("✅ 所有訂閱已成功清理")
            return True

    def _cleanup_tasks(self) -> None:
        """清理所有待處理任務"""
        if not self.pending_tasks:
            logger.debug("無待處理任務需要清理")
            return

        task_count = len(self.pending_tasks)
        logger.info(f"清理 {task_count} 個待處理任務...")

        for task in list(self.pending_tasks):
            try:
                if not task.done():
                    task.cancel()
                    logger.debug(f"已取消任務: {task}")
            except Exception as e:
                logger.warning(f"取消任務失敗: {e}")

        self.pending_tasks.clear()
        logger.info(f"✅ 已清理 {task_count} 個任務")

    def _force_cleanup_all(self) -> None:
        """強制清理所有資源（忽略錯誤）"""
        try:
            self.active_subscriptions.clear()
            logger.debug("強制清理：已清空訂閱集合")
        except Exception as e:
            logger.warning(f"強制清理訂閱時出錯: {e}")

        try:
            for task in list(self.pending_tasks):
                if not task.done():
                    task.cancel()
            self.pending_tasks.clear()
            logger.debug("強制清理：已清空任務集合")
        except Exception as e:
            logger.warning(f"強制清理任務時出錯: {e}")

    def _reset_state(self) -> None:
        """重置內部狀態"""
        self._is_logged_in = False
        self._is_initialized = False
        # 注意：不重置 _is_destroyed,因為銷毀是不可逆的
