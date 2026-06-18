"""
Standalone simulator for the external arroyo_sas_bluesky service.

Runs a WebSocket server on port 8765 and streams LatentSpaceEvent JSON
messages at a configurable rate. Model names are read from Redis so they
automatically match whatever was selected via startLive in the UI.

Configuration via env vars:
  REDIS_HOST        Redis/KVRocks hostname (default: kvrocks)
  REDIS_PORT        Redis/KVRocks port (default: 6666)
  SIM_EXPERIMENT_NAME  fallback experiment name if Redis key is absent (default: sim_experiment)
  SIM_INTERVAL_MS   milliseconds between messages (default: 200)
  SIM_PORT          WebSocket server port (default: 8765)
"""

import asyncio
import json
import logging
import os
import time

import redis.asyncio as aioredis
import websockets

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("external_arroyo_sim")

REDIS_HOST = os.getenv("REDIS_HOST", "kvrocks")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6666"))
INTERVAL_S = int(os.getenv("SIM_INTERVAL_MS", "200")) / 1000
PORT = int(os.getenv("SIM_PORT", "8765"))
DEFAULT_EXP = os.getenv("SIM_EXPERIMENT_NAME", "sim_experiment")

KEY_AUTOENCODER = "selected_mlflow_model"
KEY_DIMRED = "selected_dim_reduction_model"
KEY_EXPERIMENT = "experiment_name"
CHANNEL = "model_updates"

_CLUSTERS = [(0.0, 0.0), (4.0, 1.0), (2.0, 4.5)]
_CLUSTER_STD = 0.8


def _next_point(index: int) -> tuple[float, float]:
    import random

    cx, cy = _CLUSTERS[index % len(_CLUSTERS)]
    return cx + random.gauss(0, _CLUSTER_STD), cy + random.gauss(0, _CLUSTER_STD)


class ModelState:
    def __init__(self):
        self.autoencoder: str | None = None
        self.dimred: str | None = None
        self.experiment: str = DEFAULT_EXP

    @property
    def ready(self) -> bool:
        return bool(self.autoencoder and self.dimred)


async def _sync_from_redis(state: ModelState, r: aioredis.Redis) -> None:
    ae = await r.get(KEY_AUTOENCODER)
    dr = await r.get(KEY_DIMRED)
    exp = await r.get(KEY_EXPERIMENT)
    state.autoencoder = ae or None
    state.dimred = dr or None
    state.experiment = exp or DEFAULT_EXP
    logger.info(
        "Redis sync: ae=%s dr=%s exp=%s",
        state.autoencoder,
        state.dimred,
        state.experiment,
    )


async def _watch_redis(state: ModelState, r: aioredis.Redis) -> None:
    await _sync_from_redis(state, r)
    pubsub = r.pubsub()
    await pubsub.subscribe(CHANNEL)
    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            payload = json.loads(message["data"])
            if "model_type" in payload:
                if payload["model_type"] == "autoencoder":
                    state.autoencoder = payload["model_name"]
                elif payload["model_type"] == "dimred":
                    state.dimred = payload["model_name"]
            elif payload.get("update_type") == "experiment_name":
                state.experiment = payload["experiment_name"]
            logger.info(
                "Model update: ae=%s dr=%s exp=%s",
                state.autoencoder,
                state.dimred,
                state.experiment,
            )
        except Exception as e:
            logger.warning("Could not parse model_updates message: %s", e)


async def _stream_to_client(websocket, state: ModelState) -> None:
    logger.info("Client connected: %s", websocket.remote_address)
    index = 0
    try:
        while True:
            if not state.ready:
                await asyncio.sleep(1)
                continue
            x, y = _next_point(index)
            event = {
                "feature_vector": [x, y],
                "autoencoder_model": state.autoencoder,
                "dimred_model": state.dimred,
                "experiment_name": state.experiment,
                "index": index,
                "tiled_url": "",
                "timestamp": time.time(),
                "total_processing_time": INTERVAL_S,
                "autoencoder_time": INTERVAL_S * 0.6,
                "dimred_time": INTERVAL_S * 0.4,
            }
            await websocket.send(json.dumps(event))
            index += 1
            await asyncio.sleep(INTERVAL_S)
    except websockets.exceptions.ConnectionClosed:
        logger.info("Client disconnected: %s", websocket.remote_address)


async def main():
    r = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    state = ModelState()

    logger.info(
        "Starting external arroyo simulator on port %d (redis=%s:%d interval=%.0fms)",
        PORT,
        REDIS_HOST,
        REDIS_PORT,
        INTERVAL_S * 1000,
    )

    asyncio.create_task(_watch_redis(state, r))

    async with websockets.serve(
        lambda ws: _stream_to_client(ws, state),
        "0.0.0.0",
        PORT,
    ):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
