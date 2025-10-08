#!/usr/bin/env python3
"""
修復訂閱同步問題的工具腳本
提供同步檢查和修復功能
"""

import os
import sys

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.services.shioaji_service import shioaji_service
from src.services.subscription_manager import subscription_manager


def check_subscription_sync():
    """檢查訂閱同步狀態"""

    manager_symbols = set(subscription_manager.shioaji_subscriptions)
    service_symbols = set(shioaji_service.active_subscriptions)

    if manager_symbols == service_symbols:
        return True
    else:
        only_in_manager = manager_symbols - service_symbols
        only_in_service = service_symbols - manager_symbols

        if only_in_manager:
            pass

        if only_in_service:
            pass

        return False


def sync_subscription_records():
    """同步訂閱記錄 - 以實際 API 訂閱為準"""

    try:
        # 獲取實際的 API 訂閱狀態
        actual_subscriptions = set(shioaji_service.active_subscriptions)

        # 清理管理器記錄
        subscription_manager.cleanup_all_subscriptions()

        # 根據實際訂閱重建管理器記錄
        for symbol in actual_subscriptions:
            subscription_manager.add_subscriber(symbol, "sync_client")

        return True

    except Exception:
        return False


def safe_cleanup_all():
    """安全的統一清理方法"""

    try:
        # 1. 檢查同步狀態
        is_synced = check_subscription_sync()

        if not is_synced:
            pass

        # 2. 執行 Shioaji 服務清理(取消實際 API 訂閱)
        shioaji_service.force_cleanup_for_restart()

        # 3. 清理管理器記錄
        subscription_manager.cleanup_all_subscriptions()

        # 4. 驗證清理結果
        final_manager = len(subscription_manager.shioaji_subscriptions)
        final_service = len(shioaji_service.active_subscriptions)

        if final_manager == 0 and final_service == 0:
            pass
        else:
            pass

        return True

    except Exception:
        return False


def main():
    """主函數"""

    # 確保服務已登錄
    if not shioaji_service.is_logged_in():
        if not shioaji_service.login():
            return

    check_subscription_sync()

    choice = input("\n請選擇 (1-4): ").strip()

    if choice == "1":
        pass
    elif choice == "2":
        sync_subscription_records()
        check_subscription_sync()
    elif choice == "3":
        safe_cleanup_all()
    elif choice == "4":
        pass
    else:
        pass


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except Exception:
        pass
    finally:
        pass
