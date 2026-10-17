from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

class IncidentEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    incident_id: str
    previous_status: Optional[str] = None
    new_status: str
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))