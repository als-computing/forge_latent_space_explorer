import { useState } from 'react'
import { Eraser, LassoSelect, SquareDashedMousePointer } from 'lucide-react'
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
  latentSpaceReady,
  clusteringReady,
  dataProjectDict,
  logTransform = false,
  percentiles = [0, 100],
}: Props) {
  const [scatterData, setScatterData] = useState<FeatureVectorResponse | ClusterResponse | null>(null)
  const [heatmapResult, setHeatmapResult] = useState<HeatmapResponse | null>(null)
  const [displayOption, setDisplayOption] = useState<'mean' | 'std'>('mean')
  const [clearCount, setClearCount] = useState(0)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  async function handleShowFeatureVectors() {
    if (!latentSpaceJobId || !projectName) return
    setHeatmapResult(null)
    setScatterData(await fetchFeatureVectors(latentSpaceJobId, projectName))
  }

  async function handleShowClusters() {
    if (!latentSpaceJobId || !clusteringJobId || !projectName) return
    setHeatmapResult(null)
    setScatterData(await fetchClusters(latentSpaceJobId, clusteringJobId, projectName))
  }

  async function handleSelect(indices: number[]) {
    setSelectedIndices(indices)
    if (!dataProjectDict || indices.length === 0) return
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
      // silently ignore — scatter stays interactive
    }
  }

  async function handleDisplayChange(v: 'mean' | 'std') {
    setDisplayOption(v)
    if (!dataProjectDict || selectedIndices.length === 0) return
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
    } catch {
      // silently ignore
    }
  }

  void handleShowFeatureVectors
  void handleShowClusters
  void latentSpaceReady
  void clusteringReady

  return (
    <div style={{
      border: '1px solid rgba(0,0,0,0.175)',
      borderRadius: '0.375rem',
      backgroundColor: 'white',
      height: '64vh',
      display: 'flex',
      flexDirection: 'column',
      marginTop: 10,
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
              onClick={() => { setClearCount(c => c + 1); setSelectedIndices([]) }}
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
        <div style={{ display: 'flex', flex: 1, minHeight: 0, height: '46vh' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ScatterPlot data={scatterData} onSelect={handleSelect} clearCount={clearCount} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Heatmap result={heatmapResult} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ flexShrink: 0, paddingTop: 4, fontSize: '0.875rem' }}>
          Number of images selected: {selectedIndices.length}
        </div>
      </div>
    </div>
  )
}
