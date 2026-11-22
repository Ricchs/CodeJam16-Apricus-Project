from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Interest, UserInterest
from schemas.user_profile import (
    UserProfileCreate,
    UserProfileUpdate,
    UserProfileOut,
)
from schemas.interest import InterestOut
from schemas.user_interests import UserInterestsUpdate
from uuid import UUID

from deps import get_current_user_id

router = APIRouter(
    prefix='/users',
    tags=['Users']
)

@router.post('/', response_model=UserProfileOut, status_code=201)
def create_user_profile(
    user_data: UserProfileCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.id == user_id
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="User profile already exists."
        )

    new_user = User(
        id=user_id,
        **user_data.model_dump()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.get('/me', response_model=UserProfileOut)
def get_my_profile(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User profile not found."
        )

    return user

@router.patch('/me', response_model=UserProfileOut)
def update_my_profile(
    user_data: UserProfileUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User profile not found."
        )

    update_data = user_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return user


@router.put('/me/interests', response_model=list[InterestOut])
def update_my_interests(
    interest_data: UserInterestsUpdate, 
    user_id: UUID = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404, 
            detail='User profile not found.'
        )
    
    interest_ids = list(dict.fromkeys(
        interest_data.interest_ids
    ))

    interests = db.query(Interest).filter(
        Interest.id.in_(interest_ids)
    ).all() if interest_ids else []

    if len(interests) != len(interest_ids):
        raise HTTPException(
            status_code=404, 
            detail='One or more interests do not exist.'
        )
    
    db.query(UserInterest).filter(
        UserInterest.user_id == user_id
    ).delete(synchronize_session=False)

    for interest_id in interest_ids:
        db.add(
            UserInterest(
                user_id=user_id, 
                interest_id=interest_id
            )
        )
    
    db.commit()

    return db.query(Interest).join(
        UserInterest, 
        Interest.id == UserInterest.interest_id
    ).filter(
        UserInterest.user_id == user_id 
    ).order_by(
        Interest.id
    ).all()

@router.get('/{user_id}', response_model=UserProfileOut)
def get_user_profile(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail='User profile not found.'
        )

    return user

