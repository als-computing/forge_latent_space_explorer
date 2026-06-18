import logging
import os

import websockets
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services import live_service

ARROYO_HOST = os.getenv("ARROYO_HOST", "arroyo_xps")
ARROYO_PORT = int(os.getenv("ARROYO_PORT", "8765"))
ARROYO_WS = f"ws://{ARROYO_HOST}:{ARROYO_PORT}/lse_operator"

router = APIRouter()

logger = logging.getLogger(__name__)


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


@router.get("/stream")
async def stream():
    async def event_generator():
        async with websockets.connect(ARROYO_WS) as ws:
            async for message in ws:
                yield f"data: {message}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},
    )
