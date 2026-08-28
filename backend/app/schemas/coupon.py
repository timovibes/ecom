from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

DISCOUNT_TYPES = {"percentage", "fixed"}

class CouponCreate(BaseModel):
    code: str
    discount_type: str
    discount_value: int
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None

    @field_validator("discount_type")
    @classmethod
    def validate_discount_type(cls, v):
        if v not in DISCOUNT_TYPES:
            raise ValueError(f"discount_type must be one of {sorted(DISCOUNT_TYPES)}")
        return v

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v):
        return v.strip().upper()

class CouponOut(BaseModel):
    id: int
    code: str
    discount_type: str
    discount_value: int
    max_uses: Optional[int] = None
    times_used: int
    active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CouponPreview(BaseModel):
    code: str
    discount_type: Optional[str] = None
    discount_value: int = 0
    discount_minor: int = 0
    valid: bool
    message: Optional[str] = None