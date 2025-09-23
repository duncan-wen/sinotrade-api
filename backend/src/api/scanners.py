# src/api/scanners.py


from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from src.models.domain import ScannerData, ScannerType
from src.services.shioaji_service import shioaji_service

router = APIRouter()


@router.get("/scanners/types", response_model=list[dict])
def get_scanner_types() -> list[dict]:
    """
    獲取支援的排行類型列表
    """
    return [
        {
            "value": "ChangePercentRank",
            "label": "漲跌幅排行",
            "description": "依價格漲跌幅排序",
        },
        {
            "value": "ChangePriceRank",
            "label": "漲跌排行",
            "description": "依價格漲跌排序",
        },
        {
            "value": "DayRangeRank",
            "label": "高低價差排行",
            "description": "依高低價差排序",
        },
        {"value": "VolumeRank", "label": "成交量排行", "description": "依成交量排序"},
        {
            "value": "AmountRank",
            "label": "成交金額排行",
            "description": "依成交金額排序",
        },
    ]


@router.get("/scanners/{scanner_type}", response_model=list[ScannerData])
def get_scanners(
    scanner_type: ScannerType,
    ascending: bool = Query(
        True, description="排序方式,True 為由大到小,False 為由小到大"
    ),
    count: int = Query(100, ge=1, le=200, description="排行數量 (1-200)"),
    date: str | None = Query(None, description="指定日期 (YYYY-MM-DD),預設為當日"),
    timeout: int = Query(30000, description="超時時間 (毫秒)"),
) -> list[ScannerData]:
    """
    獲取股票排行資料

    支援的排行類型:
    - ChangePercentRank: 依價格漲跌幅排序
    - ChangePriceRank: 依價格漲跌排序
    - DayRangeRank: 依高低價差排序
    - VolumeRank: 依成交量排序
    - AmountRank: 依成交金額排序
    """
    try:
        logger.info(f"🔍 API 請求排行資料: {scanner_type}, 數量: {count}")

        scanners_data = shioaji_service.get_scanners(
            scanner_type=scanner_type,
            ascending=ascending,
            count=count,
            date=date,
            timeout=timeout,
        )

        logger.info(f"✅ API 回傳 {len(scanners_data)} 筆排行資料")
        return scanners_data

    except ValueError as e:
        logger.error(f"❌ 參數錯誤: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"❌ 服務錯誤: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"❌ 未知錯誤: {e}")
        raise HTTPException(status_code=500, detail="內部服務器錯誤")
