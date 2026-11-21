from sqlalchemy import (
    TIMESTAMP, 
    Column, 
    Date, 
    ForeignKey, 
    Integer, 
    Numeric, 
    Text, 
    Time, 
    func, 
)

from backend.database import Base


class users(Base): 
    __tablename__ = "Users"
    id = Column(Integer, primary_key=True)
    role = Column(Text)
    firstName = Column(Text)
    lastName = Column(Text)
    major = Column(Text)
    faculty = Column(Text)
    year = Column(Text)

class interests(Base):
    __tablename__ = "Interests"
    id = Column(Integer, primary_key=True)
    interest = Column(Text)

class schedules_blocks(Base):
    __tablename__ = "Schedules_Blocks"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("Users.id"))
    days_of_week = Column(Text) 
    start_time = Column(Time)
    end_time = Column(Time) 
    label = Column(Text)

class user_interests(Base):
    __tablename__ = "User_Interests"
    user_id = Column(Integer, ForeignKey("Users.id"))
    interest_id = Column(Integer, ForeignKey("Interests.id"))

class lobbies(Base): 
    __tablename__ = "Lobbies"
    id = Column(Integer, primary_key = True)
    host_id = Column(Integer, ForeignKey("Users.id"))
    title = Column(Text)
    location = Column(Text)
    starts_at = Column(Time)
    ends_at = Column(Time)
    capacity = Column(Integer)
    date = Column(Date)
    interest_id = Column(Integer, ForeignKey("Interests.id"))

class lobby_members(Base):
    __tablename__ = "Lobby_Memebers"
    lobby_id = Column(Integer, ForeignKey("Lobbies.id"))
    user_id = Column(Integer, ForeignKey("Users.id"))
    joined_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class swipes(Base):
    __tablename__ = "Swipes"
    user_id = Column(Integer, ForeignKey("Users.id"))
    lobby_id = Column(Integer, ForeignKey("Lobbies.id"))
    liked = Column(Integer)  # 1 for like, 0 for dislike
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
