#!/usr/bin/env python3
"""
生產服務器啟動腳本
"""
import subprocess
import sys


def main():
    """啟動生產服務器"""
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "src.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]

    print("🚀 啟動生產服務器...")
    print(f"📍 URL: http://localhost:8000")
    print("⏹️  按 Ctrl+C 停止服務器\n")

    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n👋 服務器已停止")


if __name__ == "__main__":
    main()
