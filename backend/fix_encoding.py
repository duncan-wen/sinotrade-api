#!/usr/bin/env python3
"""
修復編碼問題 - 將emoji字符替換為ASCII字符
"""

import os


def fix_encoding_in_file(filepath):
    """修復文件中的編碼問題"""
    try:
        with open(filepath, encoding="utf-8") as f:
            content = f.read()

        # 替換emoji字符為ASCII字符
        replacements = {
            "✅": "[SUCCESS]",
            "❌": "[ERROR]",
            "🔐": "[LOGOUT]",
            "🗑️": "[DESTROY]",
            "🧹": "[CLEANUP]",
            "⚠️": "[WARNING]",
            "🚀": "[STARTUP]",
            "🛑": "[SHUTDOWN]",
            "📈": "[SUBSCRIBE]",
            "📭": "[NO_SUBSCRIPTION]",
            "🔄": "[RESTORE]",
            "⚡": "[TICK]",
            "⏰": "[TIME]",
            "🔍": "[PROCESS]",
            "📊": "[DATA]",
            "📉": "[CHART]",
        }

        for emoji, replacement in replacements.items():
            content = content.replace(emoji, replacement)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"Fixed encoding in: {filepath}")

    except Exception as e:
        print(f"Error fixing {filepath}: {e}")


def main():
    """主函數"""
    backend_src = "src"

    # 需要修復的文件
    files_to_fix = [
        os.path.join(backend_src, "main.py"),
        os.path.join(backend_src, "services", "shioaji_service.py"),
        os.path.join(backend_src, "api", "quotes.py"),
        os.path.join(backend_src, "api", "websocket_quotes.py"),
    ]

    for file_path in files_to_fix:
        if os.path.exists(file_path):
            fix_encoding_in_file(file_path)
        else:
            print(f"File not found: {file_path}")


if __name__ == "__main__":
    main()
