import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatusEvent
from app.models.product import Product
from app.models.user import User
from app.schemas.order import OrderOut
from app.schemas.admin import OrderStatusUpdate
from app.dependencies import get_current_admin

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])
logger = logging.getLogger(__name__)

ALLOWED_STATUSES = {"pending", "paid", "declined", "shipped", "cancelled"}

# Statuses that count as realized revenue for analytics purposes.
REVENUE_STATUSES = {"paid", "shipped"}


def notify_order_status_change(order: Order) -> None:
    """Notification hook for order status changes.

    No email provider is configured yet, so this just logs the event. Swap the
    body of this function for a real send (SMTP, SendGrid, etc.) once one is
    wired up — callers don't need to change.
    """
    logger.info(
        "Order #%s status changed to '%s' (user_id=%s)",
        order.id,
        order.status,
        order.user_id,
    )


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
    db.add(OrderStatusEvent(order_id=order.id, status=status_in.status))
    db.commit()
    db.refresh(order)

    notify_order_status_change(order)

    return order


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

class AnalyticsSummary(BaseModel):
    total_revenue_minor: int
    order_count: int
    average_order_value_minor: int
    low_stock_count: int


class RevenuePoint(BaseModel):
    date: str
    revenue_minor: int
    order_count: int


class TopProduct(BaseModel):
    product_id: int
    name: str
    quantity_sold: int
    revenue_minor: int


class LowStockProduct(BaseModel):
    id: int
    name: str
    stock_quantity: int


@router.get("/analytics/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    low_stock_threshold: int = Query(5, ge=0),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    paid_orders = db.query(Order).filter(Order.status.in_(REVENUE_STATUSES)).all()
    total_revenue = sum(o.total_amount_minor for o in paid_orders)
    order_count = len(paid_orders)
    average_order_value = total_revenue // order_count if order_count else 0
    low_stock_count = (
        db.query(Product).filter(Product.stock_quantity <= low_stock_threshold).count()
    )
    return AnalyticsSummary(
        total_revenue_minor=total_revenue,
        order_count=order_count,
        average_order_value_minor=average_order_value,
        low_stock_count=low_stock_count,
    )


@router.get("/analytics/revenue", response_model=List[RevenuePoint])
def get_revenue_over_time(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    since = datetime.utcnow() - timedelta(days=days)
    orders = (
        db.query(Order)
        .filter(Order.status.in_(REVENUE_STATUSES), Order.created_at >= since)
        .all()
    )

    # Aggregated in Python (rather than a DB-specific date_trunc) so this works
    # the same whether the app runs on SQLite or Postgres.
    by_day = defaultdict(lambda: {"revenue_minor": 0, "order_count": 0})
    for o in orders:
        day_key = o.created_at.date().isoformat()
        by_day[day_key]["revenue_minor"] += o.total_amount_minor
        by_day[day_key]["order_count"] += 1

    return [
        RevenuePoint(date=day, revenue_minor=v["revenue_minor"], order_count=v["order_count"])
        for day, v in sorted(by_day.items())
    ]


@router.get("/analytics/top-products", response_model=List[TopProduct])
def get_top_products(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    rows = (
        db.query(
            OrderItem.product_id,
            Product.name,
            func.sum(OrderItem.quantity).label("quantity_sold"),
            func.sum(OrderItem.quantity * OrderItem.unit_price_minor).label("revenue_minor"),
        )
        .join(Order, OrderItem.order_id == Order.id)
        .join(Product, OrderItem.product_id == Product.id)
        .filter(Order.status.in_(REVENUE_STATUSES))
        .group_by(OrderItem.product_id, Product.name)
        .order_by(func.sum(OrderItem.quantity * OrderItem.unit_price_minor).desc())
        .limit(limit)
        .all()
    )
    return [
        TopProduct(
            product_id=r.product_id,
            name=r.name,
            quantity_sold=int(r.quantity_sold),
            revenue_minor=int(r.revenue_minor),
        )
        for r in rows
    ]


@router.get("/analytics/low-stock", response_model=List[LowStockProduct])
def get_low_stock_products(
    threshold: int = Query(5, ge=0),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    products = (
        db.query(Product)
        .filter(Product.stock_quantity <= threshold)
        .order_by(Product.stock_quantity.asc())
        .all()
    )
    return [
        LowStockProduct(id=p.id, name=p.name, stock_quantity=p.stock_quantity)
        for p in products
    ]