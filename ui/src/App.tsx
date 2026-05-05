import { useState } from 'react'
import DataOverview from './components/DataOverview'
import DataSourceSelect from './components/DataSourceSelect'
import InfraStatus from './components/InfraStatus'
import JobPanel from './components/JobPanel'
import MlflowModelSelect from './components/MlflowModelSelect'
import ModelSelect from './components/ModelSelect'
import VisualizationPanel from './components/VisualizationPanel'
import { useJobStatus } from './hooks/useJobStatus'
import type { DataProjectDict } from './types/data'
import type { ParameterValues } from './types/models'

function App() {
  const [dataProjectDict, setDataProjectDict] = useState<DataProjectDict | null>(null)

  const [dimRedModelName, setDimRedModelName] = useState<string | null>(null)
  const [dimRedParams, setDimRedParams] = useState<ParameterValues>({})
  const [clusteringModelName, setClusteringModelName] = useState<string | null>(null)
  const [clusteringParams, setClusteringParams] = useState<ParameterValues>({})

  const [mlflowModel, setMlflowModel] = useState<string | null>(null)
  const [projectName, setProjectName] = useState('')
  const [latentSpaceJobId, setLatentSpaceJobId] = useState<string | null>(null)
  const [clusteringJobId, setClusteringJobId] = useState<string | null>(null)

  // Poll job readiness for visualization gating
  const lsStatus = useJobStatus(latentSpaceJobId, 'latent-space', projectName)
  const clStatus = useJobStatus(clusteringJobId, 'clustering', projectName)

  function handleDimRedParams(modelName: string, params: ParameterValues) {
    setDimRedModelName(modelName)
    setDimRedParams(params)
  }

  function handleClusteringParams(modelName: string, params: ParameterValues) {
    setClusteringModelName(modelName)
    setClusteringParams(params)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Latent Space Explorer</h1>
        <InfraStatus />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <DataSourceSelect onLoad={setDataProjectDict} />
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
            projectName={projectName}
            onProjectNameChange={setProjectName}
            latentSpaceJobId={latentSpaceJobId}
            onLatentSpaceJobSubmitted={setLatentSpaceJobId}
            onClusteringJobSubmitted={setClusteringJobId}
          />
        </div>
      </div>

      <VisualizationPanel
        latentSpaceJobId={latentSpaceJobId}
        clusteringJobId={clusteringJobId}
        projectName={projectName}
        latentSpaceReady={lsStatus?.ready ?? false}
        clusteringReady={clStatus?.ready ?? false}
        dataProjectDict={dataProjectDict}
      />
    </div>
  )
}

export default App
