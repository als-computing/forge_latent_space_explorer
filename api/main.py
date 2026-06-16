from dotenv import load_dotenv
load_dotenv("../.env")    # root .env — fallback for everything else

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import data, infra, jobs, live, models

root_path = os.getenv("ROOT_PATH", "")
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app = FastAPI(title="Latent Space Explorer API", root_path=root_path)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router, prefix="/models", tags=["models"])
app.include_router(data.router, prefix="/data", tags=["data"])
app.include_router(infra.router, prefix="/infra", tags=["infra"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(live.router, prefix="/live", tags=["live"])
