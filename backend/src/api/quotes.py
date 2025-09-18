# src/api/quotes.py

from datetime import datetime
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, Query
from loguru import logger

from src.models.domain import APIUser, Quote
from src.models.technical_indicators import ChartDataResponse
from src.services.auth_service import get_current_user
from src.services.cache_service import get_cached_quote
from src.services.polars_technical_analysis_service import (
    polars_technical_analysis_service,
)
from src.services.shioaji_service import shioaji_service
from src.services.technical_analysis_service import technical_analysis_service

router = APIRouter()


def _extract_klines_data(result: Any) -> list[dict[str, Any]]:
    """
    統一處理 get_historical_klines 回傳結果,提取 K線數據

    Args:
        result: get_historical_klines 的回傳值

    Returns:
        K線數據列表
    """
    if isinstance(result, dict):
        return result.get("data", [])
    elif isinstance(result, list):
        return result
    else:
        return []


@router.get("/quote/{symbol}", response_model=Quote)
def get_quote(symbol: str, user: APIUser = Depends(get_current_user)) -> Quote:
    """
    Fetches a real-time quote for a given financial instrument symbol.
    It first checks the cache, and if not found, subscribes to the quote stream.
    """
    cached_quote = get_cached_quote(symbol)
    if cached_quote:
        return cached_quote

    # If not in cache, subscribe to the quote.
    # The actual quote will be put into the cache by the service's callback.
    def quote_callback(quote_data: Any) -> None:
        pass

    shioaji_service.subscribe_quote(symbol, quote_callback)

    # Returning a dummy quote for now, as the real data is handled by a callback.
    # A better approach would be to wait for the first tick, but that would
    # block the request. WebSockets are the best solution for this.
    dummy_quote = Quote(
        symbol=symbol,
        timestamp=datetime.fromisoformat("2025-09-10T12:00:00+00:00"),
        open=0,
        close=0,
        bid_price=0,
        ask_price=0,
        bid_volume=0,
        ask_volume=0,
        volume=0,
        avg_price=0,
    )
    return dummy_quote


@router.get("/klines/{symbol}")
def get_historical_klines(
    symbol: str,
    interval: str = Query(
        default="1d", description="K線間隔 (1m, 5m, 15m, 1h, 1d, 1w, 1M)"
    ),
    limit: int = Query(default=100, description="返回的K線數量", ge=1, le=1000),
    ma_periods: str = Query(
        default="", description="均線週期,逗號分隔 (如: '5,20,60')"
    ),
    include_indicators: bool = Query(
        default=False, description="是否包含基本技術指標 (MA, RSI)"
    ),
    # user: APIUser = Depends(get_current_user),
) -> dict[str, Any]:
    """
    獲取歷史 K 線資料

    - **symbol**: 股票代號 (如: 2330, TSE2330, TXF, TXO等)
    - **interval**: K線間隔 (1m=1分鐘, 5m=5分鐘, 15m=15分鐘, 1h=1小時, 1d=1日, 1w=周線, 1M=月線)
    - **limit**: 返回的K線數量 (1-1000根)
    - **ma_periods**: 均線週期 (如: '5,20,60' 會自動獲取額外數據供均線計算)
    """
    try:
        # 解析均線週期參數
        ma_periods_list = None
        if ma_periods.strip():
            try:
                ma_periods_list = [
                    int(p.strip()) for p in ma_periods.split(",") if p.strip()
                ]
            except ValueError:
                return {
                    "error": "Invalid ma_periods format. Use comma-separated integers like '5,20,60'",
                    "symbol": symbol,
                    "data": [],
                    "count": 0,
                }

        result = shioaji_service.get_historical_klines(
            symbol, interval, limit, ma_periods_list
        )

        # 統一處理回傳格式
        if isinstance(result, dict):
            klines = result.get("data", [])
            contract_info = result.get("contract", {"symbol": symbol, "name": symbol})
        else:
            klines = result if isinstance(result, list) else []
            contract_info = {"symbol": symbol, "name": symbol}

        # 可選的技術指標計算
        if include_indicators and klines:
            logger.info("Including basic technical indicators in klines response")

            # 基本指標配置
            basic_indicators_config: dict[str, Any] = {
                "ma": {"periods": ma_periods_list or [5, 20, 60]},
                "rsi": {"periods": [14]},
            }

            # 使用高效能 Polars 計算
            technical_data = polars_technical_analysis_service.calculate_all_indicators(
                klines, basic_indicators_config
            )

            return {
                "symbol": symbol,
                "interval": interval,
                "data": [indicator.dict() for indicator in technical_data],
                "count": len(technical_data),
                "source": _get_data_source(interval),
                "indicators_included": True,
                "indicators_config": basic_indicators_config,
            }

        return {
            "symbol": symbol,
            "interval": interval,
            "data": klines,
            "count": len(klines),
            "source": _get_data_source(interval),
            "indicators_included": False,
            "contract": contract_info,
        }
    except Exception as e:
        return {"error": str(e), "symbol": symbol, "data": [], "count": 0}


