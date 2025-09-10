# 階段 1: API 合約

**日期**: 2025-09-10

本文件使用 OpenAPI 3.0 規格格式 (YAML) 定義了 API 端點及其合約。

```yaml
openapi: 3.0.0
info:
  title: Shioaji 交易 API
  version: 0.1.0
  description: 一個使用 Shioaji 函式庫獲取即時市場數據和下模擬訂單的 API。

paths:
  /quote/{symbol}:
    get:
      summary: 獲取即時報價
      description: 獲取給定金融商品代碼的即時報價。
      parameters:
        - name: symbol
          in: path
          required: true
          schema:
            type: string
          description: 金融商品的代碼 (例如 "2330", "TXF202310")。
      security:
        - ApiKeyAuth: []
      responses:
        '200':
          description: 帶有即時報價的成功回應。
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Quote'
        '401':
          description: 未經授權。
        '404':
          description: 找不到商品。

  /order:
    post:
      summary: 下一個模擬訂單
      description: 為一個金融商品下一個模擬訂單。此端點僅對具有 'trader' 角色的使用者開放。
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderRequest'
      responses:
        '201':
          description: 訂單已成功下達。
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimulatedOrder'
        '400':
          description: 無效的訂單請求。
        '401':
          description: 未經授權或權限不足。

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-KEY

  schemas:
    Quote:
      type: object
      properties:
        symbol:
          type: string
        timestamp:
          type: string
          format: date-time
        open:
          type: number
        close:
          type: number
        bid_price:
          type: number
        ask_price:
          type: number
        bid_volume:
          type: integer
        ask_volume:
          type: integer
        avg_price:
          type: number
        underlying_price:
          type: number
          nullable: true

    OrderRequest:
      type: object
      properties:
        instrument_symbol:
          type: string
        action:
          type: string
          enum: [Buy, Sell]
        price:
          type: number
        quantity:
          type: integer
        order_type:
          type: string
          enum: [LMT, MKT]
        time_in_force:
          type: string
          enum: [ROD, IOC, FOK]

    SimulatedOrder:
      type: object
      properties:
        id:
          type: string
        user_id:
          type: string
        instrument_symbol:
          type: string
        action:
          type: string
          enum: [Buy, Sell]
        price:
          type: number
        quantity:
          type: integer
        order_type:
          type: string
          enum: [LMT, MKT]
        time_in_force:
          type: string
          enum: [ROD, IOC, FOK]
        status:
          type: string
          enum: [Pending, Filled, Cancelled, Failed]
        created_at:
          type: string
          format: date-time
```