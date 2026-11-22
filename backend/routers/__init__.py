from .lobbies import router as lobbies_router
from .users import router as users_router

all_routers = [lobbies_router, users_router]