# src/api/options_quotes.py

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from src.services.shioaji_service import shioaji_service

router = APIRouter(prefix="/options", tags=["台指選擇權報價"])


@router.get("/contracts")
async def get_available_option_contracts():
    """
    獲取可用的台指選擇權合約列表

    Returns:
        dict: 包含各類選擇權合約的資訊
    """
    try:
        if not shioaji_service.ensure_logged_in():
            raise HTTPException(status_code=503, detail="Shioaji 服務未登錄")

        # 獲取選擇權合約資訊
        contracts_info = {}

        # TX1 - 第一週選擇權
        try:
            tx1_contracts = shioaji_service.api.Contracts.Options.TX1
            contract_list = [
                attr for attr in dir(tx1_contracts) if not attr.startswith("_")
            ]
            contracts_info["TX1"] = {
                "name": "第一週選擇權",
                "description": "台指選擇權第一週到期合約",
                "available": bool(tx1_contracts and contract_list),
                "contract_count": len(contract_list),
                "sample_contracts": contract_list[:3] if contract_list else [],
            }
        except Exception as e:
            contracts_info["TX1"] = {
                "name": "第一週選擇權",
                "available": False,
                "error": str(e),
            }

        # TX2 - 第二週選擇權
        try:
            tx2_contracts = shioaji_service.api.Contracts.Options.TX2
            contract_list = [
                attr for attr in dir(tx2_contracts) if not attr.startswith("_")
            ]
            contracts_info["TX2"] = {
                "name": "第二週選擇權",
                "description": "台指選擇權第二週到期合約",
                "available": bool(tx2_contracts and contract_list),
                "contract_count": len(contract_list),
                "sample_contracts": contract_list[:3] if contract_list else [],
            }
        except Exception as e:
            contracts_info["TX2"] = {
                "name": "第二週選擇權",
                "available": False,
                "error": str(e),
            }

        # TXO - 當月月選擇權
        try:
            txo_contracts = shioaji_service.api.Contracts.Options.TXO
            contract_list = [
                attr for attr in dir(txo_contracts) if not attr.startswith("_")
            ]
            contracts_info["TXO"] = {
                "name": "當月月選擇權",
                "description": "台指選擇權當月第三週到期合約",
                "available": bool(txo_contracts and contract_list),
                "contract_count": len(contract_list),
                "sample_contracts": contract_list[:3] if contract_list else [],
            }
        except Exception as e:
            contracts_info["TXO"] = {
                "name": "當月月選擇權",
                "available": False,
                "error": str(e),
            }

        # TX4 - 第四週選擇權
        try:
            tx4_contracts = shioaji_service.api.Contracts.Options.TX4
            contract_list = [
                attr for attr in dir(tx4_contracts) if not attr.startswith("_")
            ]
            contracts_info["TX4"] = {
                "name": "第四週選擇權",
                "description": "台指選擇權第四週到期合約",
                "available": bool(tx4_contracts and contract_list),
                "contract_count": len(contract_list),
                "sample_contracts": contract_list[:3] if contract_list else [],
            }
        except Exception as e:
            contracts_info["TX4"] = {
                "name": "第四週選擇權",
                "available": False,
                "error": str(e),
            }

        # TXY - 近期週五選擇權
        try:
            txy_contracts = shioaji_service.api.Contracts.Options.TXY
            contract_list = [
                attr for attr in dir(txy_contracts) if not attr.startswith("_")
            ]
            contracts_info["TXY"] = {
                "name": "近期週五選擇權",
                "description": "台指選擇權近期週五到期合約",
                "available": bool(txy_contracts and contract_list),
                "contract_count": len(contract_list),
                "sample_contracts": contract_list[:3] if contract_list else [],
            }
        except Exception as e:
            contracts_info["TXY"] = {
                "name": "近期週五選擇權",
                "available": False,
                "error": str(e),
            }

        # TXU - 遠期週五選擇權
        try:
            txu_contracts = shioaji_service.api.Contracts.Options.TXU
            contract_list = [
                attr for attr in dir(txu_contracts) if not attr.startswith("_")
            ]
            contracts_info["TXU"] = {
                "name": "遠期週五選擇權",
                "description": "台指選擇權遠期週五到期合約",
                "available": bool(txu_contracts and contract_list),
                "contract_count": len(contract_list),
                "sample_contracts": contract_list[:3] if contract_list else [],
            }
        except Exception as e:
            contracts_info["TXU"] = {
                "name": "遠期週五選擇權",
                "available": False,
                "error": str(e),
            }

        return {
            "success": True,
            "message": "成功獲取選擇權合約列表",
            "contracts": contracts_info,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"❌ 獲取選擇權合約列表失敗: {e}")
        raise HTTPException(
            status_code=500, detail=f"獲取合約列表失敗: {e!s}"
        ) from None


