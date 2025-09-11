# Shioaji 行情資料類型說明

本文檔詳細說明 Shioaji API 中三種主要的行情資料類型:Tick、BidAsk 和 Quote 的差異與應用場景。

## 📊 三種行情資料類型概覽

| 類型       | 中文名稱 | 用途             | 更新頻率   | 主要用途             |
| ---------- | -------- | ---------------- | ---------- | -------------------- |
| **Tick**   | 逐筆成交 | 每筆實際成交記錄 | 每筆成交   | 高頻交易、成交分析   |
| **BidAsk** | 五檔報價 | 買賣掛單價量     | 掛單變動時 | 市場深度、流動性分析 |
| **Quote**  | 綜合報價 | 完整市場快照     | 綜合更新   | 一般交易決策         |

---

## 1. 🎯 Tick（逐筆成交資料）

### 定義
每一筆實際發生的成交交易記錄,包含成交價格、數量、時間等詳細資訊。

### 主要欄位
```python
Tick(
    code='2330',                          # 股票代碼
    datetime=datetime(2021, 7, 2, 13, 16, 35),  # 成交時間
    close=Decimal('590'),                 # 成交價格
    volume=1,                            # 成交量（張）
    total_volume=14498,                  # 累計成交量
    amount=Decimal('590000'),            # 成交金額
    total_amount=Decimal('8540101000'),  # 累計成交金額
    tick_type=1,                         # 成交類型
    price_chg=Decimal('-3'),             # 價格變動
    pct_chg=Decimal('-0.505902'),        # 漲跌幅百分比
    open=Decimal('590'),                 # 開盤價
    high=Decimal('593'),                 # 最高價
    low=Decimal('587'),                  # 最低價
    avg_price=Decimal('589.05'),         # 平均價
)
```

### 應用場景
- **高頻交易**:分析每筆成交的時間和價格模式
- **成交量分析**:計算 VWAP（成交量加權平均價）
- **市場微結構研究**:研究價格發現過程
- **即時監控**:追蹤特定價格區間的成交狀況

### 程式範例
```python
from shioaji import TickSTKv1, Exchange

def tick_callback(exchange: Exchange, tick: TickSTKv1):
    print(f"成交: {tick.code} 價格:{tick.close} 量:{tick.volume} 時間:{tick.datetime}")

    # 計算成交金額
    trade_value = tick.close * tick.volume * 1000  # 1張 = 1000股
    print(f"本筆成交金額: ${trade_value:,}")

api.quote.set_on_tick_stk_v1_callback(tick_callback)
```

---

## 2. 📈 BidAsk（五檔買賣報價）

### 定義
當前市場上的買賣掛單資訊,顯示最佳五檔的買入價、賣出價及對應的掛單數量。

### 主要欄位
```python
BidAsk(
    code='2330',
    datetime=datetime(2021, 7, 2, 13, 17, 29),
    # 買方五檔（由高到低）
    bid_price=[Decimal('589'), Decimal('588'), Decimal('587'), Decimal('586'), Decimal('585')],
    bid_volume=[223, 761, 1003, 809, 1274],  # 對應的買入量

    # 賣方五檔（由低到高）
    ask_price=[Decimal('590'), Decimal('591'), Decimal('592'), Decimal('593'), Decimal('594')],
    ask_volume=[304, 232, 183, 242, 131],    # 對應的賣出量

    # 量的變化
    diff_bid_vol=[0, 0, 0, 0, 0],           # 買量變化
    diff_ask_vol=[1, 0, 0, 0, 0],           # 賣量變化
)
```

### Bid/Ask 概念說明
- **Bid（買價）**:買方願意支付的最高價格
- **Ask（賣價）**:賣方願意接受的最低價格
- **價差（Spread）**:Ask Price - Bid Price
- **市場深度**:各價位的掛單量多寡

### 應用場景
- **流動性分析**:評估買賣掛單的深度
- **進出場時機**:觀察掛單變化決定交易時點
- **價差交易**:利用買賣價差進行套利
- **大單策略**:分析是否有足夠流動性承接大額交易

### 程式範例
```python
from shioaji import BidAskSTKv1, Exchange

def bidask_callback(exchange: Exchange, bidask: BidAskSTKv1):
    best_bid = bidask.bid_price[0]  # 最佳買價
    best_ask = bidask.ask_price[0]  # 最佳賣價
    spread = best_ask - best_bid    # 價差

    print(f"五檔報價 {bidask.code}")
    print(f"最佳買價: {best_bid} 量: {bidask.bid_volume[0]}")
    print(f"最佳賣價: {best_ask} 量: {bidask.ask_volume[0]}")
    print(f"價差: {spread}")

    # 計算總掛單量
    total_bid_vol = sum(bidask.bid_volume)
    total_ask_vol = sum(bidask.ask_volume)
    print(f"買方總量: {total_bid_vol} 賣方總量: {total_ask_vol}")

api.quote.set_on_bidask_stk_v1_callback(bidask_callback)
```

---

