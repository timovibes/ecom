from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.user import User
from app.schemas.checkout import CheckoutResponse
from app.dependencies import get_current_user
from app.payment_client import payment_client

router = APIRouter(prefix="/api/v1/checkout", tags=["checkout"])

@router.post("/", response_model=CheckoutResponse, status_code=201)
def checkout(
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

    order.total_amount_minor = total_minor
    db.commit()
    db.refresh(order)

    try:
        intent = payment_client.create_payment_intent(
            amount_minor=total_minor,
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
        amount_minor=total_minor,
        currency=currency,
        status=payment.status,
    )