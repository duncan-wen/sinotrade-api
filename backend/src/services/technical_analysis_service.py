# src/services/technical_analysis_service.py

from typing import Any

import pandas as pd
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


class TechnicalAnalysisService:
    """技術分析服務"""

    @staticmethod
    def calculate_moving_averages(
        df: pd.DataFrame, periods: list[int] | None = None
    ) -> pd.DataFrame:
        """計算移動平均線"""
        if periods is None:
            periods = [5, 10, 20, 60, 120, 240]
        try:
            for period in periods:
                if len(df) >= period:
                    df[f"ma{period}"] = df["close"].rolling(window=period).mean()
                else:
                    df[f"ma{period}"] = None
            return df
        except Exception as e:
            logger.error(f"Failed to calculate moving averages: {e}")
            return df

    @staticmethod
    def calculate_kd(
        df: pd.DataFrame, k_period: int = 9, d_period: int = 3, rsv_period: int = 9
    ) -> pd.DataFrame:
        """計算KD指標"""
        try:
            if len(df) < rsv_period:
                df["k"] = None
                df["d"] = None
                df["j"] = None
                return df

            # 計算RSV (Raw Stochastic Value)
            low_min = df["low"].rolling(window=rsv_period).min()
            high_max = df["high"].rolling(window=rsv_period).max()
            df["rsv"] = (df["close"] - low_min) / (high_max - low_min) * 100

            # 計算K值 (使用SMA)
            df["k"] = df["rsv"].ewm(alpha=1 / k_period).mean()

            # 計算D值 (K值的移動平均)
            df["d"] = df["k"].ewm(alpha=1 / d_period).mean()

            # 計算J值
            df["j"] = 3 * df["k"] - 2 * df["d"]

            return df
        except Exception as e:
            logger.error(f"Failed to calculate KD: {e}")
            df["k"] = None
            df["d"] = None
            df["j"] = None
            return df

    @staticmethod
    def calculate_macd(
        df: pd.DataFrame,
        fast_period: int = 12,
        slow_period: int = 26,
        signal_period: int = 9,
    ) -> pd.DataFrame:
        """計算MACD指標"""
        try:
            if len(df) < slow_period:
                df["dif"] = None
                df["dea"] = None
                df["macd"] = None
                df["histogram"] = None
                return df

            # 計算快線EMA和慢線EMA
            ema_fast = df["close"].ewm(span=fast_period).mean()
            ema_slow = df["close"].ewm(span=slow_period).mean()

            # 計算DIF線 (快線-慢線)
            df["dif"] = ema_fast - ema_slow

            # 計算DEA線 (DIF的EMA)
            df["dea"] = df["dif"].ewm(span=signal_period).mean()

            # 計算MACD柱狀圖
            df["macd"] = df["dif"] - df["dea"]
            df["histogram"] = (df["dif"] - df["dea"]) * 2

            return df
        except Exception as e:
            logger.error(f"Failed to calculate MACD: {e}")
            df["dif"] = None
            df["dea"] = None
            df["macd"] = None
            df["histogram"] = None
            return df

    @staticmethod
    def calculate_bollinger_bands(
        df: pd.DataFrame, period: int = 20, std_multiplier: float = 2.0
    ) -> pd.DataFrame:
        """計算布林通道"""
        try:
            if len(df) < period:
                df["bb_upper"] = None
                df["bb_middle"] = None
                df["bb_lower"] = None
                df["bb_bandwidth"] = None
                return df

            # 中軌 (移動平均線)
            df["bb_middle"] = df["close"].rolling(window=period).mean()

            # 標準差
            std = df["close"].rolling(window=period).std()

            # 上軌和下軌
            df["bb_upper"] = df["bb_middle"] + (std * std_multiplier)
            df["bb_lower"] = df["bb_middle"] - (std * std_multiplier)

            # 通道寬度
            df["bb_bandwidth"] = (
                (df["bb_upper"] - df["bb_lower"]) / df["bb_middle"] * 100
            )

            return df
        except Exception as e:
            logger.error(f"Failed to calculate Bollinger Bands: {e}")
            df["bb_upper"] = None
            df["bb_middle"] = None
            df["bb_lower"] = None
            df["bb_bandwidth"] = None
            return df

    @staticmethod
    def calculate_rsi(
        df: pd.DataFrame, periods: list[int] | None = None
    ) -> pd.DataFrame:
        """計算RSI指標"""
        if periods is None:
            periods = [6, 12, 24]
        try:
            # 計算價格變化
            delta = df["close"].diff()

            for period in periods:
                if len(df) < period:
                    df[f"rsi{period}"] = None
                    continue

                # 分離上漲和下跌
                gain = delta.where(delta > 0, 0)
                loss = -delta.where(delta < 0, 0)

                # 計算平均漲幅和跌幅
                avg_gain = gain.rolling(window=period).mean()
                avg_loss = loss.rolling(window=period).mean()

                # 計算RS和RSI
                rs = avg_gain / avg_loss
                df[f"rsi{period}"] = 100 - (100 / (1 + rs))

            return df
        except Exception as e:
            logger.error(f"Failed to calculate RSI: {e}")
            for period in periods:
                df[f"rsi{period}"] = None
            return df

    @classmethod
    def calculate_all_indicators(
        cls,
        kline_data: list[dict[str, Any]],
        indicators_config: dict[str, Any] | None = None,
    ) -> list[TechnicalIndicators]:
        """計算所有技術指標"""
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

            # 轉換為DataFrame
            df = pd.DataFrame(kline_data)
            df["datetime"] = pd.to_datetime(df["timestamp"])
            df = df.sort_values("datetime")

            # 計算各種指標
            if "ma" in config:
                ma_config = config["ma"]
                assert isinstance(ma_config, dict)
                df = cls.calculate_moving_averages(df, ma_config["periods"])

            if "kd" in config:
                kd_config = config["kd"]
                assert isinstance(kd_config, dict)
                df = cls.calculate_kd(
                    df,
                    kd_config["k_period"],
                    kd_config["d_period"],
                    kd_config["rsv_period"],
                )

            if "macd" in config:
                macd_config = config["macd"]
                assert isinstance(macd_config, dict)
                df = cls.calculate_macd(
                    df, macd_config["fast"], macd_config["slow"], macd_config["signal"]
                )

            if "bbands" in config:
                bb_config = config["bbands"]
                assert isinstance(bb_config, dict)
                df = cls.calculate_bollinger_bands(
                    df, bb_config["period"], bb_config["std_multiplier"]
                )

            if "rsi" in config:
                rsi_config = config["rsi"]
                assert isinstance(rsi_config, dict)
                df = cls.calculate_rsi(df, rsi_config["periods"])

            # 轉換為結構化數據
            result = []
            for _, row in df.iterrows():
                # 基礎K線數據
                kline = KLineData(
                    timestamp=row["timestamp"],
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
                        timestamp=row["timestamp"],
                        ma5=float(row["ma5"]) if pd.notna(row.get("ma5")) else None,
                        ma10=float(row["ma10"]) if pd.notna(row.get("ma10")) else None,
                        ma20=float(row["ma20"]) if pd.notna(row.get("ma20")) else None,
                        ma60=float(row["ma60"]) if pd.notna(row.get("ma60")) else None,
                        ma120=(
                            float(row["ma120"]) if pd.notna(row.get("ma120")) else None
                        ),
                        ma240=(
                            float(row["ma240"]) if pd.notna(row.get("ma240")) else None
                        ),
                    )

                # KD指標
                kd_data = None
                if "kd" in config:
                    kd_data = KDData(
                        timestamp=row["timestamp"],
                        k=float(row["k"]) if pd.notna(row.get("k")) else None,
                        d=float(row["d"]) if pd.notna(row.get("d")) else None,
                        j=float(row["j"]) if pd.notna(row.get("j")) else None,
                    )

                # MACD指標
                macd_data = None
                if "macd" in config:
                    macd_data = MACDData(
                        timestamp=row["timestamp"],
                        dif=float(row["dif"]) if pd.notna(row.get("dif")) else None,
                        dea=float(row["dea"]) if pd.notna(row.get("dea")) else None,
                        macd=float(row["macd"]) if pd.notna(row.get("macd")) else None,
                        histogram=(
                            float(row["histogram"])
                            if pd.notna(row.get("histogram"))
                            else None
                        ),
                    )

                # 布林通道
                bbands_data = None
                if "bbands" in config:
                    bbands_data = BollingerBandsData(
                        timestamp=row["timestamp"],
                        upper=(
                            float(row["bb_upper"])
                            if pd.notna(row.get("bb_upper"))
                            else None
                        ),
                        middle=(
                            float(row["bb_middle"])
                            if pd.notna(row.get("bb_middle"))
                            else None
                        ),
                        lower=(
                            float(row["bb_lower"])
                            if pd.notna(row.get("bb_lower"))
                            else None
                        ),
                        bandwidth=(
                            float(row["bb_bandwidth"])
                            if pd.notna(row.get("bb_bandwidth"))
                            else None
                        ),
                    )

                # RSI指標
                rsi_data = None
                if "rsi" in config:
                    rsi_data = RSIData(
                        timestamp=row["timestamp"],
                        rsi6=float(row["rsi6"]) if pd.notna(row.get("rsi6")) else None,
                        rsi12=(
                            float(row["rsi12"]) if pd.notna(row.get("rsi12")) else None
                        ),
                        rsi24=(
                            float(row["rsi24"]) if pd.notna(row.get("rsi24")) else None
                        ),
                    )

                # 組合所有數據
                indicator_data = TechnicalIndicators(
                    timestamp=row["timestamp"],
                    kline=kline,
                    ma=ma_data,
                    kd=kd_data,
                    macd=macd_data,
                    bbands=bbands_data,
                    rsi=rsi_data,
                )

                result.append(indicator_data)

            logger.info(
                f"Calculated technical indicators for {len(result)} data points"
            )
            return result

        except Exception as e:
            logger.error(f"Failed to calculate technical indicators: {e}")
            return []


# 單例服務
technical_analysis_service = TechnicalAnalysisService()
