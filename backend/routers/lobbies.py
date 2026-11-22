from uuid import UUID

import models
from database import get_db
from deps import get_current_user_id
from fastapi import APIRouter, Depends
from schemas.lobby import LobbyCreate, LobbyOut
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/lobbies", response_model=list[LobbyOut])
def get_lobbies(db: Session = Depends(get_db)):
    return db.query(models.Lobby).all()


@router.post("/lobbies", response_model=LobbyCreate)
def create_lobby(
    body: LobbyCreate,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    lobby = models.Lobby(**body.model_dump(), host_id=user_id)
    db.add(lobby)
    db.commit()
    db.refresh(lobby)
    return lobby
