import os

import models
from database import Base, engine
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import all_routers

Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = ["http://localhost:5173"]
origins.extend(
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")

for router in all_routers:
    api.include_router(router)

app.include_router(api)
