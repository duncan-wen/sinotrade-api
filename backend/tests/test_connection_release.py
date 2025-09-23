#!/usr/bin/env python3
"""
測試連線數釋放機制
驗證登出後連線數是否正確釋放
"""

import os
import sys
import time
from datetime import datetime

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.services.shioaji_service import shioaji_service


def get_connection_count():
    """獲取當前連線數"""
    try:
        usage_stats = shioaji_service.get_usage_stats()
        if usage_stats.status == "success" and usage_stats.connections is not None:
            return usage_stats.connections
        else:
            return None
    except Exception as e:
        print(f"   無法獲取連線數: {e}")
        return None


def test_connection_release():
    """測試連線數釋放機制"""
    print("🔗 連線數釋放測試")
    print("=" * 50)
    print(f"測試開始: {datetime.now().strftime('%H:%M:%S')}")
    print()

    # 1. 檢查初始連線數
    print("1. 檢查初始狀態")
    initial_connections = get_connection_count()
    print(f"   初始連線數: {initial_connections}")
    print(f"   初始登錄狀態: {shioaji_service.is_logged_in()}")
    print()

    # 2. 登錄並檢查連線數變化
    print("2. 登錄服務")
    login_result = shioaji_service.login()
    print(f"   登錄結果: {'✅ 成功' if login_result else '❌ 失敗'}")

    if login_result:
        after_login_connections = get_connection_count()
        print(f"   登錄後連線數: {after_login_connections}")

        if initial_connections is not None and after_login_connections is not None:
            change = after_login_connections - initial_connections
            print(f"   連線數變化: {change:+d}")
        print()

        # 3. 模擬使用
        print("3. 模擬服務使用")
        print("   添加模擬訂閱...")
        shioaji_service.active_subscriptions.add("2330")
        shioaji_service.active_subscriptions.add("2317")
        print(f"   活躍訂閱: {len(shioaji_service.active_subscriptions)} 個")

        print("   運行 2 秒...")
        time.sleep(2)
        print()

        # 4. 測試強制清理
        print("4. 執行強制清理")
        print("   執行前連線數:", get_connection_count())
        print("   執行清理...")

        start_time = time.time()
        shioaji_service.force_cleanup_for_restart()
        cleanup_time = time.time() - start_time

        print(f"   清理耗時: {cleanup_time:.2f} 秒")
        print(f"   清理後登錄狀態: {shioaji_service.is_logged_in()}")
        print(f"   清理後訂閱數: {len(shioaji_service.active_subscriptions)}")
        print()

        # 5. 檢查連線數釋放
        print("5. 驗證連線數釋放")
        after_cleanup_connections = get_connection_count()
        print(f"   清理後連線數: {after_cleanup_connections}")

        if (
            after_login_connections is not None
            and after_cleanup_connections is not None
        ):
            release_change = after_cleanup_connections - after_login_connections
            print(f"   連線數變化: {release_change:+d}")

            if release_change <= 0:
                print("   ✅ 連線數已釋放或減少")
            else:
                print("   ⚠️ 連線數未減少,可能需要更多時間")
        print()

        # 6. 等待並重新檢查
        print("6. 等待更長時間後重新檢查")
        print("   等待 3 秒...")
        time.sleep(3)

        final_connections = get_connection_count()
        print(f"   最終連線數: {final_connections}")

        if after_login_connections is not None and final_connections is not None:
            final_change = final_connections - after_login_connections
            print(f"   總變化: {final_change:+d}")
        print()

        # 7. 測試重新登錄
        print("7. 測試重新登錄")
        print("   嘗試重新登錄...")

        retry_login_result = shioaji_service.login()
        if retry_login_result:
            print("   ✅ 重新登錄成功")
            retry_connections = get_connection_count()
            print(f"   重新登錄後連線數: {retry_connections}")
        else:
            print("   ❌ 重新登錄失敗（可能仍達到連線限制）")
        print()

    else:
        print("   初始登錄失敗,無法進行後續測試")

    print("=" * 50)
    print(f"測試結束: {datetime.now().strftime('%H:%M:%S')}")


def test_multiple_cleanup_cycles():
    """測試多次清理循環"""
    print("\n🔄 多次清理循環測試")
    print("=" * 30)

    for i in range(3):
        print(f"循環 {i + 1}/3:")

        # 嘗試登錄
        login_result = shioaji_service.login()
        connections = get_connection_count()
        print(f"  登錄: {'✅' if login_result else '❌'}, 連線數: {connections}")

        if login_result:
            # 短暫使用
            time.sleep(0.5)

            # 強制清理
            shioaji_service.force_cleanup_for_restart()

            # 檢查結果
            final_connections = get_connection_count()
            print(f"  清理後連線數: {final_connections}")

            # 等待
            time.sleep(1)

        print()


if __name__ == "__main__":
    try:
        test_connection_release()
        test_multiple_cleanup_cycles()

        print("🎯 測試總結：")
        print("   - 如果重新登錄成功,說明清理邏輯有效")
        print("   - 如果出現 'Too Many Connections',說明需要等待更長時間")
        print("   - 在實際開發中,建議在檔案修改間隔間留出足夠時間")

    except Exception as e:
        print(f"❌ 測試過程出錯: {e}")
        import traceback

        traceback.print_exc()
    finally:
        # 確保最終清理
        print("\n🧹 執行最終清理...")
        try:
            shioaji_service.force_cleanup_for_restart()
        except Exception:
            pass
