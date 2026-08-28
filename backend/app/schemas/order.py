from pydantic import BaseModel, model_validator
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

class OrderStatusEventOut(BaseModel):
    status: str
    created_at: datetime

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
    status_history: List[OrderStatusEventOut] = []

    class Config:
        from_attributes = True

    @model_validator(mode="after")
    def _ensure_history_fallback(self):
        # Orders created before status history tracking existed (or if a status
        # change ever slips through without logging one) would otherwise show an
        # empty timeline. Fall back to a single synthetic entry from the order's
        # own status/created_at so the UI always has something to render.
        if not self.status_history:
            self.status_history = [
                OrderStatusEventOut(status=self.status, created_at=self.created_at)
            ]
        return self