#!/usr/bin/env python3
"""
測試開發環境清理場景
驗證 Ctrl+C、hot reload、正常退出等情況下的資源清理
"""

import os
import signal
import sys
import time
from datetime import datetime

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.services.shioaji_service import shioaji_service


def test_normal_operation():
    """測試正常操作流程"""
    print("1. 測試正常操作流程")
    print("=" * 40)

    try:
        # 登錄
        print("   登錄中...")
        login_result = shioaji_service.login()
        print(f"   登錄結果: {'✅ 成功' if login_result else '❌ 失敗'}")

        # 檢查狀態
        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")

        # 模擬一些操作
        print("   模擬操作中...")
        time.sleep(1)

        # 正常登出
        print("   正常登出中...")
        logout_result = shioaji_service.logout()
        print(f"   登出結果: {'✅ 成功' if logout_result else '❌ 失敗'}")
        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")

    except Exception as e:
        print(f"   ❌ 正常操作測試失敗: {e}")

    print()


def test_force_cleanup():
    """測試強制清理功能"""
    print("2. 測試開發環境強制清理")
    print("=" * 40)

    try:
        # 先登錄
        print("   登錄中...")
        shioaji_service.login()
        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")

        # 模擬添加一些訂閱
        print("   模擬添加訂閱...")
        shioaji_service.active_subscriptions.add("2330")
        shioaji_service.active_subscriptions.add("2317")
        print(f"   活躍訂閱: {len(shioaji_service.active_subscriptions)} 個")

        # 執行強制清理
        print("   執行強制清理...")
        shioaji_service.force_cleanup_for_restart()

        # 檢查清理結果
        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
        print(f"   活躍訂閱: {len(shioaji_service.active_subscriptions)} 個")
        print(f"   待處理任務: {len(shioaji_service._pending_tasks)} 個")

    except Exception as e:
        print(f"   ❌ 強制清理測試失敗: {e}")

    print()


def test_emergency_logout():
    """測試緊急登出功能"""
    print("3. 測試緊急登出")
    print("=" * 40)

    try:
        # 先登錄
        print("   登錄中...")
        shioaji_service.login()
        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")

        # 執行緊急登出
        print("   執行緊急登出...")
        shioaji_service._emergency_logout()

        # 檢查結果(注意:緊急登出只登出 API,不改變 lifecycle 狀態)
        print("   緊急登出完成")

    except Exception as e:
        print(f"   ❌ 緊急登出測試失敗: {e}")

    print()


def test_ctrl_c_simulation():
    """模擬 Ctrl+C 信號"""
    print("4. 模擬 Ctrl+C 信號處理")
    print("=" * 40)

    try:
        # 先登錄
        print("   登錄中...")
        shioaji_service.login()
        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")

        # 添加一些模擬數據
        shioaji_service.active_subscriptions.add("2330")
        print(f"   活躍訂閱: {len(shioaji_service.active_subscriptions)} 個")

        print("   模擬發送 SIGINT 信號...")
        print("   注意:這會觸發程序退出,請觀察清理日志")

        # 這會觸發我們的信號處理器
        os.kill(os.getpid(), signal.SIGINT)

    except KeyboardInterrupt:
        print("   收到 KeyboardInterrupt,信號處理器應該已經處理")
    except Exception as e:
        print(f"   ❌ Ctrl+C 模擬測試出錯: {e}")


def test_connection_limit_scenario():
    """測試連線數限制場景"""
    print("5. 測試連線數管理")
    print("=" * 40)

    try:
        print("   檢查初始連線狀態...")

        # 嘗試獲取使用量統計
        usage_stats = shioaji_service.get_usage_stats()
        print(f"   API 狀態: {usage_stats.status}")

        if usage_stats.status == "success" and usage_stats.connections is not None:
            print(f"   當前連線數: {usage_stats.connections}")
        else:
            print(f"   無法獲取連線數: {usage_stats.warning_message}")

        # 登錄
        print("   登錄中...")
        login_result = shioaji_service.login()
        print(f"   登錄結果: {'✅ 成功' if login_result else '❌ 失敗'}")

        # 再次檢查連線數
        if login_result:
            usage_stats = shioaji_service.get_usage_stats()
            if usage_stats.status == "success" and usage_stats.connections is not None:
                print(f"   登錄後連線數: {usage_stats.connections}")

        # 強制清理(確保登出)
        print("   執行強制清理以釋放連線...")
        shioaji_service.force_cleanup_for_restart()

        # 最終檢查
        time.sleep(1)  # 等待一秒讓清理生效
        usage_stats = shioaji_service.get_usage_stats()
        if usage_stats.status == "success" and usage_stats.connections is not None:
            print(f"   清理後連線數: {usage_stats.connections}")

    except Exception as e:
        print(f"   ❌ 連線數測試失敗: {e}")

    print()


def main():
    """主測試函數"""
    print("🧪 Shioaji 服務清理場景測試")
    print("=" * 60)
    print(f"測試開始時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # 運行各項測試
    test_normal_operation()
    test_force_cleanup()
    test_emergency_logout()
    test_connection_limit_scenario()

    print("⚠️  最後測試:Ctrl+C 信號處理")
    print("   這個測試會導致程序退出,請觀察清理日誌")
    print("   按 Enter 繼續...")
    input()

    # 這個測試會導致程序退出
    test_ctrl_c_simulation()

    print("🎯 所有測試完成")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🚨 收到 Ctrl+C,清理邏輯應該已經觸發")
        print("📋 請檢查上方的清理日誌")
    except Exception as e:
        print(f"\n❌ 測試過程出錯: {e}")
    finally:
        print(f"\n測試結束時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
