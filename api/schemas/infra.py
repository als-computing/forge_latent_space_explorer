from pydantic import BaseModel


class InfraState(BaseModel):
    tiled_ready: bool
    mlflow_ready: bool
    prefect_ready: bool
    prefect_worker_ready: bool
    any_infra_down: bool
    last_checked: str
