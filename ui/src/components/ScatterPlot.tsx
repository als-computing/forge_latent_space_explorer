import { memo } from 'react'
import Plot from '../lib/Plot'
import type { ClusterResponse, FeatureVectorResponse } from '../types/data'

const COLORS = [
  '#636efa', '#ef553b', '#00cc96', '#ab63fa', '#ffa15a',
  '#19d3f3', '#ff6692', '#b6e880', '#ff97ff', '#fecb52',
]

const AXIS_COLOR = 'rgba(0,0,0,0.4)'
const GRID_COLOR = 'rgba(0,0,0,0.08)'

const BASE_LAYOUT: Partial<Plotly.Layout> = {
  dragmode: 'lasso',
  margin: { l: 20, r: 20, t: 20, b: 20, pad: 0 },
  autosize: true,
  paper_bgcolor: '#ffffff',
  plot_bgcolor: '#ffffff',
  font: { color: 'rgba(0,0,0,0.65)', family: "'IBM Plex Mono', monospace", size: 10 },
  xaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR, tickfont: { color: AXIS_COLOR }, title: { font: { color: AXIS_COLOR } } },
  yaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR, tickfont: { color: AXIS_COLOR }, title: { font: { color: AXIS_COLOR } } },
  legend: { bgcolor: 'rgba(255,255,255,0.9)', bordercolor: 'rgba(0,0,0,0.15)', borderwidth: 1 },
}

interface Props {
  data: FeatureVectorResponse | ClusterResponse | null
  onSelect: (indices: number[]) => void
  onDeselect: () => void
  clearCount: number
  dataRevision: number
  onHover?: (pointIndex: number, clientX: number, clientY: number) => void
  onUnhover?: () => void
  timestamps?: number[]
}

function buildTraces(data: FeatureVectorResponse | ClusterResponse, timestamps?: number[]): Plotly.Data[] {
  const { vectors, n_components } = data
  const clusters = 'clusters' in data ? data.clusters : null
  const is3d = n_components === 3
  const hasTimestamps = timestamps && timestamps.length === vectors.length

  if (!clusters) {
    const marker = hasTimestamps
      ? { size: is3d ? 3 : 6, color: timestamps, colorscale: 'Plasma', showscale: true, colorbar: { thickness: 12, len: 0.75, tickfont: { size: 9 } } }
      : { size: is3d ? 3 : 6, color: COLORS[0] }
    return [
      is3d
        ? { type: 'scatter3d', mode: 'markers', hoverinfo: 'none', x: vectors.map(v => v[0]), y: vectors.map(v => v[1]), z: vectors.map(v => v[2]), marker } as Plotly.Data
        : { type: 'scattergl', mode: 'markers', hoverinfo: 'none', x: vectors.map(v => v[0]), y: vectors.map(v => v[1]), marker } as Plotly.Data,
    ]
  }

  const uniqueLabels = [...new Set(clusters)].sort((a, b) => a - b)
  return uniqueLabels.map((label, i) => {
    const xs = vectors.map((_, idx) => clusters[idx] === label ? vectors[idx][0] : null) as (number | null)[]
    const ys = vectors.map((_, idx) => clusters[idx] === label ? vectors[idx][1] : null) as (number | null)[]
    const zs = is3d ? vectors.map((_, idx) => clusters[idx] === label ? vectors[idx][2] : null) as (number | null)[] : undefined
    return is3d
      ? { type: 'scatter3d', mode: 'markers', hoverinfo: 'none', name: `Cluster ${label}`, x: xs, y: ys, z: zs, marker: { size: 3, color: COLORS[i % COLORS.length] } } as Plotly.Data
      : { type: 'scattergl', mode: 'markers', hoverinfo: 'none', name: `Cluster ${label}`, x: xs, y: ys, marker: { size: 6, color: COLORS[i % COLORS.length] } } as Plotly.Data
  })
}

function ScatterPlot({ data, onSelect, onDeselect, clearCount, dataRevision, onHover, onUnhover, timestamps }: Props) {
  if (!data) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#ffffff',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: 'rgba(0,0,0,0.35)',
      }}>
        No data selected
      </div>
    )
  }

  const traces = buildTraces(data, timestamps)

  const layout: Partial<Plotly.Layout> = {
    ...BASE_LAYOUT,
    uirevision: dataRevision,
    showlegend: !!data && 'clusters' in data,
    legend: { orientation: 'h', y: -0.15 },
  }

  function handleSelected(e: Plotly.PlotSelectionEvent) {
    console.log("handle selected", e?.points)
    if (!e?.points?.length) {
      onDeselect()
      return
    }
    onSelect(e.points.map(p => p.pointIndex))
  }

  function handleClick(e: Plotly.PlotMouseEvent) {
    if (!e?.points?.length) return
    onSelect([e.points[0].pointIndex])
  }

  function handleHover(e: Plotly.PlotHoverEvent) {
    if (!e?.points?.length || !onHover) return
    const p = e.points[0]
    const ev = e.event as MouseEvent
    onHover(p.pointIndex, ev.clientX, ev.clientY)
  }

  return (
    <Plot
      key={clearCount}
      data={traces}
      layout={layout}
      config={{ responsive: true, scrollZoom: true }}
      style={{ width: '100%', height: '100%' }}
      onSelected={handleSelected}
      onClick={handleClick}
      onHover={handleHover}
      onUnhover={onUnhover}
    />
  )
}

export default memo(ScatterPlot)
