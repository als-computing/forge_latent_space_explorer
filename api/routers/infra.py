from fastapi import APIRouter, HTTPException

from schemas.infra import InfraState
from services.infra_service import get_infra_state

router = APIRouter()


@router.get("/health", response_model=InfraState)
def health():
    try:
        return get_infra_state()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
