from fastapi import FastAPI, APIRouter

from database import engine

from routers import all_routers

app = FastAPI()
api = APIRouter(prefix="/api")

for router in all_routers:
    api.include_router(router)

app.include_router(api)
