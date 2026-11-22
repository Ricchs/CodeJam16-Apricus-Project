from uuid import UUID 
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from database import get_db
from models import Interest, UserInterest
from schemas.interest import InterestOut
from deps import get_current_user_id 

router = APIRouter(
    prefix='/interests', 
    tags=['Interests']
)

@router.get('/', response_model=list[InterestOut])
def get_all_interests(
    db: Session = Depends(get_db)
): 
    interests = db.query(Interest).order_by(
        Interest.id
    ).all()

    return interests

@router.get('/me', response_model=list[InterestOut])
def get_my_interests(
    user_id: UUID = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    interests = (
        db.query(Interest)
        .join(
            UserInterest, 
            Interest.id == UserInterest.interest_id
        )
        .filter(UserInterest.user_id == user_id)
        .order_by(Interest.id)
        .all()
    )

    return interests 

@router.post('/me', response_model=list[InterestOut])
def add_my_interests(
    interest_ids: list[int] = Body(..., embed=True), 
    user_id: UUID = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    interest_ids = list(dict.fromkeys(interest_ids))
    
    interests = db.query(Interest).filter(
        Interest.id.in_(interest_ids)
    ).all()

    if len(interests) != len(interest_ids):
        raise HTTPException(
            status_code=404, 
            detail='One or more interests do not exist.'
        )
    
    existing = db.query(UserInterest).filter(
        UserInterest.user_id == user_id, 
        UserInterest.interest_id.in_(interest_ids)
    ).all()

    existing_ids = {
        item.interest_id for item in existing
    }

    for interest_id in interest_ids:
        if interest_id not in existing_ids:
            db.add(
                UserInterest(
                    user_id=user_id, 
                    interest_id=interest_id
                )
            )
    
    db.commit()

    return (
        db.query(Interest)
        .join(
            UserInterest, 
            Interest.id == UserInterest.interest_id
        )
        .filter(UserInterest.user_id == user_id)
        .order_by(Interest.id)
        .all()
    )

@router.delete('/me/{interest_id}', status_code=204)
def remove_my_interest(
    interest_id: int, 
    user_id: UUID = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    user_interest = db.query(UserInterest).filter(
        UserInterest.user_id == user_id, 
        UserInterest.interest_id == interest_id
    ).first()

    if not user_interest:
        raise HTTPException(
            status_code=404, 
            detail='Interest not found in user profile.'
        )

    db.delete(user_interest)
    db.commit()