from dotenv import load_dotenv
load_dotenv("../.env")    # root .env — fallback for everything else

import os
from fastapi import FastAPI
from routers import data, infra, jobs, live, models

root_path = os.getenv("ROOT_PATH", "")

app = FastAPI(title="Latent Space Explorer API", root_path=root_path)

app.include_router(models.router, prefix="/api/v1/models", tags=["models"])
app.include_router(data.router, prefix="/api/v1/data", tags=["data"])
app.include_router(infra.router, prefix="/api/v1/infra", tags=["infra"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])
app.include_router(live.router, prefix="/api/v1/live", tags=["live"])
