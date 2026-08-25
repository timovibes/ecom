from datetime import datetime
from pydantic import BaseModel


class ProductSummary(BaseModel):
    id: int
    name: str
    price_minor: int
    currency: str
    image_url: str | None = None

    class Config:
        from_attributes = True


class WishlistItemOut(BaseModel):
    id: int
    product_id: int
    created_at: datetime
    product: ProductSummary

    class Config:
        from_attributes = True


class WishlistOut(BaseModel):
    items: list[WishlistItemOut]