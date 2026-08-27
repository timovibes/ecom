from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut
from app.dependencies import get_current_admin

router = APIRouter(prefix="/api/v1/products", tags=["products"])

SORT_OPTIONS = {
    "newest": Product.created_at.desc(),
    "oldest": Product.created_at.asc(),
    "price_asc": Product.price_minor.asc(),
    "price_desc": Product.price_minor.desc(),
    "name_asc": Product.name.asc(),
    "name_desc": Product.name.desc(),
}

@router.get("/", response_model=List[ProductOut])
def list_products(
    response: Response,
    category_id: Optional[int] = None,
    search: Optional[str] = Query(None, description="search by product name"),
    sort_by: str = Query("newest", description=f"one of {sorted(SORT_OPTIONS)}"),
    min_price: Optional[int] = Query(None, ge=0, description="minimum price in minor units"),
    max_price: Optional[int] = Query(None, ge=0, description="maximum price in minor units"),
    skip: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if min_price is not None:
        query = query.filter(Product.price_minor >= min_price)
    if max_price is not None:
        query = query.filter(Product.price_minor <= max_price)

    total = query.count()
    response.headers["X-Total-Count"] = str(total)

    order_clause = SORT_OPTIONS.get(sort_by, SORT_OPTIONS["newest"])
    query = query.order_by(order_clause)

    return query.offset(skip).limit(limit).all()

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.get("/{product_id}/related", response_model=List[ProductOut])
def get_related_products(
    product_id: int,
    limit: int = Query(4, ge=1, le=12),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    query = db.query(Product).filter(Product.id != product_id)

    if product.category_id:
        query = query.filter(Product.category_id == product.category_id)

    related = query.order_by(Product.created_at.desc()).limit(limit).all()

    if not related and product.category_id:
        related = (
            db.query(Product)
            .filter(Product.id != product_id)
            .order_by(Product.created_at.desc())
            .limit(limit)
            .all()
        )

    return related

@router.post("/", response_model=ProductOut, status_code=201)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    product = Product(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in product_in.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product

@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()