@router.get("/strikes/{option_type}")
async def get_option_strikes(
    option_type: str,
    call_put: str = Query(
        ..., regex="^(C|P|call|put)$", description="買權(C/call)或賣權(P/put)"
    ),
    limit: int = Query(20, ge=1, le=100, description="返回數量限制"),
):
    """
    獲取指定選擇權類型的履約價清單

    Args:
        option_type: 選擇權類型 (TX1, TX2, TXO, TX4, TXY, TXU)
        call_put: 買權(C/call)或賣權(P/put)
        limit: 返回數量限制
    """
    try:
        if not shioaji_service.ensure_logged_in():
            raise HTTPException(status_code=503, detail="Shioaji 服務未登錄")

        option_type = option_type.upper()
        if option_type not in ["TX1", "TX2", "TXO", "TX4", "TXY", "TXU"]:
            raise HTTPException(status_code=400, detail="不支援的選擇權類型")

        # 標準化買賣權標識
        call_put_normalized = "C" if call_put.upper() in ["C", "CALL"] else "P"

        try:
            # 獲取選擇權合約群組
            option_group = getattr(shioaji_service.api.Contracts.Options, option_type)

            # 獲取所有合約並篩選指定類型
            strikes = []

            # 遍歷合約群組中的所有合約
            for contract_name in dir(option_group):
                if contract_name.startswith("_"):
                    continue

                try:
                    contract = getattr(option_group, contract_name)

                    # 檢查合約是否符合買賣權類型
                    if (
                        hasattr(contract, "code")
                        and call_put_normalized in contract.code
                    ):
                        # 根據 notebook 中看到的實際合約結構獲取屬性
                        option_right = getattr(contract, "option_right", None)
                        option_right_str = (
                            str(option_right)
                            .split(".")[-1]
                            .replace("'", "")
                            .replace(">", "")
                            if option_right
                            else call_put_normalized
                        )
                        strikes.append(
                            {
                                "code": getattr(contract, "code", contract_name),
                                "symbol": getattr(contract, "symbol", contract_name),
                                "name": getattr(contract, "name", ""),
                                "category": getattr(contract, "category", option_type),
                                "strike_price": getattr(contract, "strike_price", None),
                                "delivery_date": str(
                                    getattr(contract, "delivery_date", "")
                                ),
                                "delivery_month": getattr(
                                    contract, "delivery_month", ""
                                ),
                                "option_right": option_right_str,
                                "call_put": call_put_normalized,
                                "underlying_kind": getattr(
                                    contract, "underlying_kind", ""
                                ),
                                "unit": getattr(contract, "unit", 1),
                                "limit_up": getattr(contract, "limit_up", None),
                                "limit_down": getattr(contract, "limit_down", None),
                                "reference": getattr(contract, "reference", None),
                                "update_date": getattr(contract, "update_date", ""),
                                "contract_name": contract_name,
                            }
                        )

                        if len(strikes) >= limit:
                            break

                except Exception as contract_error:
                    logger.debug(f"跳過無效合約 {contract_name}: {contract_error}")
                    continue

            return {
                "success": True,
                "option_type": option_type,
                "call_put": call_put_normalized,
                "strikes": strikes,
                "count": len(strikes),
                "timestamp": datetime.now().isoformat(),
            }

        except AttributeError:
            raise HTTPException(
                status_code=404, detail=f"找不到選擇權類型: {option_type}"
            ) from None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 獲取履約價清單失敗: {e}")
        raise HTTPException(status_code=500, detail=f"獲取履約價失敗: {e!s}") from None


