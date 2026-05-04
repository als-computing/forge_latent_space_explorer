from mlex_utils.mlflow_utils.mlflow_model_client import MLflowModelClient

from schemas.jobs import MlflowModelOption

_client = MLflowModelClient()


def get_mlflow_models() -> list[MlflowModelOption]:
    options = _client.get_mlflow_models(livemode=False)
    return [MlflowModelOption(**opt) for opt in options]
