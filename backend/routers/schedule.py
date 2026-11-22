from uuid import UUID
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, Field, model_validator
from sqlalchemy import Column, DateTime, MetaData, Table, Text, Uuid, delete, select, update
from sqlalchemy.dialects.postgresql import insert 

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import ScheduleBlock
from schemas.schedule_block import ScheduleBlockCreate, ScheduleBlockOut
from deps import get_current_user_id

router = APIRouter(
    prefix='/schedule', 
    tags=['Schedule']
)

@router.post('/', response_model=ScheduleBlockOut, status_code=201)
def create_schedule_block(
    schedule_data: ScheduleBlockCreate, 
    user_id: UUID = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):

    if schedule_data.end_time <= schedule_data.start_time:
        raise HTTPException(
            status_code=400, 
            detail='End time must be later than start time.'
        )
    
    new_block = ScheduleBlock(
        user_id=user_id, 
        **schedule_data.model_dump()
    )

    db.add(new_block)
    db.commit()
    db.refresh(new_block)
    
    return new_block

@router.get('/me', response_model=list[ScheduleBlockOut])
def get_my_schedule(
    user_id: UUID = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    schedule = db.query(ScheduleBlock).filter(
        ScheduleBlock.user_id == user_id
    ).order_by(
        ScheduleBlock.day_of_week, 
        ScheduleBlock.start_time
    ).all()
    
    return schedule 

@router.put('/{block_id}', response_model=ScheduleBlockOut)
def update_schedule_block(
    block_id: int, 
    schedule_data: ScheduleBlockCreate, 
    user_id: UUID = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    block = db.query(ScheduleBlock).filter(
        ScheduleBlock.id == block_id, 
        ScheduleBlock.user_id == user_id
    ).first()

    if not block:
        raise HTTPException(
            status_code=404, 
            detail='Schedule block not found.'
        )
    
    if schedule_data.end_time <= schedule_data.start_time: 
        raise HTTPException(
            status_code=400, 
            detail='End time must be later than start time.'
        )

    update_data = schedule_data.model_dump()

    for field, value in update_data.items():
        setattr(block, field, value)

    db.commit()
    db.refresh(block)

    return block

@router.delete('/{block_id}', status_code=204)
def delete_schedule_block(
    block_id: int, 
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    block = db.query(ScheduleBlock).filter(
        ScheduleBlock.id == block_id, 
        ScheduleBlock.user_id == user_id
    ).first()

    if not block:
        raise HTTPException(
            status_code=404, 
            detail='Schedule block not found.'
        )
    
    db.delete(block)
    db.commit()



# Dated events are separate from the weekly blocks used by lobby matching.
calendar_events = Table(
    "calendar_events",
    MetaData(),
    Column("user_id", Uuid, primary_key=True),
    Column("id", Text, primary_key=True),
    Column("title", Text),
    Column("start_at", DateTime(timezone=True), key="start"),
    Column("end_at", DateTime(timezone=True), key="end"),
    Column("category", Text),
    Column("location", Text),
    Column("notes", Text),
    schema="public",
)


class CalendarEvent(BaseModel):
    id: str = Field(min_length=1, max_length=512)
    title: str = Field(min_length=1, max_length=1024)
    start: AwareDatetime
    end: AwareDatetime
    category: Literal["class", "club", "work", "gym", "social", "personal"]
    location: str = Field(default="", max_length=4096)
    notes: str = Field(default="", max_length=16384)

    @model_validator(mode="after")
    def validate_times(self):
        if self.end <= self.start:
            raise ValueError("End time must be later than start time.")
        return self


def event_rows(db: Session, user_id: UUID):
    columns = calendar_events.c
    return db.execute(
        select(
            columns.id, columns.title, columns.start.label("start"),
            columns.end.label("end"), columns.category, columns.location, columns.notes,
        ).where(columns.user_id == user_id).order_by(columns.start)
    ).mappings().all()


@router.get("/events", response_model=list[CalendarEvent])
def get_calendar_events(user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return event_rows(db, user_id)


@router.post("/events", response_model=list[CalendarEvent])
def add_calendar_events(
    events: Annotated[list[CalendarEvent], Field(min_length=1, max_length=1000)],
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    rows = [dict(event.model_dump(), user_id=user_id) for event in events]
    db.execute(insert(calendar_events).on_conflict_do_nothing(index_elements=["user_id", "id"]), rows)
    db.commit()
    return event_rows(db, user_id)


@router.put("/events/{event_id}", response_model=CalendarEvent)
def update_calendar_event(
    event_id: str, event: CalendarEvent,
    user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db),
):
    columns = calendar_events.c
    result = db.execute(
        update(calendar_events).where(columns.user_id == user_id, columns.id == event_id)
        .values(event.model_dump(exclude={"id"}))
    )
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Calendar event not found.")
    db.commit()
    return event.model_copy(update={"id": event_id})


@router.delete("/events/{event_id}", status_code=204)
def delete_calendar_event(
    event_id: str, user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db),
):
    columns = calendar_events.c
    db.execute(delete(calendar_events).where(columns.user_id == user_id, columns.id == event_id))
    db.commit()
