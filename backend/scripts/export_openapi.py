#!/usr/bin/env python3
"""
導出 FastAPI OpenAPI schema 為 JSON 檔案
用於前端 TypeScript 類型生成
"""

import json
import os
import sys

# 將 src 加入 Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.main import app


def export_openapi_schema():
    """導出 OpenAPI schema 到 JSON 檔案"""
    schema = app.openapi()

    # 確保輸出目錄存在
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "..", "..", "shared", "schemas")
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    # 寫入 OpenAPI schema
    output_path = os.path.join(output_dir, "openapi.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)

    print(f"✅ OpenAPI schema 已導出至: {output_path}")  # noqa: T201
    print(f"📊 Schema 包含 {len(schema.get('paths', {}))} 個 API 端點")  # noqa: T201
    return output_path


if __name__ == "__main__":
    export_openapi_schema()
