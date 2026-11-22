from datetime import datetime
from uuid import UUID

import models
from database import get_db
from deps import get_current_user_id
from fastapi import APIRouter, Depends, HTTPException
from schemas.swipe import SwipeCreate, SwipeOut
from services.matching import MONTREAL
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/swipes", response_model=SwipeOut)
def create_swipes(
    body: SwipeCreate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    lobby = db.get(models.Lobby, body.lobby_id)
    if lobby is None:
        raise HTTPException(status_code=404, detail="Lobby not found")

    existing = db.get(models.Swipe, (user_id, body.lobby_id))
    if existing is not None:
        raise HTTPException(status_code=409, detail="Already swiped on this lobby")

    swipe = models.Swipe(user_id=user_id, lobby_id=body.lobby_id, liked=body.liked)
    db.add(swipe)

    num_members = (
        db.query(models.LobbyMember)
        .filter(models.LobbyMember.lobby_id == lobby.id)
        .count()
    )

    joined = False
    if (
        body.liked
        and lobby.starts_at > datetime.now(MONTREAL)
        and lobby.host_id != user_id
        and num_members < lobby.capacity
    ):
        db.add(models.LobbyMember(lobby_id=lobby.id, user_id=user_id))
        joined = True

    db.commit()
    return SwipeOut(lobby_id=body.lobby_id, liked=body.liked, joined=joined)
