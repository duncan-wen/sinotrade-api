#!/usr/bin/env python3
"""
測試訂閱同步問題
驗證 subscription_manager 和 shioaji_service 的訂閱狀態是否同步
"""

import os
import sys
from datetime import datetime

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.services.shioaji_service import shioaji_service
from src.services.subscription_manager import subscription_manager


def test_subscription_sync():
    """測試訂閱同步問題"""
    print("🔄 訂閱同步測試")
    print("=" * 60)
    print(f"測試開始: {datetime.now().strftime('%H:%M:%S')}")
    print()

    try:
        # 1. 清理並準備環境
        print("1. 準備測試環境")
        shioaji_service.login()

        # 清理兩個系統
        subscription_manager.cleanup_all_subscriptions()
        for symbol in list(shioaji_service.active_subscriptions):
            shioaji_service.unsubscribe_quote(symbol)

        print("   初始狀態清理完成")
        print_sync_status()
        print()

        # 2. 模擬正常的 WebSocket 訂閱流程
        print("2. 模擬正常 WebSocket 訂閱流程")
        test_symbols = ["2330", "2317", "0050"]

        for symbol in test_symbols:
            print(f"   模擬客戶端訂閱 {symbol}...")

            # 模擬 socketio_manager 的邏輯
            need_shioaji_subscription = subscription_manager.add_subscriber(
                symbol, f"client_{symbol}"
            )

            if need_shioaji_subscription:
                print(f"   → 需要向 Shioaji 訂閱 {symbol}")
                success = shioaji_service.subscribe_quote(symbol)
                print(f"   → Shioaji 訂閱結果: {'✅' if success else '❌'}")
            else:
                print(f"   → {symbol} 已有訂閱,跳過 Shioaji 調用")

        print("\n   正常流程後的狀態:")
        print_sync_status()
        print()

        # 3. 模擬直接調用 shioaji_service 的情況
        print("3. 模擬直接調用 shioaji_service(繞過 subscription_manager)")
        direct_symbol = "2454"
        print(f"   直接訂閱 {direct_symbol}...")

        success = shioaji_service.subscribe_quote(direct_symbol)
        print(f"   直接訂閱結果: {'✅' if success else '❌'}")

        print("\n   直接調用後的狀態(應該出現不同步):")
        print_sync_status()
        check_sync_status()
        print()

        # 4. 模擬部分取消訂閱
        print("4. 模擬部分取消訂閱")
        unsubscribe_symbol = "2317"
        print(f"   模擬取消訂閱 {unsubscribe_symbol}...")

        need_shioaji_unsubscription = subscription_manager.remove_subscriber(
            unsubscribe_symbol, f"client_{unsubscribe_symbol}"
        )

        if need_shioaji_unsubscription:
            print(f"   → 需要向 Shioaji 取消訂閱 {unsubscribe_symbol}")
            success = shioaji_service.unsubscribe_quote(unsubscribe_symbol)
            print(f"   → Shioaji 取消訂閱結果: {'✅' if success else '❌'}")

        print("\n   部分取消後的狀態:")
        print_sync_status()
        check_sync_status()
        print()

        # 5. 測試清理時的同步檢查
        print("5. 測試清理時的同步檢查")
        manager_symbols = set(subscription_manager.shioaji_subscriptions)
        service_symbols = set(shioaji_service.active_subscriptions)

        print(f"   管理器記錄: {sorted(manager_symbols)}")
        print(f"   服務記錄: {sorted(service_symbols)}")

        if manager_symbols != service_symbols:
            print("   🚨 檢測到不同步!")
            print(f"   僅在管理器中: {sorted(manager_symbols - service_symbols)}")
            print(f"   僅在服務中: {sorted(service_symbols - manager_symbols)}")

            print("\n   建議的清理策略:")
            print("   1. 以 shioaji_service 的實際訂閱為準")
            print("   2. 取消所有實際的 API 訂閱")
            print("   3. 清理管理器記錄")
        else:
            print("   ✅ 兩個系統同步正常")

        print()

    except Exception as e:
        print(f"❌ 測試過程出錯: {e}")
        import traceback

        traceback.print_exc()

    print("=" * 60)
    print(f"測試結束: {datetime.now().strftime('%H:%M:%S')}")


def print_sync_status():
    """打印兩個系統的同步狀態"""
    manager_subs = subscription_manager.shioaji_subscriptions
    service_subs = shioaji_service.active_subscriptions

    print(f"   subscription_manager.shioaji_subscriptions: {sorted(manager_subs)}")
    print(f"   shioaji_service.active_subscriptions:       {sorted(service_subs)}")


def check_sync_status():
    """檢查同步狀態"""
    manager_symbols = set(subscription_manager.shioaji_subscriptions)
    service_symbols = set(shioaji_service.active_subscriptions)

    if manager_symbols == service_symbols:
        print("   ✅ 兩個系統同步")
    else:
        print("   🚨 兩個系統不同步!")
        if manager_symbols - service_symbols:
            print(f"   僅在管理器中: {sorted(manager_symbols - service_symbols)}")
        if service_symbols - manager_symbols:
            print(f"   僅在服務中: {sorted(service_symbols - manager_symbols)}")


def test_cleanup_with_sync_check():
    """測試帶同步檢查的清理邏輯"""
    print("\n🧹 測試帶同步檢查的清理邏輯")
    print("=" * 40)

    try:
        # 確保有一些訂閱
        shioaji_service.login()
        shioaji_service.subscribe_quote("2330")
        subscription_manager.add_subscriber("2317", "test_client")

        print("清理前狀態:")
        print_sync_status()
        check_sync_status()

        # 模擬 main.py 中的新清理邏輯
        print("\n執行同步檢查和清理...")

        manager_symbols = set(subscription_manager.shioaji_subscriptions)
        service_symbols = set(shioaji_service.active_subscriptions)

        if manager_symbols != service_symbols:
            print("檢測到訂閱不同步!")
            print(f"僅在管理器中: {sorted(manager_symbols - service_symbols)}")
            print(f"僅在服務中: {sorted(service_symbols - manager_symbols)}")

        # 以實際 API 訂閱為準進行清理
        shioaji_service.force_cleanup_for_restart()
        subscription_manager.cleanup_all_subscriptions()

        print("\n清理後狀態:")
        print_sync_status()
        check_sync_status()

    except Exception as e:
        print(f"清理測試出錯: {e}")


if __name__ == "__main__":
    try:
        test_subscription_sync()
        test_cleanup_with_sync_check()

        print("\n🎯 測試總結:")
        print("   ⚠️ subscription_manager 和 shioaji_service 維護獨立的訂閱記錄")
        print("   ⚠️ 直接調用 shioaji_service 會導致不同步")
        print("   ✅ 新的清理邏輯會檢測並報告不同步問題")
        print("   ✅ 以 shioaji_service 的實際訂閱為準進行清理")

    except Exception as e:
        print(f"❌ 測試失敗: {e}")
    finally:
        # 確保最終清理
        print("\n🧹 執行最終清理...")
        try:
            shioaji_service.force_cleanup_for_restart()
            subscription_manager.cleanup_all_subscriptions()
        except Exception:
            pass
