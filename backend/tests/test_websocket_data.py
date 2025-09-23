#!/usr/bin/env python3
"""
測試 WebSocket 數據流
檢查 Shioaji 訂閱和數據廣播是否正常工作
"""

import os
import sys
import time
from datetime import datetime

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_service_status():
    """檢查服務狀態"""
    print("🔍 檢查服務狀態")
    print("=" * 50)

    try:
        from src.services.shioaji_service import shioaji_service
        from src.services.subscription_manager import subscription_manager

        print("1. Shioaji 服務狀態:")
        print(f"   登錄狀態: {shioaji_service.is_logged_in()}")
        print(f"   初始化狀態: {shioaji_service.lifecycle._is_initialized}")
        print(f"   銷毀狀態: {shioaji_service.lifecycle.is_destroyed()}")
        print(f"   活躍訂閱: {list(shioaji_service.active_subscriptions)}")
        print(f"   回調數量: {len(shioaji_service.quote_callbacks)}")

        # 檢查回調函數
        if shioaji_service.quote_callbacks:
            print("   回調列表:")
            for i, callback in enumerate(shioaji_service.quote_callbacks):
                print(f"     {i + 1}. {callback.__name__}")
        else:
            print("   ⚠️ 沒有註冊的回調函數！")

        print("\n2. 訂閱管理器狀態:")
        status = subscription_manager.get_subscription_status()
        print(f"   管理器記錄的訂閱: {status['active_symbols']}")
        print(f"   總訂閱數: {status['total_symbols']}")
        print(f"   訂閱者統計: {status['subscriber_counts']}")

        # 檢查同步狀態
        print("\n3. 同步檢查:")
        manager_symbols = set(subscription_manager.shioaji_subscriptions)
        service_symbols = set(shioaji_service.active_subscriptions)

        if manager_symbols == service_symbols:
            print("   ✅ 兩個系統同步")
        else:
            print("   🚨 兩個系統不同步！")
            print(f"   僅在管理器中: {sorted(manager_symbols - service_symbols)}")
            print(f"   僅在服務中: {sorted(service_symbols - manager_symbols)}")

        return True

    except Exception as e:
        print(f"❌ 狀態檢查失敗: {e}")
        return False


