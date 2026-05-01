import os
from datetime import datetime

import httpx
from mlex_utils.mlflow_utils.mlflow_model_client import MLflowModelClient
from zoneinfo import ZoneInfo
from mlex_utils.prefect_utils.core import check_prefect_ready, check_prefect_worker_ready

from schemas.infra import InfraState

TIMEZONE = os.getenv("TIMEZONE", "US/Pacific")
FLOW_NAME = os.getenv("FLOW_NAME", "")
RESULTS_TILED_URI = os.getenv("RESULTS_TILED_URI", "")
RESULTS_TILED_API_KEY = os.getenv("RESULTS_TILED_API_KEY", "")


def _check_tiled_ready() -> bool:
    try:
        headers = {"Authorization": f"Bearer {RESULTS_TILED_API_KEY}"} if RESULTS_TILED_API_KEY else {}
        httpx.get(RESULTS_TILED_URI, headers=headers, timeout=5.0)
        return True
    except Exception:
        return False


def get_infra_state() -> InfraState:
    last_checked = datetime.now(ZoneInfo(TIMEZONE)).strftime("%Y/%m/%d %H:%M:%S")
    any_infra_down = False

    tiled_ready = _check_tiled_ready()
    if not tiled_ready:
        any_infra_down = True

    try:
        mlflow_ready = MLflowModelClient().check_mlflow_ready()
        if not mlflow_ready:
            any_infra_down = True
    except Exception:
        mlflow_ready = False
        any_infra_down = True

    try:
        check_prefect_ready()
        prefect_ready = True
    except Exception:
        prefect_ready = False
        any_infra_down = True

    try:
        check_prefect_worker_ready(FLOW_NAME)
        prefect_worker_ready = True
    except Exception:
        prefect_worker_ready = False
        any_infra_down = True

    return InfraState(
        tiled_ready=tiled_ready,
        mlflow_ready=mlflow_ready,
        prefect_ready=prefect_ready,
        prefect_worker_ready=prefect_worker_ready,
        any_infra_down=any_infra_down,
        last_checked=last_checked,
    )
