import logging
import os
import pathlib
import traceback

import numpy as np
from tiled.client import from_uri as tiled_from_uri

from mlex_utils.prefect_utils.core import get_children_flow_run_ids
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

IMAGE_EXTENSIONS = {".tif", ".tiff", ".png", ".jpg", ".jpeg", ".npy", ".npz", ".h5", ".hdf5"}


def list_filesystem(rel_path: str) -> FilesystemListResponse:
    abs_path = os.path.join(READ_DIR, rel_path) if rel_path else READ_DIR
    if not os.path.isdir(abs_path):
        return FilesystemListResponse(children=[])

    children = []
    try:
        entries = sorted(os.scandir(abs_path), key=lambda e: (not e.is_dir(), e.name.lower()))
        for entry in entries:
            if entry.name.startswith("."):
                continue
            child_rel = os.path.join(rel_path, entry.name) if rel_path else entry.name
            children.append(FilesystemChild(
                rel_path=child_rel,
                name=entry.name,
                type="directory" if entry.is_dir() else "file",
            ))
    except PermissionError:
        pass

    return FilesystemListResponse(children=children)


def list_tiled_node(base_uri: str, node_path: str) -> TiledListResponse:
    api_key = DATA_TILED_KEY if base_uri.rstrip("/") == DEFAULT_TILED_URI.rstrip("/") else None
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
        datasets.append(DatasetInfo(uri=abs_path, cumulative_data_count=cumulative, filenames=filenames))
    return DataProjectDictResponse(root_uri=READ_DIR, data_type="file", datasets=datasets)


def browse_tiled(base_uri: str, paths: list[str] | None) -> DataProjectDictResponse:
    selected = paths or []
    datasets = []
    cumulative = 0
    api_key = DATA_TILED_KEY if base_uri.rstrip("/") == DEFAULT_TILED_URI.rstrip("/") else None

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

    return DataProjectDictResponse(root_uri=base_uri, data_type="tiled", datasets=datasets)


def get_default_tiled_uri() -> DefaultTiledUriResponse:
    return DefaultTiledUriResponse(uri=DEFAULT_TILED_URI or None)


def _results_tiled_client():
    return tiled_from_uri(RESULTS_TILED_URI, api_key=RESULTS_TILED_API_KEY or None)


def _navigate(client, uri: str):
    for part in uri.strip("/").split("/"):
        if part:
            client = client[part]
    return client


def get_feature_vectors(latent_space_job_id: str, project_name: str) -> FeatureVectorResponse:
    children = get_children_flow_run_ids(latent_space_job_id)
    child_id = children[1]
    result_uri = f"{USER}/{project_name}/{child_id}"

    node = _navigate(_results_tiled_client(), result_uri)
    vectors = node.read().to_numpy()
    n_components = node.metadata["model_parameters"]["n_components"]

    return FeatureVectorResponse(vectors=vectors.tolist(), n_components=int(n_components))


def get_clusters(
    latent_space_job_id: str,
    clustering_job_id: str,
    project_name: str,
) -> ClusterResponse:
    dim_red_children = get_children_flow_run_ids(latent_space_job_id)
    dim_red_child_id = dim_red_children[1]

    cl_children = get_children_flow_run_ids(clustering_job_id)
    cl_child_id = cl_children[0]

    results = _results_tiled_client()
    fv_node = _navigate(results, f"{USER}/{project_name}/{dim_red_child_id}")
    vectors = fv_node.read().to_numpy()
    n_components = int(fv_node.metadata["model_parameters"]["n_components"])

    results2 = _results_tiled_client()
    cl_node = _navigate(results2, f"{USER}/{project_name}/{cl_child_id}")
    clusters = cl_node.read()["cluster_label"].tolist()

    return ClusterResponse(vectors=vectors.tolist(), n_components=n_components, clusters=clusters)


def get_overview(req: OverviewRequest) -> OverviewResponse:
    from file_manager.data_project import DataProject

    data_project = DataProject.from_dict(req.data_project_dict, api_key=DATA_TILED_KEY or None)

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


def compute_heatmap(req: HeatmapRequest) -> HeatmapResponse:
    from file_manager.data_project import DataProject

    data_project = DataProject.from_dict(req.data_project_dict, api_key=DATA_TILED_KEY or None)
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
