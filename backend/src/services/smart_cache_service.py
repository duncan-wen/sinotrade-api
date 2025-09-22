#!/usr/bin/env python3
"""
🚀 智能緩存服務 - 多層緩存 + 批量處理 + 性能優化
"""

import asyncio
import json
import time
from datetime import datetime
from functools import wraps
from typing import Any

import aioredis
from cachetools import TTLCache
from loguru import logger


class SmartCacheService:
    """多層智能緩存系統"""

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        # L1: 本地記憶體緩存 (最快)
        self.memory_cache = TTLCache(maxsize=1000, ttl=60)

        # L2: Redis 分佈式緩存 (中等速度)
        self.redis = None
        self.redis_url = redis_url

        # 緩存策略配置
        self.cache_strategies = {
            "realtime_tick": {"ttl": 1, "local": True},
            "kline_1m": {"ttl": 30, "local": True},
            "kline_5m": {"ttl": 60, "local": True},
            "kline_15m": {"ttl": 180, "local": True},
            "kline_1h": {"ttl": 300, "local": True},
            "kline_1d": {"ttl": 3600, "local": False},
            "contract_info": {"ttl": 86400, "local": False},
            "historical_data": {"ttl": 1800, "local": False},
            "technical_indicators": {"ttl": 60, "local": True},
        }

        # 性能統計
        self.stats = {
            "hits": {"memory": 0, "redis": 0, "miss": 0},
            "operations": {"get": 0, "set": 0, "delete": 0},
            "timing": {"avg_get": 0, "avg_set": 0},
        }

    async def initialize(self):
        """初始化 Redis 連接"""
        try:
            self.redis = await aioredis.from_url(self.redis_url)
            await self.redis.ping()
            logger.info("✅ Redis 連接成功")
        except Exception as e:
            logger.error(f"❌ Redis 連接失敗: {e}")
            self.redis = None

    def _get_cache_key(self, cache_type: str, **kwargs) -> str:
        """生成緩存鍵"""
        key_parts = [cache_type]
        for k, v in sorted(kwargs.items()):
            key_parts.append(f"{k}:{v}")
        return ":".join(key_parts)

    async def get(self, cache_type: str, **kwargs) -> Any | None:
        """智能獲取緩存數據"""
        start_time = time.time()
        self.stats["operations"]["get"] += 1

        cache_key = self._get_cache_key(cache_type, **kwargs)
        strategy = self.cache_strategies.get(cache_type, {"ttl": 300, "local": True})

        try:
            # L1: 記憶體緩存
            if strategy["local"] and cache_key in self.memory_cache:
                self.stats["hits"]["memory"] += 1
                data = self.memory_cache[cache_key]
                logger.debug(f"📈 Memory Hit: {cache_key}")
                return data

            # L2: Redis 緩存
            if self.redis:
                redis_data = await self.redis.get(f"cache:{cache_key}")
                if redis_data:
                    self.stats["hits"]["redis"] += 1
                    data = json.loads(redis_data)

                    # 回填到記憶體緩存
                    if strategy["local"]:
                        self.memory_cache[cache_key] = data

                    logger.debug(f"📊 Redis Hit: {cache_key}")
                    return data

            # Cache Miss
            self.stats["hits"]["miss"] += 1
            logger.debug(f"❌ Cache Miss: {cache_key}")
            return None

        except Exception as e:
            logger.error(f"緩存獲取錯誤 {cache_key}: {e}")
            return None
        finally:
            # 更新性能統計
            duration = time.time() - start_time
            self._update_timing_stats("get", duration)

    async def set(self, cache_type: str, data: Any, **kwargs) -> bool:
        """智能設置緩存數據"""
        start_time = time.time()
        self.stats["operations"]["set"] += 1

        cache_key = self._get_cache_key(cache_type, **kwargs)
        strategy = self.cache_strategies.get(cache_type, {"ttl": 300, "local": True})

        try:
            # L1: 記憶體緩存
            if strategy["local"]:
                self.memory_cache[cache_key] = data

            # L2: Redis 緩存
            if self.redis:
                serialized_data = json.dumps(data, default=str)
                await self.redis.setex(
                    f"cache:{cache_key}", strategy["ttl"], serialized_data
                )

            logger.debug(f"✅ Cache Set: {cache_key} (TTL: {strategy['ttl']}s)")
            return True

        except Exception as e:
            logger.error(f"緩存設置錯誤 {cache_key}: {e}")
            return False
        finally:
            duration = time.time() - start_time
            self._update_timing_stats("set", duration)

    async def delete(self, cache_type: str, **kwargs) -> bool:
        """刪除緩存"""
        self.stats["operations"]["delete"] += 1
        cache_key = self._get_cache_key(cache_type, **kwargs)

        try:
            # 從記憶體緩存刪除
            self.memory_cache.pop(cache_key, None)

            # 從 Redis 刪除
            if self.redis:
                await self.redis.delete(f"cache:{cache_key}")

            logger.debug(f"🗑️ Cache Deleted: {cache_key}")
            return True
        except Exception as e:
            logger.error(f"緩存刪除錯誤 {cache_key}: {e}")
            return False

    async def invalidate_pattern(self, pattern: str) -> int:
        """批量失效緩存(使用模式匹配)"""
        if not self.redis:
            return 0

        try:
            keys = await self.redis.keys(f"cache:{pattern}")
            if keys:
                deleted = await self.redis.delete(*keys)
                logger.info(f"🗑️ 批量失效緩存: {pattern} ({deleted} 個)")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"批量失效緩存錯誤 {pattern}: {e}")
            return 0

    def _update_timing_stats(self, operation: str, duration: float):
        """更新性能統計"""
        current_avg = self.stats["timing"][f"avg_{operation}"]
        total_ops = self.stats["operations"][operation]

        # 計算新的平均值
        new_avg = ((current_avg * (total_ops - 1)) + duration) / total_ops
        self.stats["timing"][f"avg_{operation}"] = new_avg

    def get_stats(self) -> dict[str, Any]:
        """獲取緩存統計信息"""
        total_hits = sum(self.stats["hits"].values())
        hit_rate = (
            0
            if total_hits == 0
            else (
                (self.stats["hits"]["memory"] + self.stats["hits"]["redis"])
                / total_hits
                * 100
            )
        )

        return {
            **self.stats,
            "hit_rate": f"{hit_rate:.2f}%",
            "memory_cache_size": len(self.memory_cache),
            "timestamp": datetime.now().isoformat(),
        }


