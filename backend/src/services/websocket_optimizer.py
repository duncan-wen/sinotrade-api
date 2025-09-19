#!/usr/bin/env python3
"""
🚀 WebSocket 連接優化 - 連接池 + 批量推送 + 智能訂閱
"""

import asyncio
import json
import time
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger


@dataclass
class ClientInfo:
    """客戶端信息"""

    client_id: str
    websocket: WebSocket
    subscriptions: set[str]
    last_active: float
    user_id: str | None = None
    device_type: str = "web"

    def to_dict(self) -> dict[str, Any]:
        return {
            "client_id": self.client_id,
            "subscriptions": list(self.subscriptions),
            "last_active": self.last_active,
            "user_id": self.user_id,
            "device_type": self.device_type,
        }


@dataclass
class SubscriptionData:
    """訂閱數據"""

    symbol: str
    data_type: str  # 'tick', 'kline', 'orderbook'
    interval: str | None = None

    def to_key(self) -> str:
        """生成訂閱鍵"""
        if self.interval:
            return f"{self.data_type}:{self.symbol}:{self.interval}"
        return f"{self.data_type}:{self.symbol}"


class WebSocketManager:
    """高性能 WebSocket 管理器"""

    def __init__(self):
        # 客戶端連接池
        self.clients: dict[str, ClientInfo] = {}

        # 訂閱索引：subscription_key -> set of client_ids
        self.subscriptions: dict[str, set[str]] = defaultdict(set)

        # 批量推送緩衝區
        self.message_buffer: dict[str, list[dict]] = defaultdict(list)
        self.last_flush = time.time()

        # 配置參數
        self.config = {
            "batch_size": 50,  # 批量推送大小
            "flush_interval": 0.1,  # 100ms 推送間隔
            "heartbeat_interval": 30,  # 30秒心跳
            "max_subscriptions": 100,  # 每客戶端最大訂閱數
            "inactive_timeout": 300,  # 5分鐘無活動超時
        }

        # 統計信息
        self.stats = {
            "total_connections": 0,
            "active_connections": 0,
            "messages_sent": 0,
            "messages_buffered": 0,
            "subscriptions_total": 0,
            "errors": 0,
        }

        # 啟動後台任務
        asyncio.create_task(self._background_tasks())

    async def connect_client(
        self, websocket: WebSocket, client_id: str, user_id: str | None = None
    ) -> bool:
        """客戶端連接"""
        try:
            await websocket.accept()

            # 創建客戶端信息
            client_info = ClientInfo(
                client_id=client_id,
                websocket=websocket,
                subscriptions=set(),
                last_active=time.time(),
                user_id=user_id,
            )

            self.clients[client_id] = client_info
            self.stats["total_connections"] += 1
            self.stats["active_connections"] = len(self.clients)

            logger.info(f"✅ 客戶端連接: {client_id} (用戶: {user_id})")

            # 發送歡迎消息
            await self.send_to_client(
                client_id,
                {
                    "type": "connection_success",
                    "client_id": client_id,
                    "server_time": datetime.now().isoformat(),
                    "config": {
                        "max_subscriptions": self.config["max_subscriptions"],
                        "heartbeat_interval": self.config["heartbeat_interval"],
                    },
                },
            )

            return True

        except Exception as e:
            logger.error(f"❌ 客戶端連接失敗 {client_id}: {e}")
            self.stats["errors"] += 1
            return False

    async def disconnect_client(self, client_id: str) -> bool:
        """客戶端斷線"""
        try:
            if client_id not in self.clients:
                return False

            client_info = self.clients[client_id]

            # 清理所有訂閱
            for subscription_key in list(client_info.subscriptions):
                await self._unsubscribe_internal(client_id, subscription_key)

            # 移除客戶端
            del self.clients[client_id]
            self.stats["active_connections"] = len(self.clients)

            logger.info(f"👋 客戶端斷線: {client_id}")
            return True

        except Exception as e:
            logger.error(f"❌ 客戶端斷線處理失敗 {client_id}: {e}")
            self.stats["errors"] += 1
            return False

    async def subscribe(self, client_id: str, subscription: SubscriptionData) -> bool:
        """訂閱數據"""
        try:
            if client_id not in self.clients:
                logger.warning(f"⚠️ 客戶端不存在: {client_id}")
                return False

            client_info = self.clients[client_id]

            # 檢查訂閱數量限制
            if len(client_info.subscriptions) >= self.config["max_subscriptions"]:
                await self.send_to_client(
                    client_id,
                    {
                        "type": "error",
                        "message": f"超過最大訂閱數限制: {self.config['max_subscriptions']}",
                    },
                )
                return False

            subscription_key = subscription.to_key()

            # 避免重複訂閱
            if subscription_key in client_info.subscriptions:
                return True

            # 添加訂閱
            client_info.subscriptions.add(subscription_key)
            self.subscriptions[subscription_key].add(client_id)
            self.stats["subscriptions_total"] = sum(
                len(subs) for subs in self.subscriptions.values()
            )

            # 更新活躍時間
            client_info.last_active = time.time()

            logger.debug(f"📈 新增訂閱: {client_id} -> {subscription_key}")

            # 發送訂閱確認
            await self.send_to_client(
                client_id,
                {"type": "subscription_success", "subscription": asdict(subscription)},
            )

            return True

        except Exception as e:
            logger.error(f"❌ 訂閱失敗 {client_id} -> {subscription}: {e}")
            self.stats["errors"] += 1
            return False

    async def unsubscribe(self, client_id: str, subscription: SubscriptionData) -> bool:
        """取消訂閱"""
        subscription_key = subscription.to_key()
        return await self._unsubscribe_internal(client_id, subscription_key)

    async def _unsubscribe_internal(
        self, client_id: str, subscription_key: str
    ) -> bool:
        """內部取消訂閱方法"""
        try:
            if client_id not in self.clients:
                return False

            client_info = self.clients[client_id]

            # 移除訂閱
            client_info.subscriptions.discard(subscription_key)
            self.subscriptions[subscription_key].discard(client_id)

            # 清理空的訂閱組
            if not self.subscriptions[subscription_key]:
                del self.subscriptions[subscription_key]

            self.stats["subscriptions_total"] = sum(
                len(subs) for subs in self.subscriptions.values()
            )

            logger.debug(f"📉 移除訂閱: {client_id} -> {subscription_key}")
            return True

        except Exception as e:
            logger.error(f"❌ 取消訂閱失敗 {client_id} -> {subscription_key}: {e}")
            self.stats["errors"] += 1
            return False

    async def broadcast_to_subscribers(
        self, subscription_key: str, data: dict[str, Any]
    ):
        """向訂閱者廣播數據"""
        subscribers = self.subscriptions.get(subscription_key, set())

        if not subscribers:
            return

        # 添加到批量緩衝區
        message = {
            "type": "data_update",
            "subscription": subscription_key,
            "data": data,
            "timestamp": time.time(),
        }

        for client_id in subscribers:
            self.message_buffer[client_id].append(message)
            self.stats["messages_buffered"] += 1

        # 檢查是否需要立即推送
        if (
            len(self.message_buffer) > self.config["batch_size"]
            or time.time() - self.last_flush > self.config["flush_interval"]
        ):
            await self._flush_messages()

    async def send_to_client(self, client_id: str, message: dict[str, Any]) -> bool:
        """發送消息給特定客戶端"""
        try:
            if client_id not in self.clients:
                return False

            client_info = self.clients[client_id]
            await client_info.websocket.send_text(json.dumps(message, default=str))

            client_info.last_active = time.time()
            self.stats["messages_sent"] += 1

            return True

        except WebSocketDisconnect:
            logger.info(f"🔌 客戶端主動斷線: {client_id}")
            await self.disconnect_client(client_id)
            return False

        except Exception as e:
            logger.error(f"❌ 發送消息失敗 {client_id}: {e}")
            await self.disconnect_client(client_id)
            self.stats["errors"] += 1
            return False

    async def _flush_messages(self):
        """批量推送緩衝的消息"""
        if not self.message_buffer:
            return

        flush_start = time.time()

        # 並行發送消息
        send_tasks = []
        for client_id, messages in self.message_buffer.items():
            if messages:  # 確保有消息需要發送
                # 批量消息包裝
                batch_message = {
                    "type": "batch_update",
                    "messages": messages,
                    "count": len(messages),
                }

                task = self.send_to_client(client_id, batch_message)
                send_tasks.append(task)

        # 等待所有發送完成
        if send_tasks:
            results = await asyncio.gather(*send_tasks, return_exceptions=True)
            success_count = sum(1 for r in results if r is True)

            logger.debug(f"📤 批量推送: {success_count}/{len(send_tasks)} 成功")

        # 清理緩衝區
        self.message_buffer.clear()
        self.last_flush = time.time()

        flush_duration = time.time() - flush_start
        if flush_duration > 0.1:  # 超過100ms
            logger.warning(f"🐌 批量推送緩慢: {flush_duration:.3f}s")

    async def _background_tasks(self):
        """後台任務：心跳、清理、統計"""
        while True:
            try:
                await asyncio.sleep(10)  # 每10秒運行一次

                current_time = time.time()

                # 清理不活躍的連接
                inactive_clients = []
                for client_id, client_info in self.clients.items():
                    if (
                        current_time - client_info.last_active
                        > self.config["inactive_timeout"]
                    ):
                        inactive_clients.append(client_id)

                for client_id in inactive_clients:
                    logger.info(f"🧹 清理不活躍客戶端: {client_id}")
                    await self.disconnect_client(client_id)

                # 推送心跳
                if current_time - self.last_flush > self.config["heartbeat_interval"]:
                    await self._send_heartbeat()

                # 刷新緩衝的消息
                if self.message_buffer:
                    await self._flush_messages()

                # 記錄統計信息
                if len(self.clients) > 0:
                    logger.debug(f"📊 WebSocket 統計: {self.get_stats()}")

            except Exception as e:
                logger.error(f"❌ 後台任務錯誤: {e}")
                self.stats["errors"] += 1

    async def _send_heartbeat(self):
        """發送心跳消息"""
        heartbeat_message = {
            "type": "heartbeat",
            "timestamp": time.time(),
            "server_stats": {
                "active_connections": len(self.clients),
                "total_subscriptions": self.stats["subscriptions_total"],
            },
        }

        # 並行發送心跳
        tasks = [
            self.send_to_client(client_id, heartbeat_message)
            for client_id in self.clients.keys()
        ]

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    def get_stats(self) -> dict[str, Any]:
        """獲取統計信息"""
        return {
            **self.stats,
            "active_subscriptions": len(self.subscriptions),
            "buffered_messages": sum(
                len(msgs) for msgs in self.message_buffer.values()
            ),
            "memory_usage": len(self.clients) + len(self.subscriptions),
            "uptime": time.time() - getattr(self, "_start_time", time.time()),
        }

    def get_client_info(self, client_id: str) -> dict[str, Any] | None:
        """獲取客戶端信息"""
        if client_id in self.clients:
            return self.clients[client_id].to_dict()
        return None


# 全局 WebSocket 管理器
websocket_manager = WebSocketManager()


# 使用示例
async def handle_tick_data(symbol: str, tick_data: dict[str, Any]):
    """處理 Tick 數據並推送給訂閱者"""
    subscription_key = f"tick:{symbol}"
    await websocket_manager.broadcast_to_subscribers(
        subscription_key,
        {
            "symbol": symbol,
            "price": tick_data["price"],
            "volume": tick_data["volume"],
            "timestamp": tick_data["timestamp"],
        },
    )


async def handle_kline_update(symbol: str, interval: str, kline_data: dict[str, Any]):
    """處理 K線更新並推送給訂閱者"""
    subscription_key = f"kline:{symbol}:{interval}"
    await websocket_manager.broadcast_to_subscribers(
        subscription_key,
        {
            "symbol": symbol,
            "interval": interval,
            "kline": kline_data,
            "timestamp": time.time(),
        },
    )
