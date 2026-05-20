import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import NoSessionModal from './components/NoSessionModal'
import SessionModal from './components/SessionModal'
import type { SessionConfig } from './components/SessionModal'
import ExplorePage from './pages/ExplorePage'
import LivePage from './pages/LivePage'
import ReplayPage from './pages/ReplayPage'
import RunPage from './pages/RunPage'
import { useJobStatus } from './hooks/useJobStatus'
import { fetchMasks } from './api/data'
import { deriveProjectName } from './utils/projectName'
import type { DataProjectDict } from './types/data'

function App() {
  const [masks, setMasks] = useState<string[]>(['None'])
  const [logTransform, setLogTransform] = useState(false)
  const [percentiles, setPercentiles] = useState<[number, number]>([2, 95])
  const [mask, setMask] = useState('None')
  const [dataProjectDict, setDataProjectDict] = useState<DataProjectDict | null>(null)
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(true)
  const [jobRunning, setJobRunning] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [clearCount, setClearCount] = useState(0)

  useEffect(() => { fetchMasks().then(setMasks).catch(() => {}) }, [])

  useEffect(() => {
    if (!dataProjectDict?.datasets?.length) { setProjectName(''); return }
    const uris = dataProjectDict.datasets.map(ds => ds.uri)
    deriveProjectName(uris).then(setProjectName)
  }, [dataProjectDict])

  const jobStatus = useJobStatus(
    jobRunning ? (sessionConfig?.jobId ?? null) : null,
    'latent-space',
    projectName,
  )

  useEffect(() => {
    if (jobStatus?.ready) setJobRunning(false)
  }, [jobStatus?.ready])

  function handleDataLoad(dict: DataProjectDict, config: SessionConfig | null) {
    setDataProjectDict(dict)
    setSessionConfig(config)
    setJobRunning(!!config?.jobId)
  }

  return (
    <>
      <Header
        dataProjectDict={dataProjectDict}
        onOpenModal={() => setModalOpen(true)}
        jobRunning={jobRunning}
      />
      <NoSessionModal
        open={welcomeOpen && !dataProjectDict}
        onClose={() => setWelcomeOpen(false)}
        onSetUpSession={() => { setWelcomeOpen(false); setModalOpen(true) }}
      />
      <SessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        dataProjectDict={dataProjectDict}
        hasData={dataProjectDict !== null}
        onClearData={() => { setDataProjectDict(null); setSessionConfig(null); setModalOpen(false); setClearCount(c => c + 1) }}
        onDataLoad={handleDataLoad}
        onProjectNameChange={setProjectName}
        jobRunning={jobRunning}
        masks={masks}
        logTransform={logTransform}
        onLogTransformChange={setLogTransform}
        percentiles={percentiles}
        onPercentilesChange={setPercentiles}
        mask={mask}
        onMaskChange={setMask}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route
          path="/explore"
          element={
            <ExplorePage
              dataProjectDict={dataProjectDict}
              onDataProjectDictChange={setDataProjectDict}
              sessionConfig={sessionConfig}
              clearCount={clearCount}
              projectName={projectName}
              masks={masks}
              logTransform={logTransform}
              onLogTransformChange={setLogTransform}
              percentiles={percentiles}
              onPercentilesChange={setPercentiles}
              mask={mask}
              onMaskChange={setMask}

            />
          }
        />
        <Route path="/live" element={<LivePage />} />
        <Route path="/replay" element={<ReplayPage />} />
        <Route path="/run" element={<RunPage />} />
      </Routes>
    </>
  )
}

export default App
