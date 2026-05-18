import { useEffect, useState } from 'react'
import { Settings, ChevronDown } from 'lucide-react'
import Clustering from './Clustering'
import DataTransformation from './DataTransformation'
import DimensionReduction from './DimensionReduction'
import type { DataProjectDict } from '../types/data'

interface Props {
  dataProjectDict: DataProjectDict | null
  projectName: string
  logTransform: boolean
  onLogTransformChange: (v: boolean) => void
  percentiles: [number, number]
  onPercentilesChange: (v: [number, number]) => void
  mask: string
  onMaskChange: (v: string) => void
  latentSpaceJobId: string | null
  onLatentSpaceJobSubmitted: (jobId: string) => void
  onDataProjectDictChange?: (dict: DataProjectDict) => void
  clearCount?: number
  onShowFeatureVectors: () => void
  onHideFeatureVectors: () => void
  onClusteringJobSubmitted: (jobId: string) => void
  onShowClusters: () => void
  onHideClusters: () => void
  masks: string[]
  isOpen: boolean
  onToggle: () => void
}

function AccordionItem({
  title,
  titleColor,
  defaultOpen,
  forceOpen,
  children,
}: {
  title: string
  titleColor?: string
  defaultOpen?: boolean
  forceOpen?: boolean
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  useEffect(() => {
    if (forceOpen) setOpen(true)
  }, [forceOpen])

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
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
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: titleColor ?? 'rgba(255,255,255,0.65)',
        }}>
          {title}
        </span>
        <ChevronDown
          size={10}
          style={{
            color: 'rgba(255,255,255,0.35)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        />
      </button>
      {open && (
        <div style={{ padding: '8px 14px 12px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({
  dataProjectDict,
  projectName,
  logTransform, onLogTransformChange,
  percentiles, onPercentilesChange,
  mask, onMaskChange,
  latentSpaceJobId,
  onLatentSpaceJobSubmitted,
  onDataProjectDictChange,
  clearCount,
  onShowFeatureVectors,
  onHideFeatureVectors,
  onClusteringJobSubmitted,
  onShowClusters,
  onHideClusters,
  masks,
  isOpen,
  onToggle,
}: Props) {

  return (
    <>
      {/* Offcanvas panel */}
      <div
        style={{
          position: 'fixed',
          top: 80,
          left: isOpen ? 0 : -400,
          width: 400,
          height: 'calc(100vh - 80px)',
          backgroundColor: '#343a40',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.4)',
          zIndex: 1050,
          transition: 'left 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div style={{ flex: 1 }}>
          <AccordionItem title="Data transformation">
            <DataTransformation
              logTransform={logTransform}
              onLogTransformChange={onLogTransformChange}
              percentiles={percentiles}
              onPercentilesChange={onPercentilesChange}
              mask={mask}
              onMaskChange={onMaskChange}
              masks={masks}
            />
          </AccordionItem>
          <AccordionItem title="Dimension Reduction" forceOpen={!!latentSpaceJobId}>
            <DimensionReduction
              dataProjectDict={dataProjectDict}
              projectName={projectName}
              currentJobId={latentSpaceJobId}
              logTransform={logTransform}
              percentiles={percentiles}
              mask={mask}
              onJobSubmitted={onLatentSpaceJobSubmitted}
              onShowFeatureVectors={onShowFeatureVectors}
              onHideFeatureVectors={onHideFeatureVectors}
              onDataProjectDictChange={onDataProjectDictChange}
              clearCount={clearCount}
            />
          </AccordionItem>
          <AccordionItem title="Clustering">
            <Clustering
              projectName={projectName}
              latentSpaceJobId={latentSpaceJobId}
              logTransform={logTransform}
              percentiles={percentiles}
              mask={mask}
              onJobSubmitted={onClusteringJobSubmitted}
              onShowClusters={onShowClusters}
              onHideClusters={onHideClusters}
              onDataProjectDictChange={onDataProjectDictChange}
              clearCount={clearCount}
            />
          </AccordionItem>
        </div>
      </div>

      {/* Toggle button */}
      <div
        style={{
          position: 'fixed',
          bottom: 60,
          right: 10,
          zIndex: 9999,
          opacity: 0.8,
        }}
      >
        <button
          onClick={onToggle}
          title="Toggle sidebar"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#6c757d',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Settings size={20} />
        </button>
      </div>
    </>
  )
}
