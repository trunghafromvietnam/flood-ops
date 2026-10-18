from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

class Incident(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    description: str
    people_count: Optional[int] = None
    phone: Optional[str] = None  # call-back number given by the reporter
    reporter_type: str = "SELF"  # SELF | THIRD_PARTY
    status: str = "NEW"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_method: Optional[str] = None  # GPS | MAP_PIN | MANUAL | UNKNOWN
    address_text: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))