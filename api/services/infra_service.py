import os
import socket
from datetime import datetime
from urllib.parse import urlparse

import httpx
from mlex_utils.mlflow_utils.mlflow_model_client import MLflowModelClient
from zoneinfo import ZoneInfo

from schemas.infra import InfraState

TIMEZONE = os.getenv("TIMEZONE", "US/Pacific")
RESULTS_TILED_URI = os.getenv("RESULTS_TILED_URI", "")
RESULTS_TILED_API_KEY = os.getenv("RESULTS_TILED_API_KEY", "")
ARROYO_HOST = os.getenv("ARROYO_HOST", "arroyo_xps")
ARROYO_PORT = int(os.getenv("ARROYO_PORT", "8765"))
WEBSOCKET_URL = os.getenv("WEBSOCKET_URL", "ws://timepix_processor:8001/xps_operator")


def _check_websocket_ready() -> tuple[bool, str | None]:
    if not WEBSOCKET_URL:
        return False, "WEBSOCKET_URL is not configured"
    try:
        parsed = urlparse(WEBSOCKET_URL)
        host = parsed.hostname
        port = parsed.port or (443 if parsed.scheme == "wss" else 80)
        with socket.create_connection((host, port), timeout=3):
            return True, None
    except Exception as e:
        return False, str(e)


def _check_arroyo_ready() -> tuple[bool, str | None]:
    try:
        with socket.create_connection((ARROYO_HOST, ARROYO_PORT), timeout=3):
            return True, None
    except Exception as e:
        return False, str(e)


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
    tiled_error: str | None = None
    if not tiled_ready:
        any_infra_down = True
        tiled_error = f"Could not reach Tiled at {RESULTS_TILED_URI}"

    mlflow_ready = False
    mlflow_error: str | None = None
    try:
        mlflow_ready = MLflowModelClient().check_mlflow_ready()
        if not mlflow_ready:
            any_infra_down = True
            mlflow_error = "MLflow returned a non-ready status"
    except Exception as e:
        mlflow_ready = False
        any_infra_down = True
        mlflow_error = str(e)

    arroyo_ready, arroyo_error = _check_arroyo_ready()
    if not arroyo_ready:
        any_infra_down = True

    websocket_ready, websocket_error = _check_websocket_ready()
    if not websocket_ready:
        any_infra_down = True

    return InfraState(
        tiled_ready=tiled_ready,
        mlflow_ready=mlflow_ready,
        arroyo_ready=arroyo_ready,
        websocket_ready=websocket_ready,
        any_infra_down=any_infra_down,
        last_checked=last_checked,
        tiled_error=tiled_error,
        mlflow_error=mlflow_error,
        arroyo_error=arroyo_error,
        websocket_error=websocket_error,
    )
