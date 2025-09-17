#!/usr/bin/env python3
"""
測試訂閱記錄功能
"""

import os
import sys

# 添加src目錄到路徑
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))


def test_subscription_tracking():
    print("🧪 測試訂閱記錄功能...")

    try:
        from services.shioaji_service import shioaji_service

        print("初始訂閱記錄:", shioaji_service.active_subscriptions)

        # 測試記錄功能(不實際訂閱)
        print("模擬添加訂閱記錄...")
        shioaji_service.active_subscriptions.add("2330")
        shioaji_service.active_subscriptions.add("2454")

        print("添加後訂閱記錄:", shioaji_service.active_subscriptions)

        # 測試移除功能
        print("模擬移除訂閱記錄...")
        shioaji_service.active_subscriptions.discard("2330")

        print("移除後訂閱記錄:", shioaji_service.active_subscriptions)

        # 測試清理功能
        print("測試清理功能...")
        shioaji_service.active_subscriptions.clear()

        print("清理後訂閱記錄:", shioaji_service.active_subscriptions)

        print("✅ 訂閱記錄功能測試完成")

    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_subscription_tracking()
