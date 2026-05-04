from fastapi import APIRouter, HTTPException

from schemas.jobs import MlflowModelOption
from services import jobs_service

router = APIRouter()


@router.get("/mlflow-models", response_model=list[MlflowModelOption])
def list_mlflow_models():
    try:
        return jobs_service.get_mlflow_models()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
