from uuid import UUID

import models
from database import get_db
from deps import get_current_user_id
from fastapi import APIRouter, Depends, HTTPException
from schemas.swipe import SwipeCreate, SwipeOut
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/swipes", response_model=list[SwipeCreate])
def get_swipes(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    rows = (
        db.query(models.Swipe)
        .filter(models.Swipe.user_id == user_id)
        .order_by(models.Swipe.created_at, models.Swipe.lobby_id)
        .all()
    )
    return [SwipeCreate(lobby_id=row.lobby_id, liked=row.liked) for row in rows]


@router.post("/swipes", response_model=SwipeOut)
def create_swipes(
    body: SwipeCreate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    if db.get(models.Lobby, body.lobby_id) is None:
        raise HTTPException(status_code=404, detail="Lobby not found")

    statement = insert(models.Swipe).values(
        user_id=user_id, lobby_id=body.lobby_id, liked=body.liked
    )
    db.execute(
        statement.on_conflict_do_update(
            index_elements=[models.Swipe.user_id, models.Swipe.lobby_id],
            set_={"liked": statement.excluded.liked},
        )
    )
    joined = db.get(models.LobbyMember, (body.lobby_id, user_id)) is not None
    db.commit()
    return SwipeOut(lobby_id=body.lobby_id, liked=body.liked, joined=joined)
