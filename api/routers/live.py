from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services import live_service

router = APIRouter()


class LiveStartRequest(BaseModel):
    autoencoder_model: str  # "name:version"
    dimred_model: str       # "name:version"
    experiment_name: str


@router.post("/start", status_code=204)
def start_live(req: LiveStartRequest):
    try:
        live_service.start_live(req.autoencoder_model, req.dimred_model, req.experiment_name)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/stop", status_code=204)
def stop_live():
    try:
        live_service.stop_live()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
