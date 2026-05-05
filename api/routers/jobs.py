from fastapi import APIRouter, HTTPException, Query

from schemas.jobs import (
    ClusteringJobRequest,
    FlowRunOption,
    JobSubmitResponse,
    LatentSpaceJobRequest,
    MlflowModelOption,
)
from services import jobs_service

router = APIRouter()


@router.get("/mlflow-models", response_model=list[MlflowModelOption])
def list_mlflow_models():
    try:
        return jobs_service.get_mlflow_models()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/runs", response_model=list[FlowRunOption])
def list_flow_runs(tags: list[str] | None = Query(default=None)):
    try:
        return jobs_service.get_flow_runs(tags)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/latent-space", response_model=JobSubmitResponse)
def submit_latent_space(req: LatentSpaceJobRequest):
    try:
        return jobs_service.submit_latent_space_job(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clustering", response_model=JobSubmitResponse)
def submit_clustering(req: ClusteringJobRequest):
    try:
        return jobs_service.submit_clustering_job(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
