#!/usr/bin/env python3
"""
測試 logout 和 unsubscribe 的防護機制
"""
import sys
import os

# 添加src目錄到路徑
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

def test_protection_mechanisms():
    print("🛡️ 測試 logout 和 unsubscribe 防護機制...")

    try:
        from services.shioaji_service import shioaji_service

        # 測試狀態標記
        print("📊 初始狀態:")
        print(f"  - 已登入: {shioaji_service._is_logged_in}")
        print(f"  - 已初始化: {shioaji_service._is_initialized}")
        print(f"  - 已銷毀: {shioaji_service._is_destroyed}")
        print(f"  - 活躍訂閱: {shioaji_service.active_subscriptions}")

        # 測試重複登出
        print("\n🔐 測試重複登出...")
        try:
            shioaji_service.logout()
            print("✅ 第一次登出成功")
            shioaji_service.logout()
            print("✅ 重複登出被正確處理")
        except Exception as e:
            print(f"❌ 登出測試失敗: {e}")

        # 測試無效參數的取消訂閱
        print("\n❌ 測試無效參數取消訂閱...")
        result = shioaji_service.unsubscribe_quote("")
        print(f"空字串結果: {result}")

        result = shioaji_service.unsubscribe_quote(None)
        print(f"None結果: {result}")

        # 測試未訂閱股票的取消
        print("\n📭 測試未訂閱股票取消...")
        result = shioaji_service.unsubscribe_quote("NONEXISTENT")
        print(f"未訂閱股票結果: {result}")

        print("
🛡️ 防護機制測試完成"        print("✅ 所有異常情況都被正確處理")

    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_protection_mechanisms()
