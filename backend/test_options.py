# test_options.py - 台指選擇權功能測試

import asyncio
from datetime import datetime
from typing import Any

from src.services.shioaji_service import shioaji_service


async def test_options_functionality() -> None:
    """測試台指選擇權功能"""

    print("=" * 60)
    print("🔥 台指選擇權功能測試")
    print("=" * 60)

    try:
        # 1. 初始化服務
        print("\n📡 1. 初始化 Shioaji 服務...")
        if not shioaji_service.initialize():
            print("❌ 服務初始化失敗")
            return

        print("✅ 服務初始化成功")

        # 2. 檢查可用的選擇權合約
        print("\n📊 2. 檢查可用的選擇權合約...")

        option_types = [
            "TXO",
            "TX1",
            "TX2",
            "TX4",
            "TX5",
            "TXU",
            "TXV",
            "TXX",
            "TXY",
            "TXZ",
        ]
        available_options: dict[str, dict[str, Any]] = {}

        for opt_type in option_types:
            try:
                option_group = getattr(shioaji_service.api.Contracts.Options, opt_type)
                contract_count = len(
                    [attr for attr in dir(option_group) if not attr.startswith("_")]
                )
                available_options[opt_type] = {
                    "available": True,
                    "contract_count": contract_count,
                }
                print(f"   ✅ {opt_type}: {contract_count} 個合約")

                # 顯示前幾個合約範例
                contracts = [
                    attr for attr in dir(option_group) if not attr.startswith("_")
                ][:3]
                for contract_name in contracts:
                    try:
                        contract = getattr(option_group, contract_name)
                        print(
                            f"      - {contract_name}: {getattr(contract, 'code', 'N/A')}"
                        )
                    except Exception:
                        continue

            except Exception as e:
                available_options[opt_type] = {"available": False, "error": str(e)}
                print(f"   ❌ {opt_type}: 不可用 ({e})")

        # 3. 測試合約獲取功能
        print("\n🔍 3. 測試合約獲取功能...")

        # 嘗試獲取一些常見的選擇權合約
        test_symbols = []

        # 從可用的選擇權中選擇測試標的
        for opt_type, info in available_options.items():
            if info.get("available"):
                try:
                    option_group = getattr(
                        shioaji_service.api.Contracts.Options, opt_type
                    )
                    contracts = [
                        attr for attr in dir(option_group) if not attr.startswith("_")
                    ]
                    if contracts:
                        test_symbols.append(contracts[0])  # 取第一個合約
                        break
                except Exception:
                    continue

        for symbol in test_symbols:
            print(f"\n   測試合約: {symbol}")
            contract = shioaji_service._get_contract(symbol)
            if contract:
                print("   ✅ 成功獲取合約:")
                print(f"      - 代碼: {getattr(contract, 'code', 'N/A')}")
                print(f"      - 符號: {getattr(contract, 'symbol', 'N/A')}")
                print(f"      - 履約價: {getattr(contract, 'strike_price', 'N/A')}")
                print(f"      - 到期日: {getattr(contract, 'delivery_date', 'N/A')}")
            else:
                print(f"   ❌ 無法獲取合約: {symbol}")

        # 4. 測試訂閱功能 (如果有可用合約)
        if test_symbols:
            print("\n📈 4. 測試訂閱功能...")
            test_symbol = test_symbols[0]
            print(f"   嘗試訂閱: {test_symbol}")

            try:
                success = shioaji_service.subscribe_quote(test_symbol)
                if success:
                    print(f"   ✅ 訂閱成功: {test_symbol}")
                    print(
                        f"   📊 當前活躍訂閱數: {len(shioaji_service.active_subscriptions)}"
                    )

                    # 等待一下看是否有數據
                    print("   ⏳ 等待 3 秒查看是否有數據...")
                    await asyncio.sleep(3)

                    # 取消訂閱
                    print(f"   🔄 取消訂閱: {test_symbol}")
                    unsubscribe_success = shioaji_service.unsubscribe_quote(test_symbol)
                    if unsubscribe_success:
                        print("   ✅ 取消訂閱成功")
                    else:
                        print("   ⚠️ 取消訂閱失敗")

                else:
                    print(f"   ❌ 訂閱失敗: {test_symbol}")

            except Exception as e:
                print(f"   ❌ 訂閱過程發生錯誤: {e}")

        # 5. 測試歷史數據獲取 (如果有可用合約)
        if test_symbols:
            print("\n📈 5. 測試歷史數據獲取...")
            test_symbol = test_symbols[0]
            print(f"   獲取 {test_symbol} 的歷史數據...")

            try:
                historical_data = shioaji_service.get_historical_klines(
                    symbol=test_symbol, interval="1d", limit=5
                )

                if historical_data.get("data"):
                    print(f"   ✅ 成功獲取 {len(historical_data['data'])} 筆歷史數據")
                    print("   📊 最新幾筆數據:")
                    for i, kline in enumerate(historical_data["data"][-3:]):
                        print(
                            f"      {i + 1}. 時間: {kline.get('time', 'N/A')}, 收盤: {kline.get('close', 'N/A')}"
                        )
                else:
                    print("   ⚠️ 未獲取到歷史數據")

            except Exception as e:
                print(f"   ❌ 獲取歷史數據失敗: {e}")

        print("\n" + "=" * 60)
        print("📋 測試總結:")
        print(
            f"   - 可用選擇權類型: {sum(1 for v in available_options.values() if v.get('available'))}/{len(option_types)}"
        )
        print(f"   - 測試合約數量: {len(test_symbols)}")
        print(
            f"   - 服務狀態: {'✅ 正常' if shioaji_service.is_logged_in() else '❌ 異常'}"
        )
        print("=" * 60)

    except Exception as e:
        print(f"❌ 測試過程發生錯誤: {e}")
        import traceback

        traceback.print_exc()

    finally:
        # 清理資源
        print("\n🧹 清理資源...")
        try:
            shioaji_service.cleanup()
            print("✅ 清理完成")
        except Exception as e:
            print(f"⚠️ 清理過程出現問題: {e}")


def test_contract_access() -> None:
    """簡單測試合約存取"""

    print("\n🔍 快速合約存取測試...")

    if not shioaji_service.ensure_logged_in():
        print("❌ 無法登入服務")
        return

    option_types = ["TX1", "TX2", "TXO", "TX4", "TX5", "TXY", "TXU"]

    for opt_type in option_types:
        try:
            option_group = getattr(shioaji_service.api.Contracts.Options, opt_type)
            contracts = [attr for attr in dir(option_group) if not attr.startswith("_")]

            print(f"📊 {opt_type}: {len(contracts)} 個合約")

            # 顯示前3個合約的詳細資訊
            for contract_name in contracts[:3]:
                try:
                    contract = getattr(option_group, contract_name)
                    code = getattr(contract, "code", "N/A")
                    strike = getattr(contract, "strike_price", "N/A")
                    delivery = getattr(contract, "delivery_date", "N/A")

                    print(
                        f"   - {contract_name}: 代碼={code}, 履約價={strike}, 到期={delivery}"
                    )

                except Exception as contract_error:
                    print(f"   - {contract_name}: 存取失敗 ({contract_error})")

        except Exception as group_error:
            print(f"❌ {opt_type}: 群組存取失敗 ({group_error})")


if __name__ == "__main__":
    print("🚀 開始台指選擇權功能測試")
    print(f"⏰ 測試時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # 先進行簡單測試
    test_contract_access()

    # 再進行完整測試
    asyncio.run(test_options_functionality())
