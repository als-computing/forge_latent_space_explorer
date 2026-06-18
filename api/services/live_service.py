import json
import logging
import os
import time

import numpy as np
import redis

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "kvrocks")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6666))
RESULTS_TILED_API_KEY = os.getenv("RESULTS_TILED_API_KEY", "")

KEY_AUTOENCODER = "selected_mlflow_model"
KEY_DIMRED = "selected_dim_reduction_model"
KEY_EXPERIMENT = "experiment_name"
CHANNEL = "model_updates"


def _client() -> redis.Redis:
    return redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)


def start_live(autoencoder_model: str, dimred_model: str, experiment_name: str) -> None:
    r = _client()
    # Write keys so arroyo's per-frame Redis check enters live mode
    r.set(KEY_AUTOENCODER, autoencoder_model)
    r.set(KEY_DIMRED, dimred_model)
    r.set(KEY_EXPERIMENT, experiment_name)
    # Publish pub/sub notifications so the reducer's subscriber thread
    # actually loads the model objects (without these arroyo reads the key
    # but model stays None and every frame errors with NoneType.predict)
    now = time.time()
    r.publish(
        CHANNEL,
        json.dumps(
            {
                "model_type": "autoencoder",
                "model_name": autoencoder_model,
                "timestamp": now,
            }
        ),
    )
    r.publish(
        CHANNEL,
        json.dumps(
            {
                "model_type": "dimred",
                "model_name": dimred_model,
                "timestamp": now,
            }
        ),
    )
    r.publish(
        CHANNEL,
        json.dumps(
            {
                "update_type": "experiment_name",
                "experiment_name": experiment_name,
                "timestamp": now,
            }
        ),
    )
    logger.info(
        "Live mode started: ae=%s dr=%s exp=%s",
        autoencoder_model,
        dimred_model,
        experiment_name,
    )


def stop_live() -> None:
    r = _client()
    r.delete(KEY_AUTOENCODER, KEY_DIMRED, KEY_EXPERIMENT)
    logger.info("Live mode stopped: Redis keys cleared")


def compute_live_heatmap(req):
    from file_manager.data_project import DataProject
    from schemas.data import HeatmapResponse

    data_project = DataProject.from_dict(
        req.data_project_dict, api_key=RESULTS_TILED_API_KEY or None
    )
    images, _ = data_project.read_datasets(
        req.selected_indices,
        resize=True,
        export="pillow",
        log=req.log_transform,
        percentiles=req.percentiles,
    )
    arr = np.array([np.array(img).astype(float) for img in images])
    if arr.ndim == 4:
        arr = arr.mean(axis=-1)
    result = arr.mean(axis=0) if req.display_option == "mean" else arr.std(axis=0)
    return HeatmapResponse(data=result.tolist())
