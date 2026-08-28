from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    discount_type = Column(String, nullable=False)   # "percentage" or "fixed"
    discount_value = Column(Integer, nullable=False)  # percent (1-100) for "percentage", minor units for "fixed"
    max_uses = Column(Integer, nullable=True)         # null = unlimited
    times_used = Column(Integer, default=0, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())