from __future__ import annotations

import math

import pandas as pd
import yfinance as yf  # type: ignore[import-untyped]
from fastapi import APIRouter, HTTPException, Query
from loguru import logger
from pydantic import BaseModel

router = APIRouter()


class PricePoint(BaseModel):
    date: str
    taiex: float | None
    usd_twd: float | None


class CorrPoint(BaseModel):
    date: str
    correlation: float | None


class ReturnPoint(BaseModel):
    date: str
    market: float | None
    strategy: float | None


class ForexAnalysisResponse(BaseModel):
    price_data: list[PricePoint]
    corr_data: list[CorrPoint]
    return_data: list[ReturnPoint]
    market_return_pct: float
    strategy_return_pct: float
    win_rate_pct: float
    total_days: int
    signal_days: int


def _safe_float(x: object) -> float | None:
    """將 pandas/numpy 數值轉為 Python float，NaN 回傳 None。"""
    try:
        v = float(x)  # type: ignore[arg-type]
        return None if math.isnan(v) else round(v, 4)
    except (TypeError, ValueError):
        return None


@router.get(
    "/forex/analysis",
    response_model=ForexAnalysisResponse,
    summary="匯率與大盤連動分析",
    description="分析 USD/TWD 匯率與台灣加權指數 (^TWII) 的相關性，並回測「台幣升值即買入」策略。",
)
async def get_forex_analysis(
    days: int = Query(default=730, ge=365, le=3650, description="回測天數"),
    corr_window: int = Query(
        default=20, ge=5, le=60, description="滾動相關係數視窗（天）"
    ),
) -> ForexAnalysisResponse:
    """匯率與台股大盤連動分析 + 策略回測。"""
    try:
        logger.info(f"[ForexAnalysis] 開始分析: days={days}, corr_window={corr_window}")

        raw = yf.download(
            ["^TWII", "TWD=X"],
            period=f"{days}d",
            auto_adjust=True,
            progress=False,
        )

        close = raw["Close"]

        df = pd.DataFrame(
            {
                "TAIEX": close["^TWII"],
                "USD_TWD": close["TWD=X"],
            }
        ).dropna()

        if df.empty:
            raise HTTPException(status_code=503, detail="無法從 yfinance 取得資料，請稍後重試")

        # --- 計算滾動相關係數 ---
        df["Correlation"] = (
            df["TAIEX"].rolling(window=corr_window).corr(df["USD_TWD"])
        )

        # --- 策略：台幣升值（USD/TWD 下跌）隔日買入大盤 ---
        df["TWD_Change"] = df["USD_TWD"].pct_change()
        df["Signal"] = (df["TWD_Change"] < 0).astype(int)
        df["Market_Return"] = df["TAIEX"].pct_change()
        df["Strategy_Return"] = df["Market_Return"] * df["Signal"].shift(1)

        df["Cumulative_Market"] = (1 + df["Market_Return"].fillna(0)).cumprod()
        df["Cumulative_Strategy"] = (1 + df["Strategy_Return"].fillna(0)).cumprod()

        # --- 績效指標 ---
        market_return_pct = round(float(df["Cumulative_Market"].iloc[-1] - 1) * 100, 2)
        strategy_return_pct = round(
            float(df["Cumulative_Strategy"].iloc[-1] - 1) * 100, 2
        )
        signal_days = int((df["Signal"] == 1).sum())
        wins = int((df["Strategy_Return"] > 0).sum())
        win_rate_pct = round(wins / signal_days * 100, 2) if signal_days > 0 else 0.0

        # --- 整理回傳資料 ---
        dates = df.index.strftime("%Y-%m-%d").tolist()

        price_data = [
            PricePoint(
                date=d,
                taiex=_safe_float(row["TAIEX"]),
                usd_twd=_safe_float(row["USD_TWD"]),
            )
            for d, (_, row) in zip(dates, df.iterrows())
        ]

        corr_data = [
            CorrPoint(date=d, correlation=_safe_float(row["Correlation"]))
            for d, (_, row) in zip(dates, df.iterrows())
        ]

        return_data = [
            ReturnPoint(
                date=d,
                market=_safe_float(row["Cumulative_Market"]),
                strategy=_safe_float(row["Cumulative_Strategy"]),
            )
            for d, (_, row) in zip(dates, df.iterrows())
        ]

        logger.info(
            f"[ForexAnalysis] 完成: {len(df)} 筆資料, "
            f"大盤報酬={market_return_pct}%, 策略報酬={strategy_return_pct}%"
        )

        return ForexAnalysisResponse(
            price_data=price_data,
            corr_data=corr_data,
            return_data=return_data,
            market_return_pct=market_return_pct,
            strategy_return_pct=strategy_return_pct,
            win_rate_pct=win_rate_pct,
            total_days=len(df),
            signal_days=signal_days,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ForexAnalysis] 分析失敗: {e}")
        raise HTTPException(status_code=500, detail=f"分析失敗: {e!s}")
