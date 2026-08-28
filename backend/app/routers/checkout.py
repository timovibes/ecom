from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatusEvent
from app.models.payment import Payment
from app.models.coupon import Coupon
from app.models.user import User
from app.schemas.checkout import CheckoutResponse
from app.schemas.coupon import CouponPreview
from app.dependencies import get_current_user
from app.payment_client import payment_client
from app.schemas.order import OrderOut

router = APIRouter(prefix="/api/v1/checkout", tags=["checkout"])


def _get_cart_subtotal_minor(db: Session, user_id: int) -> int:
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart or not cart.items:
        return 0
    subtotal = 0
    for cart_item in cart.items:
        product = db.query(Product).filter(Product.id == cart_item.product_id).first()
        if product:
            subtotal += product.price_minor * cart_item.quantity
    return subtotal


def _validate_and_price_coupon(db: Session, code: str, subtotal_minor: int):
    """Returns (coupon_or_None, discount_minor, error_message_or_None).
    Does NOT mark the coupon as used — that only happens once payment succeeds,
    mirroring how stock is only decremented on a successful payment."""
    coupon = db.query(Coupon).filter(Coupon.code == code.strip().upper()).first()
    if not coupon:
        return None, 0, "Coupon not found"
    if not coupon.active:
        return None, 0, "Coupon is not active"
    if coupon.expires_at and coupon.expires_at < datetime.utcnow():
        return None, 0, "Coupon has expired"
    if coupon.max_uses is not None and coupon.times_used >= coupon.max_uses:
        return None, 0, "Coupon has reached its usage limit"

    if coupon.discount_type == "percentage":
        discount = (subtotal_minor * coupon.discount_value) // 100
    else:
        discount = coupon.discount_value

    discount = max(0, min(discount, subtotal_minor))
    return coupon, discount, None


@router.get("/coupon/{code}", response_model=CouponPreview)
def preview_coupon(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate a coupon against the current user's cart without applying it,
    so the checkout page can show a live discount preview before payment."""
    subtotal = _get_cart_subtotal_minor(db, current_user.id)
    coupon, discount, error = _validate_and_price_coupon(db, code, subtotal)
    if not coupon:
        return CouponPreview(code=code.strip().upper(), valid=False, message=error)
    return CouponPreview(
        code=coupon.code,
        discount_type=coupon.discount_type,
        discount_value=coupon.discount_value,
        discount_minor=discount,
        valid=True,
    )


@router.post("/", response_model=CheckoutResponse, status_code=201)
def checkout(
    coupon_code: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total_minor = 0
    currency = "kes"
    order = Order(user_id=current_user.id, status="pending", total_amount_minor=0, currency=currency)
    db.add(order)
    db.flush()  # get order.id before committing

    for cart_item in cart.items:
        product = db.query(Product).filter(Product.id == cart_item.product_id).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {cart_item.product_id} no longer exists")
        if product.stock_quantity < cart_item.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {product.name}")

        line_total = product.price_minor * cart_item.quantity
        total_minor += line_total

        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=cart_item.quantity,
            unit_price_minor=product.price_minor,
        )
        db.add(order_item)

    subtotal_minor = total_minor
    discount_minor = 0
    applied_coupon = None
    if coupon_code:
        applied_coupon, discount_minor, error = _validate_and_price_coupon(db, coupon_code, subtotal_minor)
        if not applied_coupon:
            db.rollback()
            raise HTTPException(status_code=400, detail=error or "Invalid coupon")

    final_total = subtotal_minor - discount_minor

    order.total_amount_minor = final_total
    order.coupon_code = applied_coupon.code if applied_coupon else None
    order.discount_minor = discount_minor
    db.commit()
    db.refresh(order)

    try:
        intent = payment_client.create_payment_intent(
            amount_minor=final_total,
            currency=currency,
            description=f"Order #{order.id}",
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach payment gateway")

    payment = Payment(
        order_id=order.id,
        payment_intent_id=intent["id"],
        status=intent.get("status", "pending"),
        client_secret=intent.get("client_secret"),
    )
    db.add(payment)
    db.commit()

    return CheckoutResponse(
        order_id=order.id,
        payment_intent_id=intent["id"],
        client_secret=intent["client_secret"],
        subtotal_minor=subtotal_minor,
        discount_minor=discount_minor,
        coupon_code=order.coupon_code,
        amount_minor=final_total,
        currency=currency,
        status=payment.status,
    )


@router.post("/orders/{order_id}/sync-payment", response_model=OrderOut)
def sync_payment(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if not payment:
        raise HTTPException(status_code=400, detail="No payment attached to this order")

    try:
        intent = payment_client.get_payment_intent(payment.payment_intent_id)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach payment gateway")

    gateway_status = intent.get("status")
    payment.status = gateway_status
    payment.failure_reason = intent.get("failure_reason")

    if gateway_status == "succeeded" and order.status != "paid":
        order.status = "paid"
        db.add(OrderStatusEvent(order_id=order.id, status="paid"))
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock_quantity = max(0, product.stock_quantity - item.quantity)

        # Coupon is only marked "used" once payment actually succeeds — same
        # reasoning as stock, which is only decremented here and not at checkout.
        if order.coupon_code:
            coupon = db.query(Coupon).filter(Coupon.code == order.coupon_code).first()
            if coupon:
                coupon.times_used += 1

        # Clear the user's cart now that the order is paid for.
        cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
        if cart:
            db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()

    elif gateway_status == "declined" and order.status != "declined":
        order.status = "declined"
        db.add(OrderStatusEvent(order_id=order.id, status="declined"))
    # any other status (e.g. "pending") — leave order.status as "pending", nothing to do yet

    db.commit()
    db.refresh(order)
    return order