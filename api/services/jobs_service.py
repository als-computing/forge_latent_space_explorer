import asyncio
import json
import logging
import os
import traceback
import uuid
from datetime import datetime
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

from tiled.client import from_uri as tiled_from_uri

from mlex_utils.mlflow_utils.mlflow_model_client import MLflowModelClient
from mlex_utils.prefect_utils.core import (
    _flow_run_query,
    _read_flow_run,
    get_children_flow_run_ids,
    get_flow_run_logs,
    get_flow_run_name,
    get_flow_run_state,
    schedule_prefect_flow,
)

from schemas.jobs import (
    ClusteringJobRequest,
    FlowRunOption,
    JobStatusResponse,
    JobSubmitResponse,
    LatentSpaceJobRequest,
    MlflowModelOption,
)
from services import model_service

MODE = os.getenv("MODE", "")
FLOW_NAME = os.getenv("FLOW_NAME", "")
PREFECT_TAGS = json.loads(os.getenv("PREFECT_TAGS", '["latent-space-explorer"]'))
RESULTS_TILED_URI = os.getenv("RESULTS_TILED_URI", "")
RESULTS_TILED_API_KEY = os.getenv("RESULTS_TILED_API_KEY", "")
WRITE_DIR = os.getenv("WRITE_DIR", "")
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
TIMEZONE = os.getenv("TIMEZONE", "US/Pacific")
USER = os.getenv("USER", "")

logger = logging.getLogger(__name__)
_mlflow_client = MLflowModelClient()

_SYSTEM_TAGS = (
    set(json.loads(os.getenv("PREFECT_TAGS", '["latent-space-explorer"]')))
    | {"latent-space", "clustering"}
)


def _resolve_project_name(job_id: str, project_name: str) -> str:
    """Return project_name as-is if non-empty; otherwise read it from Prefect flow run tags."""
    if project_name:
        return project_name
    flow_run = asyncio.run(_read_flow_run(job_id))
    candidates = [t for t in (flow_run.tags or []) if t not in _SYSTEM_TAGS]
    if not candidates:
        raise ValueError(f"Cannot determine project_name from flow run {job_id}: no non-system tags found")
    return candidates[0]


def _prepare_project_container(user: str, project_name: str) -> None:
    """Create {user} and {user}/{project_name} containers in results Tiled if they don't exist."""
    client = tiled_from_uri(RESULTS_TILED_URI, api_key=RESULTS_TILED_API_KEY or None)
    for key in [user, project_name]:
        if key in client.keys():
            client = client[key]
        else:
            client = client.create_container(key=key)


def _build_flow_run_option(flow_run, mlflow_label_by_id: dict[str, str]) -> FlowRunOption:
    if flow_run.state_name in {"Failed", "Crashed"}:
        label = f"❌ {flow_run.name}"
    elif flow_run.state_name == "Completed":
        label = f"✅ {flow_run.name}"
    elif flow_run.state_name == "Cancelled":
        label = f"🚫 {flow_run.name}"
    else:
        label = f"🕑 {flow_run.name}"

    candidates = [t for t in (flow_run.tags or []) if t not in _SYSTEM_TAGS]
    project_name = candidates[0] if candidates else ''

    algorithm = ''
    autoencoder_model = ''
    try:
        params_list = (flow_run.parameters or {}).get('params_list', [])
        if len(params_list) >= 2:
            # dim-reduction job: [0] = ae extraction, [1] = dim reduction algorithm
            algorithm = params_list[1].get('model_name', '')
            mlflow_id = (
                params_list[0]
                .get('params', {})
                .get('io_parameters', {})
                .get('mlflow_model', '')
            )
            autoencoder_model = mlflow_label_by_id.get(mlflow_id, mlflow_id)
        elif len(params_list) == 1:
            # clustering job: [0] = clustering algorithm
            algorithm = params_list[0].get('model_name', '')
    except (AttributeError, TypeError, KeyError):
        pass

    date = str(flow_run.created)[:16].replace('T', ' ') if flow_run.created else ''

    return FlowRunOption(
        value=str(flow_run.id),
        label=label,
        project_name=project_name,
        algorithm=algorithm,
        autoencoder_model=autoencoder_model,
        date=date,
    )


def get_flow_runs(tags: list[str] | None = None) -> list[FlowRunOption]:
    flow_runs = asyncio.run(_flow_run_query(tags=tags or PREFECT_TAGS))
    try:
        mlflow_label_by_id = {
            opt['value']: opt['label']
            for opt in _mlflow_client.get_mlflow_models(livemode=False)
            if opt.get('value')
        }
    except Exception:
        mlflow_label_by_id = {}
    return [_build_flow_run_option(r, mlflow_label_by_id) for r in flow_runs]


