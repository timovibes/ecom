from pydantic import BaseModel

class OrderStatusUpdate(BaseModel):
    status: str  # e.g. "shipped", "cancelled"