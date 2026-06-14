import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import type { SessionConfig } from './components/SessionModal'
import ExplorePage from './pages/ExplorePage'
import LivePage from './pages/LivePage'
import ReplayPage from './pages/ReplayPage'
import RunPage from './pages/RunPage'
import { useJobStatus } from './hooks/useJobStatus'

import { deriveProjectName } from './utils/projectName'
import type { DataProjectDict } from './types/data'

function App() {
  const [logTransform] = useState(false)
  const [percentiles] = useState<[number, number]>([2, 95])
  const [mask] = useState('None')
  const [dataProjectDict, setDataProjectDict] = useState<DataProjectDict | null>(null)
  const [sessionConfig] = useState<SessionConfig | null>(null)
  const [jobRunning, setJobRunning] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [clearCount] = useState(0)


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

  return (
    <>
      <Header
        jobRunning={jobRunning}
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
              logTransform={logTransform}
              percentiles={percentiles}
              mask={mask}
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
