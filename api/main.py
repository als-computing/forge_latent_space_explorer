from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import models

app = FastAPI(title="Latent Space Explorer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router, prefix="/models", tags=["models"])