class BatchProcessor:
    """批量處理器 - 減少數據庫/API 調用"""

    def __init__(self, batch_size: int = 100, flush_interval: float = 1.0):
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.pending_operations = []
        self.last_flush = time.time()
        self._flush_lock = asyncio.Lock()

    async def add_operation(self, operation_type: str, data: Any):
        """添加操作到批次隊列"""
        self.pending_operations.append(
            {"type": operation_type, "data": data, "timestamp": time.time()}
        )

        # 檢查是否需要刷新
        if (
            len(self.pending_operations) >= self.batch_size
            or time.time() - self.last_flush > self.flush_interval
        ):
            await self.flush()

    async def flush(self):
        """刷新批次操作"""
        async with self._flush_lock:
            if not self.pending_operations:
                return

            operations = self.pending_operations[:]
            self.pending_operations.clear()
            self.last_flush = time.time()

            # 按類型分組處理
            grouped = {}
            for op in operations:
                op_type = op["type"]
                if op_type not in grouped:
                    grouped[op_type] = []
                grouped[op_type].append(op["data"])

            # 批量處理
            for op_type, data_list in grouped.items():
                try:
                    await self._process_batch(op_type, data_list)
                    logger.debug(f"✅ 批量處理 {op_type}: {len(data_list)} 項")
                except Exception as e:
                    logger.error(f"❌ 批量處理失敗 {op_type}: {e}")

    async def _process_batch(self, operation_type: str, data_list: list[Any]):
        """處理特定類型的批次操作"""
        if operation_type == "tick_aggregation":
            await self._process_tick_batch(data_list)
        elif operation_type == "indicator_calculation":
            await self._process_indicator_batch(data_list)
        # 添加更多批處理類型...

    async def _process_tick_batch(self, tick_list: list[Any]):
        """批量處理 Tick 數據聚合"""
        # 按商品分組
        symbol_groups = {}
        for tick in tick_list:
            symbol = tick["symbol"]
            if symbol not in symbol_groups:
                symbol_groups[symbol] = []
            symbol_groups[symbol].append(tick)

        # 並行處理每個商品
        tasks = []
        for symbol, ticks in symbol_groups.items():
            tasks.append(self._aggregate_ticks_for_symbol(symbol, ticks))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def _aggregate_ticks_for_symbol(self, symbol: str, ticks: list[Any]):
        """為單個商品聚合 Tick 數據"""
        # 實現 Tick 到 K線的聚合邏輯
        pass


def performance_monitor(operation_name: str):
    """性能監控裝飾器"""

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            start_memory = get_memory_usage()

            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                memory_delta = get_memory_usage() - start_memory

                # 記錄性能指標
                logger.info(
                    f"📊 {operation_name}: {duration:.3f}s, {memory_delta:+.1f}MB"
                )

                # 如果性能異常,記錄警告
                if duration > 1.0:  # 超過1秒
                    logger.warning(f"🐌 {operation_name} 性能異常: {duration:.3f}s")

                return result

            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"❌ {operation_name} 失敗: {e} (耗時: {duration:.3f}s)")
                raise

        return wrapper

    return decorator


def get_memory_usage() -> float:
    """獲取當前記憶體使用量 (MB)"""
    try:
        import psutil

        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024
    except ImportError:
        return 0.0


# 全局緩存實例
smart_cache = SmartCacheService()
batch_processor = BatchProcessor()


# 使用示例
@performance_monitor("獲取K線數據")
async def get_klines_cached(symbol: str, interval: str, limit: int = 100):
    """帶緩存的K線數據獲取"""

    # 嘗試從緩存獲取
    cached_data = await smart_cache.get(f"kline_{interval}", symbol=symbol, limit=limit)

    if cached_data:
        return cached_data

    # 緩存未命中,計算數據
    klines_data = await calculate_klines(symbol, interval, limit)

    # 存入緩存
    await smart_cache.set(f"kline_{interval}", klines_data, symbol=symbol, limit=limit)

    return klines_data


async def calculate_klines(symbol: str, interval: str, limit: int):
    """實際的K線計算邏輯"""
    # 這裡實現具體的K線計算
    pass
