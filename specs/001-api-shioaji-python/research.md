# 階段 0: Shioaji 函式庫研究

**日期**: 2025-09-10

## 1. 研究目標

本研究的主要目標是了解 `shioaji` Python 函式庫提供的資料結構和方法，用於獲取各種金融商品（股票、期貨、選擇權）的報價和下單。

## 2. 研究過程

由於連結失效，初期透過網路搜尋尋找官方文件的嘗試遇到了挑戰。因此，研究過程轉向分析 GitHub 上的一個第三方範例儲存庫：`https://github.com/chuangtc/shioaji_api`。

分析了數個檔案，包括 `notebook.ipynb`、`main_quote.py` 和 `main_sim.py`。

## 3. 研究發現

### 3.1. 報價 (Quotes)

- **訂閱 (Subscription)**: 透過訂閱特定商品的合約來獲取即時報價。
  - **方法**: `api.quote.subscribe(contract, quote_type, version)`
  - **範例**: `api.quote.subscribe(api.Contracts.Stocks["0050"], quote_type=sj.constant.QuoteType.Tick, version=sj.constant.QuoteVersion.v1)`

- **資料結構 (Data Structure)**: 資料以 `Tick` 物件的形式返回。對於期貨和選擇權，物件很可能是 `TickFOPv1`。

- **已知屬性** (來自 `TickFOPv1` 的網路搜尋結果):
  - `code`: 商品代碼
  - `datetime`: 時間戳
  - `open`: 開盤價
  - `close`: 收盤價 (最後成交價)
  - `bid_side_total_vol`: 買方總量
  - `ask_side_total_vol`: 賣方總量
  - `avg_price`: 平均價
  - `underlying_price`: 標的資產價格

- **❗ 未解決**: **股票**的 `Tick` 物件的完整結構尚未確認。訂閱後接收 `Tick` 物件流的機制（例如，回呼函式、事件處理器）在範例中也未明確顯示，需要在實作過程中確定。

### 3.2. 訂單 (Orders)

- **訂單建立 (Order Creation)**: 下單前必須先建立一個 `Order` 物件。對於股票，這是 `shioaji.order.StockOrder`。

- **`StockOrder` 屬性**:
  - `action`: `shioaji.constant.Action.Buy` 或 `Action.Sell`
  - `price`: 訂單價格
  - `quantity`: 訂單數量
  - `price_type`: `shioaji.constant.StockPriceType.LMT` (限價) 或 `MKT` (市價)
  - `order_type`: `shioaji.constant.OrderType.ROD` (當日有效)、`IOC` (立即成交否則取消)、`FOK` (全部成交否則取消)
  - `account`: 要使用的帳戶，例如 `api.stock_account`

- **訂單放置 (Order Placement)**: 使用 `api.place_order` 方法下單。
  - **方法**: `api.place_order(contract, order)`
  - **返回**: 一個 `Trade` 物件，其中包含訂單的狀態。

- **❗ 未解決**: **期貨**和**選擇權**的特定 `Order` 物件結構在範例中未被觀察到。它們可能與 `StockOrder` 相似，但可能有不同的屬性（例如，用於指定到期日或履約價）。

## 4. 結論

這項研究為 API 設計提供了堅實的基礎。我們對如何下股票訂單有很好的理解，對報價機制有部分的理解。

未解決的問題（完整的 Tick 結構、報價回呼機制以及期貨/選擇權訂單結構）將在實作階段解決。初始任務將涉及編寫探索性程式碼與 `shioaji` 函式庫互動，並記錄返回的物件以完全理解其結構。這符合測試驅動開發（TDD）的方法，其中初始測試將幫助我們探索函式庫的行為。