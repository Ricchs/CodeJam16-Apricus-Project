from uuid import UUID 

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import ScheduleBlock
from schemas import ScheduleBlockCreate, ScheduleBlockOut
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


