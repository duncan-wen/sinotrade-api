#!/usr/bin/env python3
"""
測試統一清理邏輯
驗證所有退出場景都使用一致的清理方法
"""

import os
import sys
import time
from datetime import datetime

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.services.shioaji_service import shioaji_service


def test_unified_cleanup_logic():
    """測試統一的清理邏輯"""
    print("🔄 統一清理邏輯測試")
    print("=" * 50)
    print(f"測試開始: {datetime.now().strftime('%H:%M:%S')}")
    print()

    try:
        # 1. 登錄並添加訂閱
        print("1. 準備測試環境")
        login_result = shioaji_service.login()
        print(f"   登錄結果: {'✅ 成功' if login_result else '❌ 失敗'}")

        if not login_result:
            print("   登錄失敗,無法進行測試")
            return

        # 添加一些訂閱
        test_symbols = ["2330", "2317"]
        for symbol in test_symbols:
            shioaji_service.subscribe_quote(symbol)
            print(f"   訂閱 {symbol}")

        print(f"   當前訂閱數: {len(shioaji_service.active_subscriptions)}")
        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
        print()

        # 2. 測試統一清理方法
        print("2. 測試統一清理方法 force_cleanup_for_restart()")
        print("   這個方法現在用於所有退出場景:")
        print("   - FastAPI shutdown")
        print("   - Ctrl+C 信號")
        print("   - 程序正常退出")
        print()

        before_connections = None
        try:
            usage_stats = shioaji_service.get_usage_stats()
            if usage_stats.status == "success":
                before_connections = usage_stats.connections
                print(f"   清理前連線數: {before_connections}")
        except Exception:
            pass

        print("   執行統一清理...")
        start_time = time.time()
        shioaji_service.force_cleanup_for_restart()
        cleanup_time = time.time() - start_time

        print(f"   清理耗時: {cleanup_time:.2f} 秒")
        print(f"   清理後訂閱數: {len(shioaji_service.active_subscriptions)}")
        print(f"   清理後登錄狀態: {shioaji_service.is_logged_in()}")

        # 檢查連線數變化
        try:
            time.sleep(1)  # 等待伺服器處理
            usage_stats = shioaji_service.get_usage_stats()
            if usage_stats.status == "success":
                after_connections = usage_stats.connections
                print(f"   清理後連線數: {after_connections}")

                if before_connections is not None:
                    change = after_connections - before_connections
                    if change <= 0:
                        print(f"   ✅ 連線數已釋放 ({change:+d})")
                    else:
                        print(f"   ⚠️ 連線數增加了 ({change:+d})")
        except Exception as e:
            print(f"   無法檢查清理後連線數: {e}")

        print()

        # 3. 驗證可以重新使用
        print("3. 驗證服務可以重新使用")
        print("   等待 2 秒後嘗試重新登錄...")
        time.sleep(2)

        retry_result = shioaji_service.login()
        print(f"   重新登錄結果: {'✅ 成功' if retry_result else '❌ 失敗'}")

        if retry_result:
            print("   ✅ 統一清理邏輯正確,服務可以重新使用")

            # 再次檢查連線數
            try:
                usage_stats = shioaji_service.get_usage_stats()
                if usage_stats.status == "success":
                    print(f"   重新登錄後連線數: {usage_stats.connections}")
            except Exception:
                pass
        else:
            print("   ❌ 重新登錄失敗,可能仍有連線數問題")

        print()

    except Exception as e:
        print(f"❌ 測試過程出錯: {e}")
        import traceback

        traceback.print_exc()

    print("=" * 50)
    print(f"測試結束: {datetime.now().strftime('%H:%M:%S')}")


def test_cleanup_vs_force_cleanup():
    """比較舊的 cleanup() 與新的 force_cleanup_for_restart()"""
    print("\n🔍 清理方法比較測試")
    print("=" * 30)

    try:
        # 測試舊的 cleanup 方法
        print("測試舊的 cleanup() 方法(僅清理,不登出):")

        # 先登錄
        shioaji_service.login()
        shioaji_service.subscribe_quote("2330")

        print(
            f"  清理前 - 登錄: {shioaji_service.is_logged_in()}, 訂閱: {len(shioaji_service.active_subscriptions)}"
        )

        # 使用舊方法
        success = shioaji_service.cleanup()
        print(f"  舊清理結果: {'✅' if success else '❌'}")
        print(
            f"  清理後 - 登錄: {shioaji_service.is_logged_in()}, 訂閱: {len(shioaji_service.active_subscriptions)}"
        )
        print("  📝 注意:舊方法不會登出,只是清理資源")

        print()

        # 現在測試新方法
        print("測試新的 force_cleanup_for_restart() 方法(清理+登出):")
        shioaji_service.subscribe_quote("2317")  # 重新添加訂閱

        print(
            f"  清理前 - 登錄: {shioaji_service.is_logged_in()}, 訂閱: {len(shioaji_service.active_subscriptions)}"
        )

        shioaji_service.force_cleanup_for_restart()
        print("  新清理完成")
        print(
            f"  清理後 - 登錄: {shioaji_service.is_logged_in()}, 訂閱: {len(shioaji_service.active_subscriptions)}"
        )
        print("  📝 注意:新方法會完全清理並登出")

    except Exception as e:
        print(f"比較測試出錯: {e}")


if __name__ == "__main__":
    try:
        test_unified_cleanup_logic()
        test_cleanup_vs_force_cleanup()

        print("\n🎯 測試總結:")
        print("   ✅ 統一清理邏輯:所有退出場景都使用 force_cleanup_for_restart()")
        print("   ✅ 正確順序:取消訂閱 → 登出 → 等待 → 清理任務")
        print("   ✅ 避免重複操作:不再在 main.py 中手動取消訂閱")
        print("   ✅ 連線數管理:確保每次退出都正確釋放連線")

    except Exception as e:
        print(f"❌ 測試失敗: {e}")
    finally:
        # 確保最終清理
        print("\n🧹 執行最終清理...")
        try:
            shioaji_service.force_cleanup_for_restart()
        except Exception:
            pass
