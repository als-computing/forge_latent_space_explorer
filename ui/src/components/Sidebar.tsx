import { useState } from 'react'
import { Settings, ChevronDown } from 'lucide-react'

const SECTIONS = [
  { id: 'data-selection', title: 'Data selection' },
  { id: 'data-transformation', title: 'Data transformation' },
  { id: 'dimension-reduction', title: 'Dimension Reduction' },
  { id: 'clustering', title: 'Clustering' },
  { id: 'experiment-replay', title: 'Experiment Replay' },
]

function AccordionItem({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderBottom: '1px solid #dee2e6' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: open ? '#e7f1ff' : 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 'large',
          fontWeight: 'bold',
          textAlign: 'left',
          color: open ? '#0c63e4' : '#212529',
        }}
      >
        {title}
        <ChevronDown
          size={18}
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        />
      </button>
      {open && (
        <div style={{ padding: '8px 16px 16px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <>
      {/* Offcanvas panel */}
      <div
        style={{
          position: 'fixed',
          top: 80,
          left: isOpen ? 0 : -500,
          width: 500,
          height: 'calc(100vh - 80px)',
          backgroundColor: 'white',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          zIndex: 1050,
          transition: 'left 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #dee2e6',
          fontWeight: 'bold',
          fontSize: '1.25rem',
          color: '#212529',
        }}>
          Controls
        </div>

        <div style={{ flex: 1 }}>
          {SECTIONS.map(({ id, title }) => (
            <AccordionItem key={id} title={title} />
          ))}
        </div>
      </div>

      {/* Toggle button (bottom-right, fixed) */}
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
          onClick={() => setIsOpen(o => !o)}
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