@router.get("/chart/{symbol}", response_model=ChartDataResponse)
def get_chart_data_with_indicators(
    symbol: str,
    interval: str = Query(
        default="1d", description="K線間隔 (1m, 5m, 15m, 1h, 1d, 1w, 1M)"
    ),
    limit: int = Query(default=100, description="返回的K線數量", ge=1, le=1000),
    indicators: str = Query(
        default="ma,kd,macd,bbands,rsi",
        description="技術指標,逗號分隔 (ma,kd,macd,bbands,rsi)",
    ),
    ma_periods: str = Query(default="5,10,20,60", description="均線週期,逗號分隔"),
    use_polars: bool = Query(
        default=True, description="使用 Polars + polars_talib 高效能計算"
    ),
    user: APIUser = Depends(get_current_user),
) -> ChartDataResponse:
    """
    獲取完整的圖表數據(K線 + 技術指標)

    - **symbol**: 股票代號 (如: 2330, TSE2330)
    - **interval**: K線間隔
    - **limit**: 返回的K線數量
    - **indicators**: 要計算的技術指標 (ma,kd,macd,bbands,rsi)
    - **ma_periods**: 均線週期設定
    """
    try:
        # 解析指標參數
        indicators_list = [ind.strip() for ind in indicators.split(",") if ind.strip()]
        ma_periods_list = [int(p.strip()) for p in ma_periods.split(",") if p.strip()]

        # 構建指標配置
        indicators_config: dict[str, Any] = {}

        if "ma" in indicators_list:
            indicators_config["ma"] = {"periods": ma_periods_list}

        if "kd" in indicators_list:
            indicators_config["kd"] = {"k_period": 9, "d_period": 3, "rsv_period": 9}

        if "macd" in indicators_list:
            indicators_config["macd"] = {"fast": 12, "slow": 26, "signal": 9}

        if "bbands" in indicators_list:
            indicators_config["bbands"] = {"period": 20, "std_multiplier": 2.0}

        if "rsi" in indicators_list:
            indicators_config["rsi"] = {"periods": [6, 12, 24]}

        # 計算需要的額外數據量(考慮技術指標需求)
        max_period = 0
        if "ma" in indicators_config:
            max_period = max(max_period, max(ma_periods_list))
        if "kd" in indicators_config:
            max_period = max(max_period, 9)  # KD需要9期
        if "macd" in indicators_config:
            max_period = max(max_period, 26)  # MACD需要26期
        if "bbands" in indicators_config:
            max_period = max(max_period, 20)  # 布林通道需要20期
        if "rsi" in indicators_config:
            max_period = max(max_period, 24)  # RSI最大需要24期

        # 獲取原始K線數據(包含額外數據供指標計算)
        extended_limit = limit + max_period if max_period > 0 else limit
        klines_result = shioaji_service.get_historical_klines(
            symbol, interval, extended_limit
        )
        klines = _extract_klines_data(klines_result)

        if not klines:
            return ChartDataResponse(
                symbol=symbol,
                interval=interval,
                data=[],
                count=0,
                indicators_config=indicators_config,
                source="no_data",
            )

        # 計算技術指標 - 選擇計算引擎
        if use_polars:
            logger.info("Using Polars + polars_talib for high-performance calculation")
            technical_data = polars_technical_analysis_service.calculate_all_indicators(
                klines, indicators_config
            )
        else:
            logger.info("Using pandas for technical analysis calculation")
            technical_data = technical_analysis_service.calculate_all_indicators(
                klines, indicators_config
            )

        # 只返回最後 limit 筆數據供顯示
        display_data = (
            technical_data[-limit:] if len(technical_data) > limit else technical_data
        )

        return ChartDataResponse(
            symbol=symbol,
            interval=interval,
            data=display_data,
            count=len(display_data),
            indicators_config=indicators_config,
            source=_get_data_source(interval),
        )

    except Exception:
        return ChartDataResponse(
            symbol=symbol,
            interval=interval,
            data=[],
            count=0,
            indicators_config={},
            source="error",
        )