@router.get("/contract/{option_type}/{contract_symbol}")
async def get_option_contract_details(option_type: str, contract_symbol: str):
    """
    獲取指定選擇權合約的詳細資訊

    Args:
        option_type: 選擇權類型 (TX1, TX2, TXO, TX4, TXY, TXU)
        contract_symbol: 合約代號 (如: TX120251025250C)
    """
    try:
        if not shioaji_service.ensure_logged_in():
            raise HTTPException(status_code=503, detail="Shioaji 服務未登錄")

        option_type = option_type.upper()
        if option_type not in ["TX1", "TX2", "TXO", "TX4", "TXY", "TXU"]:
            raise HTTPException(status_code=400, detail="不支援的選擇權類型")

        try:
            # 根據 notebook 範例: shioaji_service.api.Contracts.Options.TX1["TX120251025250C"]
            option_group = getattr(shioaji_service.api.Contracts.Options, option_type)
            contract = getattr(option_group, contract_symbol)
            if not contract:
                raise HTTPException(
                    status_code=404, detail=f"找不到合約: {contract_symbol}"
                )

            # 獲取所有合約屬性 (基於 notebook 中看到的實際結構)
            contract_details = {
                "code": getattr(contract, "code", ""),
                "symbol": getattr(contract, "symbol", contract_symbol),
                "name": getattr(contract, "name", ""),
                "category": getattr(contract, "category", option_type),
                "delivery_month": getattr(contract, "delivery_month", ""),
                "delivery_date": str(getattr(contract, "delivery_date", "")),
                "strike_price": getattr(contract, "strike_price", None),
                "option_right": str(getattr(contract, "option_right", ""))
                .split(".")[-1]
                .replace("'", "")
                .replace(">", "")
                if hasattr(contract, "option_right")
                else "",
                "underlying_kind": getattr(contract, "underlying_kind", ""),
                "underlying_code": getattr(contract, "underlying_code", ""),
                "unit": getattr(contract, "unit", 1),
                "limit_up": getattr(contract, "limit_up", None),
                "limit_down": getattr(contract, "limit_down", None),
                "reference": getattr(contract, "reference", None),
                "update_date": getattr(contract, "update_date", ""),
                # 計算相關資訊
                "is_call": "C" in contract_symbol,
                "is_put": "P" in contract_symbol,
                "moneyness": None,  # 可以根據標的價格計算
            }
            # 如果有參考價, 計算價內外狀態
            if contract_details["reference"] and contract_details["strike_price"]:
                try:
                    underlying_price = float(contract_details["reference"])
                    strike = float(contract_details["strike_price"])

                    if contract_details["is_call"]:
                        contract_details["moneyness"] = (
                            "ITM"
                            if underlying_price > strike
                            else "OTM"
                            if underlying_price < strike
                            else "ATM"
                        )
                    else:  # Put
                        contract_details["moneyness"] = (
                            "ITM"
                            if underlying_price < strike
                            else "OTM"
                            if underlying_price > strike
                            else "ATM"
                        )
                except (ValueError, TypeError):
                    contract_details["moneyness"] = "Unknown"

            return {
                "success": True,
                "option_type": option_type,
                "contract_symbol": contract_symbol,
                "contract": contract_details,
                "timestamp": datetime.now().isoformat(),
            }

        except AttributeError:
            raise HTTPException(
                status_code=404,
                detail=f"找不到合約: {contract_symbol} 在 {option_type} 中",
            ) from None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 獲取合約詳細資訊失敗: {e}")
        raise HTTPException(
            status_code=500, detail=f"獲取合約詳細資訊失敗: {e!s}"
        ) from None


@router.post("/subscribe")
async def subscribe_option_quote(
    option_code: str = Query(..., description="選擇權合約代碼"),
    option_type: str = Query(
        ..., description="選擇權類型 (TX1, TX2, TXO, TX4, TXY, TXU)"
    ),
):
    """
    訂閱選擇權即時報價

    Args:
        option_code: 選擇權合約代碼 (如: TXO20241218020000C)
        option_type: 選擇權類型
    """
    try:
        if not shioaji_service.ensure_logged_in():
            raise HTTPException(status_code=503, detail="Shioaji 服務未登錄")

        option_type = option_type.upper()
        if option_type not in ["TX1", "TX2", "TXO", "TX4", "TXY", "TXU"]:
            raise HTTPException(status_code=400, detail="不支援的選擇權類型")

        # 嘗試獲取合約
        try:
            option_group = getattr(shioaji_service.api.Contracts.Options, option_type)
            contract = getattr(option_group, option_code)

            if not contract:
                raise HTTPException(
                    status_code=404, detail=f"找不到合約: {option_code}"
                )

        except AttributeError:
            raise HTTPException(
                status_code=404, detail=f"找不到合約: {option_code}"
            ) from None

        # 執行訂閱
        success = shioaji_service.subscribe_quote(option_code)

        if success:
            return {
                "success": True,
                "message": f"成功訂閱選擇權: {option_code}",
                "option_type": option_type,
                "contract_code": contract.code,
                "contract_symbol": getattr(contract, "symbol", option_code),
                "active_subscriptions": len(shioaji_service.active_subscriptions),
                "timestamp": datetime.now().isoformat(),
            }
        else:
            raise HTTPException(status_code=500, detail="訂閱失敗")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 訂閱選擇權報價失敗: {e}")
        raise HTTPException(status_code=500, detail=f"訂閱失敗: {e!s}") from None