def _result_exists_in_tiled(result_uri: str) -> bool:
    """Return True if the result node is reachable in the results Tiled instance."""
    try:
        client = tiled_from_uri(RESULTS_TILED_URI, api_key=RESULTS_TILED_API_KEY or None)
        for part in result_uri.strip("/").split("/"):
            client = client[part]
        return True
    except Exception:
        return False


def get_latent_space_job_status(job_id: str, project_name: str = "") -> JobStatusResponse:
    """Check whether the dim-reduction child job has completed and its results exist in Tiled."""
    try:
        children = get_children_flow_run_ids(job_id)
    except Exception:
        logger.error(traceback.format_exc())
        return JobStatusResponse(ready=False, state=None)

    if len(children) < 2:
        return JobStatusResponse(ready=False, state=None)

    child_id = children[1]
    state = get_flow_run_state(child_id)
    state_str = state.value if hasattr(state, "value") else str(state)

    if state_str != "COMPLETED":
        return JobStatusResponse(ready=False, state=state_str)

    project_name = _resolve_project_name(job_id, project_name)
    result_uri = f"{USER}/{project_name}/{child_id}"
    ready = _result_exists_in_tiled(result_uri)
    return JobStatusResponse(ready=ready, state=state_str, result_uri=result_uri if ready else None)


def get_clustering_job_status(job_id: str, project_name: str = "") -> JobStatusResponse:
    """Check whether the clustering child job has completed and its results exist in Tiled."""
    try:
        children = get_children_flow_run_ids(job_id)
    except Exception:
        logger.error(traceback.format_exc())
        return JobStatusResponse(ready=False, state=None)

    if not children:
        return JobStatusResponse(ready=False, state=None)

    child_id = children[0]
    state = get_flow_run_state(child_id)
    state_str = state.value if hasattr(state, "value") else str(state)
    if state_str != "COMPLETED":
        return JobStatusResponse(ready=False, state=state_str)

    project_name = _resolve_project_name(job_id, project_name)
    result_uri = f"{USER}/{project_name}/{child_id}"
    ready = _result_exists_in_tiled(result_uri)
    return JobStatusResponse(ready=ready, state=state_str, result_uri=result_uri if ready else None)


def get_job_logs(job_id: str) -> list[str]:
    logs = get_flow_run_logs(job_id)
    try:
        for child_id in get_children_flow_run_ids(job_id):
            logs.extend(get_flow_run_logs(child_id))
    except Exception:
        pass
    return logs


def get_mlflow_models() -> list[MlflowModelOption]:
    base_options = _mlflow_client.get_mlflow_models(livemode=False)

    # Build a lookup: model_name -> (algorithm, date) using one bulk versions query
    enrichment: dict[str, tuple[str, str]] = {}
    try:
        all_versions = _mlflow_client.client.search_model_versions()
        latest: dict[str, object] = {}
        for v in all_versions:
            cur = latest.get(v.name)
            if cur is None or int(v.version) > int(cur.version):  # type: ignore[union-attr]
                latest[v.name] = v
        for name, v in latest.items():
            try:
                run = _mlflow_client.client.get_run(v.run_id)  # type: ignore[union-attr]
                algorithm = run.data.tags.get('model_type', '')
                ts = getattr(v, 'creation_timestamp', None) or run.info.start_time
                date = (
                    datetime.fromtimestamp(ts / 1000).strftime('%Y-%m-%d %H:%M')
                    if ts else ''
                )
                enrichment[name] = (algorithm, date)
            except Exception:
                enrichment[name] = ('', '')
    except Exception:
        pass

    return [
        MlflowModelOption(
            label=opt['label'],
            value=opt['value'],
            algorithm=enrichment.get(opt['value'] or '', ('', ''))[0],
            date=enrichment.get(opt['value'] or '', ('', ''))[1],
        )
        for opt in base_options
    ]


def _results_tiled_url(user: str, project_name: str) -> str:
    base = "/api/v1/metadata"
    if base not in RESULTS_TILED_URI:
        return urljoin(RESULTS_TILED_URI, os.path.join(base, user, project_name))
    return urljoin(RESULTS_TILED_URI, f"/{user}/{project_name}")


