import logging

from fastapi import APIRouter, HTTPException

from schemas.infra import InfraState
from services.infra_service import get_infra_state

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=InfraState)
def health():
    try:
        return get_infra_state()
    except Exception as e:
        logger.exception("Failed to get infra state")
        raise HTTPException(status_code=500, detail=str(e))
