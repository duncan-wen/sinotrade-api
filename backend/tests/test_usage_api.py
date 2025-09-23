#!/usr/bin/env python3
"""
測試 Shioaji API 使用量統計端點
"""

from datetime import datetime

import requests

BASE_URL = "http://localhost:8000"


def test_usage_api():
    """測試使用量 API 端點"""
    print("🔍 測試 Shioaji API 使用量統計")
    print("=" * 50)

    try:
        # 測試詳細使用量統計
        print("📊 測試詳細使用量統計...")
        response = requests.get(f"{BASE_URL}/api/usage", timeout=10)

        if response.status_code == 200:
            data = response.json()
            print("✅ 詳細統計成功")
            print(f"狀態: {data.get('status')}")
            print(f"連接次數: {data.get('connections', 'N/A'):,}")

            if data.get("bytes_used") is not None:
                print(f"已使用流量: {data.get('bytes_used'):.2f} MB")
            if data.get("bytes_limit") is not None:
                print(f"流量限制: {data.get('bytes_limit'):.2f} MB")
            if data.get("bytes_remaining") is not None:
                remaining = data.get("bytes_remaining")
                if remaining < 0:
                    print(f"⚠️ 超過限制: {abs(remaining):.2f} MB")
                else:
                    print(f"剩餘流量: {remaining:.2f} MB")
            if data.get("usage_rate") is not None:
                print(f"使用率: {data.get('usage_rate'):.1f}%")
            if data.get("warning_message"):
                print(f"警告: {data.get('warning_message')}")

            print(f"是否超過限制: {data.get('is_over_limit', False)}")
            print(f"是否接近限制: {data.get('is_near_limit', False)}")
        else:
            print(f"❌ 詳細統計失敗: {response.status_code}")
            print(f"錯誤: {response.text}")

    except requests.RequestException as e:
        print(f"❌ 請求錯誤: {e}")

    print("-" * 50)

    try:
        # 測試簡化使用量摘要
        print("📋 測試簡化使用量摘要...")
        response = requests.get(f"{BASE_URL}/api/usage/summary", timeout=10)

        if response.status_code == 200:
            data = response.json()
            print("✅ 摘要成功")
            print(f"狀態: {data.get('status')}")
            print(f"連接次數: {data.get('connections', 'N/A')}")
            print(f"使用量: {data.get('usage_mb', 0):.2f} MB")
            print(f"限制: {data.get('limit_mb', 0):.2f} MB")
            print(f"剩餘: {data.get('remaining_mb', 'N/A')} MB")
            print(f"使用率: {data.get('usage_percentage', 0):.1f}%")
            if data.get("warning"):
                print(f"警告: {data.get('warning')}")
        else:
            print(f"❌ 摘要失敗: {response.status_code}")
            print(f"錯誤: {response.text}")

    except requests.RequestException as e:
        print(f"❌ 請求錯誤: {e}")

    print("=" * 50)
    print(f"測試完成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    test_usage_api()
