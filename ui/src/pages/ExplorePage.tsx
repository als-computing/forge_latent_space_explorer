import { useEffect, useState } from 'react'
import DataOverview from '../components/DataOverview'
import Sidebar from '../components/Sidebar'
import VisualizationPanel from '../components/VisualizationPanel'
import type { DataProjectDict } from '../types/data'
import { deriveProjectName } from '../utils/projectName'

function ExplorePage() {
  const [dataProjectDict, setDataProjectDict] = useState<DataProjectDict | null>(null)
  const [logTransform, setLogTransform] = useState(false)
  const [percentiles, setPercentiles] = useState<[number, number]>([0, 100])
  const [mask, setMask] = useState('None')
  const [latentSpaceJobId, setLatentSpaceJobId] = useState<string | null>(null)
  const [clusteringJobId, setClusteringJobId] = useState<string | null>(null)
  const [showClustersTrigger, setShowClustersTrigger] = useState(0)
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
        onHideFeatureVectors={() => setShowFVTrigger(0)}
        onClusteringJobSubmitted={setClusteringJobId}
        onShowClusters={() => setShowClustersTrigger(n => n + 1)}
        onHideClusters={() => setShowClustersTrigger(0)}
      />
      <div style={{ padding: '10px 10px 10px 520px' }}>
        <DataOverview
          dataProjectDict={dataProjectDict}
          logTransform={logTransform}
          percentiles={percentiles}
        />
        <VisualizationPanel
          latentSpaceJobId={latentSpaceJobId}
          clusteringJobId={clusteringJobId}
          projectName={projectName}
          dataProjectDict={dataProjectDict}
          logTransform={logTransform}
          percentiles={percentiles}
          showFVTrigger={showFVTrigger}
          showClustersTrigger={showClustersTrigger}
        />
      </div>
    </div>
  )
}

export default ExplorePage
