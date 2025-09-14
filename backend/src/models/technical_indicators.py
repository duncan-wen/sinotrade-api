# src/models/technical_indicators.py

from typing import Any

from pydantic import BaseModel


class KLineData(BaseModel):
    """K線基礎數據"""

    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class MovingAverageData(BaseModel):
    """移動平均線數據"""

    timestamp: str
    ma5: float | None = None
    ma10: float | None = None
    ma20: float | None = None
    ma60: float | None = None
    ma120: float | None = None
    ma240: float | None = None


class KDData(BaseModel):
    """KD指標數據"""

    timestamp: str
    k: float | None = None
    d: float | None = None
    j: float | None = None


class MACDData(BaseModel):
    """MACD指標數據"""

    timestamp: str
    dif: float | None = None  # DIF線 (快線)
    dea: float | None = None  # DEA線 (慢線)
    macd: float | None = None  # MACD柱狀圖
    histogram: float | None = None  # 柱狀圖 (DIF-DEA)*2


class BollingerBandsData(BaseModel):
    """布林通道數據"""

    timestamp: str
    upper: float | None = None  # 上軌
    middle: float | None = None  # 中軌 (MA20)
    lower: float | None = None  # 下軌
    bandwidth: float | None = None  # 通道寬度


class RSIData(BaseModel):
    """RSI指標數據"""

    timestamp: str
    rsi6: float | None = None
    rsi12: float | None = None
    rsi24: float | None = None


class TechnicalIndicators(BaseModel):
    """完整技術指標數據"""

    timestamp: str
    # 基礎數據
    kline: KLineData
    # 技術指標
    ma: MovingAverageData | None = None
    kd: KDData | None = None
    macd: MACDData | None = None
    bbands: BollingerBandsData | None = None
    rsi: RSIData | None = None


class ChartDataResponse(BaseModel):
    """圖表數據響應格式"""

    symbol: str
    interval: str
    data: list[TechnicalIndicators]
    count: int
    indicators_config: dict[str, Any]
    source: str
