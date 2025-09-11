#!/usr/bin/env python3
"""
從 Pydantic 模型生成 TypeScript 類型定義
"""

import subprocess
import sys
from pathlib import Path


def generate_typescript_types():
    """從 OpenAPI schema 生成 TypeScript 類型"""

    # 確保必要的目錄存在
    shared_dir = Path(__file__).parent.parent.parent / "shared"
    schemas_dir = shared_dir / "schemas"
    types_dir = shared_dir / "types"

    schemas_dir.mkdir(parents=True, exist_ok=True)
    types_dir.mkdir(parents=True, exist_ok=True)

    # 1. 導出 OpenAPI schema
    print("🔄 正在導出 OpenAPI schema...")  # noqa: T201
    export_script = Path(__file__).parent / "export_openapi.py"
    result = subprocess.run(
        [sys.executable, str(export_script)], capture_output=True, text=True
    )

    if result.returncode != 0:
        print(f"❌ 導出 OpenAPI schema 失敗: {result.stderr}")  # noqa: T201
        return False

    # 2. 生成 TypeScript 類型
    openapi_file = schemas_dir / "openapi.json"
    types_file = types_dir / "api.ts"

    print("🔄 正在生成 TypeScript 類型...")  # noqa: T201

    # 使用 openapi-typescript 生成類型
    cmd = [
        "npx",
        "openapi-typescript",
        str(openapi_file),
        "--output",
        str(types_file),
        "--prettier",
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=shared_dir)

        if result.returncode == 0:
            print(f"✅ TypeScript 類型已生成: {types_file}")  # noqa: T201

            # 3. 生成額外的便利類型
            generate_convenience_types(types_file)
            return True
        else:
            print(f"❌ 生成 TypeScript 類型失敗: {result.stderr}")  # noqa: T201
            # 如果 npx 不可用,提供替代方案
            print("💡 請安裝 openapi-typescript: npm install -g openapi-typescript")  # noqa: T201
            return False

    except FileNotFoundError:
        print("❌ 找不到 npx,請確保已安裝 Node.js")  # noqa: T201
        return False


def generate_convenience_types(types_file: Path):
    """生成便利的類型定義"""

    convenience_types = """
// 便利類型定義
export type ApiResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
};

// 從 OpenAPI 生成的組件類型
export type { components } from './api';

// 常用的 API 類型別名
export type Quote = components['schemas']['Quote'];
export type APIUser = components['schemas']['APIUser'];
export type SimulatedOrder = components['schemas']['SimulatedOrder'];
export type FinancialInstrument = components['schemas']['FinancialInstrument'];

// WebSocket 訊息類型
export type WSQuoteMessage = {
  type: 'quote';
  data: Quote;
};

export type WSKlineMessage = {
  type: 'kline';
  data: {
    symbol: string;
    interval: string;
    kline: {
      timestamp: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    };
  };
};

export type WSMessage = WSQuoteMessage | WSKlineMessage;
"""

    # 寫入便利類型檔案
    convenience_file = types_file.parent / "index.ts"
    with open(convenience_file, "w", encoding="utf-8") as f:
        f.write(convenience_types)

    print(f"✅ 便利類型已生成: {convenience_file}")  # noqa: T201


if __name__ == "__main__":
    success = generate_typescript_types()
    sys.exit(0 if success else 1)
