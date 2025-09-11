# src/main.py

from fastapi import FastAPI

from src.api import quotes, orders

app = FastAPI(
    title="Shioaji Trading API",
    description="An API for fetching real-time market data and placing simulated orders using the Shioaji library.",
    version="0.1.0",
    openapi_tags=[
        {
            "name": "Quotes",
            "description": "即時報價和歷史數據相關 API",
        },
        {
            "name": "Orders",
            "description": "模擬下單相關 API",
        },
        {
            "name": "WebSocket",
            "description": "即時數據推送 WebSocket 連接",
        },
    ],
)

app.include_router(quotes.router, prefix="/api", tags=["Quotes"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])


@app.get("/")
def read_root():
    return {"message": "Welcome to the Shioaji Trading API"}
