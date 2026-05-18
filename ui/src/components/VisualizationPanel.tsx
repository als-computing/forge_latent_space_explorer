import { useCallback, useEffect, useState } from 'react'
import { Eraser, LassoSelect, SquareDashedMousePointer } from 'lucide-react'
import { fetchClusters, fetchFeatureVectors, fetchHeatmap } from '../api/data'
import type { ClusterResponse, DataProjectDict, FeatureVectorResponse, HeatmapResponse } from '../types/data'
import Heatmap from './Heatmap'
import ScatterPlot from './ScatterPlot'

interface Props {
  latentSpaceJobId: string | null
  clusteringJobId: string | null
  projectName: string
  dataProjectDict: DataProjectDict | null
  logTransform?: boolean
  percentiles?: [number, number]
  showFVTrigger?: number
  showClustersTrigger?: number
  hasDataOverview?: boolean
}

const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 0',
  width: 160,
  border: '1px solid #0d6efd',
  backgroundColor: active ? '#0d6efd' : 'white',
  color: active ? 'white' : '#0d6efd',
  cursor: 'pointer',
  fontSize: '0.875rem',
  lineHeight: 1.5,
})

export default function VisualizationPanel({
  latentSpaceJobId,
  clusteringJobId,
  projectName,
  dataProjectDict,
  logTransform = false,
  percentiles = [0, 100],
  showFVTrigger = 0,
  showClustersTrigger = 0,
  hasDataOverview = false,
}: Props) {
  const [scatterData, setScatterData] = useState<FeatureVectorResponse | ClusterResponse | null>(null)
  const [scatterError, setScatterError] = useState<string | null>(null)
  const [heatmapResult, setHeatmapResult] = useState<HeatmapResponse | null>(null)
  const [heatmapLoading, setHeatmapLoading] = useState(false)
  const [heatmapError, setHeatmapError] = useState<string | null>(null)
  const [displayOption, setDisplayOption] = useState<'mean' | 'std'>('mean')
  const [clearCount, setClearCount] = useState(0)
  const [dataRevision, setDataRevision] = useState(0)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  console.log("heatmapresult", heatmapResult)

  async function handleShowFeatureVectors() {
    if (!latentSpaceJobId) return
    setHeatmapResult(null)
    setHeatmapError(null)
    setSelectedIndices([])
    setScatterError(null)
    try {
      setScatterData(await fetchFeatureVectors(latentSpaceJobId, projectName))
      setDataRevision(r => r + 1)
    } catch (err) {
      setScatterError(err instanceof Error ? err.message : 'Failed to load feature vectors')
    }
  }

  useEffect(() => {
    if (showFVTrigger > 0) handleShowFeatureVectors()
    else setScatterData(null)
  }, [showFVTrigger, latentSpaceJobId, projectName])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showClustersTrigger > 0) handleShowClusters()
    else setScatterData(null)
  }, [showClustersTrigger, latentSpaceJobId, clusteringJobId, projectName])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleShowClusters() {
    if (!clusteringJobId) return
    setHeatmapResult(null)
    setHeatmapError(null)
    setSelectedIndices([])
    setScatterError(null)
    try {
      setScatterData(await fetchClusters(clusteringJobId, projectName, latentSpaceJobId ?? ""))
      setDataRevision(r => r + 1)
    } catch (err) {
      setScatterError(err instanceof Error ? err.message : 'Failed to load clusters')
    }
  }

  const handleDeselect = useCallback(() => {
    setSelectedIndices([])
    setHeatmapResult(null)
    setHeatmapError(null)
  }, [])

  const handleSelect = useCallback(async (indices: number[]) => {
    setSelectedIndices(indices)
    console.log("dataProjectDict", dataProjectDict);
    if (!dataProjectDict || indices.length === 0) return
    setHeatmapError(null)
    setHeatmapLoading(true)
    try {
      console.log("TRY")
      setHeatmapResult(
        await fetchHeatmap({
          data_project_dict: dataProjectDict,
          selected_indices: indices,
          log_transform: logTransform,
          percentiles,
          display_option: displayOption,
        }),
      )
    } catch (err) {
      console.log("ERROR", err)
      setHeatmapError(err instanceof Error ? err.message : 'Failed to load heatmap')
    } finally {
      setHeatmapLoading(false)
    }
  }, [dataProjectDict, logTransform, percentiles, displayOption])

  async function handleDisplayChange(v: 'mean' | 'std') {
    setDisplayOption(v)
    if (!dataProjectDict || selectedIndices.length === 0) return
    setHeatmapError(null)
    setHeatmapLoading(true)
    try {
      setHeatmapResult(
        await fetchHeatmap({
          data_project_dict: dataProjectDict,
          selected_indices: selectedIndices,
          log_transform: logTransform,
          percentiles,
          display_option: v,
        }),
      )
    } catch (err) {
      setHeatmapError(err instanceof Error ? err.message : 'Failed to load heatmap')
    } finally {
      setHeatmapLoading(false)
    }
  }

  return (
    <div style={{
      border: '1px solid rgba(0,0,0,0.175)',
      borderRadius: '0.375rem',
      backgroundColor: 'white',
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      marginTop: hasDataOverview ? 10 : 0,
    }}>
      {/* Card header */}
      <div style={{
        padding: '0.5rem 1rem',
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderBottom: '1px solid rgba(0,0,0,0.175)',
        fontWeight: 500,
        flexShrink: 0,
      }}>
        Latent Space Analysis
      </div>

      {/* Card body */}
      <div style={{ padding: '0.75rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Toolbar row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
          {/* Left: lasso label + clear button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem' }}>
              <span>Select a Group of Points using</span>
              <LassoSelect size={16} />
              <span>or</span>
              <SquareDashedMousePointer size={16} />
              <span>tools</span>
            </div>
            <button
              onClick={() => { setClearCount(c => c + 1); handleDeselect() }}
              title="Clear lasso selection"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6.5px',
                fontSize: '1.3rem',
                backgroundColor: '#0d6efd',
                border: '1px solid #0d6efd',
                color: 'white',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              <Eraser size={16} />
            </button>
          </div>

          {/* Right: Mean / Standard Deviation toggle */}
          <div style={{ display: 'flex' }}>
            <button
              onClick={() => handleDisplayChange('mean')}
              style={{ ...toggleBtnStyle(displayOption === 'mean'), borderRadius: '4px 0 0 4px' }}
            >
              Mean
            </button>
            <button
              onClick={() => handleDisplayChange('std')}
              style={{ ...toggleBtnStyle(displayOption === 'std'), borderRadius: '0 4px 4px 0', borderLeft: 'none' }}
            >
              Standard Deviation
            </button>
          </div>
        </div>

        {/* Plots row */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ScatterPlot data={scatterData} onSelect={handleSelect} onDeselect={handleDeselect} clearCount={clearCount} dataRevision={dataRevision} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Heatmap result={heatmapResult} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ flexShrink: 0, paddingTop: 4, fontSize: '0.875rem' }}>
          Number of images selected: {selectedIndices.length}
          {heatmapLoading && (
            <span style={{ marginLeft: 12, color: '#666' }}>Loading heatmap...</span>
          )}
          {scatterError && (
            <span style={{ marginLeft: 12, color: 'red' }}>{scatterError}</span>
          )}
          {heatmapError && (
            <span style={{ marginLeft: 12, color: 'red' }}>{heatmapError}</span>
          )}
        </div>
      </div>
    </div>
  )
}
