# src/services/polars_technical_analysis_service.py

from typing import Any

import polars as pl
import polars_talib as plta  # type: ignore
from loguru import logger

from src.models.technical_indicators import (
    BollingerBandsData,
    KDData,
    KLineData,
    MACDData,
    MovingAverageData,
    RSIData,
    TechnicalIndicators,
)


class PolarsTechnicalAnalysisService:
    """使用 Polars + polars_talib 的高效能技術分析服務"""

    @classmethod
    def calculate_all_indicators(
        cls,
        kline_data: list[dict[str, Any]],
        indicators_config: dict[str, Any] | None = None,
    ) -> list[TechnicalIndicators]:
        """
        使用 Polars 和 polars_talib 計算所有技術指標

        優勢:
        - 高效能向量化計算
        - 自動多核心並行處理
        - 內建技術指標函數
        - 更少的記憶體使用
        """
        try:
            if not kline_data:
                return []

            # 預設指標配置
            default_config = {
                "ma": {"periods": [5, 10, 20, 60, 120, 240]},
                "kd": {"k_period": 9, "d_period": 3, "rsv_period": 9},
                "macd": {"fast": 12, "slow": 26, "signal": 9},
                "bbands": {"period": 20, "std_multiplier": 2.0},
                "rsi": {"periods": [6, 12, 24]},
            }

            config = indicators_config or default_config

            # 轉換為 Polars DataFrame
            df = pl.DataFrame(kline_data)
            df = df.with_columns(
                [
                    pl.col("timestamp").str.to_datetime(),
                    pl.col("open").cast(pl.Float64),
                    pl.col("high").cast(pl.Float64),
                    pl.col("low").cast(pl.Float64),
                    pl.col("close").cast(pl.Float64),
                    pl.col("volume").cast(pl.Int64),
                ]
            ).sort("timestamp")

            logger.info(f"Processing {len(df)} data points with Polars")

            # 使用 Polars expressions 計算技術指標
            expressions = []

            # 1. 移動平均線 (MA)
            if "ma" in config:
                ma_config = config["ma"]
                assert isinstance(ma_config, dict)
                for period in ma_config["periods"]:
                    expressions.append(
                        pl.col("close")
                        .rolling_mean(window_size=period)
                        .fill_null(strategy="forward")
                        .alias(f"ma{period}")
                    )

            # 2. KD 指標
            if "kd" in config:
                kd_config = config["kd"]
                assert isinstance(kd_config, dict)
                rsv_period = kd_config["rsv_period"]
                k_period = kd_config["k_period"]
                d_period = kd_config["d_period"]

                # 使用 polars_talib 計算 KD
                expressions.extend(
                    [
                        # RSV 計算
                        (
                            (
                                pl.col("close")
                                - pl.col("low").rolling_min(window_size=rsv_period)
                            )
                            / (
                                pl.col("high").rolling_max(window_size=rsv_period)
                                - pl.col("low").rolling_min(window_size=rsv_period)
                            )
                            * 100
                        )
                        .fill_null(strategy="forward")
                        .alias("rsv"),
                    ]
                )

                # K, D, J 值需要在後續步驟計算(因為需要 EMA)

            # 3. MACD 指標
            if "macd" in config:
                macd_config = config["macd"]
                assert isinstance(macd_config, dict)
                fast = macd_config["fast"]
                slow = macd_config["slow"]
                signal = macd_config["signal"]

                # 使用 polars_talib 計算 MACD
                expressions.extend(
                    [
                        plta.macd(pl.col("close"), fast, slow, signal)
                        .struct.field("macd")
                        .fill_null(strategy="forward")
                        .alias("macd_line"),
                        plta.macd(pl.col("close"), fast, slow, signal)
                        .struct.field("macdsignal")
                        .fill_null(strategy="forward")
                        .alias("dea"),
                        plta.macd(pl.col("close"), fast, slow, signal)
                        .struct.field("macdhist")
                        .fill_null(strategy="forward")
                        .alias("dif"),
                    ]
                )

            # 4. 布林通道 (Bollinger Bands)
            if "bbands" in config:
                bb_config = config["bbands"]
                assert isinstance(bb_config, dict)
                period = bb_config["period"]
                std_multiplier = bb_config["std_multiplier"]

                # 使用 polars_talib 計算布林通道
                expressions.extend(
                    [
                        plta.bbands(
                            pl.col("close"), period, std_multiplier, std_multiplier
                        )
                        .struct.field("upperband")
                        .fill_null(strategy="forward")
                        .alias("bb_upper"),
                        plta.bbands(
                            pl.col("close"), period, std_multiplier, std_multiplier
                        )
                        .struct.field("middleband")
                        .fill_null(strategy="forward")
                        .alias("bb_middle"),
                        plta.bbands(
                            pl.col("close"), period, std_multiplier, std_multiplier
                        )
                        .struct.field("lowerband")
                        .fill_null(strategy="forward")
                        .alias("bb_lower"),
                    ]
                )

            # 5. RSI 指標
            if "rsi" in config:
                rsi_config = config["rsi"]
                assert isinstance(rsi_config, dict)
                for period in rsi_config["periods"]:
                    expressions.append(
                        plta.rsi(pl.col("close"), period)
                        .fill_null(strategy="forward")
                        .alias(f"rsi{period}")
                    )

            # 執行所有計算
            if expressions:
                df = df.with_columns(expressions)

            # 後處理:計算 KD 的 K, D, J 值
            if "kd" in config and "rsv" in df.columns:
                kd_config = config["kd"]
                assert isinstance(kd_config, dict)
                k_period = kd_config["k_period"]
                d_period = kd_config["d_period"]

                df = df.with_columns(
                    [
                        # K 值 (RSV 的 EMA)
                        pl.col("rsv")
                        .ewm_mean(alpha=1 / k_period)
                        .fill_null(strategy="forward")
                        .alias("k"),
                    ]
                )

                df = df.with_columns(
                    [
                        # D 值 (K 值的 EMA)
                        pl.col("k")
                        .ewm_mean(alpha=1 / d_period)
                        .fill_null(strategy="forward")
                        .alias("d"),
                    ]
                )

                df = df.with_columns(
                    [
                        # J 值
                        (3 * pl.col("k") - 2 * pl.col("d")).fill_null(strategy="forward").alias("j"),
                    ]
                )

            # 計算布林通道寬度
            if "bbands" in config and all(
                col in df.columns for col in ["bb_upper", "bb_middle", "bb_lower"]
            ):
                df = df.with_columns(
                    [
                        (
                            (pl.col("bb_upper") - pl.col("bb_lower"))
                            / pl.col("bb_middle")
                            * 100
                        )
                        .fill_null(strategy="forward")
                        .alias("bb_bandwidth")
                    ]
                )

            # 計算 MACD histogram
            if "macd" in config and all(col in df.columns for col in ["dif", "dea"]):
                df = df.with_columns(
                    [
                        (pl.col("dif") - pl.col("dea")).fill_null(strategy="forward").alias("macd"),
                        ((pl.col("dif") - pl.col("dea")) * 2)
                        .fill_null(strategy="forward")
                        .alias("histogram"),
                    ]
                )

            logger.info(f"Calculated indicators with Polars: {df.columns}")

            # 轉換為結構化數據
            result = []
            for row in df.iter_rows(named=True):
                # 基礎K線數據
                kline = KLineData(
                    timestamp=row["timestamp"].isoformat(),
                    open=float(row["open"]),
                    high=float(row["high"]),
                    low=float(row["low"]),
                    close=float(row["close"]),
                    volume=int(row["volume"]),
                )

                # 移動平均線
                ma_data = None
                if "ma" in config:
                    ma_data = MovingAverageData(
                        timestamp=row["timestamp"].isoformat(),
                        ma5=(float(row["ma5"]) if row.get("ma5") is not None else None),
                        ma10=(
                            float(row["ma10"]) if row.get("ma10") is not None else None
                        ),
                        ma20=(
                            float(row["ma20"]) if row.get("ma20") is not None else None
                        ),
                        ma60=(
                            float(row["ma60"]) if row.get("ma60") is not None else None
                        ),
                        ma120=(
                            float(row["ma120"])
                            if row.get("ma120") is not None
                            else None
                        ),
                        ma240=(
                            float(row["ma240"])
                            if row.get("ma240") is not None
                            else None
                        ),
                    )

                # KD指標
                kd_data = None
                if "kd" in config:
                    kd_data = KDData(
                        timestamp=row["timestamp"].isoformat(),
                        k=float(row["k"]) if row.get("k") is not None else None,
                        d=float(row["d"]) if row.get("d") is not None else None,
                        j=float(row["j"]) if row.get("j") is not None else None,
                    )

                # MACD指標
                macd_data = None
                if "macd" in config:
                    macd_data = MACDData(
                        timestamp=row["timestamp"].isoformat(),
                        dif=(float(row["dif"]) if row.get("dif") is not None else None),
                        dea=(float(row["dea"]) if row.get("dea") is not None else None),
                        macd=(
                            float(row["macd"]) if row.get("macd") is not None else None
                        ),
                        histogram=(
                            float(row["histogram"])
                            if row.get("histogram") is not None
                            else None
                        ),
                    )

                # 布林通道
                bbands_data = None
                if "bbands" in config:
                    bbands_data = BollingerBandsData(
                        timestamp=row["timestamp"].isoformat(),
                        upper=(
                            float(row["bb_upper"])
                            if row.get("bb_upper") is not None
                            else None
                        ),
                        middle=(
                            float(row["bb_middle"])
                            if row.get("bb_middle") is not None
                            else None
                        ),
                        lower=(
                            float(row["bb_lower"])
                            if row.get("bb_lower") is not None
                            else None
                        ),
                        bandwidth=(
                            float(row["bb_bandwidth"])
                            if row.get("bb_bandwidth") is not None
                            else None
                        ),
                    )

                # RSI指標
                rsi_data = None
                if "rsi" in config:
                    rsi_data = RSIData(
                        timestamp=row["timestamp"].isoformat(),
                        rsi6=(
                            float(row["rsi6"]) if row.get("rsi6") is not None else None
                        ),
                        rsi12=(
                            float(row["rsi12"])
                            if row.get("rsi12") is not None
                            else None
                        ),
                        rsi24=(
                            float(row["rsi24"])
                            if row.get("rsi24") is not None
                            else None
                        ),
                    )

                # 組合所有數據
                indicator_data = TechnicalIndicators(
                    timestamp=row["timestamp"].isoformat(),
                    kline=kline,
                    ma=ma_data,
                    kd=kd_data,
                    macd=macd_data,
                    bbands=bbands_data,
                    rsi=rsi_data,
                )

                result.append(indicator_data)

            logger.info(
                f"Generated {len(result)} technical indicator data points using Polars"
            )
            return result

        except Exception as e:
            logger.error(f"Failed to calculate technical indicators with Polars: {e}")
            return []

    @classmethod
    def calculate_multi_symbol_indicators(
        cls,
        multi_symbol_data: dict[str, list[dict[str, Any]]],
        indicators_config: dict[str, Any] | None = None,
    ) -> dict[str, list[TechnicalIndicators]]:
        """
        多商品並行計算技術指標

        利用 Polars 的 over() 功能實現真正的並行計算
        """
        try:
            if not multi_symbol_data:
                return {}

            # 合併所有商品數據
            all_data = []
            for symbol, data in multi_symbol_data.items():
                for item in data:
                    item_with_symbol = item.copy()
                    item_with_symbol["symbol"] = symbol
                    all_data.append(item_with_symbol)

            if not all_data:
                return {}

            # 轉換為 Polars DataFrame
            df = pl.DataFrame(all_data)
            df = df.with_columns(
                [
                    pl.col("timestamp").str.to_datetime(),
                    pl.col("open").cast(pl.Float64),
                    pl.col("high").cast(pl.Float64),
                    pl.col("low").cast(pl.Float64),
                    pl.col("close").cast(pl.Float64),
                    pl.col("volume").cast(pl.Int64),
                ]
            ).sort(["symbol", "timestamp"])

            logger.info(
                f"Processing {len(df)} data points for {len(multi_symbol_data)} symbols with Polars"
            )

            # 預設指標配置
            default_config = {
                "ma": {"periods": [5, 10, 20, 60]},
                "macd": {"fast": 12, "slow": 26, "signal": 9},
                "rsi": {"periods": [6, 12, 24]},
            }

            config = indicators_config or default_config
            expressions = []

            # 使用 over("symbol") 實現按商品分組的並行計算
            if "ma" in config:
                ma_config = config["ma"]
                assert isinstance(ma_config, dict)
                for period in ma_config["periods"]:
                    expressions.append(
                        pl.col("close")
                        .rolling_mean(window_size=period)
                        .over("symbol")  # 🚀 關鍵:按商品分組並行計算
                        .fill_null(strategy="forward")
                        .alias(f"ma{period}")
                    )

            if "macd" in config:
                macd_config = config["macd"]
                assert isinstance(macd_config, dict)
                expressions.extend(
                    [
                        plta.macd(
                            pl.col("close"),
                            macd_config["fast"],
                            macd_config["slow"],
                            macd_config["signal"],
                        )
                        .over("symbol")  # 🚀 並行計算每個商品的 MACD
                        .struct.field("macd")
                        .fill_null(strategy="forward")
                        .alias("macd_line"),
                        plta.macd(
                            pl.col("close"),
                            macd_config["fast"],
                            macd_config["slow"],
                            macd_config["signal"],
                        )
                        .over("symbol")
                        .struct.field("macdsignal")
                        .fill_null(strategy="forward")
                        .alias("dea"),
                        plta.macd(
                            pl.col("close"),
                            macd_config["fast"],
                            macd_config["slow"],
                            macd_config["signal"],
                        )
                        .over("symbol")
                        .struct.field("macdhist")
                        .fill_null(strategy="forward")
                        .alias("dif"),
                    ]
                )

            if "rsi" in config:
                rsi_config = config["rsi"]
                assert isinstance(rsi_config, dict)
                for period in rsi_config["periods"]:
                    expressions.append(
                        plta.rsi(pl.col("close"), period)
                        .over("symbol")  # 🚀 並行計算每個商品的 RSI
                        .fill_null(strategy="forward")
                        .alias(f"rsi{period}")
                    )

            # 執行所有計算
            if expressions:
                df = df.with_columns(expressions)

            # 按商品分組返回結果
            result = {}
            for symbol in multi_symbol_data.keys():
                symbol_df = df.filter(pl.col("symbol") == symbol)
                symbol_indicators = []

                for row in symbol_df.iter_rows(named=True):
                    # 轉換為 TechnicalIndicators 格式
                    kline = KLineData(
                        timestamp=row["timestamp"].isoformat(),
                        open=float(row["open"]),
                        high=float(row["high"]),
                        low=float(row["low"]),
                        close=float(row["close"]),
                        volume=int(row["volume"]),
                    )

                    # 簡化版指標數據(可根據需要擴展)
                    ma_data = (
                        MovingAverageData(
                            timestamp=row["timestamp"].isoformat(),
                            ma5=(
                                float(row["ma5"])
                                if row.get("ma5") is not None
                                else None
                            ),
                            ma10=(
                                float(row["ma10"])
                                if row.get("ma10") is not None
                                else None
                            ),
                            ma20=(
                                float(row["ma20"])
                                if row.get("ma20") is not None
                                else None
                            ),
                            ma60=(
                                float(row["ma60"])
                                if row.get("ma60") is not None
                                else None
                            ),
                        )
                        if "ma" in config
                        else None
                    )

                    indicator_data = TechnicalIndicators(
                        timestamp=row["timestamp"].isoformat(),
                        kline=kline,
                        ma=ma_data,
                        kd=None,
                        macd=None,
                        bbands=None,
                        rsi=None,
                    )

                    symbol_indicators.append(indicator_data)

                result[symbol] = symbol_indicators

            logger.info(f"Completed multi-symbol calculation for {len(result)} symbols")
            return result

        except Exception as e:
            logger.error(f"Failed to calculate multi-symbol indicators: {e}")
            return {}


# 單例服務
polars_technical_analysis_service = PolarsTechnicalAnalysisService()
