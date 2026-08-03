from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price_minor: int

    class Config:
        from_attributes = True

class PaymentOut(BaseModel):
    status: str
    failure_reason: Optional[str] = None

    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: int
    status: str
    total_amount_minor: int
    currency: str
    created_at: datetime
    items: List[OrderItemOut]
    payment: Optional[PaymentOut] = None

    class Config:
        from_attributes = True