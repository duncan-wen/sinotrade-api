# src/api/orders.py

from fastapi import APIRouter, Depends, HTTPException
from starlette.status import HTTP_403_FORBIDDEN

from src.models.domain import APIUser, SimulatedOrder
from src.services.auth_service import get_current_user
from src.services.shioaji_service import shioaji_service

router = APIRouter()


def get_trader_user(user: APIUser = Depends(get_current_user)) -> APIUser:
    if user.role != "trader":
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail="You do not have permission to place orders.",
        )
    return user


@router.post("/order", response_model=SimulatedOrder)
def place_order(
    order_request: SimulatedOrder, user: APIUser = Depends(get_trader_user)
) -> SimulatedOrder:
    """
    Places a simulated order for a financial instrument.
    This endpoint is only available to users with the 'trader' role.
    """
    order_request.user_id = user.id
    placed_order = shioaji_service.place_order(order_request)
    return placed_order
