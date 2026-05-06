import Plot from '../lib/Plot'
import type { HeatmapResponse } from '../types/data'

interface Props {
  result: HeatmapResponse | null
}

const BASE_LAYOUT: Partial<Plotly.Layout> = {
  autosize: true,
  margin: { l: 20, r: 20, t: 20, b: 20, pad: 0 },
  yaxis: { autorange: 'reversed', scaleanchor: 'x' },
}

export default function Heatmap({ result }: Props) {
  const traces: Plotly.Data[] = result
    ? [{ type: 'heatmap', z: result.data, colorscale: 'Greys' } as Plotly.Data]
    : [{ type: 'heatmap', z: [] } as Plotly.Data]

  return (
    <Plot
      data={traces}
      layout={BASE_LAYOUT}
      config={{ responsive: true }}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
