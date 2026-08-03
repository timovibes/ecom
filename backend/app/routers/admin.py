from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.order import Order
from app.models.user import User
from app.schemas.order import OrderOut
from app.schemas.admin import OrderStatusUpdate
from app.dependencies import get_current_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

ALLOWED_STATUSES = {"pending", "paid", "declined", "shipped", "cancelled"}

@router.get("/orders", response_model=List[OrderOut])
def list_all_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    return query.order_by(Order.created_at.desc()).all()

@router.get("/orders/{order_id}", response_model=OrderOut)
def get_any_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.patch("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    status_in: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    if status_in.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {sorted(ALLOWED_STATUSES)}")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status_in.status
    db.commit()
    db.refresh(order)
    return order