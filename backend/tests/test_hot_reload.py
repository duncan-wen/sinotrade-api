#!/usr/bin/env python3
"""
測試 Hot Reload 場景
模擬 FastAPI 開發環境中的檔案修改重載情況
"""

import os
import sys
import time
from datetime import datetime

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("🔥 Hot Reload 測試 - 模擬開發環境")
print("=" * 50)
print(f"測試開始: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print()

try:
    # 導入並使用服務
    print("📦 導入 Shioaji 服務...")
    from src.services.shioaji_service import shioaji_service

    # 登錄服務
    print("🔐 登錄服務...")
    login_result = shioaji_service.login()
    print(f"登錄結果: {'✅ 成功' if login_result else '❌ 失敗'}")

    if login_result:
        # 獲取使用量統計
        print("📊 獲取使用量統計...")
        usage_stats = shioaji_service.get_usage_stats()
        print(f"API 狀態: {usage_stats.status}")

        if usage_stats.status == "success":
            print(f"連線數: {usage_stats.connections}")
            if usage_stats.bytes_used is not None:
                print(f"已使用流量: {usage_stats.bytes_used:.2f} MB")

        # 模擬一些訂閱
        print("📡 模擬添加訂閱...")
        shioaji_service.active_subscriptions.add("2330")
        shioaji_service.active_subscriptions.add("2317")
        shioaji_service.active_subscriptions.add("2454")
        print(f"活躍訂閱: {len(shioaji_service.active_subscriptions)} 個")

        # 模擬運行一段時間
        print("⏰ 模擬服務運行 3 秒...")
        time.sleep(3)

        # 模擬 hot reload 觸發的清理
        print("\n🔄 模擬 Hot Reload 觸發...")
        print("執行開發環境強制清理...")
        shioaji_service.force_cleanup_for_restart()

        # 檢查清理結果
        print(f"清理後登錄狀態: {shioaji_service.is_logged_in()}")
        print(f"清理後訂閱數: {len(shioaji_service.active_subscriptions)}")

        # 再次檢查使用量
        print("\n📊 清理後使用量統計...")
        usage_stats = shioaji_service.get_usage_stats()
        if usage_stats.status == "success":
            print(f"連線數: {usage_stats.connections}")
        else:
            print(f"狀態: {usage_stats.status}")
            print(f"錯誤: {usage_stats.warning_message}")

except Exception as e:
    print(f"❌ 測試過程出錯: {e}")
    import traceback

    traceback.print_exc()

finally:
    print("\n" + "=" * 50)
    print(f"測試結束: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # 模擬程序退出時的清理
    print("🧹 模擬程序退出清理...")
    try:
        if "shioaji_service" in locals():
            shioaji_service.force_cleanup_for_restart()
    except Exception as cleanup_error:
        print(f"清理時出錯: {cleanup_error}")

    print("✅ Hot Reload 測試完成")
    print()
    print("📝 說明:")
    print("   - 在真實的 FastAPI 開發環境中,uvicorn 會在檔案變更時")
    print("   - 自動重啟服務,此時我們的清理邏輯會被觸發")
    print("   - 確保連線被正確釋放,避免達到連線數限制")
    print()
