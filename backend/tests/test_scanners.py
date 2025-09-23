#!/usr/bin/env python3
"""
測試 Shioaji Scanners API
"""

import asyncio
import sys
from pathlib import Path

# 添加 src 目錄到 Python 路徑
sys.path.append(str(Path(__file__).parent / "src"))

from src.models.domain import ScannerType
from src.services.shioaji_service import shioaji_service


async def test_all_scanner_types():
    """測試所有排行類型"""
    print("🚀 開始測試 Shioaji Scanners API")

    # 測試所有排行類型
    scanner_types = [
        ScannerType.ChangePercentRank,
        ScannerType.ChangePriceRank,
        ScannerType.DayRangeRank,
        ScannerType.VolumeRank,
        ScannerType.AmountRank,
    ]

    for scanner_type in scanner_types:
        print(f"\n📊 測試 {scanner_type.value} 排行...")
        try:
            # 獲取前5名的排行資料
            scanners = shioaji_service.get_scanners(
                scanner_type=scanner_type,
                ascending=True,  # 由大到小排序
                count=5,
            )

            if scanners:
                print(f"✅ 成功獲取 {len(scanners)} 筆 {scanner_type.value} 資料")

                # 顯示前3筆資料
                for i, scanner in enumerate(scanners[:3], 1):
                    print(f"  {i}. {scanner.name} ({scanner.code})")
                    print(f"     收盤價: {scanner.close}")
                    print(f"     漲跌: {scanner.change_price:+.2f}")
                    print(f"     漲跌幅: {scanner.change_percent:.2f}%")
                    print(f"     成交量: {scanner.total_volume:,}")
                    print(f"     成交金額: {scanner.total_amount:,}")
                    print()
            else:
                print(f"⚠️  未獲取到 {scanner_type.value} 資料")

        except Exception as e:
            print(f"❌ 測試 {scanner_type.value} 失敗: {e}")


def test_scanner_validation():
    """測試參數驗證"""
    print("\n🔧 測試參數驗證...")

    # 測試 count 超出範圍
    try:
        shioaji_service.get_scanners(
            scanner_type=ScannerType.ChangePercentRank,
            count=300,  # 超出最大值 200
        )
        print("❌ count 驗證失敗 - 應該拋出 ValueError")
    except ValueError as e:
        print(f"✅ count 驗證成功: {e}")
    except Exception as e:
        print(f"❌ 意外錯誤: {e}")


def main():
    """主測試函數"""
    try:
        # 初始化服務
        if not shioaji_service.ensure_logged_in():
            print("❌ Shioaji 服務登錄失敗")
            return

        print("✅ Shioaji 服務登錄成功")

        # 執行測試
        asyncio.run(test_all_scanner_types())
        test_scanner_validation()

        print("\n🎉 所有測試完成!")

    except KeyboardInterrupt:
        print("\n⏹️  測試被用戶中斷")
    except Exception as e:
        print(f"\n💥 測試過程發生錯誤: {e}")
    finally:
        # 清理資源
        try:
            shioaji_service.cleanup()
            print("🧹 資源清理完成")
        except Exception as e:
            print(f"⚠️  資源清理失敗: {e}")


if __name__ == "__main__":
    main()