def submit_latent_space_job(req: LatentSpaceJobRequest) -> JobSubmitResponse:
    data_uris = [ds["uri"] for ds in req.data_project_dict["datasets"]]
    if not data_uris:
        return JobSubmitResponse(
            job_uid=None,
            message="No datasets selected. Please select a data directory with images before submitting.",
            status="error",
        )
    data_type = req.data_project_dict["data_type"]
    root_uri = req.data_project_dict["root_uri"]

    results_dir = f"{WRITE_DIR}/{USER}"

    io_parameters = {
        "uid_retrieve": "",
        "data_uris": data_uris,
        "data_type": data_type,
        "root_uri": root_uri,
        "models_dir": f"{results_dir}/models",
        "results_tiled_uri": _results_tiled_url(USER, req.project_name),
        "results_dir": results_dir,
        "mlflow_uri": MLFLOW_TRACKING_URI,
        "mlflow_model": req.mlflow_model_id,
    }

    model_parameters = dict(req.model_parameters)
    model_parameters["log"] = req.log_transform
    model_parameters["percentiles"] = req.percentiles
    model_parameters["mask"] = req.mask

    auto_params = _mlflow_client.get_mlflow_params(req.mlflow_model_id)

    latent_space_model = model_service.get_models("latent_space_extraction")[0]
    dim_reduction_model = model_service.get_model(req.model_name)

    params_list = [
        {
            "model_name": latent_space_model.model_name,
            "task_name": "inference",
            "params": {"io_parameters": io_parameters, "model_parameters": auto_params},
        },
        {
            "model_name": dim_reduction_model.model_name,
            "task_name": "excute",
            "params": {"io_parameters": io_parameters, "model_parameters": model_parameters},
        },
    ]
    job_params = {"params_list": params_list}

    if MODE == "dev":
        job_uid = str(uuid.uuid4())
        return JobSubmitResponse(
            job_uid=job_uid,
            message=f"Dev mode: job submitted with uid {job_uid}",
            status="dev",
        )

    try:
        _prepare_project_container(USER, req.project_name)
        current_time = datetime.now(ZoneInfo(TIMEZONE)).strftime("%Y/%m/%d %H:%M:%S")
        job_uid = str(schedule_prefect_flow(
            FLOW_NAME,
            parameters=job_params,
            flow_run_name=f"{req.job_name} {current_time}",
            tags=PREFECT_TAGS + [req.project_name, "latent-space"],
        ))
        return JobSubmitResponse(
            job_uid=job_uid,
            message=f"Job submitted with uid {job_uid}",
            status="success",
        )
    except Exception as e:
        logger.error(traceback.format_exc())
        return JobSubmitResponse(job_uid=None, message=f"Job error: {e}", status="error")


def submit_clustering_job(req: ClusteringJobRequest) -> JobSubmitResponse:
    project_name = _resolve_project_name(req.dimension_reduction_job_id, req.project_name)
    children_job_ids = get_children_flow_run_ids(req.dimension_reduction_job_id)
    child_job_id = children_job_ids[1]

    expected_uri = f"/{USER}/{project_name}/{child_job_id}"
    data_uris = [expected_uri]
    results_dir = f"{WRITE_DIR}/{USER}"

    io_parameters = {
        "uid_retrieve": "",
        "data_uris": data_uris,
        "data_type": "tiled",
        "root_uri": RESULTS_TILED_URI,
        "data_tiled_api_key": RESULTS_TILED_API_KEY,
        "save_model_path": f"{results_dir}/models",
        "results_tiled_uri": _results_tiled_url(USER, project_name),
        "results_dir": results_dir,
    }

    model_parameters = dict(req.model_parameters)
    model_parameters["log"] = req.log_transform
    model_parameters["percentiles"] = req.percentiles
    model_parameters["mask"] = req.mask

    clustering_model = model_service.get_model(req.model_name)

    params_list = [
        {
            "model_name": clustering_model.model_name,
            "task_name": "excute",
            "params": {"io_parameters": io_parameters, "model_parameters": model_parameters},
        }
    ]
    job_params = {"params_list": params_list}

    if MODE == "dev":
        job_uid = str(uuid.uuid4())
        return JobSubmitResponse(
            job_uid=job_uid,
            message=f"Dev mode: clustering job submitted with uid {job_uid}",
            status="dev",
        )

    try:
        _prepare_project_container(USER, project_name)
        current_time = datetime.now(ZoneInfo(TIMEZONE)).strftime("%Y/%m/%d %H:%M:%S")
        dim_red_name = get_flow_run_name(req.dimension_reduction_job_id)
        job_uid = str(schedule_prefect_flow(
            FLOW_NAME,
            parameters=job_params,
            flow_run_name=f"{dim_red_name} {req.job_name} {current_time}",
            tags=PREFECT_TAGS + [project_name, "clustering"],
        ))
        return JobSubmitResponse(
            job_uid=job_uid,
            message=f"Job submitted with uid {job_uid}",
            status="success",
        )
    except Exception as e:
        logger.error(traceback.format_exc())
        return JobSubmitResponse(job_uid=None, message=f"Job error: {e}", status="error")
