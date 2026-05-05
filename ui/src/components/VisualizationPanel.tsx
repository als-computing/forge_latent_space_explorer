import { useState } from 'react'
import { fetchClusters, fetchFeatureVectors, fetchHeatmap } from '../api/data'
import type { ClusterResponse, DataProjectDict, FeatureVectorResponse, HeatmapResponse } from '../types/data'
import Heatmap from './Heatmap'
import ScatterPlot from './ScatterPlot'

interface Props {
  latentSpaceJobId: string | null
  clusteringJobId: string | null
  projectName: string
  latentSpaceReady: boolean
  clusteringReady: boolean
  dataProjectDict: DataProjectDict | null
  logTransform?: boolean
  percentiles?: [number, number]
}

export default function VisualizationPanel({
  latentSpaceJobId,
  clusteringJobId,
  projectName,
  latentSpaceReady,
  clusteringReady,
  dataProjectDict,
  logTransform = false,
  percentiles = [0, 100],
}: Props) {
  const [scatterData, setScatterData] = useState<FeatureVectorResponse | ClusterResponse | null>(null)
  const [heatmapResult, setHeatmapResult] = useState<HeatmapResponse | null>(null)
  const [displayOption, setDisplayOption] = useState<'mean' | 'std'>('mean')
  const [loadingVectors, setLoadingVectors] = useState(false)
  const [loadingClusters, setLoadingClusters] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleShowFeatureVectors() {
    if (!latentSpaceJobId || !projectName) return
    setLoadingVectors(true)
    setError(null)
    setHeatmapResult(null)
    try {
      setScatterData(await fetchFeatureVectors(latentSpaceJobId, projectName))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feature vectors')
    } finally {
      setLoadingVectors(false)
    }
  }

  async function handleShowClusters() {
    if (!latentSpaceJobId || !clusteringJobId || !projectName) return
    setLoadingClusters(true)
    setError(null)
    setHeatmapResult(null)
    try {
      setScatterData(await fetchClusters(latentSpaceJobId, clusteringJobId, projectName))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load clusters')
    } finally {
      setLoadingClusters(false)
    }
  }

  async function handleSelect(indices: number[]) {
    if (!dataProjectDict || indices.length === 0) return
    setHeatmapResult(null)
    try {
      setHeatmapResult(
        await fetchHeatmap({
          data_project_dict: dataProjectDict,
          selected_indices: indices,
          log_transform: logTransform,
          percentiles,
          display_option: displayOption,
        }),
      )
    } catch {
      // silently ignore heatmap errors — scatter stays interactive
    }
  }

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, marginRight: 8 }}>Visualization</h3>
        <button
          onClick={handleShowFeatureVectors}
          disabled={!latentSpaceReady || !projectName || loadingVectors}
        >
          {loadingVectors ? 'Loading…' : 'Show Feature Vectors'}
        </button>
        <button
          onClick={handleShowClusters}
          disabled={!clusteringReady || !projectName || loadingClusters}
        >
          {loadingClusters ? 'Loading…' : 'Show Clusters'}
        </button>
        {(!latentSpaceReady || !projectName) && (
          <span style={{ fontSize: 12, color: '#999' }}>
            {!projectName ? 'Enter a project name in Job Submission.' : 'Waiting for latent space results.'}
          </span>
        )}
      </div>

      {error && <div style={{ color: 'red', fontSize: 13, marginBottom: 8 }}>{error}</div>}

      <ScatterPlot data={scatterData} onSelect={handleSelect} />

      <div style={{ marginTop: 16 }}>
        <Heatmap
          result={heatmapResult}
          displayOption={displayOption}
          onDisplayChange={(v) => {
            setDisplayOption(v)
            // Re-fetch with new display option if we already have a selection
            if (heatmapResult && dataProjectDict) {
              // The user can just click again; don't auto-refetch to keep it simple
            }
          }}
        />
      </div>
    </div>
  )
}
