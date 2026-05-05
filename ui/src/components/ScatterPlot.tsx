import Plot from 'react-plotly.js'
import type { ClusterResponse, FeatureVectorResponse } from '../types/data'

// Plotly's default discrete colors
const COLORS = [
  '#636efa', '#ef553b', '#00cc96', '#ab63fa', '#ffa15a',
  '#19d3f3', '#ff6692', '#b6e880', '#ff97ff', '#fecb52',
]

interface Props {
  data: FeatureVectorResponse | ClusterResponse | null
  onSelect: (indices: number[]) => void
}

function buildTraces(data: FeatureVectorResponse | ClusterResponse) {
  const { vectors, n_components } = data
  const clusters = 'clusters' in data ? data.clusters : null
  const is3d = n_components === 3

  if (!clusters) {
    // Single trace, all points
    const trace: Plotly.Data = is3d
      ? {
          type: 'scatter3d',
          mode: 'markers',
          x: vectors.map((v) => v[0]),
          y: vectors.map((v) => v[1]),
          z: vectors.map((v) => v[2]),
          marker: { size: 3, color: COLORS[0] },
        }
      : {
          type: 'scattergl',
          mode: 'markers',
          x: vectors.map((v) => v[0]),
          y: vectors.map((v) => v[1]),
          marker: { size: 6, color: COLORS[0] },
        }
    return [trace]
  }

  // One trace per cluster label — None-padded so point index == data index
  const uniqueLabels = [...new Set(clusters)].sort((a, b) => a - b)
  return uniqueLabels.map((label, i) => {
    const xs: (number | null)[] = vectors.map((_, idx) => (clusters[idx] === label ? vectors[idx][0] : null))
    const ys: (number | null)[] = vectors.map((_, idx) => (clusters[idx] === label ? vectors[idx][1] : null))
    const zs = is3d
      ? vectors.map((_, idx) => (clusters[idx] === label ? vectors[idx][2] : null))
      : undefined

    return is3d
      ? ({ type: 'scatter3d', mode: 'markers', name: `Cluster ${label}`, x: xs, y: ys, z: zs, marker: { size: 3, color: COLORS[i % COLORS.length] } } as Plotly.Data)
      : ({ type: 'scattergl', mode: 'markers', name: `Cluster ${label}`, x: xs, y: ys, marker: { size: 6, color: COLORS[i % COLORS.length] } } as Plotly.Data)
  })
}

export default function ScatterPlot({ data, onSelect }: Props) {
  if (!data) {
    return (
      <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', borderRadius: 6, color: '#999' }}>
        No data loaded
      </div>
    )
  }

  const traces = buildTraces(data)
  const layout: Partial<Plotly.Layout> = {
    dragmode: 'lasso',
    margin: { l: 20, r: 20, t: 20, b: 20 },
    height: 400,
    showlegend: 'clusters' in data,
    legend: { orientation: 'h', y: -0.15 },
  }

  function handleSelected(e: Plotly.PlotSelectionEvent) {
    if (!e?.points) return
    onSelect(e.points.map((p) => p.pointIndex))
  }

  function handleClick(e: Plotly.PlotMouseEvent) {
    if (!e?.points?.length) return
    onSelect([e.points[0].pointIndex])
  }

  return (
    <Plot
      data={traces}
      layout={layout}
      config={{ responsive: true }}
      style={{ width: '100%' }}
      onSelected={handleSelected}
      onClick={handleClick}
    />
  )
}
