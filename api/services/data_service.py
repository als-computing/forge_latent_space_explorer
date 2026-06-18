import asyncio
import json
import logging
import os
import pathlib
import traceback

import numpy as np
from tiled.client import from_uri as tiled_from_uri

try:
    import pyFAI.detectors as pyfai_detectors
except ImportError:
    pyfai_detectors = None

from mlex_utils.prefect_utils.core import (
    _read_flow_run,
    get_children_flow_run_ids,
    get_flow_run_parameters,
    get_flow_run_parent_id,
)
from schemas.data import (
    ClusterResponse,
    DataProjectDictResponse,
    DatasetInfo,
    DefaultTiledUriResponse,
    FeatureVectorResponse,
    FilesystemChild,
    FilesystemListResponse,
    HeatmapRequest,
    HeatmapResponse,
    MasksResponse,
    OverviewRequest,
    OverviewResponse,
    TiledChild,
    TiledListResponse,
)

logger = logging.getLogger(__name__)

READ_DIR = os.getenv("READ_DIR", "/tiled_storage")
DEFAULT_TILED_URI = os.getenv("DEFAULT_TILED_URI", "")
DATA_TILED_KEY = os.getenv("DATA_TILED_KEY", "")
RESULTS_TILED_URI = os.getenv("RESULTS_TILED_URI", "")
RESULTS_TILED_API_KEY = os.getenv("RESULTS_TILED_API_KEY", "")
USER = os.getenv("USER", "")

# Tags that are part of the system, not the user-supplied project name
_SYSTEM_TAGS = set(
    json.loads(os.getenv("PREFECT_TAGS", '["latent-space-explorer"]'))
) | {"latent-space", "clustering"}


def _resolve_project_name(job_id: str, project_name: str) -> str:
    """Return project_name as-is if non-empty; otherwise read it from Prefect flow run tags."""
    if project_name:
        return project_name
    flow_run = asyncio.run(_read_flow_run(job_id))
    candidates = [t for t in (flow_run.tags or []) if t not in _SYSTEM_TAGS]
    if not candidates:
        raise ValueError(
            f"Cannot determine project_name from flow run {job_id}: no non-system tags found"
        )
    return candidates[0]


def _fv_uri_from_clustering_job(clustering_job_id: str) -> str:
    """Return the feature-vectors Tiled path stored in the clustering job's Prefect parameters."""
    params = get_flow_run_parameters(clustering_job_id)
    data_uris = params["params_list"][0]["params"]["io_parameters"]["data_uris"]
    return data_uris[0].lstrip("/")


IMAGE_EXTENSIONS = {
    ".tif",
    ".tiff",
    ".png",
    ".jpg",
    ".jpeg",
    ".npy",
    ".npz",
    ".h5",
    ".hdf5",
}


def list_filesystem(rel_path: str) -> FilesystemListResponse:
    abs_path = os.path.join(READ_DIR, rel_path) if rel_path else READ_DIR
    if not os.path.isdir(abs_path):
        return FilesystemListResponse(children=[])

    children = []
    try:
        entries = sorted(
            os.scandir(abs_path), key=lambda e: (not e.is_dir(), e.name.lower())
        )
        for entry in entries:
            if entry.name.startswith("."):
                continue
            child_rel = os.path.join(rel_path, entry.name) if rel_path else entry.name
            children.append(
                FilesystemChild(
                    rel_path=child_rel,
                    name=entry.name,
                    type="directory" if entry.is_dir() else "file",
                )
            )
    except PermissionError:
        pass

    return FilesystemListResponse(children=children)


def list_tiled_node(base_uri: str, node_path: str) -> TiledListResponse:
    api_key = (
        DATA_TILED_KEY
        if base_uri.rstrip("/") == DEFAULT_TILED_URI.rstrip("/")
        else None
    )
    client = tiled_from_uri(base_uri, api_key=api_key or None)

    if node_path:
        for part in node_path.strip("/").split("/"):
            if part:
                client = client[part]

    children = []
    for key in client.keys():
        child = client[key]
        child_path = f"{node_path}/{key}".strip("/") if node_path else key
        node_type = "container" if hasattr(child, "keys") else "array"
        children.append(TiledChild(node_path=child_path, name=key, type=node_type))

    return TiledListResponse(children=children)


def _list_images(abs_path: str) -> list[str]:
    root = pathlib.Path(abs_path)
    return sorted(
        str(f.relative_to(root))
        for f in root.rglob("*")
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
    )


def browse_filesystem(paths: list[str] | None) -> DataProjectDictResponse:
    selected = paths or []
    datasets = []
    cumulative = 0
    for rel_path in selected:
        abs_path = os.path.join(READ_DIR, rel_path)
        filenames = _list_images(abs_path)
        cumulative += len(filenames)
        datasets.append(
            DatasetInfo(
                uri=abs_path, cumulative_data_count=cumulative, filenames=filenames
            )
        )
    return DataProjectDictResponse(
        root_uri=READ_DIR, data_type="file", datasets=datasets
    )


