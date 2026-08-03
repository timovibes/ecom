from pydantic import BaseModel
from typing import List
from app.schemas.product import ProductOut

class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductOut

    class Config:
        from_attributes = True

class CartOut(BaseModel):
    id: int
    user_id: int
    items: List[CartItemOut]

    class Config:
        from_attributes = True