@router.get("/debug/kbar-raw/{symbol}")
def debug_kbar_raw_data(symbol: str):
    """調試端點:檢查 Shioaji KBar API 原始數據"""
    try:
        from datetime import datetime, timedelta

        # 獲取合約
        contract = shioaji_service._get_contract(symbol)
        if not contract:
            return {"error": f"找不到合約 {symbol}"}

        # 獲取當天數據
        end_date = datetime.now()
        start_date = end_date - timedelta(days=1)

        logger.info(f"🔍 調試 KBar API 原始數據: {symbol}")
        logger.info(
            f"   時間範圍: {start_date.strftime('%Y-%m-%d')} ~ {end_date.strftime('%Y-%m-%d')}"
        )

        # 直接調用 Shioaji KBar API
        kbars = shioaji_service.api.kbars(
            contract=contract,
            start=start_date.strftime("%Y-%m-%d"),
            end=end_date.strftime("%Y-%m-%d"),
        )

        if not kbars or len(kbars.ts) == 0:
            return {"error": "沒有數據"}

        # 轉換為易讀格式
        raw_data = []
        for i in range(len(kbars.ts)):
            ts = pd.to_datetime(kbars.ts[i], unit="ns")
            raw_data.append(
                {
                    "time": ts.strftime("%Y-%m-%d %H:%M:%S"),
                    "open": float(kbars.Open[i]),
                    "high": float(kbars.High[i]),
                    "low": float(kbars.Low[i]),
                    "close": float(kbars.Close[i]),
                    "volume": int(kbars.Volume[i]),
                }
            )

        # 分析數據
        total_count = len(raw_data)
        zero_volume_count = sum(1 for d in raw_data if d["volume"] == 0)
        time_intervals = []

        if total_count >= 2:
            for i in range(1, min(20, total_count)):
                prev_time = pd.to_datetime(raw_data[i - 1]["time"])
                curr_time = pd.to_datetime(raw_data[i]["time"])
                diff_minutes = (curr_time - prev_time).total_seconds() / 60
                time_intervals.append(diff_minutes)

        # 檢查特定時間段
        target_times = []
        for item in raw_data:
            time_part = item["time"].split(" ")[1][:5]  # 取 HH:MM
            if time_part in ["12:20", "12:21", "12:22", "12:23", "12:24", "12:25"]:
                target_times.append(
                    {
                        "time": time_part,
                        "volume": item["volume"],
                        "close": item["close"],
                    }
                )

        return {
            "symbol": symbol,
            "analysis": {
                "total_count": total_count,
                "zero_volume_count": zero_volume_count,
                "time_intervals": time_intervals[:10],
                "avg_interval_minutes": sum(time_intervals) / len(time_intervals)
                if time_intervals
                else 0,
            },
            "target_period_12_20_25": target_times,
            "last_10_records": raw_data[-10:],
            "raw_data_sample": raw_data[:10],
        }

    except Exception as e:
        logger.error(f"調試 KBar 原始數據失敗: {e}")
        return {"error": str(e)}


