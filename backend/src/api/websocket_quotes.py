# src/api/websocket_quotes.py

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger

from src.models.domain import Quote
from src.services.shioaji_service import shioaji_service


class WebSocketManager:
    """WebSocket 連接管理器"""

    def __init__(self):
        # 儲存所有活動的 WebSocket 連接
        self.active_connections: Dict[str, WebSocket] = {}
        # 每個連接訂閱的股票
        self.subscriptions: Dict[str, Set[str]] = {}
        # 每個股票的訂閱者
        self.symbol_subscribers: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        """接受新的 WebSocket 連接"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.subscriptions[client_id] = set()
        logger.info(f"客戶端 {client_id} 已連接")

    def disconnect(self, client_id: str):
        """斷開 WebSocket 連接"""
        if client_id in self.active_connections:
            # 清理訂閱
            if client_id in self.subscriptions:
                for symbol in self.subscriptions[client_id]:
                    if symbol in self.symbol_subscribers:
                        self.symbol_subscribers[symbol].discard(client_id)
                        # 如果沒有人訂閱了,停止訂閱該股票
                        if not self.symbol_subscribers[symbol]:
                            self._unsubscribe_from_shioaji(symbol)

            # 清理連接
            del self.active_connections[client_id]
            if client_id in self.subscriptions:
                del self.subscriptions[client_id]

            logger.info(f"客戶端 {client_id} 已斷開")

    async def subscribe_symbol(self, client_id: str, symbol: str):
        """訂閱股票"""
        if client_id not in self.subscriptions:
            return False

        self.subscriptions[client_id].add(symbol)

        if symbol not in self.symbol_subscribers:
            self.symbol_subscribers[symbol] = set()
            # 第一個訂閱者,開始訂閱 Shioaji
            self._subscribe_to_shioaji(symbol)

        self.symbol_subscribers[symbol].add(client_id)
        logger.info(f"客戶端 {client_id} 訂閱了 {symbol}")
        return True

    async def unsubscribe_symbol(self, client_id: str, symbol: str):
        """取消訂閱股票"""
        if client_id in self.subscriptions:
            self.subscriptions[client_id].discard(symbol)

        if symbol in self.symbol_subscribers:
            self.symbol_subscribers[symbol].discard(client_id)
            # 如果沒有人訂閱了,停止訂閱該股票
            if not self.symbol_subscribers[symbol]:
                self._unsubscribe_from_shioaji(symbol)

        logger.info(f"客戶端 {client_id} 取消訂閱 {symbol}")

    def _subscribe_to_shioaji(self, symbol: str):
        """向 Shioaji 訂閱股票"""
        try:
            success = shioaji_service.subscribe_quote(symbol)
            if success:
                logger.info(f"開始從 Shioaji 訂閱 {symbol}")
            else:
                logger.error(f"訂閱 {symbol} 失敗")
        except Exception as e:
            logger.error(f"訂閱 {symbol} 時發生錯誤: {e}")

    def _unsubscribe_from_shioaji(self, symbol: str):
        """取消 Shioaji 訂閱"""
        # 這裡可以實作取消訂閱的邏輯
        logger.info(f"停止訂閱 {symbol}")

    async def broadcast_tick(self, quote: Quote):
        """廣播 Tick 資料給訂閱的客戶端（用於 K 線圖）"""
        if quote.symbol not in self.symbol_subscribers:
            return

        message = {
            "type": "tick",
            "data": {
                "symbol": quote.symbol,
                "timestamp": quote.timestamp.isoformat(),
                "price": float(quote.close),  # 成交價
                "volume": quote.volume,  # 成交量
                "amount": float(quote.close) * quote.volume * 1000,  # 成交金額
                "total_volume": getattr(quote, "total_volume", 0),  # 累計成交量
            },
        }

        # 發送給所有訂閱該股票的客戶端
        disconnected_clients = []
        for client_id in self.symbol_subscribers[quote.symbol]:
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_text(
                        json.dumps(message)
                    )
                except Exception as e:
                    logger.error(f"發送消息給客戶端 {client_id} 失敗: {e}")
                    disconnected_clients.append(client_id)

        # 清理斷開的連接
        for client_id in disconnected_clients:
            self.disconnect(client_id)

    async def send_kline_update(self, symbol: str, kline_data: dict):
        """發送 K 線更新"""
        if symbol not in self.symbol_subscribers:
            return

        message = {
            "type": "kline",
            "data": {
                "symbol": symbol,
                "timestamp": kline_data["timestamp"],
                "open": kline_data["open"],
                "high": kline_data["high"],
                "low": kline_data["low"],
                "close": kline_data["close"],
                "volume": kline_data["volume"],
            },
        }

        # 發送給所有訂閱該股票的客戶端
        for client_id in self.symbol_subscribers[symbol]:
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_text(
                        json.dumps(message)
                    )
                except Exception as e:
                    logger.error(f"發送 K 線更新失敗: {e}")


# 全局 WebSocket 管理器
ws_manager = WebSocketManager()


# K 線聚合器
class KlineAggregator:
    """將 Tick 資料聚合成 K 線"""

    def __init__(self):
        self.current_klines = {}  # symbol -> current kline

    def get_minute_timestamp(self, timestamp: datetime) -> datetime:
        """獲取分鐘時間戳（去除秒和毫秒）"""
        return timestamp.replace(second=0, microsecond=0)

    async def process_tick(self, quote: Quote):
        """處理 Tick 資料並更新 K 線"""
        symbol = quote.symbol
        minute_timestamp = self.get_minute_timestamp(quote.timestamp)

        if symbol not in self.current_klines:
            self.current_klines[symbol] = {}

        # 檢查是否是新的分鐘 K 線
        if minute_timestamp not in self.current_klines[symbol]:
            # 新的 K 線
            new_kline = {
                "symbol": symbol,
                "timestamp": minute_timestamp.isoformat(),
                "open": float(quote.close),
                "high": float(quote.close),
                "low": float(quote.close),
                "close": float(quote.close),
                "volume": quote.volume,
            }
            self.current_klines[symbol][minute_timestamp] = new_kline

            # 廣播新的 K 線
            await ws_manager.send_kline_update(symbol, new_kline)
        else:
            # 更新現有 K 線
            kline = self.current_klines[symbol][minute_timestamp]
            kline["high"] = max(kline["high"], float(quote.close))
            kline["low"] = min(kline["low"], float(quote.close))
            kline["close"] = float(quote.close)
            kline["volume"] += quote.volume

            # 廣播更新的 K 線
            await ws_manager.send_kline_update(symbol, kline)


# 全局 K 線聚合器
kline_aggregator = KlineAggregator()


# 設定 Shioaji 的 tick callback 來處理數據
async def tick_broadcast_callback(quote: Quote):
    """接收到新的 Tick 時處理並廣播"""
    # 廣播原始 Tick 資料
    await ws_manager.broadcast_tick(quote)
    # 處理 K 線聚合
    await kline_aggregator.process_tick(quote)


# 註冊到 Shioaji service
# 注意:這需要在 ShioajiService 中添加 callback 註冊功能


router = APIRouter()


@router.websocket("/ws/quotes/{client_id}")
async def websocket_quotes_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket 端點用於即時報價"""
    await ws_manager.connect(websocket, client_id)

    try:
        while True:
            # 接收客戶端消息
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "subscribe":
                symbol = message["symbol"]
                await ws_manager.subscribe_symbol(client_id, symbol)
                # 發送確認消息
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "subscription_confirmed",
                            "symbol": symbol,
                            "status": "success",
                        }
                    )
                )

            elif message["type"] == "unsubscribe":
                symbol = message["symbol"]
                await ws_manager.unsubscribe_symbol(client_id, symbol)
                # 發送確認消息
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "unsubscription_confirmed",
                            "symbol": symbol,
                            "status": "success",
                        }
                    )
                )

    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket 錯誤: {e}")
        ws_manager.disconnect(client_id)


@router.websocket("/ws/klines/{client_id}")
async def websocket_klines_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket 端點用於即時 K 線"""
    await ws_manager.connect(websocket, f"kline_{client_id}")

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "subscribe_kline":
                symbol = message["symbol"]
                interval = message.get("interval", "1m")  # 默認 1 分鐘

                await ws_manager.subscribe_symbol(f"kline_{client_id}", symbol)

                # 發送歷史 K 線數據
                historical_klines = await get_historical_klines(symbol, interval, 100)
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "historical_klines",
                            "symbol": symbol,
                            "data": historical_klines,
                        }
                    )
                )

    except WebSocketDisconnect:
        ws_manager.disconnect(f"kline_{client_id}")
    except Exception as e:
        logger.error(f"K 線 WebSocket 錯誤: {e}")
        ws_manager.disconnect(f"kline_{client_id}")


async def get_historical_klines(symbol: str, interval: str, limit: int) -> List[dict]:
    """獲取歷史 K 線資料"""
    try:
        historical_data = shioaji_service.get_historical_klines(symbol, interval, limit)
        logger.info(f"Retrieved {len(historical_data)} historical klines for {symbol}")
        return historical_data
    except Exception as e:
        logger.error(f"Failed to get historical klines: {e}")
        return []
