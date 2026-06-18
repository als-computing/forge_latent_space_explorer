import json
import logging
import os
import time

import redis

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "kvrocks")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6666))

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
