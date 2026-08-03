from pydantic import BaseModel
from typing import List

class CheckoutItemIn(BaseModel):
    product_id: int
    quantity: int

class CheckoutRequest(BaseModel):
    items: List[CheckoutItemIn]

class CheckoutResponse(BaseModel):
    order_id: int
    payment_intent_id: str
    client_secret: str
    amount_minor: int
    currency: str
    status: str