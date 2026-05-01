from fastapi import APIRouter, HTTPException, Query

from schemas.models import Model
from services.model_service import get_model, get_models

router = APIRouter()


@router.get("/", response_model=list[Model])
def list_models(type: str | None = Query(None)):
    """
    List all models. Optionally filter by type:
      - latent_space_extraction
      - dimension_reduction
      - clustering
    """
    return get_models(model_type=type)


@router.get("/{model_name}", response_model=Model)
def get_model_by_name(model_name: str):
    model = get_model(model_name)
    if model is None:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
    return model
