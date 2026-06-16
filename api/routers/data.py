import logging

from fastapi import APIRouter, HTTPException

from schemas.data import (
    BrowseFilesystemRequest,
    BrowseTiledRequest,
    ClusterResponse,
    DataProjectDictResponse,
    DefaultTiledUriResponse,
    FeatureVectorResponse,
    FilesystemListResponse,
    HeatmapRequest,
    HeatmapResponse,
    MasksResponse,
    OverviewRequest,
    OverviewResponse,
    TiledListResponse,
)
from services import data_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/masks", response_model=MasksResponse)
def list_masks():
    try:
        return data_service.get_masks()
    except Exception as e:
        logger.exception("Failed to get masks")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filesystem", response_model=FilesystemListResponse)
def list_filesystem(rel_path: str = ""):
    try:
        return data_service.list_filesystem(rel_path)
    except Exception as e:
        logger.exception("Failed to list filesystem (rel_path=%s)", rel_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/default-tiled-uri", response_model=DefaultTiledUriResponse)
def get_default_tiled_uri():
    return data_service.get_default_tiled_uri()


@router.get("/tiled", response_model=TiledListResponse)
def list_tiled_node(base_uri: str, node_path: str = ""):
    try:
        return data_service.list_tiled_node(base_uri, node_path)
    except Exception as e:
        logger.exception("Failed to list Tiled node (base_uri=%s, node_path=%s)", base_uri, node_path)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/browse/filesystem", response_model=DataProjectDictResponse)
def browse_filesystem(req: BrowseFilesystemRequest):
    try:
        return data_service.browse_filesystem(req.paths)
    except Exception as e:
        logger.exception("Failed to browse filesystem")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/browse/tiled", response_model=DataProjectDictResponse)
def browse_tiled(req: BrowseTiledRequest):
    try:
        return data_service.browse_tiled(req.uri, req.paths)
    except Exception as e:
        logger.exception("Failed to browse Tiled")
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/feature-vectors", response_model=FeatureVectorResponse)
def get_feature_vectors(latent_space_job_id: str, project_name: str = ""):
    try:
        return data_service.get_feature_vectors(latent_space_job_id, project_name)
    except Exception as e:
        logger.exception("Failed to get feature vectors for job %s", latent_space_job_id)
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/clusters", response_model=ClusterResponse)
def get_clusters(clustering_job_id: str, project_name: str = "", latent_space_job_id: str = ""):
    try:
        return data_service.get_clusters(clustering_job_id, project_name, latent_space_job_id)
    except Exception as e:
        logger.exception("Failed to get clusters for job %s", clustering_job_id)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/overview", response_model=OverviewResponse)
def get_overview(req: OverviewRequest):
    try:
        return data_service.get_overview(req)
    except Exception as e:
        logger.exception("Failed to compute overview")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data-project-dict", response_model=DataProjectDictResponse)
def get_data_project_dict(dimension_reduction_job_id: str = "", clustering_job_id: str = ""):
    try:
        if dimension_reduction_job_id:
            return data_service.get_data_project_dict_from_job(dimension_reduction_job_id)
        elif clustering_job_id:
            return data_service.get_data_project_dict_from_clustering_job(clustering_job_id)
        raise HTTPException(status_code=400, detail="Provide dimension_reduction_job_id or clustering_job_id")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to get data project dict")
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/heatmap", response_model=HeatmapResponse)
def compute_heatmap(req: HeatmapRequest):
    try:
        return data_service.compute_heatmap(req)
    except Exception as e:
        logger.exception("Failed to compute heatmap")
        raise HTTPException(status_code=500, detail=str(e))
