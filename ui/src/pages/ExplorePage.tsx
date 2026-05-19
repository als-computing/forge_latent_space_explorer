import { useEffect, useState } from 'react'
import DataOverview from '../components/DataOverview'
import Sidebar from '../components/Sidebar'
import VisualizationPanel from '../components/VisualizationPanel'
import type { SessionConfig } from '../components/SessionModal'
import type { DataProjectDict } from '../types/data'

interface Props {
  dataProjectDict: DataProjectDict | null
  sessionConfig: SessionConfig | null
  projectName: string
  masks: string[]
  logTransform: boolean
  onLogTransformChange: (v: boolean) => void
  percentiles: [number, number]
  onPercentilesChange: (v: [number, number]) => void
  mask: string
  onMaskChange: (v: string) => void
  onDataProjectDictChange?: (dict: DataProjectDict) => void
  clearCount?: number
}

function ExplorePage({ dataProjectDict, sessionConfig, projectName, masks, logTransform, onLogTransformChange, percentiles, onPercentilesChange, mask, onMaskChange, onDataProjectDictChange, clearCount = 0 }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [latentSpaceJobId, setLatentSpaceJobId] = useState<string | null>(null)
  const [clusteringJobId, setClusteringJobId] = useState<string | null>(null)
  const [showClustersTrigger, setShowClustersTrigger] = useState(0)
  const [showFVTrigger, setShowFVTrigger] = useState(0)
  const [autoencoderLabel, setAutoencoderLabel] = useState<string | null>(null)
  const [dimRedLabel, setDimRedLabel] = useState<string | null>(null)

  useEffect(() => {
    if (sessionConfig?.jobId) setLatentSpaceJobId(sessionConfig.jobId)
  }, [sessionConfig])

  useEffect(() => {
    if (clearCount > 0) {
      setLatentSpaceJobId(null)
      setClusteringJobId(null)
      setShowFVTrigger(0)
      setShowClustersTrigger(0)
    }
  }, [clearCount])

  return (
    <div>
      <Sidebar
        dataProjectDict={dataProjectDict}
        projectName={projectName}
        logTransform={logTransform}
        onLogTransformChange={onLogTransformChange}
        percentiles={percentiles}
        onPercentilesChange={onPercentilesChange}
        mask={mask}
        onMaskChange={onMaskChange}
        latentSpaceJobId={latentSpaceJobId}
        onLatentSpaceJobSubmitted={setLatentSpaceJobId}
        onDataProjectDictChange={onDataProjectDictChange}
        clearCount={clearCount}
        onShowFeatureVectors={() => setShowFVTrigger(n => n + 1)}
        onHideFeatureVectors={() => setShowFVTrigger(0)}
        onClusteringJobSubmitted={setClusteringJobId}
        onShowClusters={() => setShowClustersTrigger(n => n + 1)}
        onHideClusters={() => setShowClustersTrigger(0)}
        onModelInfoChange={(ae, dr) => { setAutoencoderLabel(ae); setDimRedLabel(dr) }}
        masks={masks}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
      />
      <div style={{
        marginLeft: sidebarOpen ? 400 : 0,
        transition: 'margin-left 0.3s ease',
        height: 'calc(100vh - 72px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: 10,
        boxSizing: 'border-box',
      }}>
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
          hasDataOverview={!!dataProjectDict?.datasets?.length}
          autoencoderLabel={autoencoderLabel}
          dimRedLabel={dimRedLabel}

        />
      </div>
    </div>
  )
}

export default ExplorePage
