<<<<<<< HEAD
import uuid 
from sqlalchemy import (
    TIMESTAMP, 
    Boolean, 
    Column, 
    DateTime, 
    ForeignKey, 
    Integer,  
=======
from sqlalchemy import (
    TIMESTAMP, 
    Column, 
    Date, 
    ForeignKey, 
    Integer, 
    Numeric, 
>>>>>>> 5e4ffdf (models.py)
    Text, 
    Time, 
    func, 
)

<<<<<<< HEAD
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
    year = Column(Integer)
    created_at = Column(
        TIMESTAMP(timezone=True), 
        nullable=False, 
        server_default=func.now()
    )
    @property
    def display_name(self):
        if self.role == 'club':
            return self.club_name or 'New club'
        
        name = " ".join(part for part in [self.first_name, self.last_name] if part)
        
        return name or 'New user'


class Interest(Base):
    __tablename__ = "interests"
    id = Column(Integer, primary_key=True)
    interest = Column(Text, unique=True, nullable=False)

class ScheduleBlock(Base):
    __tablename__ = "schedule_blocks"
    id = Column(Integer, primary_key=True)
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"), 
        nullable=False
    )
    day_of_week = Column(Integer, nullable=False) 
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
    interest_id = Column(
        Integer, 
        ForeignKey("interests.id"), 
        nullable=False
    )
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
=======
class users(Base): 
    __tablename__ = "Users"
    id = Column(Integer, primary_key=True)
    Role = Column(Text)
    FirstName = Column(Text)
    LastName = Column(Text)
    Major = Column(Text)
    Faculty = Column(Text)
    Year = Column(Text)

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
    Label = Column(Text)

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
>>>>>>> 5e4ffdf (models.py)