@router.get("/chart/multi")
def get_multi_symbol_chart_data(
    symbols: str = Query(description="商品代號,逗號分隔 (如: '2330,2317,2454')"),
    interval: str = Query(
        default="1d", description="K線間隔 (1m, 5m, 15m, 1h, 1d, 1w, 1M)"
    ),
    limit: int = Query(default=60, description="每個商品返回的K線數量", ge=1, le=500),
    indicators: str = Query(
        default="ma,kd,macd,bbands",
        description="技術指標,逗號分隔 (ma,kd,macd,bbands) - 多商品模式支援較少指標",
    ),
    ma_periods: str = Query(default="5,20,60", description="均線週期,逗號分隔"),
    user: APIUser = Depends(get_current_user),
) -> dict[str, Any]:
    """
    🚀 多商品並行技術指標計算 (使用 Polars 高效能引擎)

    - **symbols**: 商品代號列表,逗號分隔
    - **interval**: K線間隔
    - **limit**: 每個商品的K線數量
    - **indicators**: 技術指標 (多商品模式優化版)
    - **ma_periods**: 均線週期設定
    - **use_kbar_api**: 是否使用官方KBar API (僅日線)

    優勢:
    - 並行計算多個商品
    - 自動多核心處理
    - 記憶體效率優化
    """
    try:
        # 解析商品列表
        symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
        if not symbol_list:
            return {"error": "No symbols provided", "data": {}}

        if len(symbol_list) > 20:  # 限制最多20個商品
            return {"error": "Too many symbols (max 20)", "data": {}}

        # 解析指標參數
        indicators_list = [ind.strip() for ind in indicators.split(",") if ind.strip()]
        ma_periods_list = [int(p.strip()) for p in ma_periods.split(",") if p.strip()]

        # 構建指標配置(多商品模式簡化版)
        indicators_config: dict[str, Any] = {}

        if "ma" in indicators_list:
            indicators_config["ma"] = {"periods": ma_periods_list}

        if "macd" in indicators_list:
            indicators_config["macd"] = {"fast": 12, "slow": 26, "signal": 9}

        if "rsi" in indicators_list:
            indicators_config["rsi"] = {"periods": [6, 12, 24]}

        # 獲取所有商品的K線數據
        multi_symbol_data = {}
        max_period = max(ma_periods_list) if ma_periods_list else 20
        extended_limit = limit + max_period

        for symbol in symbol_list:
            try:
                klines_result = shioaji_service.get_historical_klines(
                    symbol, interval, extended_limit
                )
                klines = _extract_klines_data(klines_result)
                if klines:
                    multi_symbol_data[symbol] = klines
                    logger.info(f"Fetched {len(klines)} data points for {symbol}")
            except Exception as e:
                logger.error(f"Failed to fetch data for {symbol}: {e}")
                continue

        if not multi_symbol_data:
            return {"error": "No data available for any symbol", "data": {}}

        # 🚀 使用 Polars 並行計算多商品技術指標
        logger.info(
            f"Starting parallel calculation for {len(multi_symbol_data)} symbols"
        )
        technical_results = (
            polars_technical_analysis_service.calculate_multi_symbol_indicators(
                multi_symbol_data, indicators_config
            )
        )

        # 格式化返回結果
        result: dict[str, Any] = {
            "symbols": symbol_list,
            "interval": interval,
            "indicators_config": indicators_config,
            "data": {},
            "summary": {
                "total_symbols": len(symbol_list),
                "successful_symbols": len(technical_results),
                "failed_symbols": len(symbol_list) - len(technical_results),
            },
        }

        # 只返回最後 limit 筆數據
        for symbol, indicators_data in technical_results.items():
            display_data = (
                indicators_data[-limit:]
                if len(indicators_data) > limit
                else indicators_data
            )
            result["data"][symbol] = {
                "count": len(display_data),
                "data": [indicator.dict() for indicator in display_data],
            }

        logger.info(f"Multi-symbol calculation completed: {result['summary']}")
        return result

    except Exception as e:
        logger.error(f"Multi-symbol chart data error: {e}")
        return {"error": str(e), "data": {}}


