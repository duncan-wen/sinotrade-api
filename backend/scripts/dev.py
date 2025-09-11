#!/usr/bin/env python3
"""
開發服務器啟動腳本
"""
import subprocess
import sys


def main():
    """啟動開發服務器"""
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "src.main:app",
        "--reload",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]

    print("🚀 啟動開發服務器...")
    print(f"📍 URL: http://localhost:8000")
    print(f"📖 API 文檔: http://localhost:8000/docs")
    print("⏹️  按 Ctrl+C 停止服務器\n")

    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n👋 服務器已停止")


if __name__ == "__main__":
    main()
