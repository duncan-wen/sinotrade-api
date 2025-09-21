# src/utils/symbol_mapping.py

from loguru import logger


def get_symbol_mapping(original_symbol: str) -> str:
    """
    通用期貨動態映射 - 將實際合約代碼映射到標準化符號

    例如:
    - CDFJ5 -> CDFR1 (台積電期貨)
    - TXFJ5 -> TXFR1 (台指期貨)
    - MXFJ5 -> MXFR1 (小台指期貨)
    - TMFK5 -> TMFR1 (台泥期貨)
    """
    # 如果已經是標準化符號(*R1/*R2),直接返回
    if original_symbol.endswith(("R1", "R2")):
        return original_symbol

    # 通用期貨映射邏輯
    # 期貨代碼格式: [期貨群組][月份代碼][年份代碼] (例如: CDFJ5, TXFK5)
    if len(original_symbol) >= 4:
        # 提取期貨群組名稱 (移除最後2-3個字符的月份+年份代碼)
        if original_symbol[-3:].isalnum() and original_symbol[-2].isalpha():
            # 格式: XXXYZ5 (3字符群組 + 月份代碼 + 年份代碼)
            group_name = original_symbol[:-2]
        elif original_symbol[-4:].isalnum() and original_symbol[-3:-1].isalpha():
            # 格式: XXXYYZ5 (4字符群組等其他格式)
            group_name = original_symbol[:-2]
        else:
            # 無法識別的格式,保持原樣
            return original_symbol

        # 所有期貨合約默認映射到近月 (*R1)
        mapped_symbol = f"{group_name}R1"

        logger.debug(f"期貨映射: {original_symbol} -> {mapped_symbol}")
        return mapped_symbol

    # 非期貨或無法識別的符號保持原樣
    return original_symbol