@router.get("/benchmark/{symbol}")
def benchmark_polars_vs_pandas(
    symbol: str,
    interval: str = Query(default="1d", description="K線間隔"),
    limit: int = Query(default=500, description="測試數據量", ge=100, le=2000),
    indicators: str = Query(
        default="ma,kd,macd,bbands,rsi", description="技術指標,逗號分隔"
    ),
    ma_periods: str = Query(default="5,10,20,60", description="均線週期"),
) -> dict[str, Any]:
    """
    性能測試: 比較 Polars vs Pandas 計算技術指標的效能

    返回兩種方法的執行時間、記憶體使用量等指標
    """
    import time
    import tracemalloc

    try:
        # 解析參數
        indicators_list = [ind.strip() for ind in indicators.split(",") if ind.strip()]
        ma_periods_list = [int(p.strip()) for p in ma_periods.split(",") if p.strip()]

        # 構建指標配置
        indicators_config: dict[str, Any] = {}
        if "ma" in indicators_list:
            indicators_config["ma"] = {"periods": ma_periods_list}
        if "kd" in indicators_list:
            indicators_config["kd"] = {"k_period": 9, "d_period": 3, "rsv_period": 9}
        if "macd" in indicators_list:
            indicators_config["macd"] = {"fast": 12, "slow": 26, "signal": 9}
        if "bbands" in indicators_list:
            indicators_config["bbands"] = {"period": 20, "std_multiplier": 2}
        if "rsi" in indicators_list:
            indicators_config["rsi"] = {"periods": [14]}

        # 獲取測試數據
        klines_result = shioaji_service.get_historical_klines(symbol, interval, limit)
        klines = _extract_klines_data(klines_result)

        if not klines:
            return {"error": "無法獲取K線數據", "symbol": symbol}

        logger.info(f"🔬 開始性能測試 - 數據量: {len(klines)} 根K線")

        # === 測試 Polars ===
        logger.info(f"📊 測試 Polars 計算,配置: {indicators_config}")
        tracemalloc.start()
        polars_start = time.perf_counter()

        polars_result = polars_technical_analysis_service.calculate_all_indicators(
            klines, indicators_config
        )

        polars_end = time.perf_counter()
        polars_memory = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        polars_time = polars_end - polars_start
        polars_peak_memory = polars_memory[1] / (1024 * 1024)  # MB
        logger.info(
            f"✅ Polars 完成: {len(polars_result)} 結果,耗時 {polars_time * 1000:.1f}ms"
        )

        # === 測試 Pandas ===
        logger.info(f"📊 測試 Pandas 計算,配置: {indicators_config}")
        tracemalloc.start()
        pandas_start = time.perf_counter()

        pandas_result = technical_analysis_service.calculate_all_indicators(
            _extract_klines_data(klines), indicators_config
        )

        pandas_end = time.perf_counter()
        pandas_memory = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        pandas_time = pandas_end - pandas_start
        pandas_peak_memory = pandas_memory[1] / (1024 * 1024)  # MB
        logger.info(
            f"✅ Pandas 完成: {len(pandas_result)} 結果,耗時 {pandas_time * 1000:.1f}ms"
        )

        # 計算加速比
        speedup = pandas_time / polars_time if polars_time > 0 else 0
        memory_efficiency = (
            pandas_peak_memory / polars_peak_memory if polars_peak_memory > 0 else 0
        )

        # 驗證結果一致性 (比較最後幾筆數據)
        consistency_check = "未檢查"
        if len(polars_result) > 0 and len(pandas_result) > 0:
            # 簡單檢查最後一筆數據的MA值
            last_polars = polars_result[-1]
            last_pandas = pandas_result[-1]

            if hasattr(last_polars, "ma") and hasattr(last_pandas, "ma"):
                polars_ma5 = (
                    getattr(last_polars.ma, "ma5", None) if last_polars.ma else None
                )
                pandas_ma5 = (
                    getattr(last_pandas.ma, "ma5", None) if last_pandas.ma else None
                )

                if polars_ma5 is not None and pandas_ma5 is not None:
                    diff_percent = abs(polars_ma5 - pandas_ma5) / pandas_ma5 * 100
                    consistency_check = f"MA5差異: {diff_percent:.4f}%"
                else:
                    consistency_check = (
                        f"MA數據檢查: Polars MA5={polars_ma5}, Pandas MA5={pandas_ma5}"
                    )
            else:
                consistency_check = f"MA檢查: Polars有MA={hasattr(last_polars, 'ma')}, Pandas有MA={hasattr(last_pandas, 'ma')}"

        benchmark_result = {
            "symbol": symbol,
            "test_config": {
                "data_points": len(klines),
                "interval": interval,
                "indicators": indicators_list,
                "ma_periods": ma_periods_list,
            },
            "performance": {
                "polars": {
                    "execution_time_ms": round(polars_time * 1000, 2),
                    "peak_memory_mb": round(polars_peak_memory, 2),
                    "result_count": len(polars_result),
                },
                "pandas": {
                    "execution_time_ms": round(pandas_time * 1000, 2),
                    "peak_memory_mb": round(pandas_peak_memory, 2),
                    "result_count": len(pandas_result),
                },
                "comparison": {
                    "speedup_ratio": round(speedup, 2),
                    "memory_efficiency_ratio": round(memory_efficiency, 2),
                    "polars_faster": polars_time < pandas_time,
                    "polars_memory_efficient": polars_peak_memory < pandas_peak_memory,
                },
            },
            "data_consistency": consistency_check,
            "recommendation": _get_performance_recommendation(
                speedup, memory_efficiency
            ),
        }

        logger.info(
            f"🎯 測試完成 - Polars: {polars_time * 1000:.1f}ms, Pandas: {pandas_time * 1000:.1f}ms, 加速比: {speedup:.2f}x"
        )

        return benchmark_result

    except Exception as e:
        logger.error(f"Benchmark test error: {e}")
        return {"error": str(e), "symbol": symbol}


def _get_performance_recommendation(speedup: float, memory_efficiency: float) -> str:
    """根據性能測試結果給出建議"""
    if speedup > 2.0 and memory_efficiency > 1.2:
        return "🚀 強烈建議使用 Polars - 速度和記憶體效率都明顯更佳"
    elif speedup > 1.5:
        return "✅ 建議使用 Polars - 速度提升明顯"
    elif speedup > 1.0:
        return "📈 Polars 略有優勢, 可考慮切換"
    elif speedup > 0.8:
        return "⚖️  兩者性能相近, 可根據其他因素決定"
    else:
        return "⚠️  Pandas 在此場景下表現更好, 建議保持現狀"


def _get_data_source(interval: str) -> str:
    """確定資料來源類型"""
    # 統一KBar API策略:所有支援的間隔都使用官方KBar API
    if interval in ["1m", "5m", "15m", "60m", "1d", "1w", "1M"]:
        return "official_kbar"
    else:
        return "ticks_aggregated"
