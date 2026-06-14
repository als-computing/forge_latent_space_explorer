import Plot from '../lib/Plot'
import type { HeatmapResponse } from '../types/data'

interface Props {
  result: HeatmapResponse | null
}

const DARK = '#343a40'
const AXIS_COLOR = 'rgba(255,255,255,0.35)'
const GRID_COLOR = 'rgba(255,255,255,0.08)'

const BASE_LAYOUT: Partial<Plotly.Layout> = {
  autosize: true,
  margin: { l: 20, r: 20, t: 20, b: 20, pad: 0 },
  paper_bgcolor: DARK,
  plot_bgcolor: DARK,
  font: { color: 'rgba(255,255,255,0.65)', family: "'IBM Plex Mono', monospace", size: 10 },
  xaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR, tickfont: { color: AXIS_COLOR } },
  yaxis: { autorange: 'reversed', scaleanchor: 'x', gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR, tickfont: { color: AXIS_COLOR } },
}

export default function Heatmap({ result }: Props) {
  if (!result) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: DARK,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: 'rgba(255,255,255,0.35)',
      }}>
        Select points to view heatmap
      </div>
    )
  }

  const traces: Plotly.Data[] = [{ type: 'heatmap', z: result.data, colorscale: 'Greys' } as Plotly.Data]

  return (
    <Plot
      data={traces}
      layout={BASE_LAYOUT}
      config={{ responsive: true }}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
