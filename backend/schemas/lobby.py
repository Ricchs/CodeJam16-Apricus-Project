from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LobbyCreate(BaseModel):
    title: str
    location: str | None = None
    starts_at: datetime
    ends_at: datetime
    capacity: int
    interest_id: int

class LobbyOut(LobbyCreate):
    id: UUID
    host_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)