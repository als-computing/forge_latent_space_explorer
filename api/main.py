from dotenv import load_dotenv
load_dotenv("../.env")    # root .env — fallback for everything else

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import data, infra, jobs, models

app = FastAPI(title="Latent Space Explorer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router, prefix="/models", tags=["models"])
app.include_router(data.router, prefix="/data", tags=["data"])
app.include_router(infra.router, prefix="/infra", tags=["infra"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
