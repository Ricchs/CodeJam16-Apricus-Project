from collections import defaultdict
from datetime import datetime
from uuid import UUID

import models
from database import get_db
from deps import get_current_user_id
from fastapi import APIRouter, Depends, HTTPException
from schemas.lobby import LobbyCreate, LobbyOut, LobbyDetail, MemberOut
from services.matching import MONTREAL, TimeBlock, rank_lobbies
from services.matching import Lobby as MatchLobby
from sqlalchemy.orm import Session
from sqlalchemy import or_

router = APIRouter()


@router.get("/lobbies", response_model=list[LobbyOut])
def get_lobbies(db: Session = Depends(get_db)):
    return db.query(models.Lobby).all()


@router.get("/lobbies/deck", response_model=list[LobbyOut])
def get_lobbies_deck(
    db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)
):
    now = datetime.now(MONTREAL)

    user_interests = (
        db.query(models.UserInterest)
        .filter(models.UserInterest.user_id == user_id)
        .all()
    )
    schedule_blocks = (
        db.query(models.ScheduleBlock)
        .filter(models.ScheduleBlock.user_id == user_id)
        .all()
    )
    swiped_lobbies_ids = db.query(models.Swipe.lobby_id).filter(
        models.Swipe.user_id == user_id
    )
    lobbies = (
        db.query(models.Lobby)
        .filter(
            models.Lobby.starts_at > now,
            models.Lobby.host_id != user_id,
            ~models.Lobby.id.in_(swiped_lobbies_ids),
        )
        .all()
    )
    lobby_ids = [lobby.id for lobby in lobbies]

    member_interests = (
        db.query(
            models.LobbyMember.lobby_id,
            models.LobbyMember.user_id,
            models.UserInterest.interest_id,
        )
        .outerjoin(
            models.UserInterest,
            models.UserInterest.user_id == models.LobbyMember.user_id,
        )
        .filter(models.LobbyMember.lobby_id.in_(lobby_ids))
        .all()
    )

    user_interests_ids = {user_interest.interest_id for user_interest in user_interests}
    schedule_lists = [
        TimeBlock(
            weekday=row.day_of_week, start_time=row.start_time, end_time=row.end_time
        )
        for row in schedule_blocks
    ]

    members_by_lobby = defaultdict(lambda: defaultdict(set))
    for lobby_id, member_id, interest_id in member_interests:
        members = members_by_lobby[lobby_id]
        members[member_id]
        if interest_id is not None:
            members[member_id].add(interest_id)

    match_lobbies = [
        MatchLobby(
            id=lobby.id,
            interest_id=lobby.interest_id,
            start_time=lobby.starts_at,
            end_time=lobby.ends_at,
            capacity=lobby.capacity,
            member_interests=list(members_by_lobby[lobby.id].values()),
        )
        for lobby in lobbies
    ]

    ranked = rank_lobbies(user_interests_ids, schedule_lists, match_lobbies, now)

    lobbies_by_id = {lobby.id: lobby for lobby in lobbies}
    return [lobbies_by_id[m.id] for m in ranked]


@router.get("/lobbies/mine", response_model=list[LobbyOut])
def get_my_lobbies(
    db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)
):
    joined_ids = db.query(models.LobbyMember.lobby_id).filter(
        models.LobbyMember.user_id == user_id
    )
    return (
        db.query(models.Lobby)
        .filter(
            or_(
                models.Lobby.host_id == user_id,
                models.Lobby.id.in_(joined_ids),
            )
        )
        .order_by(models.Lobby.starts_at)
        .all()
    )


@router.post("/lobbies", response_model=LobbyOut)
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


@router.get("/lobbies/joined", response_model=list[UUID])
def get_joined_lobbies(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return [
        lobby_id
        for (lobby_id,) in db.query(models.LobbyMember.lobby_id)
        .filter_by(user_id=user_id)
        .all()
    ]


@router.get("/lobbies/{lobby_id}", response_model=LobbyDetail)
def get_lobby(
    lobby_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    lobby = db.get(models.Lobby, lobby_id)
    if lobby is None:
        raise HTTPException(status_code=404, detail="Lobby not found")

    member_ids = db.query(models.LobbyMember.user_id).filter(
        models.LobbyMember.lobby_id == lobby_id
    )
    members = db.query(models.User).filter(models.User.id.in_(member_ids)).all()

    return LobbyDetail(
        **LobbyOut.model_validate(lobby).model_dump(),
        members=[MemberOut.model_validate(m) for m in members],
    )


@router.post("/lobbies/{lobby_id}/join")
def join_lobby(
    lobby_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    # Lock the lobby while checking capacity and adding a member.
    lobby = db.get(models.Lobby, lobby_id, with_for_update=True)
    if lobby is None:
        raise HTTPException(status_code=404, detail="Lobby not found.")
    if lobby.host_id == user_id:
        raise HTTPException(status_code=409, detail="You host this lobby.")
    if db.get(models.LobbyMember, (lobby_id, user_id)) is not None:
        return {"joined": True}
    if lobby.starts_at <= datetime.now(MONTREAL):
        raise HTTPException(status_code=409, detail="This lobby has already started.")
    if db.get(models.User, user_id) is None:
        raise HTTPException(
            status_code=403, detail="Create your Apricus profile before joining."
        )
    if (
        db.query(models.LobbyMember).filter_by(lobby_id=lobby_id).count()
        >= lobby.capacity
    ):
        raise HTTPException(status_code=409, detail="This lobby is full.")

    db.add(models.LobbyMember(lobby_id=lobby_id, user_id=user_id))
    db.commit()
    return {"joined": True}
