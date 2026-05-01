import { useState } from 'react'
import DataOverview from './components/DataOverview'
import InfraStatus from './components/InfraStatus'
import ModelSelect from './components/ModelSelect'
import type { DataProjectDict } from './types/data'
import type { ParameterValues } from './types/models'

function App() {
  // Placeholder: in the real app this comes from a file manager component
  const [tiledUri, setTiledUri] = useState('')
  const [submittedUri, setSubmittedUri] = useState<DataProjectDict | null>(null)

  async function handleLoadData() {
    if (!tiledUri.trim()) return
    const res = await fetch('/api/data/browse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: tiledUri.trim() }),
    })
    if (!res.ok) return
    const dict = await res.json()
    setSubmittedUri(dict)
  }

  function handleDimRedParams(_modelName: string, _params: ParameterValues) {}
  function handleClusteringParams(_modelName: string, _params: ParameterValues) {}

  return (
    <div style={{ maxWidth: 960, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Latent Space Explorer</h1>
        <InfraStatus />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          {/* Placeholder data source input — replace with file manager later */}
          <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 16, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Data Source</h3>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Tiled URI
              <input
                type="text"
                value={tiledUri}
                onChange={(e) => setTiledUri(e.target.value)}
                placeholder="http://localhost:8000/api/v1/..."
                style={{ display: 'block', width: '100%', marginTop: 4, boxSizing: 'border-box' }}
              />
            </label>
            <button onClick={handleLoadData}>Load</button>
          </div>

          <DataOverview
            dataProjectDict={submittedUri}
            logTransform={false}
            percentiles={[0, 100]}
          />
        </div>

        <div>
          <ModelSelect
            label="Dimension Reduction"
            modelType="dimension_reduction"
            onParamsChange={handleDimRedParams}
          />
          <ModelSelect
            label="Clustering"
            modelType="clustering"
            onParamsChange={handleClusteringParams}
          />
        </div>
      </div>
    </div>
  )
}

export default App
