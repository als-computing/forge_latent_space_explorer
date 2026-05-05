import Plot from 'react-plotly.js'
import type { HeatmapResponse } from '../types/data'

interface Props {
  result: HeatmapResponse | null
  displayOption: 'mean' | 'std'
  onDisplayChange: (v: 'mean' | 'std') => void
}

export default function Heatmap({ result, displayOption, onDisplayChange }: Props) {
  const layout: Partial<Plotly.Layout> = {
    margin: { l: 20, r: 20, t: 20, b: 20 },
    height: 300,
    yaxis: { autorange: 'reversed', scaleanchor: 'x' },
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {result ? `${result.n_selected} image${result.n_selected !== 1 ? 's' : ''} selected` : 'Select points on the scatter plot'}
        </span>
        <label style={{ fontSize: 13 }}>
          <input type="radio" value="mean" checked={displayOption === 'mean'} onChange={() => onDisplayChange('mean')} />{' '}Mean
        </label>
        <label style={{ fontSize: 13 }}>
          <input type="radio" value="std" checked={displayOption === 'std'} onChange={() => onDisplayChange('std')} />{' '}Std Dev
        </label>
      </div>
      {result ? (
        <Plot
          data={[{ type: 'heatmap', z: result.data, colorscale: 'Greys' } as Plotly.Data]}
          layout={layout}
          config={{ responsive: true }}
          style={{ width: '100%' }}
        />
      ) : (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', borderRadius: 6, color: '#999', fontSize: 13 }}>
          No selection
        </div>
      )}
    </div>
  )
}
