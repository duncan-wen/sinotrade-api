#!/usr/bin/env python3
"""
測試應用生命週期管理
"""

import os
import signal
import subprocess
import time


def test_lifecycle():
    print("🚀 測試應用生命週期管理...")

    # 啟動服務器
    print("啟動服務器...")
    # 使用uv run python來運行uvicorn
    proc = subprocess.Popen(
        [
            "uv",
            "run",
            "python",
            "-m",
            "uvicorn",
            "src.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
            "--log-level",
            "info",
        ],
        cwd=os.path.dirname(__file__),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    # 等待服務器啟動並讀取輸出
    time.sleep(3)

    # 檢查服務器是否還在運行
    if proc.poll() is None:
        print("服務器已啟動,正在運行...")

        # 讀取一些輸出
        try:
            output, _ = proc.communicate(timeout=1)
            if output:
                print("服務器輸出:", output[:500])  # 只顯示前500字符
        except subprocess.TimeoutExpired:
            pass

        print("等待2秒後關閉服務器...")

        # 發送SIGTERM信號
        if os.name == "nt":  # Windows
            proc.terminate()
        else:  # Unix/Linux
            os.kill(proc.pid, signal.SIGTERM)

        try:
            remaining_output, _ = proc.communicate(timeout=5)
            if remaining_output:
                print("關閉時輸出:", remaining_output)
            print("✅ 服務器正常關閉")
        except subprocess.TimeoutExpired:
            print("⚠️ 服務器未在預期時間內關閉,強制結束...")
            proc.kill()
            proc.wait()
            print("✅ 服務器已被強制結束")
    else:
        print("❌ 服務器啟動失敗")
        output, error = proc.communicate()
        print("啟動錯誤:", error)

    print("🎯 生命週期測試完成")


if __name__ == "__main__":
    test_lifecycle()