def browse_tiled(base_uri: str, paths: list[str] | None) -> DataProjectDictResponse:
    selected = paths or []
    datasets = []
    cumulative = 0
    api_key = (
        DATA_TILED_KEY
        if base_uri.rstrip("/") == DEFAULT_TILED_URI.rstrip("/")
        else None
    )

    for node_path in selected:
        try:
            client = tiled_from_uri(base_uri, api_key=api_key or None)
            for part in node_path.strip("/").split("/"):
                if part:
                    client = client[part]
            # Try to get length for arrays; containers may have multiple children
            count = len(client) if hasattr(client, "__len__") else 0
        except Exception:
            logger.warning(traceback.format_exc())
            count = 0
        cumulative += count
        datasets.append(DatasetInfo(uri=node_path, cumulative_data_count=cumulative))

    return DataProjectDictResponse(
        root_uri=base_uri, data_type="tiled", datasets=datasets
    )


def get_default_tiled_uri() -> DefaultTiledUriResponse:
    return DefaultTiledUriResponse(uri=DEFAULT_TILED_URI or None)


def _results_tiled_client():
    return tiled_from_uri(RESULTS_TILED_URI, api_key=RESULTS_TILED_API_KEY or None)


def _navigate(client, uri: str):
    for part in uri.strip("/").split("/"):
        if part:
            client = client[part]
    return client


def get_feature_vectors(
    latent_space_job_id: str, project_name: str = ""
) -> FeatureVectorResponse:
    project_name = _resolve_project_name(latent_space_job_id, project_name)
    children = get_children_flow_run_ids(latent_space_job_id)
    child_id = children[1]

    node = _results_tiled_client()[USER][project_name][child_id]
    vectors = node.read().to_numpy()
    n_components = node.metadata["model_parameters"]["n_components"]

    return FeatureVectorResponse(
        vectors=vectors.tolist(), n_components=int(n_components)
    )


def get_clusters(
    clustering_job_id: str,
    project_name: str = "",
    latent_space_job_id: str = "",
) -> ClusterResponse:
    project_name = _resolve_project_name(clustering_job_id, project_name)

    results = _results_tiled_client()
    if latent_space_job_id:
        dim_red_children = get_children_flow_run_ids(latent_space_job_id)
        fv_node = results[USER][project_name][dim_red_children[1]]
    else:
        # fv_uri format: "{user}/{project_name_may_contain_slashes}/{child_id}"
        # child_id is a UUID (no slashes); project_name is everything between first and last "/"
        raw = _fv_uri_from_clustering_job(clustering_job_id)
        parts = raw.strip("/").split("/")
        fv_node = results[parts[0]]["/".join(parts[1:-1])][parts[-1]]

    vectors = fv_node.read().to_numpy()
    n_components = int(fv_node.metadata["model_parameters"]["n_components"])

    cl_children = get_children_flow_run_ids(clustering_job_id)
    cl_node = results[USER][project_name][cl_children[0]]
    clusters = cl_node.read()["cluster_label"].tolist()

    return ClusterResponse(
        vectors=vectors.tolist(), n_components=n_components, clusters=clusters
    )


def get_overview(req: OverviewRequest) -> OverviewResponse:
    from file_manager.data_project import DataProject

    data_project = DataProject.from_dict(
        req.data_project_dict, api_key=DATA_TILED_KEY or None
    )

    if not data_project.datasets:
        return OverviewResponse(images=[], total=0)

    total = data_project.datasets[-1].cumulative_data_count
    if total == 0:
        return OverviewResponse(images=[], total=0)

    start = req.page * req.page_size
    end = min(start + req.page_size, total)
    if start >= total:
        return OverviewResponse(images=[], total=total)

    imgs, _ = data_project.read_datasets(
        list(range(start, end)),
        export="base64",
        resize=True,
        log=req.log_transform,
        percentiles=req.percentiles,
    )
    return OverviewResponse(images=imgs, total=total)


def get_data_project_dict_from_job(job_id: str) -> DataProjectDictResponse:
    params = get_flow_run_parameters(job_id)
    io = params["params_list"][0]["params"]["io_parameters"]
    data_type: str = io["data_type"]
    root_uri: str = io["root_uri"]
    data_uris: list[str] = io["data_uris"]
    if data_type == "file":
        rel_paths = [os.path.relpath(uri, READ_DIR) for uri in data_uris]
        return browse_filesystem(rel_paths)
    else:
        return browse_tiled(root_uri, data_uris)


def get_data_project_dict_from_clustering_job(
    clustering_job_id: str,
) -> DataProjectDictResponse:
    params = get_flow_run_parameters(clustering_job_id)
    fv_uri = params["params_list"][0]["params"]["io_parameters"]["data_uris"][0]
    # fv_uri format: "/{USER}/{project_name}/{dim_red_child_id}"
    dim_red_child_id = fv_uri.strip("/").split("/")[2]
    dim_red_parent_id = str(get_flow_run_parent_id(dim_red_child_id))
    return get_data_project_dict_from_job(dim_red_parent_id)


def compute_heatmap(req: HeatmapRequest) -> HeatmapResponse:
    from file_manager.data_project import DataProject

    data_project = DataProject.from_dict(
        req.data_project_dict, api_key=DATA_TILED_KEY or None
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


def get_masks() -> MasksResponse:
    detectors = (
        list(pyfai_detectors.ALL_DETECTORS.keys())
        if pyfai_detectors is not None
        else []
    )
    assets_dir = pathlib.Path(__file__).parent.parent.parent / "assets" / "masks"
    tif_files = (
        [p.name for p in assets_dir.glob("*.tif")] if assets_dir.exists() else []
    )
    return MasksResponse(masks=detectors + tif_files + ["None"])
