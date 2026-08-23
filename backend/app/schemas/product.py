from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CategoryCreate(BaseModel):
    name: str

class CategoryOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price_minor: int
    currency: str = "kes"
    stock_quantity: int = 0
    image_url: Optional[str] = None
    category_id: Optional[int] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_minor: Optional[int] = None
    stock_quantity: Optional[int] = None
    image_url: Optional[str] = None
    category_id: Optional[int] = None

class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price_minor: int
    currency: str
    stock_quantity: int
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    created_at: datetime
    average_rating: Optional[float] = None
    review_count: int = 0

    class Config:
        from_attributes = True