from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/cart", tags=["cart"])

def get_or_create_cart(db: Session, user_id: int) -> Cart:
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart

@router.get("/", response_model=CartOut)
def get_cart(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_or_create_cart(db, current_user.id)

@router.post("/items", response_model=CartOut, status_code=201)
def add_item(
    item_in: CartItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == item_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if item_in.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    cart = get_or_create_cart(db, current_user.id)

    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.product_id == item_in.product_id,
    ).first()

    if existing_item:
        existing_item.quantity += item_in.quantity
    else:
        existing_item = CartItem(
            cart_id=cart.id,
            product_id=item_in.product_id,
            quantity=item_in.quantity,
        )
        db.add(existing_item)

    db.commit()
    db.refresh(cart)
    return cart

@router.patch("/items/{item_id}", response_model=CartOut)
def update_item(
    item_id: int,
    item_in: CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart = get_or_create_cart(db, current_user.id)
    item = db.query(CartItem).filter(
        CartItem.id == item_id, CartItem.cart_id == cart.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if item_in.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    item.quantity = item_in.quantity
    db.commit()
    db.refresh(cart)
    return cart

@router.delete("/items/{item_id}", response_model=CartOut)
def remove_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart = get_or_create_cart(db, current_user.id)
    item = db.query(CartItem).filter(
        CartItem.id == item_id, CartItem.cart_id == cart.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    db.delete(item)
    db.commit()
    db.refresh(cart)
    return cart

@router.delete("/", status_code=204)
def clear_cart(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cart = get_or_create_cart(db, current_user.id)
    for item in cart.items:
        db.delete(item)
    db.commit()