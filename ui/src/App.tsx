import { useState } from 'react'
import DataOverview from './components/DataOverview'
import InfraStatus from './components/InfraStatus'
import JobPanel from './components/JobPanel'
import MlflowModelSelect from './components/MlflowModelSelect'
import ModelSelect from './components/ModelSelect'
import type { DataProjectDict } from './types/data'
import type { ParameterValues } from './types/models'

function App() {
  const [tiledUri, setTiledUri] = useState('')
  const [dataProjectDict, setDataProjectDict] = useState<DataProjectDict | null>(null)

  const [dimRedModelName, setDimRedModelName] = useState<string | null>(null)
  const [dimRedParams, setDimRedParams] = useState<ParameterValues>({})
  const [clusteringModelName, setClusteringModelName] = useState<string | null>(null)
  const [clusteringParams, setClusteringParams] = useState<ParameterValues>({})

  const [mlflowModel, setMlflowModel] = useState<string | null>(null)
  const [latentSpaceJobId, setLatentSpaceJobId] = useState<string | null>(null)

  async function handleLoadData() {
    if (!tiledUri.trim()) return
    const res = await fetch('/api/data/browse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: tiledUri.trim() }),
    })
    if (!res.ok) return
    setDataProjectDict(await res.json())
  }

  function handleDimRedParams(modelName: string, params: ParameterValues) {
    setDimRedModelName(modelName)
    setDimRedParams(params)
  }

  function handleClusteringParams(modelName: string, params: ParameterValues) {
    setClusteringModelName(modelName)
    setClusteringParams(params)
  }

  return (
    <div style={{ maxWidth: 960, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Latent Space Explorer</h1>
        <InfraStatus />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
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
            dataProjectDict={dataProjectDict}
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
          <MlflowModelSelect value={mlflowModel} onChange={setMlflowModel} />
          <JobPanel
            dataProjectDict={dataProjectDict}
            dimRedModelName={dimRedModelName}
            dimRedParams={dimRedParams}
            clusteringModelName={clusteringModelName}
            clusteringParams={clusteringParams}
            mlflowModelId={mlflowModel}
            latentSpaceJobId={latentSpaceJobId}
            onLatentSpaceJobSubmitted={setLatentSpaceJobId}
          />
        </div>
      </div>
    </div>
  )
}

export default App