def test_subscription_and_data():
    """測試訂閱和數據接收"""
    print("\n🔄 測試訂閱和數據接收")
    print("=" * 50)

    try:
        from src.services.shioaji_service import shioaji_service

        # 確保登錄
        if not shioaji_service.is_logged_in():
            print("登錄 Shioaji...")
            if not shioaji_service.login():
                print("❌ 登錄失敗")
                return False

        print("✅ Shioaji 已登錄")

        # 測試訂閱
        test_symbol = "2330"
        print(f"\n測試訂閱 {test_symbol}...")

        # 檢查回調數量
        callback_count_before = len(shioaji_service.quote_callbacks)
        print(f"訂閱前回調數量: {callback_count_before}")

        # 執行訂閱
        success = shioaji_service.subscribe_quote(test_symbol)
        print(f"訂閱結果: {'✅ 成功' if success else '❌ 失敗'}")

        if success:
            print(f"活躍訂閱: {list(shioaji_service.active_subscriptions)}")

            # 等待一段時間看是否有數據
            print("\n等待數據...")
            data_received = False

            # 創建一個測試回調來捕獲數據
            def test_callback(tick_data):
                nonlocal data_received
                data_received = True
                print(
                    f"📡 收到數據: {getattr(tick_data, 'symbol', 'unknown')} - {getattr(tick_data, 'close', 'N/A')}"
                )

            # 臨時添加測試回調
            shioaji_service.add_quote_callback(test_callback)
            print("已添加測試回調")

            # 等待數據
            for i in range(10):
                time.sleep(1)
                print(f"   等待中... {i + 1}/10")
                if data_received:
                    break

            if data_received:
                print("✅ 收到了實時數據")
            else:
                print("⚠️ 10秒內未收到數據")

            # 移除測試回調
            if test_callback in shioaji_service.quote_callbacks:
                shioaji_service.quote_callbacks.remove(test_callback)
                print("已移除測試回調")

        return success

    except Exception as e:
        print(f"❌ 訂閱測試失敗: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_socketio_broadcaster():
    """測試 SocketIO 廣播器"""
    print("\n📡 測試 SocketIO 廣播器")
    print("=" * 50)

    try:
        from src.services.socketio_manager import (
            SocketIOTickBroadcaster,
            socket_manager,
        )

        print("1. 創建廣播器...")
        broadcaster = SocketIOTickBroadcaster(socket_manager)
        print("✅ 廣播器創建成功")

        print("2. 測試廣播方法...")
        # 創建模擬數據
        mock_tick_data = {
            "symbol": "2330",
            "close": 500.0,
            "volume": 1000,
            "timestamp": str(datetime.now()),
        }

        # 測試廣播（這不會實際發送,因為沒有連接的客戶端）
        try:
            broadcaster.broadcast_tick_data(mock_tick_data)
            print("✅ 廣播方法調用成功")
        except Exception as e:
            print(f"⚠️ 廣播方法調用失敗: {e}")

        print("3. 檢查廣播器是否註冊為回調...")
        from src.services.shioaji_service import shioaji_service

        # 檢查廣播器的方法是否在回調列表中
        broadcast_method = broadcaster.broadcast_tick_data
        is_registered = broadcast_method in shioaji_service.quote_callbacks

        print(f"廣播器回調註冊狀態: {'✅ 已註冊' if is_registered else '❌ 未註冊'}")

        if not is_registered:
            print("   這可能是 WebSocket 數據問題的原因！")
            print("   嘗試重新註冊...")
            shioaji_service.add_quote_callback(broadcast_method)
            print("   ✅ 重新註冊完成")

        return True

    except Exception as e:
        print(f"❌ SocketIO 廣播器測試失敗: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_websocket_connection():
    """測試 WebSocket 連接能力"""
    print("\n🔌 測試 WebSocket 連接")
    print("=" * 50)

    try:
        print("1. 檢查 SocketIO 服務器狀態...")
        from src.services.socketio_manager import socket_manager

        # 檢查 socket_manager 是否正常
        print(f"   Socket.IO 管理器: {type(socket_manager)}")

        print("2. 檢查事件註冊...")
        # 這裡我們只能檢查模組是否正常導入
        print("   ✅ SocketIO 管理器模組正常")

        print("3. 建議檢查項目:")
        print("   - 前端是否正確連接到 ws://localhost:8000/socket.io")
        print("   - 瀏覽器開發者工具的 Network 標籤中 WebSocket 連接狀態")
        print("   - 前端是否正確監聽 'kline_tick' 事件")

        return True

    except Exception as e:
        print(f"❌ WebSocket 測試失敗: {e}")
        return False


if __name__ == "__main__":
    print("🧪 WebSocket 數據流測試")
    print("=" * 60)
    print(f"測試開始: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    tests = [
        ("服務狀態檢查", test_service_status),
        ("SocketIO 廣播器檢查", test_socketio_broadcaster),
        ("訂閱和數據測試", test_subscription_and_data),
        ("WebSocket 連接檢查", test_websocket_connection),
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        print(f"🧪 {test_name}")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} 通過")
            else:
                failed += 1
                print(f"❌ {test_name} 失敗")
        except Exception as e:
            failed += 1
            print(f"❌ {test_name} 執行失敗: {e}")
        print()

    print("=" * 60)
    print(f"測試結果: ✅ {passed} 個通過, ❌ {failed} 個失敗")

    if failed > 0:
        print("\n🔧 可能的解決方案:")
        print("1. 重啟 FastAPI 服務器")
        print("2. 檢查前端 WebSocket 連接代碼")
        print("3. 確認前端監聽正確的事件名稱")
        print("4. 檢查瀏覽器控制台是否有錯誤")

    print(f"\n測試結束: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # 執行清理
    try:
        from src.services.shioaji_service import shioaji_service

        # 清理測試訂閱
        if "2330" in shioaji_service.active_subscriptions:
            shioaji_service.unsubscribe_quote("2330")
            print("\n🧹 已清理測試訂閱")
    except Exception:
        pass