@router.delete("/unsubscribe")
async def unsubscribe_option_quote(
    option_code: str = Query(..., description="選擇權合約代碼"),
):
    """
    取消訂閱選擇權即時報價
    """
    try:
        if not shioaji_service.ensure_logged_in():
            raise HTTPException(status_code=503, detail="Shioaji 服務未登錄")

        success = shioaji_service.unsubscribe_quote(option_code)

        if success:
            return {
                "success": True,
                "message": f"成功取消訂閱: {option_code}",
                "active_subscriptions": len(shioaji_service.active_subscriptions),
                "timestamp": datetime.now().isoformat(),
            }
        else:
            raise HTTPException(status_code=500, detail="取消訂閱失敗")

    except Exception as e:
        logger.error(f"❌ 取消訂閱選擇權報價失敗: {e}")
        raise HTTPException(status_code=500, detail=f"取消訂閱失敗: {e!s}") from None


@router.get("/historical/{option_code}")
async def get_option_historical_data(
    option_code: str,
    option_type: str = Query(..., description="選擇權類型"),
    interval: str = Query("1m", description="時間間隔"),
    limit: int = Query(100, ge=1, le=1000, description="數據量限制"),
):
    """
    獲取選擇權歷史數據

    Args:
        option_code: 選擇權合約代碼
        option_type: 選擇權類型
        interval: 時間間隔 (1m, 5m, 15m, 1h, 1d)
        limit: 數據量限制
    """
    try:
        if not shioaji_service.ensure_logged_in():
            raise HTTPException(status_code=503, detail="Shioaji 服務未登錄")

        option_type = option_type.upper()
        if option_type not in ["TX1", "TX2", "TXO", "TX4", "TXY", "TXU"]:
            raise HTTPException(status_code=400, detail="不支援的選擇權類型")

        # 獲取歷史 K 線數據
        historical_data = shioaji_service.get_historical_klines(
            symbol=option_code, interval=interval, limit=limit
        )

        return {
            "success": True,
            "option_code": option_code,
            "option_type": option_type,
            "interval": interval,
            "data": historical_data.get("data", []),
            "contract": historical_data.get("contract", {}),
            "count": len(historical_data.get("data", [])),
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"❌ 獲取選擇權歷史數據失敗: {e}")
        raise HTTPException(
            status_code=500, detail=f"獲取歷史數據失敗: {e!s}"
        ) from None


@router.get("/status")
async def get_option_subscription_status():
    """
    獲取選擇權訂閱狀態
    """
    try:
        if not shioaji_service.ensure_logged_in():
            raise HTTPException(status_code=503, detail="Shioaji 服務未登錄")

        # 篩選選擇權相關的訂閱
        option_subscriptions = [
            sub
            for sub in shioaji_service.active_subscriptions
            if any(
                opt_type in sub
                for opt_type in ["TX1", "TX2", "TXO", "TX4", "TXY", "TXU"]
            )
        ]

        return {
            "success": True,
            "message": "選擇權訂閱狀態",
            "total_subscriptions": len(shioaji_service.active_subscriptions),
            "option_subscriptions": len(option_subscriptions),
            "active_options": option_subscriptions,
            "service_status": {
                "logged_in": shioaji_service.is_logged_in(),
                "initialized": shioaji_service.lifecycle._is_initialized,
                "callbacks_count": len(shioaji_service.quote_callbacks),
            },
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"❌ 獲取選擇權訂閱狀態失敗: {e}")
        raise HTTPException(status_code=500, detail=f"獲取狀態失敗: {e!s}") from None
