from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SwipeCreate(BaseModel):
    lobby_id: UUID
    liked: bool


class SwipeOut(SwipeCreate):
    joined: bool