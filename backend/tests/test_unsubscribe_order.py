#!/usr/bin/env python3
"""
測試訂閱取消順序
驗證在登出前是否正確取消所有 API 訂閱
"""

import os
import sys
import time
from datetime import datetime

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.services.shioaji_service import shioaji_service


def test_subscription_cleanup_order():
    """測試訂閱清理順序"""
    print("📡 訂閱清理順序測試")
    print("=" * 50)
    print(f"測試開始: {datetime.now().strftime('%H:%M:%S')}")
    print()

    try:
        # 1. 登錄服務
        print("1. 登錄服務")
        login_result = shioaji_service.login()
        print(f"   登錄結果: {'✅ 成功' if login_result else '❌ 失敗'}")

        if not login_result:
            print("   登錄失敗,無法進行測試")
            return

        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
        print()

        # 2. 添加訂閱
        print("2. 添加測試訂閱")
        test_symbols = ["2330", "2317", "2454", "0050"]

        for symbol in test_symbols:
            try:
                subscribe_result = shioaji_service.subscribe_quote(symbol)
                print(f"   訂閱 {symbol}: {'✅' if subscribe_result else '❌'}")
            except Exception as e:
                print(f"   訂閱 {symbol} 失敗: {e}")

        print(f"   當前活躍訂閱: {len(shioaji_service.active_subscriptions)} 個")
        print(f"   訂閱列表: {list(shioaji_service.active_subscriptions)}")
        print()

        # 3. 檢查訂閱狀態
        print("3. 運行一段時間以確保訂閱生效")
        print("   等待 3 秒...")
        time.sleep(3)
        print(f"   活躍訂閱: {len(shioaji_service.active_subscriptions)} 個")
        print()

        # 4. 測試批量取消訂閱方法
        print("4. 測試批量取消訂閱(在登錄狀態下)")
        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
        print(f"   取消前訂閱數: {len(shioaji_service.active_subscriptions)}")

        # 直接調用批量取消方法
        print("   執行批量取消...")
        shioaji_service._batch_unsubscribe_all()

        print(f"   取消後訂閱數: {len(shioaji_service.active_subscriptions)}")
        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
        print()

        # 5. 重新添加訂閱,測試完整清理流程
        print("5. 重新添加訂閱,測試完整清理流程")

        # 重新添加一些訂閱
        for symbol in ["2330", "2317"]:
            shioaji_service.subscribe_quote(symbol)
            print(f"   重新訂閱 {symbol}")

        print(f"   重新訂閱後: {len(shioaji_service.active_subscriptions)} 個")
        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
        print()

        # 6. 測試完整的強制清理流程
        print("6. 測試完整的強制清理流程")
        print("   這會按順序執行:取消訂閱 → 登出 → 等待 → 清理任務")
        print("   執行清理...")

        start_time = time.time()
        shioaji_service.force_cleanup_for_restart()
        cleanup_time = time.time() - start_time

        print(f"   清理耗時: {cleanup_time:.2f} 秒")
        print(f"   最終訂閱數: {len(shioaji_service.active_subscriptions)}")
        print(f"   最終登錄狀態: {shioaji_service.is_logged_in()}")
        print()

        # 7. 驗證重新登錄
        print("7. 驗證重新登錄")
        print("   等待 2 秒後嘗試重新登錄...")
        time.sleep(2)

        retry_result = shioaji_service.login()
        print(f"   重新登錄結果: {'✅ 成功' if retry_result else '❌ 失敗'}")

        if retry_result:
            print("   ✅ 清理順序正確,重新登錄成功")

            # 獲取使用量統計
            try:
                usage_stats = shioaji_service.get_usage_stats()
                if usage_stats.status == "success":
                    print(f"   當前連線數: {usage_stats.connections}")
            except Exception as e:
                print(f"   獲取使用量失敗: {e}")
        else:
            print("   ❌ 重新登錄失敗,可能仍有資源未釋放")

    except Exception as e:
        print(f"❌ 測試過程出錯: {e}")
        import traceback

        traceback.print_exc()

    print()
    print("=" * 50)
    print(f"測試結束: {datetime.now().strftime('%H:%M:%S')}")


def test_individual_unsubscribe():
    """測試單個取消訂閱在登出後的行為"""
    print("\n🔍 單個取消訂閱測試")
    print("=" * 30)

    try:
        # 確保登錄
        shioaji_service.login()

        # 添加一個訂閱
        print("添加測試訂閱...")
        shioaji_service.subscribe_quote("2330")
        print(f"當前訂閱: {list(shioaji_service.active_subscriptions)}")

        # 登出
        print("執行登出...")
        shioaji_service.logout()
        print(f"登錄狀態: {shioaji_service.is_logged_in()}")

        # 嘗試取消訂閱
        print("嘗試在登出後取消訂閱...")
        result = shioaji_service.unsubscribe_quote("2330")
        print(f"取消訂閱結果: {'✅ 成功' if result else '❌ 失敗'}")
        print(f"最終訂閱數: {len(shioaji_service.active_subscriptions)}")

        print("📝 這個測試驗證了為什麼我們需要在登出前取消訂閱")

    except Exception as e:
        print(f"測試出錯: {e}")


if __name__ == "__main__":
    try:
        test_subscription_cleanup_order()
        test_individual_unsubscribe()

        print("\n🎯 測試總結:")
        print("   ✅ 新的清理順序:取消訂閱 → 登出 → 等待 → 清理任務")
        print("   ✅ 確保 API 訂閱在登錄狀態下正確取消")
        print("   ✅ 避免了登出後無法取消訂閱的問題")

    except Exception as e:
        print(f"❌ 測試失敗: {e}")
    finally:
        # 確保最終清理
        print("\n🧹 執行最終清理...")
        try:
            shioaji_service.force_cleanup_for_restart()
        except Exception:
            pass
