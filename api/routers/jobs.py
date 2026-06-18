import logging
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from schemas.jobs import (
    ClusteringJobRequest,
    FlowRunOption,
    JobStatusResponse,
    JobSubmitResponse,
    LatentSpaceJobRequest,
    MlflowModelOption,
    ModelVersionOption,
)
from services import jobs_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/mlflow-models", response_model=list[MlflowModelOption])
def list_mlflow_models():
    try:
        return jobs_service.get_mlflow_models()
    except Exception as e:
        logger.exception("Failed to list MLflow models")
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/live-models", response_model=list[MlflowModelOption])
def list_live_models(
    model_type: Literal["autoencoder", "dimension_reduction"] = Query(...),
):
    try:
        return jobs_service.get_live_models(model_type)
    except Exception as e:
        logger.exception("Failed to list live models (type=%s)", model_type)
        raise HTTPException(status_code=502, detail=str(e))


@router.get(
    "/live-models/{model_name}/versions", response_model=list[ModelVersionOption]
)
def list_live_model_versions(model_name: str):
    try:
        return jobs_service.get_live_model_versions(model_name)
    except Exception as e:
        logger.exception("Failed to list versions for model %s", model_name)
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/runs", response_model=list[FlowRunOption])
def list_flow_runs(tags: list[str] | None = Query(default=None)):
    try:
        return jobs_service.get_flow_runs(tags)
    except Exception as e:
        logger.exception("Failed to list flow runs (tags=%s)", tags)
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/{job_id}/status", response_model=JobStatusResponse)
def get_job_status(
    job_id: str,
    kind: Literal["latent-space", "clustering"],
    project_name: str = "",
):
    try:
        if kind == "latent-space":
            return jobs_service.get_latent_space_job_status(job_id, project_name)
        return jobs_service.get_clustering_job_status(job_id, project_name)
    except Exception as e:
        logger.exception("Failed to get status for job %s (kind=%s)", job_id, kind)
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/{job_id}/logs", response_model=list[str])
def get_logs(job_id: str):
    try:
        return jobs_service.get_job_logs(job_id)
    except Exception as e:
        logger.exception("Failed to get logs for job %s", job_id)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/latent-space", response_model=JobSubmitResponse)
def submit_latent_space(req: LatentSpaceJobRequest):
    try:
        return jobs_service.submit_latent_space_job(req)
    except Exception as e:
        logger.exception("Failed to submit latent-space job")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clustering", response_model=JobSubmitResponse)
def submit_clustering(req: ClusteringJobRequest):
    try:
        return jobs_service.submit_clustering_job(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
