import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from routers import data, infra, jobs, live, models
from starlette.exceptions import HTTPException as StarletteHTTPException

load_dotenv("../.env")  # root .env — fallback for everything else

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

root_path = os.getenv("ROOT_PATH", "")
UI_DIST = Path("/app/ui/dist")


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = live.start_listener()
    yield
    task.cancel()
    try:
        await task
    except Exception:
        pass


app = FastAPI(title="Latent Space Explorer API", root_path=root_path, lifespan=lifespan)

app.include_router(models.router, prefix="/api/v1/models", tags=["models"])
app.include_router(data.router, prefix="/api/v1/data", tags=["data"])
app.include_router(infra.router, prefix="/api/v1/infra", tags=["infra"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])
app.include_router(live.router, prefix="/api/v1/live", tags=["live"])


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404 and not request.url.path.startswith("/api/"):
        file = UI_DIST / request.url.path.lstrip("/")
        if file.is_file():
            return FileResponse(file)
        return FileResponse(UI_DIST / "index.html")
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
