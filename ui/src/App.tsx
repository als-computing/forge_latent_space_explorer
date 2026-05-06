import { useState } from 'react'
import DataOverview from './components/DataOverview'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import VisualizationPanel from './components/VisualizationPanel'
import type { DataProjectDict } from './types/data'

function App() {
  const [dataProjectDict, setDataProjectDict] = useState<DataProjectDict | null>(null)
  const [logTransform, setLogTransform] = useState(false)
  const [percentiles, setPercentiles] = useState<[number, number]>([0, 100])
  const [mask, setMask] = useState('None')

  return (
    <div>
      <Header />
      <Sidebar
        onDataLoad={setDataProjectDict}
        logTransform={logTransform}
        onLogTransformChange={setLogTransform}
        percentiles={percentiles}
        onPercentilesChange={setPercentiles}
        mask={mask}
        onMaskChange={setMask}
      />
      <div style={{ padding: '10px 10px 10px 520px' }}>
        <DataOverview
          dataProjectDict={dataProjectDict}
          logTransform={logTransform}
          percentiles={percentiles}
        />
        <VisualizationPanel
          latentSpaceJobId={null}
          clusteringJobId={null}
          projectName=""
          latentSpaceReady={false}
          clusteringReady={false}
          dataProjectDict={dataProjectDict}
        />
      </div>
    </div>
  )
}

export default App
