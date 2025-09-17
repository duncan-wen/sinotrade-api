# 簡單的 Socket.IO 廣播處理器
import asyncio
import queue
import threading

from loguru import logger


class SimpleSocketIOBroadcaster:
    """簡單的 Socket.IO 廣播器,使用隊列避免事件循環問題"""

    def __init__(self, socket_manager):
        self.socket_manager = socket_manager
        self.queue = queue.Queue()
        self.worker_thread = None
        self.stop_event = threading.Event()

    def start(self):
        """啟動背景工作線程"""
        if self.worker_thread is None or not self.worker_thread.is_alive():
            self.worker_thread = threading.Thread(target=self._worker, daemon=True)
            self.worker_thread.start()
            logger.info("🚀 Socket.IO 廣播器啟動")

    def stop(self):
        """停止背景工作線程"""
        self.stop_event.set()
        if self.worker_thread and self.worker_thread.is_alive():
            self.worker_thread.join(timeout=5)
            logger.info("🛑 Socket.IO 廣播器停止")

    def broadcast(self, event, data):
        """添加廣播任務到隊列"""
        try:
            self.queue.put((event, data), timeout=1)
            logger.debug(f"📤 Socket.IO 廣播任務已添加: {event}")
        except queue.Full:
            logger.warning(f"⚠️ Socket.IO 廣播隊列已滿,丟棄消息: {event}")

    def _worker(self):
        """背景工作線程,處理廣播隊列"""
        logger.info("🔄 Socket.IO 廣播工作線程啟動")

        while not self.stop_event.is_set():
            try:
                # 從隊列獲取任務,超時1秒
                event, data = self.queue.get(timeout=1)

                # 在新的事件循環中執行廣播
                asyncio.run(self._async_broadcast(event, data))

                self.queue.task_done()

            except queue.Empty:
                continue  # 超時,繼續檢查停止信號
            except Exception as e:
                logger.error(f"❌ Socket.IO 廣播失敗: {e}")

        logger.info("🏁 Socket.IO 廣播工作線程結束")

    async def _async_broadcast(self, event, data):
        """異步廣播方法"""
        try:
            await self.socket_manager.emit(event, data)
            logger.debug(f"✅ Socket.IO 廣播成功: {event}")
        except Exception as e:
            logger.error(f"❌ Socket.IO emit 失敗: {e}")


# 全局實例將在 main.py 中初始化
broadcaster = None
