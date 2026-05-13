from typing import Any

from pydantic import BaseModel


class FilesystemChild(BaseModel):
    rel_path: str
    name: str
    type: str  # "directory" | "file"


class FilesystemListResponse(BaseModel):
    children: list[FilesystemChild]


class TiledChild(BaseModel):
    node_path: str
    name: str
    type: str  # "container" | "array"


class TiledListResponse(BaseModel):
    children: list[TiledChild]


class BrowseFilesystemRequest(BaseModel):
    root_uri: str | None = None
    paths: list[str] | None = None


class BrowseTiledRequest(BaseModel):
    uri: str
    paths: list[str] | None = None


class DatasetInfo(BaseModel):
    uri: str
    cumulative_data_count: int = 0
    filenames: list[str] = []


class DataProjectDictResponse(BaseModel):
    root_uri: str
    data_type: str
    datasets: list[DatasetInfo]
    project_id: str | None = None


class DefaultTiledUriResponse(BaseModel):
    uri: str | None = None


class HeatmapRequest(BaseModel):
    data_project_dict: dict[str, Any]
    selected_indices: list[int]
    log_transform: bool = False
    percentiles: list[float] = [0.0, 100.0]
    display_option: str = "mean"  # "mean" | "std"


class HeatmapResponse(BaseModel):
    data: list[list[float]]


class OverviewRequest(BaseModel):
    data_project_dict: dict[str, Any]
    log_transform: bool = False
    percentiles: list[float] = [0.0, 100.0]
    page: int = 0
    page_size: int = 48


class OverviewResponse(BaseModel):
    images: list[str]  # base64 data URIs
    total: int


class FeatureVectorResponse(BaseModel):
    vectors: list[list[float]]
    n_components: int


class ClusterResponse(BaseModel):
    vectors: list[list[float]]
    n_components: int
    clusters: list[int]
