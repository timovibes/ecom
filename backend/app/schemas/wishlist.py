from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.wishlist import WishlistItem
from app.models.product import Product
from app.models.user import User
from app.schemas.wishlist import WishlistOut
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/wishlist", tags=["wishlist"])

def _get_items(db: Session, user_id: int):
    return db.query(WishlistItem).filter(WishlistItem.user_id == user_id).all()

@router.get("/", response_model=WishlistOut)
def get_wishlist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"items": _get_items(db, current_user.id)}

@router.post("/{product_id}", status_code=201, response_model=WishlistOut)
def add_to_wishlist(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product already in wishlist")

    db.add(WishlistItem(user_id=current_user.id, product_id=product_id))
    db.commit()
    return {"items": _get_items(db, current_user.id)}

@router.delete("/{product_id}", response_model=WishlistOut)
def remove_from_wishlist(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == product_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not in wishlist")

    db.delete(item)
    db.commit()
    return {"items": _get_items(db, current_user.id)}