import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, LassoSelect, SquareDashedMousePointer } from 'lucide-react'
import { fetchClusters, fetchDataProjectDictFromJob, fetchFeatureVectors, fetchHeatmap, fetchOverview } from '../api/data'
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
  autoencoderLabel?: string | null
  dimRedLabel?: string | null
}

const C = {
  bg: '#343a40',
  border: 'rgba(255,255,255,0.1)',
  borderHi: 'rgba(255,255,255,0.25)',
  text: 'white',
  textMuted: 'rgba(255,255,255,0.65)',
  textDim: 'rgba(255,255,255,0.35)',
  accent: '#4f8ef7',
  mono: "'IBM Plex Mono', monospace",
}

const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '3px 10px',
  border: `1px solid ${active ? C.accent : C.border}`,
  backgroundColor: active ? C.accent : 'rgba(255,255,255,0.06)',
  color: active ? 'white' : C.textMuted,
  cursor: 'pointer',
  fontFamily: C.mono,
  fontSize: 11,
  letterSpacing: '.04em',
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
  autoencoderLabel = null,
  dimRedLabel = null,
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
  const [tooltip, setTooltip] = useState<{ x: number; y: number; src: string; name: string } | null>(null)
  const hoveredIndexRef = useRef<number | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollZoomActiveRef = useRef(false)
  const scrollZoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const displayOptionRef = useRef<'mean' | 'std'>(displayOption)
  displayOptionRef.current = displayOption

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
  }, [showFVTrigger, latentSpaceJobId])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showClustersTrigger > 0) handleShowClusters()
    else setScatterData(null)
  }, [showClustersTrigger, latentSpaceJobId, clusteringJobId])  // eslint-disable-line react-hooks/exhaustive-deps

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

  function getFilenameForIndex(index: number): string | null {
    if (!dataProjectDict) return null
    let prev = 0
    for (const ds of dataProjectDict.datasets) {
      const cum = ds.cumulative_data_count ?? 0
      if (index < cum) return ds.filenames?.[index - prev] ?? null
      prev = cum
    }
    return null
  }

  const handleWheel = useCallback(() => {
    scrollZoomActiveRef.current = true
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setTooltip(null)
    if (scrollZoomTimerRef.current) clearTimeout(scrollZoomTimerRef.current)
    scrollZoomTimerRef.current = setTimeout(() => {
      scrollZoomActiveRef.current = false
    }, 300)
  }, [])

  const handleHover = useCallback((pointIndex: number, clientX: number, clientY: number) => {
    if (!dataProjectDict || scrollZoomActiveRef.current) return
    if (hoveredIndexRef.current === pointIndex) return
    hoveredIndexRef.current = pointIndex
    setTooltip(null)
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetchOverview({
          data_project_dict: dataProjectDict,
          log_transform: logTransform,
          percentiles,
          page: pointIndex,
          page_size: 1,
        })
        if (hoveredIndexRef.current !== pointIndex) return
        const src = res.images[0]
        if (!src) return
        const name = getFilenameForIndex(pointIndex) ?? `#${pointIndex}`
        setTooltip({ x: clientX, y: clientY, src, name })
      } catch {
        // ignore fetch errors for tooltip
      }
    }, 500)
  }, [dataProjectDict, logTransform, percentiles])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnhover = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoveredIndexRef.current = null
    setTooltip(null)
  }, [])

  const handleDeselect = useCallback(() => {
    setSelectedIndices([])
    setHeatmapResult(null)
    setHeatmapError(null)
  }, [])

  const handleSelect = useCallback(async (indices: number[]) => {
    console.log("handle select", indices)
    setSelectedIndices(indices)
    if (indices.length === 0) return
    let dpd = dataProjectDict
    if (!dpd && latentSpaceJobId) {
      try {
        dpd = await fetchDataProjectDictFromJob(latentSpaceJobId)
      } catch {
        return
      }
    }
    console.log("dpd", dpd)
    if (!dpd) return
    setHeatmapError(null)
    setHeatmapLoading(true)
    try {
      setHeatmapResult(
        await fetchHeatmap({
          data_project_dict: dpd,
          selected_indices: indices,
          log_transform: logTransform,
          percentiles,
          display_option: displayOptionRef.current,
        }),
      )
    } catch (err) {
      setHeatmapError(err instanceof Error ? err.message : 'Failed to load heatmap')
    } finally {
      setHeatmapLoading(false)
    }
  }, [dataProjectDict, latentSpaceJobId, logTransform, percentiles])

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

  const totalPoints = scatterData?.vectors.length ?? 0
  const datasetName = dataProjectDict?.root_uri?.split('/').filter(Boolean).pop()
    ?? dataProjectDict?.datasets[0]?.uri?.split('/').filter(Boolean).pop()
    ?? null

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${C.border}`,
    borderRadius: '0.375rem',
    backgroundColor: C.bg,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 10 }}>

      {/* ── Latent Space panel ── */}
      <div style={{ ...cardStyle, flex: 1 }}>
        {/* Header */}
        <div style={{
          height: 34, display: 'flex', alignItems: 'center',
          padding: '0 12px', borderBottom: `1px solid ${C.border}`, gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: C.textMuted }}>
            Latent Space
          </span>
          {totalPoints > 0 && (
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim, background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 3 }}>
              {totalPoints.toLocaleString()} pts
            </span>
          )}
          {selectedIndices.length > 0 && (
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.accent, background: 'rgba(79,142,247,0.12)', padding: '2px 6px', borderRadius: 3 }}>
              {selectedIndices.length.toLocaleString()} selected
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => { setClearCount(c => c + 1); handleDeselect() }}
              title="Clear selection"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 5, background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${C.border}`, color: C.textMuted,
                borderRadius: 4, cursor: 'pointer',
              }}
            >
              <Eraser size={13} />
            </button>
          </div>
        </div>

        {/* Selection hint */}
        <div style={{ padding: '4px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>Select points using</span>
          <LassoSelect size={12} color={C.textDim} />
          <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>or</span>
          <SquareDashedMousePointer size={12} color={C.textDim} />
          {scatterError && <span style={{ marginLeft: 8, fontFamily: C.mono, fontSize: 10, color: '#ef4444' }}>{scatterError}</span>}
        </div>

        {/* Scatter plot */}
        <div style={{ flex: 1, minHeight: 0 }} onMouseLeave={handleUnhover} onWheel={handleWheel}>
          <ScatterPlot data={scatterData} onSelect={handleSelect} onDeselect={handleDeselect} clearCount={clearCount} dataRevision={dataRevision} onHover={handleHover} onUnhover={handleUnhover} />
        </div>

        {/* Footer */}
        <div style={{
          height: 26, borderTop: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', padding: '0 12px', gap: 14, flexShrink: 0,
        }}>
          {datasetName && (
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>
              dataset <span style={{ color: C.textMuted }}>{datasetName}</span>
            </span>
          )}
          {autoencoderLabel && (
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>
              autoencoder <span style={{ color: C.textMuted }}>{autoencoderLabel}</span>
            </span>
          )}
          {dimRedLabel && (
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>
              dim reduction <span style={{ color: C.textMuted }}>{dimRedLabel}</span>
            </span>
          )}
          {!datasetName && !autoencoderLabel && !dimRedLabel && (
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>no session active</span>
          )}
        </div>
      </div>

      {/* ── Selected Heatmap panel ── */}
      <div style={{ ...cardStyle, flex: 1 }}>
        {/* Header */}
        <div style={{
          height: 34, display: 'flex', alignItems: 'center',
          padding: '0 12px', borderBottom: `1px solid ${C.border}`, gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: C.textMuted }}>
            Selected Heatmap
          </span>
          {heatmapLoading && (
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.textDim }}>loading…</span>
          )}
          {heatmapError && (
            <span style={{ fontFamily: C.mono, fontSize: 10, color: '#ef4444' }}>{heatmapError}</span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 0 }}>
            <button onClick={() => handleDisplayChange('mean')} style={{ ...toggleBtnStyle(displayOption === 'mean'), borderRadius: '4px 0 0 4px' }}>
              Mean
            </button>
            <button onClick={() => handleDisplayChange('std')} style={{ ...toggleBtnStyle(displayOption === 'std'), borderRadius: '0 4px 4px 0', borderLeft: 'none' }}>
              Std Dev
            </button>
          </div>
        </div>

        {/* Heatmap */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <Heatmap result={heatmapResult} />
        </div>
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 14,
          top: tooltip.y - 90,
          zIndex: 9999,
          backgroundColor: '#1a1d20',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6,
          padding: 8,
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          width: 140,
        }}>
          <img src={tooltip.src} alt="" style={{ width: '100%', display: 'block', borderRadius: 3 }} />
          <span style={{
            display: 'block', marginTop: 5,
            fontFamily: C.mono, fontSize: 10, color: C.textMuted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {tooltip.name}
          </span>
        </div>
      )}
    </div>
  )
}
