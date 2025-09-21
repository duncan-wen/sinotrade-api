# src/services/subscription_manager.py

from typing import Any

from loguru import logger


class GlobalSubscriptionManager:
    """全域訂閱管理器 - 確保同一商品只訂閱一次"""

    def __init__(self) -> None:
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
