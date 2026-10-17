from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

class Evidence(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    incident_id: str
    filename: str
    content_type: str
    storage_key: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))