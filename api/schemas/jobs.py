from typing import Any

from pydantic import BaseModel


class MlflowModelOption(BaseModel):
    label: str
    value: str | None


class LatentSpaceJobRequest(BaseModel):
    data_project_dict: dict[str, Any]
    model_name: str
    model_parameters: dict[str, Any]
    log_transform: bool = False
    percentiles: list[float] = [0.0, 100.0]
    mask: str | None = None
    job_name: str
    project_name: str
    mlflow_model_id: str


class ClusteringJobRequest(BaseModel):
    model_name: str
    model_parameters: dict[str, Any]
    log_transform: bool = False
    percentiles: list[float] = [0.0, 100.0]
    mask: str | None = None
    job_name: str
    project_name: str = ""
    dimension_reduction_job_id: str


class JobSubmitResponse(BaseModel):
    job_uid: str | None
    message: str
    status: str  # "success" | "dev" | "error"


class FlowRunOption(BaseModel):
    label: str
    value: str


class JobStatusResponse(BaseModel):
    ready: bool
    state: str | None = None    # Prefect state of the relevant child job
    result_uri: str | None = None
