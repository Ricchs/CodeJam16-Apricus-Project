from .lobbies import router as lobbies_router
from .users import router as users_router
from .interests import router as interests_router
from .schedule import router as schedule_router
from .swipes import router as swipes_router

all_routers = [
    lobbies_router,
    users_router,
    interests_router,
    schedule_router,
    swipes_router,
]
