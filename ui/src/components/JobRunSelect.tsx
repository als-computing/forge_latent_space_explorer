import { useEffect, useRef, useState } from 'react'
import { fetchFlowRuns } from '../api/jobs'
import type { FlowRunOption } from '../types/jobs'

interface Props {
  label: string
  tags?: string[]
  value: string | null
  onChange: (value: string | null) => void
}

const C = {
  bg: '#2a2f36',
  bg2: 'rgba(0,0,0,0.25)',
  bg3: 'rgba(0,0,0,0.2)',
  accent: '#4f8ef7',
  text: 'white',
  textMuted: 'rgba(255,255,255,0.65)',
  textDim: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.15)',
  borderHover: 'rgba(255,255,255,0.3)',
  mono: "'IBM Plex Mono', monospace",
}

function metaString(opt: FlowRunOption): string {
  return [opt.algorithm, opt.autoencoder_model, opt.date, `id:${opt.value.slice(0, 8)}`]
    .filter(Boolean)
    .join(' · ')
}

export default function JobRunSelect({ label, tags, value, onChange }: Props) {
  const [options, setOptions] = useState<FlowRunOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setOptions(await fetchFlowRuns(tags))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const selected = options.find(o => o.value === value) ?? null

  const triggerLabel = loading
    ? 'Loading…'
    : selected
      ? (selected.project_name || selected.label)
      : options.length === 0
        ? 'No runs found'
        : '— Select a run —'

  return (
    <div ref={containerRef} style={{ marginBottom: 12, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: C.mono, fontWeight: 600, fontSize: 13, color: C.text }}>{label}</span>
        <button
          onClick={load}
          disabled={loading}
          style={{
            fontSize: 11,
            padding: '2px 8px',
            background: 'rgba(255,255,255,0.08)',
            border: `1px solid ${C.border}`,
            borderRadius: 3,
            color: C.textMuted,
            fontFamily: C.mono,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#ef4444', fontFamily: C.mono, fontSize: 11, marginBottom: 6 }}>{error}</div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => { if (!loading && options.length > 0) setOpen(o => !o) }}
        disabled={loading || options.length === 0}
        style={{
          width: '100%',
          background: C.bg2,
          border: `1px solid ${open ? C.accent : C.border}`,
          borderRadius: 4,
          padding: '6px 10px 6px 10px',
          cursor: loading || options.length === 0 ? 'default' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 2,
          textAlign: 'left',
          transition: 'border-color 0.15s',
          minHeight: 44,
        }}
      >
        {selected ? (
          <>
            <span style={{
              fontFamily: C.mono,
              fontSize: 13,
              fontWeight: 700,
              color: C.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
            }}>
              {selected.project_name || selected.label}
            </span>
            <span style={{
              fontFamily: C.mono,
              fontSize: 10,
              color: C.textDim,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
            }}>
              {metaString(selected)}
            </span>
          </>
        ) : (
          <span style={{ fontFamily: C.mono, fontSize: 12, color: C.textDim }}>
            {triggerLabel}
          </span>
        )}
        <span style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          color: C.textDim,
          fontSize: 10,
          pointerEvents: 'none',
          transition: 'transform 0.15s',
        }}>
          ▾
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: '#2a2f36',
          border: `1px solid ${C.border}`,
          borderRadius: 5,
          zIndex: 200,
          maxHeight: 260,
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {/* Clear selection */}
          {value && (
            <div
              onClick={() => { onChange(null); setOpen(false) }}
              style={{
                padding: '7px 10px',
                borderBottom: `1px solid ${C.border}`,
                cursor: 'pointer',
                fontFamily: C.mono,
                fontSize: 11,
                color: C.textDim,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              — Clear selection —
            </div>
          )}
          {options.map(opt => {
            const isSelected = opt.value === value
            return (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(79,142,247,0.12)' : 'transparent',
                  borderLeft: isSelected ? `2px solid ${C.accent}` : '2px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent'
                }}
              >
                <div style={{
                  fontFamily: C.mono,
                  fontSize: 13,
                  fontWeight: 700,
                  color: isSelected ? C.accent : C.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: 2,
                }}>
                  {opt.project_name || opt.label}
                </div>
                <div style={{
                  fontFamily: C.mono,
                  fontSize: 10,
                  color: C.textDim,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {metaString(opt)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
