from pydantic import BaseModel
from typing import List, Optional

class CheckoutItemIn(BaseModel):
    product_id: int
    quantity: int

class CheckoutRequest(BaseModel):
    items: List[CheckoutItemIn]

class CheckoutResponse(BaseModel):
    order_id: int
    payment_intent_id: str
    client_secret: str
    subtotal_minor: int
    discount_minor: int = 0
    coupon_code: Optional[str] = None
    amount_minor: int
    currency: str
    status: str