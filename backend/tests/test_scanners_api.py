#!/usr/bin/env python3
"""
測試 Scanners API endpoints
"""

import requests

BASE_URL = "http://localhost:8000/api"


def test_get_scanner_types():
    """測試獲取排行類型列表"""
    print("🔍 測試獲取排行類型列表...")

    try:
        response = requests.get(f"{BASE_URL}/scanners/types")

        if response.status_code == 200:
            types = response.json()
            print(f"✅ 成功獲取 {len(types)} 種排行類型:")
            for scanner_type in types:
                print(f"  - {scanner_type['label']}: {scanner_type['description']}")
        else:
            print(f"❌ 請求失敗: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"❌ 連接失敗: {e}")


def test_get_scanners_data(scanner_type: str, count: int = 5):
    """測試獲取排行資料"""
    print(f"\n📊 測試獲取 {scanner_type} 排行資料 (前 {count} 名)...")

    try:
        params = {
            "ascending": True,
            "count": count,
        }

        response = requests.get(f"{BASE_URL}/scanners/{scanner_type}", params=params)

        if response.status_code == 200:
            scanners = response.json()
            print(f"✅ 成功獲取 {len(scanners)} 筆 {scanner_type} 資料")

            # 顯示前3筆資料
            for i, scanner in enumerate(scanners[:3], 1):
                print(f"  {i}. {scanner['name']} ({scanner['code']})")
                print(f"     收盤價: {scanner['close']}")
                print(f"     漲跌: {scanner['change_price']:+.2f}")
                print(f"     漲跌幅: {scanner.get('change_percent', 0):.2f}%")
                print(f"     成交量: {scanner['total_volume']:,}")
                print(f"     成交金額: {scanner['total_amount']:,}")
                print()

        elif response.status_code == 503:
            print(f"⚠️  服務暫時不可用: {response.text}")
        else:
            print(f"❌ 請求失敗: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"❌ 連接失敗: {e}")


def test_invalid_parameters():
    """測試無效參數"""
    print("\n🔧 測試無效參數...")

    # 測試無效的 scanner_type
    try:
        response = requests.get(f"{BASE_URL}/scanners/InvalidType")
        if response.status_code == 422:
            print("✅ 無效 scanner_type 驗證成功")
        else:
            print(f"❌ 無效 scanner_type 驗證失敗: {response.status_code}")
    except Exception as e:
        print(f"❌ 測試失敗: {e}")

    # 測試超出範圍的 count
    try:
        response = requests.get(
            f"{BASE_URL}/scanners/ChangePercentRank", params={"count": 300}
        )
        if response.status_code == 422:
            print("✅ count 範圍驗證成功")
        else:
            print(f"❌ count 範圍驗證失敗: {response.status_code}")
    except Exception as e:
        print(f"❌ 測試失敗: {e}")


def main():
    """主測試函數"""
    print("🚀 開始測試 Scanners API")

    # 等待服務啟動
    print("⏳ 等待服務啟動...")
    import time

    time.sleep(5)

    # 測試獲取排行類型列表
    test_get_scanner_types()

    # 測試各種排行類型
    scanner_types = [
        "ChangePercentRank",
        "ChangePriceRank",
        "VolumeRank",
        "AmountRank",
        "DayRangeRank",
    ]

    for scanner_type in scanner_types:
        test_get_scanners_data(scanner_type, count=5)

    # 測試無效參數
    test_invalid_parameters()

    print("\n🎉 API 測試完成!")


if __name__ == "__main__":
    main()
