import type { PlotParams } from 'react-plotly.js'
import _Plot from 'react-plotly.js'

// react-plotly.js is CJS; Vite may double-wrap the default export
const Plot = (_Plot as unknown as { default: React.ComponentType<PlotParams> }).default ?? _Plot

export default Plot as React.ComponentType<PlotParams>
