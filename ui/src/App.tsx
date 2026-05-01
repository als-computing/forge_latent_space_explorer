import ModelSelect from './components/ModelSelect'
import type { ParameterValues } from './types/models'

function App() {
  function handleDimRedParams(modelName: string, params: ParameterValues) {
    console.log('Dim reduction:', modelName, params)
  }

  function handleClusteringParams(modelName: string, params: ParameterValues) {
    console.log('Clustering:', modelName, params)
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Latent Space Explorer</h1>
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
  )
}

export default App
