#!/usr/bin/env python3
"""
修復 WebSocket 回調註冊
重新註冊廣播回調以恢復實時數據流
"""

import os
import sys
from datetime import datetime

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def check_and_fix_callback_registration():
    """檢查並修復回調註冊"""

    try:
        # 導入服務
        from src.services.shioaji_service import shioaji_service
        from src.services.socketio_manager import (
            SocketIOTickBroadcaster,
            socket_manager,
        )


        if shioaji_service.quote_callbacks:
            for _i, _callback in enumerate(shioaji_service.quote_callbacks):
                pass
        else:
            pass

        broadcaster = SocketIOTickBroadcaster(socket_manager)
        broadcast_method = broadcaster.broadcast_tick_data


        # 檢查是否已註冊
        is_registered = broadcast_method in shioaji_service.quote_callbacks

        if not is_registered:
            shioaji_service.add_quote_callback(broadcast_method)
        else:
            pass

        for _i, _callback in enumerate(shioaji_service.quote_callbacks):
            pass

        # 檢查服務狀態

        if not shioaji_service.is_logged_in():
            shioaji_service.login()

        return True

    except Exception:
        import traceback

        traceback.print_exc()
        return False


def test_callback_with_mock_data():
    """使用模擬數據測試回調"""

    try:
        from src.services.shioaji_service import shioaji_service

        if not shioaji_service.quote_callbacks:
            return False


        # 創建模擬 tick 數據
        class MockTickData:
            def __init__(self):
                self.symbol = "2330"
                self.close = 500.0
                self.volume = 1000
                self.timestamp = datetime.now()

        mock_data = MockTickData()

        for _i, callback in enumerate(shioaji_service.quote_callbacks):
            try:
                callback(mock_data)
            except Exception:
                pass

        return True

    except Exception:
        return False


def create_startup_fix():
    """創建啟動修復腳本"""

    fix_script = '''#!/usr/bin/env python3
"""
FastAPI 啟動後執行的修復腳本
確保 WebSocket 回調正確註冊
"""

def fix_websocket_callbacks():
    """修復 WebSocket 回調註冊"""
    try:
        from src.services.shioaji_service import shioaji_service
        from src.services.socketio_manager import SocketIOTickBroadcaster
        from src.services.socketio_manager import socket_manager

        # 創建廣播器
        broadcaster = SocketIOTickBroadcaster(socket_manager)

        # 檢查是否已註冊
        if broadcaster.broadcast_tick_data not in shioaji_service.quote_callbacks:
            shioaji_service.add_quote_callback(broadcaster.broadcast_tick_data)
            print("✅ WebSocket 廣播回調已重新註冊")

        return True

    except Exception as e:
        print(f"❌ 修復失敗: {e}")
        return False

if __name__ == "__main__":
    fix_websocket_callbacks()
'''

    try:
        with open("startup_fix.py", "w", encoding="utf-8") as f:
            f.write(fix_script)
        return True
    except Exception:
        return False


if __name__ == "__main__":

    try:
        # 執行修復
        success1 = check_and_fix_callback_registration()
        success2 = test_callback_with_mock_data()
        success3 = create_startup_fix()

        if success1 and success2:
            pass
        else:
            pass


    except KeyboardInterrupt:
        pass
    except Exception:
        pass
