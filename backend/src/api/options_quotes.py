# src/api/options_quotes.py

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from src.services.shioaji_service import shioaji_service

router = APIRouter(prefix="/options", tags=["台指選擇權報價"])


@router.get("/contracts/filtered")
async def get_filtered_option_contracts(
    option_types: str = Query(
        default="TXO", description="選擇權類型,逗號分隔 (如: TX1,TX2,TXO 或 TXO)"
    ),
    target_months: str = Query(
        default="202509,202510", description="目標月份,逗號分隔 (如: 202509,202510)"
    ),
    price_range: int = Query(
        default=600, ge=100, le=2000, description="價格範圍 (上下多少點)"
    ),
    futures_symbol: str = Query(
        default="TXFR1", description="期貨合約代號 (如: TXFR1)"
    ),
    call_put_filter: str = Query(
        default="both",
        regex="^(call|put|both)$",
        description="篩選類型: call, put, 或 both",
    ),
):
    """
    🎯 獲取指定類型和月份的選擇權合約

    根據指定的選擇權類型、目標月份和期貨價格範圍,返回符合條件的合約

    Args:
        option_types: 選擇權類型,逗號分隔 (TX1,TX2,TXO,TX4,TXY,TXU)
        target_months: 目標月份,逗號分隔 (202509,202510)
        price_range: 上下價格範圍 (點數)
        futures_symbol: 期貨合約代號
        call_put_filter: 篩選類型 (call/put/both)
    """
    try:
        if not shioaji_service.ensure_logged_in():
            raise HTTPException(status_code=503, detail="Shioaji 服務未登錄")

        # 解析選擇權類型
        option_type_list = [t.strip().upper() for t in option_types.split(",")]
        valid_types = ["TX1", "TX2", "TXO", "TX4", "TXY", "TXU"]

        for opt_type in option_type_list:
            if opt_type not in valid_types:
                raise HTTPException(
                    status_code=400, detail=f"不支援的選擇權類型: {opt_type}"
                )

        # 解析目標月份
        target_month_list = [m.strip() for m in target_months.split(",")]

        # 1. 獲取期貨當前價格 (使用高效 snapshot API)
        current_futures_price = shioaji_service.get_current_price(futures_symbol)
        if current_futures_price is None:
            raise HTTPException(
                status_code=404, detail=f"無法獲取期貨 {futures_symbol} 的價格數據"
            )

        # 2. 計算價格範圍
        price_lower = current_futures_price - price_range
        price_upper = current_futures_price + price_range

        logger.info(
            f"💰 價格範圍: {price_lower:.0f} ~ {price_upper:.0f} (範圍: ±{price_range})"
        )

        # 3. 遍歷每個選擇權類型並搜尋合約
        all_call_contracts = []
        all_put_contracts = []

        for option_type in option_type_list:
            logger.info(f"🔍 搜尋 {option_type} 選擇權合約...")

            try:
                option_group = getattr(
                    shioaji_service.api.Contracts.Options, option_type
                )

                # 遍歷該類型的所有選擇權合約
                for contract_name in dir(option_group):
                    if contract_name.startswith("_"):
                        continue

                    try:
                        contract = getattr(option_group, contract_name)

                        # 檢查是否有履約價
                        if (
                            not hasattr(contract, "strike_price")
                            or not contract.strike_price
                        ):
                            continue

                        strike_price = float(contract.strike_price)

                        # 檢查價格範圍
                        if not (price_lower <= strike_price <= price_upper):
                            continue

                        # 檢查月份
                        delivery_month = getattr(contract, "delivery_month", "")
                        if delivery_month not in target_month_list:
                            continue

                        # 判斷Call/Put
                        contract_code = getattr(contract, "code", contract_name)
                        contract_symbol = getattr(contract, "symbol", contract_name)

                        is_call = (
                            "C" in contract_code[-2:]
                            or "C" in contract_symbol[-2:]
                            or "Call" in str(getattr(contract, "option_right", ""))
                        )
                        is_put = (
                            "P" in contract_code[-2:]
                            or "P" in contract_symbol[-2:]
                            or "Put" in str(getattr(contract, "option_right", ""))
                        )

                        # 應用Call/Put篩選
                        if call_put_filter == "call" and not is_call:
                            continue
                        if call_put_filter == "put" and not is_put:
                            continue

                        if not is_call and not is_put:
                            continue

                        contract_info = {
                            "code": contract_code,
                            "symbol": contract_symbol,
                            "name": getattr(contract, "name", ""),
                            "option_type": option_type,
                            "strike_price": strike_price,
                            "delivery_date": str(
                                getattr(contract, "delivery_date", "")
                            ),
                            "delivery_month": delivery_month,
                            "option_right": str(getattr(contract, "option_right", ""))
                            .split(".")[-1]
                            .replace("'", "")
                            .replace(">", "")
                            if hasattr(contract, "option_right")
                            else ("Call" if is_call else "Put"),
                            "underlying_kind": getattr(contract, "underlying_kind", ""),
                            "unit": getattr(contract, "unit", 1),
                            "reference": getattr(contract, "reference", None),
                            "contract_name": contract_name,
                            "distance_from_futures": abs(
                                strike_price - current_futures_price
                            ),
                            "moneyness": _calculate_moneyness(
                                strike_price, current_futures_price, is_call
                            ),
                        }

                        if is_call:
                            all_call_contracts.append(contract_info)
                        elif is_put:
                            all_put_contracts.append(contract_info)

                    except Exception as contract_error:
                        logger.debug(f"跳過無效合約 {contract_name}: {contract_error}")
                        continue

            except AttributeError:
                logger.warning(f"找不到選擇權類型: {option_type}")
                continue

        # 按照選擇權類型、履約價、到期月份排序
        def _safe_sort_key(contract):
            strike = contract.get("strike_price", 0)
            if strike is None:
                strike = 0
            return (
                contract.get("option_type", ""),
                float(strike),
                contract.get("delivery_month", ""),
            )

        all_call_contracts.sort(key=_safe_sort_key)
        all_put_contracts.sort(key=_safe_sort_key)

        # 按選擇權類型分組
        contracts_by_type = {}
        for option_type in option_type_list:
            call_contracts_for_type = [
                c for c in all_call_contracts if c["option_type"] == option_type
            ]
            put_contracts_for_type = [
                c for c in all_put_contracts if c["option_type"] == option_type
            ]

            contracts_by_type[option_type] = {
                "call_options": call_contracts_for_type,
                "put_options": put_contracts_for_type,
                "call_count": len(call_contracts_for_type),
                "put_count": len(put_contracts_for_type),
                "total_count": len(call_contracts_for_type)
                + len(put_contracts_for_type),
            }

        # 統計資訊
        contract_stats = {}
        for option_type in option_type_list:
            call_count = len(
                [c for c in all_call_contracts if c["option_type"] == option_type]
            )
            put_count = len(
                [c for c in all_put_contracts if c["option_type"] == option_type]
            )
            contract_stats[option_type] = {
                "call_contracts": call_count,
                "put_contracts": put_count,
                "total": call_count + put_count,
            }

        return {
            "success": True,
            "message": "成功獲取篩選後的選擇權合約",
            "filters_applied": {
                "option_types": option_type_list,
                "target_months": target_month_list,
                "call_put_filter": call_put_filter,
                "price_range": f"±{price_range}點",
            },
            "futures_info": {
                "symbol": futures_symbol,
                "current_price": current_futures_price,
                "method": "snapshot_api",
            },
            "price_filter": {
                "range": price_range,
                "lower_bound": price_lower,
                "upper_bound": price_upper,
            },
            "option_contracts": {
                "all_call_options": all_call_contracts,
                "all_put_options": all_put_contracts,
                "by_type": contracts_by_type,
            },
            "summary": {
                "total_call_contracts": len(all_call_contracts),
                "total_put_contracts": len(all_put_contracts),
                "total_contracts": len(all_call_contracts) + len(all_put_contracts),
                "by_option_type": contract_stats,
            },
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 獲取篩選選擇權合約失敗: {e}")
        raise HTTPException(
            status_code=500, detail=f"獲取篩選選擇權合約失敗: {e!s}"
        ) from None


def _calculate_moneyness(
    strike_price: float, underlying_price: float, is_call: bool
) -> str:
    """
    計算價內外狀態

    Args:
        strike_price: 履約價
        underlying_price: 標的價格
        is_call: 是否為買權

    Returns:
        ITM (價內), ATM (價平), OTM (價外)
    """
    tolerance = 25  # 價平容忍度 (點數)

    if abs(strike_price - underlying_price) <= tolerance:
        return "ATM"  # 價平

    if is_call:
        return "ITM" if underlying_price > strike_price else "OTM"
    else:  # Put
        return "ITM" if underlying_price < strike_price else "OTM"


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
