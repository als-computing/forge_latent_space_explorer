import { useEffect, useState } from 'react'
import DataOverview from './components/DataOverview'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import VisualizationPanel from './components/VisualizationPanel'
import type { DataProjectDict } from './types/data'
import { deriveProjectName } from './utils/projectName'

function App() {
  const [dataProjectDict, setDataProjectDict] = useState<DataProjectDict | null>(null)
  const [logTransform, setLogTransform] = useState(false)
  const [percentiles, setPercentiles] = useState<[number, number]>([0, 100])
  const [mask, setMask] = useState('None')
  const [latentSpaceJobId, setLatentSpaceJobId] = useState<string | null>(null)
const [projectName, setProjectName] = useState('')
  const [showFVTrigger, setShowFVTrigger] = useState(0)

  useEffect(() => {
    if (!dataProjectDict?.datasets?.length) {
      setProjectName('')
      return
    }
    const uris = dataProjectDict.datasets.map(ds => ds.uri)
    deriveProjectName(uris).then(setProjectName)
  }, [dataProjectDict])

  return (
    <div>
      <Header />
      <Sidebar
        onDataLoad={setDataProjectDict}
        dataProjectDict={dataProjectDict}
        projectName={projectName}
        logTransform={logTransform}
        onLogTransformChange={setLogTransform}
        percentiles={percentiles}
        onPercentilesChange={setPercentiles}
        mask={mask}
        onMaskChange={setMask}
        latentSpaceJobId={latentSpaceJobId}
        onLatentSpaceJobSubmitted={setLatentSpaceJobId}
        onShowFeatureVectors={() => setShowFVTrigger(n => n + 1)}
      />
      <div style={{ padding: '10px 10px 10px 520px' }}>
        <DataOverview
          dataProjectDict={dataProjectDict}
          logTransform={logTransform}
          percentiles={percentiles}
        />
        <VisualizationPanel
          latentSpaceJobId={latentSpaceJobId}
          clusteringJobId={null}
          projectName={projectName}
          clusteringReady={false}
          dataProjectDict={dataProjectDict}
          logTransform={logTransform}
          percentiles={percentiles}
          showFVTrigger={showFVTrigger}
        />
      </div>
    </div>
  )
}

export default App
