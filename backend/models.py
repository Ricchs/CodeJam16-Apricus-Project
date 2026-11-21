import uuid 
from sqlalchemy import (
    TIMESTAMP, 
    Boolean, 
    Column, 
    DateTime, 
    ForeignKey, 
    Integer,  
    Text, 
    Time, 
    func, 
)

from sqlalchemy.dialects.postgresql import UUID
from database import Base


class User(Base): 
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    role = Column(Text, nullable=False,  server_default='student')
    first_name = Column(Text, nullable=True)
    last_name = Column(Text, nullable=True)
    club_name = Column(Text, nullable=True)
    major = Column(Text)
    faculty = Column(Text)
    year = Column(Text)

class Interest(Base):
    __tablename__ = "interests"
    id = Column(Integer, primary_key=True)
    interest = Column(Text, unique=True, nullable=False)

class ScheduleBlock(Base):
    __tablename__ = "schedules_blocks"
    id = Column(Integer, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id")
        nullable=False
    )
    days_of_week = Column(Integer, nullable=False) 
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False) 
    label = Column(Text)

class UserInterest(Base):
    __tablename__ = "user_interests"
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"), 
        primary_key=True
    )
    interest_id = Column(
        Integer, 
        ForeignKey("interests.id"), 
        primary_key=True
    )

class Lobby(Base): 
    __tablename__ = "lobbies"
    id = Column(
        UUID(as_uuid=True), 
        primary_key = True, 
        default=uuid.uuid4
    )
    host_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"), 
        nullable=False
    )
    title = Column(Text, nullable=False)
    location = Column(Text)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    capacity = Column(Integer, nullable=False)
    interest_id = Column(Integer, ForeignKey("interests.id"))
    created_at = Column(
        TIMESTAMP(timezone=True), 
        nullable=False, 
        server_default=func.now()
    )

class LobbyMember(Base):
    __tablename__ = "lobby_members"
    lobby_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("lobbies.id"), 
        primary_key=True
    )
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"), 
        primary_key=True
    )
    joined_at = Column(
        TIMESTAMP(timezone=True), 
        nullable=False, 
        server_default=func.now()
    )

class Swipe(Base):
    __tablename__ = "swipes"
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"), 
        primary_key=True
    )
    lobby_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("lobbies.id"), 
        primary_key=True
    )
    liked = Column(Boolean, nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True), 
        nullable=False, 
        server_default=func.now()
    )
