from datetime import datetime, time
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class ScheduleBlockCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time 
    end_time: time
    label: str | None = None 

class ScheduleBlockOut(BaseModel):
    id: int
    user_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    label: str | None = None

    model_config = ConfigDict(from_attributes=True)

