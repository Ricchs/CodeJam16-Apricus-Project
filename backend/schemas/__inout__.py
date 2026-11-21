from datetime import datetime, time
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class InterestOut(BaseModel):
    id: int
    interest: str

    model_config = ConfigDict(from_attributes=True)

class UserProfileCreate(BaseModel):
    first_name: str | None = None 
    last_name: str | None = None 
    club_name: str | None = None 
    major: str | None = None 
    faculty: str | None = None 
    year: int | None = None 

class UserProfileUpdate(BaseModel):
    first_name: str | None = None 
    last_name: str | None = None 
    club_name: str | None = None 
    major: str | None = None 
    faculty: str | None = None 
    year: int | None = None

class UserProfileOut(BaseModel):
    id: UUID
    role: str
    first_name: str | None = None
    last_name: str | None = None
    club_name: str | None = None
    major: str | None = None
    faculty: str | None = None
    year: int | None = None 
    created_at: datetime 
    display_name: str 

    model_config = ConfigDict(from_attri=butes=True)

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

