#!/usr/bin/env python3
"""
測試 Shioaji 服務生命週期管理
"""

import os
import sys

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime

from src.services.shioaji_service import shioaji_service


def test_lifecycle_management():
    """測試生命週期管理功能"""
    print("🔄 測試 Shioaji 服務生命週期管理")
    print("=" * 60)

    # 1. 測試初始狀態
    print("1. 檢查初始狀態")
    print(f"   是否已登錄: {shioaji_service.is_logged_in()}")
    print(f"   是否已銷毀: {shioaji_service.lifecycle.is_destroyed()}")
    print()

    # 2. 測試登錄
    print("2. 測試登錄")
    login_success = shioaji_service.login()
    print(f"   登錄結果: {'✅ 成功' if login_success else '❌ 失敗'}")
    print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
    print()

    # 3. 測試確保登錄
    print("3. 測試確保登錄(應該跳過重複登錄)")
    ensure_result = shioaji_service.ensure_logged_in()
    print(f"   確保登錄結果: {'✅ 成功' if ensure_result else '❌ 失敗'}")
    print()

    # 4. 測試清理
    print("4. 測試清理資源")
    cleanup_success = shioaji_service.cleanup()
    print(f"   清理結果: {'✅ 成功' if cleanup_success else '❌ 失敗'}")
    print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
    print()

    # 5. 測試安全登出
    print("5. 測試安全登出")
    logout_success = shioaji_service.logout(force=False)
    print(f"   登出結果: {'✅ 成功' if logout_success else '❌ 失敗'}")
    print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
    print()

    # 6. 重新登錄並測試強制登出
    print("6. 重新登錄並測試強制登出")
    shioaji_service.login()
    print(f"   重新登錄狀態: {shioaji_service.is_logged_in()}")

    force_logout_success = shioaji_service.logout(force=True)
    print(f"   強制登出結果: {'✅ 成功' if force_logout_success else '❌ 失敗'}")
    print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
    print()

    # 7. 測試銷毀
    print("7. 測試完全銷毀")
    destroy_success = shioaji_service.destroy()
    print(f"   銷毀結果: {'✅ 成功' if destroy_success else '❌ 失敗'}")
    print(f"   是否已銷毀: {shioaji_service.lifecycle.is_destroyed()}")
    print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
    print()

    # 8. 測試銷毀後的操作
    print("8. 測試銷毀後的操作(應該失敗)")
    login_after_destroy = shioaji_service.login()
    print(f"   銷毀後登錄結果: {'✅ 成功' if login_after_destroy else '❌ 失敗(預期)'}")
    print()

    print("=" * 60)
    print(f"測試完成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


def test_usage_api_after_lifecycle():
    """測試在生命週期管理後是否能正常調用 usage API"""
    print("\n🔍 測試使用量 API(在生命週期測試後)")
    print("-" * 40)

    try:
        # 創建新的服務實例
        from src.services.shioaji_service import ShioajiService

        test_service = ShioajiService()

        # 測試獲取使用量
        usage_stats = test_service.get_usage_stats()
        print(f"使用量 API 狀態: {usage_stats.status}")

        if usage_stats.status == "success":
            print("✅ 使用量 API 正常工作")
            if usage_stats.connections is not None:
                print(f"   連接次數: {usage_stats.connections}")
            if usage_stats.bytes_used is not None:
                print(f"   已使用流量: {usage_stats.bytes_used:.2f} MB")
        else:
            print("❌ 使用量 API 出現錯誤")
            print(f"   錯誤訊息: {usage_stats.warning_message}")

        # 清理測試實例
        test_service.destroy()

    except Exception as e:
        print(f"❌ 使用量 API 測試失敗: {e}")


if __name__ == "__main__":
    test_lifecycle_management()
    test_usage_api_after_lifecycle()
