import asyncio
import logging
import os

import websockets
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from schemas.data import HeatmapRequest, HeatmapResponse
from services import live_service

ARROYO_HOST = os.getenv("ARROYO_HOST", "arroyo_xps")
ARROYO_PORT = int(os.getenv("ARROYO_PORT", "8765"))
ARROYO_WS = f"ws://{ARROYO_HOST}:{ARROYO_PORT}/lse_operator"

router = APIRouter()

logger = logging.getLogger(__name__)

_subscribers: set[asyncio.Queue] = set()


async def _arroyo_listener():
    backoff = 1
    while True:
        try:
            async with websockets.connect(ARROYO_WS) as ws:
                backoff = 1
                logger.info("Arroyo WebSocket connected at %s", ARROYO_WS)
                async for message in ws:
                    for q in list(_subscribers):
                        q.put_nowait(message)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Arroyo WebSocket error, retrying in %ds", backoff)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 30)


def start_listener() -> asyncio.Task:
    return asyncio.create_task(_arroyo_listener())


class LiveStartRequest(BaseModel):
    autoencoder_model: str  # "name:version"
    dimred_model: str  # "name:version"
    experiment_name: str


@router.post("/start", status_code=204)
def start_live(req: LiveStartRequest):
    try:
        live_service.start_live(
            req.autoencoder_model, req.dimred_model, req.experiment_name
        )
    except Exception as e:
        logger.exception("Failed to start live mode")
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/stop", status_code=204)
def stop_live():
    try:
        live_service.stop_live()
    except Exception as e:
        logger.exception("Failed to stop live mode")
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/heatmap", response_model=HeatmapResponse)
def compute_live_heatmap(req: HeatmapRequest):
    try:
        return live_service.compute_live_heatmap(req)
    except Exception as e:
        logger.exception("Failed to compute live heatmap")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stream")
async def stream():
    q: asyncio.Queue = asyncio.Queue()
    _subscribers.add(q)

    async def event_generator():
        try:
            while True:
                message = await q.get()
                yield f"data: {message}\n\n"
        finally:
            _subscribers.discard(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},
    )
