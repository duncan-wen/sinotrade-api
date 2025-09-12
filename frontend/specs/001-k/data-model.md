# Data Model

This document describes the key data entities based on the `openapi.json` specification.

## Quote
Represents a real-time quote for a financial instrument.
-   `symbol`: string
-   `timestamp`: string (date-time)
-   `open`: number
-   `close`: number
-   `bid_price`: number
-   `ask_price`: number
-   `bid_volume`: integer
-   `ask_volume`: integer
-   `volume`: integer
-   `avg_price`: number
-   `underlying_price`: number | null

## SimulatedOrder
Represents a simulated order placed by a user.
-   `id`: string
-   `user_id`: string
-   `instrument_symbol`: string
-   `action`: string (enum: "Buy", "Sell")
-   `price`: number
-   `quantity`: integer
-   `order_type`: string (enum: "LMT", "MKT")
-   `time_in_force`: string (enum: "ROD", "IOC", "FOK")
-   `status`: string (enum: "Pending", "Filled", "Cancelled", "Failed")
-   `created_at`: string (date-time)