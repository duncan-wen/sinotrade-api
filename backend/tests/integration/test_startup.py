#!/usr/bin/env python3
"""
測試應用啟動事件
"""

import asyncio
import os
import sys

# 添加src目錄到路徑
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))


async def test_startup():
    print("🎯 測試應用啟動和關閉事件...")

    try:
        # 測試導入
        from main import shutdown_event, startup_event

        print("✅ 成功導入啟動/關閉事件函數")

        # 測試啟動事件
        print("🚀 執行啟動事件...")
        await startup_event()
        print("✅ 啟動事件完成")

        # 測試關閉事件
        print("🛑 執行關閉事件...")
        await shutdown_event()
        print("✅ 關閉事件完成")

    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_startup())
