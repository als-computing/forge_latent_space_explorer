import json
import logging
from pathlib import Path

from schemas.models import Model

logger = logging.getLogger(__name__)

_MODELS_FILE = (
    Path(__file__).parent.parent.parent / "src" / "assets" / "default_models.json"
)


def get_models(model_type: str | None = None) -> list[Model]:
    contents = json.loads(_MODELS_FILE.read_text())["contents"]
    if model_type:
        contents = [c for c in contents if c["type"] == model_type]
    return [Model(**c) for c in contents]


def get_model(model_name: str) -> Model | None:
    contents = json.loads(_MODELS_FILE.read_text())["contents"]
    for c in contents:
        if c["model_name"] == model_name:
            return Model(**c)
    return None
