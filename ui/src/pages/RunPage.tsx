import { useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Clustering from '../components/Clustering'
import DataTransformation from '../components/DataTransformation'
import DimensionReduction from '../components/DimensionReduction'
import FileBrowser from '../components/FileBrowser'
import DataOverview from '../components/DataOverview'
import JobStatusPanel from '../components/JobStatusPanel'
import type { ActiveJobEntry } from '../components/JobStatusPanel'
import { fetchMasks } from '../api/data'
import type { DataProjectDict } from '../types/data'

const C = {
  bg: '#343a40',
  border: 'rgba(255,255,255,0.1)',
  text: 'white',
  textMuted: 'rgba(255,255,255,0.65)',
  textDim: 'rgba(255,255,255,0.4)',
  mono: "'IBM Plex Mono', monospace",
  accent: '#4f8ef7',
}

function HandleButton({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      style={{
        position: 'fixed',
        top: '50%',
        left: isOpen ? 400 : 0,
        transform: 'translateY(-50%)',
        width: 16,
        height: 48,
        zIndex: 1051,
        border: 'none',
        borderRadius: '0 6px 6px 0',
        backgroundColor: hovered ? '#868e96' : '#495057',
        color: 'rgba(255,255,255,0.8)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: hovered ? 1 : 0.35,
        transition: 'left 0.3s ease, opacity 0.2s, background-color 0.2s',
        padding: 0,
      }}
    >
      {isOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
    </button>
  )
}

function AccordionItem({ title, defaultOpen = true, children }: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span style={{
          fontFamily: C.mono,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: C.textMuted,
        }}>
          {title}
        </span>
        <ChevronDown
          size={10}
          style={{
            color: C.textDim,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        />
      </button>
      {open && <div style={{ padding: '8px 14px 12px' }}>{children}</div>}
    </div>
  )
}

type Tab = 'dimred' | 'clustering'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dimred', label: 'Dim Reduction' },
  { id: 'clustering', label: 'Clustering' },
]

export default function RunPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('dimred')

  const [logTransform, setLogTransform] = useState(false)
  const [percentiles, setPercentiles] = useState<[number, number]>([2, 95])
  const [mask, setMask] = useState('None')
  const [masks, setMasks] = useState<string[]>(['None'])
  const [dataProjectDict, setDataProjectDict] = useState<DataProjectDict | null>(null)
  const [latentSpaceJobId, setLatentSpaceJobId] = useState<string | null>(null)
  const [activeJobs, setActiveJobs] = useState<ActiveJobEntry[]>([])

  function handleDimRedJobSubmitted(jobId: string) {
    setLatentSpaceJobId(jobId)
    setActiveJobs(prev => [...prev, { jobId, kind: 'latent-space', startedAt: Date.now() }])
  }

  function handleClusteringJobSubmitted(jobId: string) {
    setActiveJobs(prev => [...prev, { jobId, kind: 'clustering', startedAt: Date.now() }])
  }

  useEffect(() => {
    fetchMasks()
      .then(m => setMasks(['None', ...m]))
      .catch(() => {})
  }, [])

  return (
    <div>
      {/* Sidebar panel */}
      <div
        style={{
          position: 'fixed',
          top: 72,
          left: sidebarOpen ? 0 : -400,
          width: 400,
          height: 'calc(100vh - 72px)',
          backgroundColor: C.bg,
          borderRight: `1px solid ${C.border}`,
          boxShadow: '2px 0 12px rgba(0,0,0,0.4)',
          zIndex: 1050,
          transition: 'left 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                borderBottom: activeTab === tab.id
                  ? `2px solid ${C.accent}`
                  : '2px solid transparent',
                background: activeTab === tab.id
                  ? 'rgba(79,142,247,0.08)'
                  : 'transparent',
                fontFamily: C.mono,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: activeTab === tab.id ? C.accent : C.textDim,
                cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s, background 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'dimred' && (
            <>
              <AccordionItem title="Dataset Source">
                <FileBrowser onLoad={setDataProjectDict} />
              </AccordionItem>

              <AccordionItem title="Data Transformation">
                <DataTransformation
                  logTransform={logTransform}
                  onLogTransformChange={setLogTransform}
                  percentiles={percentiles}
                  onPercentilesChange={setPercentiles}
                  mask={mask}
                  onMaskChange={setMask}
                  masks={masks}
                />
              </AccordionItem>

              <AccordionItem title="Dimension Reduction">
                <DimensionReduction
                  dataProjectDict={dataProjectDict}
                  projectName=""
                  currentJobId={latentSpaceJobId}
                  logTransform={logTransform}
                  percentiles={percentiles}
                  mask={mask}
                  onJobSubmitted={handleDimRedJobSubmitted}
                  onShowFeatureVectors={() => {}}
                  onHideFeatureVectors={() => {}}
                  hideHistory
                  onDataProjectDictChange={setDataProjectDict}
                />
              </AccordionItem>
            </>
          )}

          {activeTab === 'clustering' && (
            <AccordionItem title="Clustering">
              <Clustering
                projectName=""
                latentSpaceJobId={latentSpaceJobId}
                logTransform={logTransform}
                percentiles={percentiles}
                mask={mask}
                onJobSubmitted={handleClusteringJobSubmitted}
                onShowClusters={() => {}}
                onHideClusters={() => {}}
                hideHistory
                onDataProjectDictChange={setDataProjectDict}
              />
            </AccordionItem>
          )}
        </div>
      </div>

      <HandleButton isOpen={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />

      {/* Main content */}
      <div
        style={{
          marginLeft: sidebarOpen ? 400 : 0,
          transition: 'margin-left 0.3s ease',
          height: 'calc(100vh - 72px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 10,
          gap: 10,
          boxSizing: 'border-box',
        }}
      >
        {dataProjectDict && (
          <DataOverview
            dataProjectDict={dataProjectDict}
            logTransform={logTransform}
            percentiles={percentiles}
          />
        )}
        <div style={{ flex: 1, minHeight: 0 }}>
          <JobStatusPanel activeJobs={activeJobs} />
        </div>
      </div>
    </div>
  )
}