## 3. 📋 Quote（綜合報價）

### 定義
綜合性的市場行情快照,整合了成交資訊、五檔報價、統計數據等完整市場資訊。

### 主要欄位
```python
Quote(
    code='2330',
    datetime=datetime(2022, 7, 1, 10, 43, 15),

    # 成交資訊
    close=Decimal('461'),                    # 最新成交價
    open=Decimal('471.5'),                   # 開盤價
    high=Decimal('474'),                     # 最高價
    low=Decimal('461'),                      # 最低價
    volume=1,                               # 最新成交量
    total_volume=25292,                     # 總成交量
    amount=Decimal('461000'),               # 最新成交金額
    total_amount=Decimal('11834476000'),    # 總成交金額
    avg_price=Decimal('467.91'),            # 平均成交價

    # 漲跌資訊
    price_chg=Decimal('-15'),               # 漲跌價差
    pct_chg=Decimal('-3.15'),               # 漲跌幅(%)

    # 五檔資訊（同 BidAsk）
    bid_price=[...],                        # 買方五檔價格
    bid_volume=[...],                       # 買方五檔數量
    ask_price=[...],                        # 賣方五檔價格
    ask_volume=[...],                       # 賣方五檔數量

    # 其他市場資訊
    avail_borrowing=9579699,                # 可借券餘額
    suspend=0,                              # 是否暫停交易
    simtrade=0,                             # 是否為試撮
)
```

### 應用場景
- **完整市場監控**:一次取得所有需要的行情資訊
- **投資決策**:綜合評估價格、量能、掛單狀況
- **風險管理**:監控暫停交易、借券餘額等風險指標
- **報價顯示**:適合在交易介面顯示完整行情

### 程式範例
```python
from shioaji import QuoteSTKv1, Exchange

def quote_callback(exchange: Exchange, quote: QuoteSTKv1):
    print(f"=== {quote.code} 完整報價 ===")
    print(f"現價: {quote.close} ({quote.price_chg:+}) [{quote.pct_chg:+.2f}%]")
    print(f"開高低: {quote.open}/{quote.high}/{quote.low}")
    print(f"成交量: {quote.total_volume:,} 張")
    print(f"成交金額: ${quote.total_amount:,}")
    print(f"平均價: {quote.avg_price}")

    # 五檔資訊
    print("五檔買賣:")
    for i in range(5):
        print(f"  {quote.bid_volume[i]:>4} @ {quote.bid_price[i]} | {quote.ask_price[i]} @ {quote.ask_volume[i]:<4}")

    # 風險指標
    if quote.suspend:
        print("⚠️  交易暫停中")
    print(f"可借券: {quote.avail_borrowing:,} 張")

api.quote.set_on_quote_stk_v1_callback(quote_callback)
```

---

## 🚀 在 Sinotrade API 中的使用

### 訂閱方式
```python
import shioaji as sj

# 訂閱 Tick
api.quote.subscribe(
    api.Contracts.Stocks["2330"],
    quote_type=sj.constant.QuoteType.Tick,
    version=sj.constant.QuoteVersion.v1
)

# 訂閱 BidAsk
api.quote.subscribe(
    api.Contracts.Stocks["2330"],
    quote_type=sj.constant.QuoteType.BidAsk,
    version=sj.constant.QuoteVersion.v1
)

# Quote 類型需要特別的訂閱方式,請參考官方文檔
```

### 在我們的專案中
在 `src/services/shioaji_service.py` 中,我們主要使用 **Tick** 類型來獲取即時成交資料:

```python
def _on_stock_tick(self, exchange: Exchange, tick: TickSTKv1):
    """處理股票 tick 資料"""
    quote = Quote(
        symbol=tick.code,
        timestamp=tick.datetime,
        open=tick.open,
        close=tick.close,
        bid_price=tick.bid_price[0] if tick.bid_price else 0,
        ask_price=tick.ask_price[0] if tick.ask_price else 0,
        # ... 其他欄位
    )
    set_cached_quote(quote.symbol, quote)
```

---

## 📚 選擇建議

### 使用 **Tick** 當你需要:
- ✅ 分析每筆成交的細節
- ✅ 進行高頻交易策略
- ✅ 計算 VWAP 或其他成交量指標
- ✅ 監控特定價格的成交狀況

### 使用 **BidAsk** 當你需要:
- ✅ 了解市場掛單深度
- ✅ 制定限價單策略
- ✅ 評估流動性風險
- ✅ 進行價差分析

### 使用 **Quote** 當你需要:
- ✅ 完整的市場資訊概覽
- ✅ 一般的投資決策分析
- ✅ 在交易介面顯示報價
- ✅ 風險監控（暫停交易、借券等）

---

## 🔗 參考資料

- [Shioaji 官方文檔 - 證券即時行情](https://sinotrade.github.io/zh/tutor/market_data/streaming/stocks/#tick_1)
- [Shioaji 商品檔說明](https://sinotrade.github.io/zh/tutor/contract/#_5)

---

*最後更新: 2025年9月*
