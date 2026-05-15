import { useRef } from 'react'

interface Props {
  logTransform: boolean
  onLogTransformChange: (v: boolean) => void
  percentiles: [number, number]
  onPercentilesChange: (v: [number, number]) => void
  mask: string
  onMaskChange: (v: string) => void
  masks: string[]
}

const C = {
  bg3: 'rgba(0,0,0,0.2)',
  bg: '#343a40',
  accent: '#4f8ef7',
  text: 'white',
  textMuted: 'rgba(255,255,255,0.65)',
  textDim: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.15)',
  mono: "'IBM Plex Mono', monospace",
}

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      display: 'block',
      fontSize: 12,
      fontFamily: C.mono,
      color: C.textDim,
      letterSpacing: '.05em',
      textTransform: 'uppercase',
      marginBottom: 4,
      ...style,
    }}>
      {children}
    </span>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        width: 28,
        height: 16,
        background: on ? C.accent : C.bg3,
        border: `1px solid ${on ? C.accent : C.border}`,
        borderRadius: 8,
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2,
        left: on ? 14 : 2,
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

function DualRangeSlider({
  value,
  onChange,
}: {
  value: [number, number]
  onChange: (v: [number, number]) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  const getPercent = (clientX: number): number => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    return Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)))
  }

  const startDrag = (thumb: 'lo' | 'hi') => (e: React.MouseEvent) => {
    e.preventDefault()
    let lo = value[0]
    let hi = value[1]
    const onMove = (me: MouseEvent) => {
      const pct = getPercent(me.clientX)
      if (thumb === 'lo') {
        lo = Math.min(pct, hi - 1)
        onChange([lo, hi])
      } else {
        hi = Math.max(pct, lo + 1)
        onChange([lo, hi])
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const [lo, hi] = value

  return (
    <div>
      <div
        ref={trackRef}
        style={{ position: 'relative', height: 3, background: C.bg3, borderRadius: 2, margin: '10px 0 4px' }}
      >
        <div style={{
          position: 'absolute',
          left: `${lo}%`,
          width: `${hi - lo}%`,
          height: '100%',
          background: C.accent,
          borderRadius: 2,
        }} />
        <div
          onMouseDown={startDrag('lo')}
          style={{
            position: 'absolute',
            top: '50%',
            left: `${lo}%`,
            transform: 'translate(-50%, -50%)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: C.accent,
            border: `2px solid ${C.bg}`,
            cursor: 'grab',
            zIndex: 2,
          }}
        />
        <div
          onMouseDown={startDrag('hi')}
          style={{
            position: 'absolute',
            top: '50%',
            left: `${hi}%`,
            transform: 'translate(-50%, -50%)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: C.accent,
            border: `2px solid ${C.bg}`,
            cursor: 'grab',
            zIndex: 2,
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.mono, fontSize: 12, color: C.textMuted }}>
        <span>{lo}%</span>
        <span>{hi}%</span>
      </div>
    </div>
  )
}

export default function DataTransformation({
  logTransform,
  onLogTransformChange,
  percentiles,
  onPercentilesChange,
  mask,
  onMaskChange,
  masks,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: C.text }}>Log Transform</span>
        <Toggle on={logTransform} onToggle={() => onLogTransformChange(!logTransform)} />
      </div>

      <div style={{ marginTop: 4 }}>
        <FieldLabel>Min-Max Percentile</FieldLabel>
        <DualRangeSlider value={percentiles} onChange={onPercentilesChange} />
      </div>

      <div style={{ marginTop: 8 }}>
        <FieldLabel>Mask</FieldLabel>
        <div style={{ position: 'relative' }}>
          <select
            value={mask}
            onChange={(e) => onMaskChange(e.target.value)}
            style={{
              width: '100%',
              background: C.bg3,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: '5px 8px',
              fontFamily: C.mono,
              fontSize: 13,
              color: C.text,
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
            }}
          >
            {masks.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <span style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            color: C.textDim,
            fontSize: 10,
            pointerEvents: 'none',
          }}>▾</span>
        </div>
      </div>

    </div>
  )
}
