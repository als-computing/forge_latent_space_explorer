import { useEffect, useRef, useState } from 'react'
import type { MlflowModelOption } from '../types/jobs'

interface Props {
  options: MlflowModelOption[]
  value: string | null
  onChange: (value: string | null) => void
  loading?: boolean
  variant?: 'dark' | 'light'
}

function matchesSearch(opt: MlflowModelOption, query: string): boolean {
  const q = query.toLowerCase()
  return [opt.label, opt.algorithm, opt.date]
    .filter(Boolean)
    .some(s => s!.toLowerCase().includes(q))
}

const DARK = {
  bg: 'rgba(0,0,0,0.25)',
  bgPanel: '#2a2f36',
  bgHover: 'rgba(255,255,255,0.05)',
  bgSelected: 'rgba(79,142,247,0.12)',
  border: 'rgba(255,255,255,0.15)',
  borderOpen: '#4f8ef7',
  borderSelected: '#4f8ef7',
  text: 'white',
  textDim: 'rgba(255,255,255,0.4)',
  mono: "'IBM Plex Mono', monospace",
  shadow: '0 8px 24px rgba(0,0,0,0.4)',
}

const LIGHT = {
  bg: 'white',
  bgPanel: 'white',
  bgHover: '#f8f9fa',
  bgSelected: 'rgba(12,99,228,0.05)',
  border: '#dee2e6',
  borderOpen: '#0c63e4',
  borderSelected: '#0c63e4',
  text: '#212529',
  textDim: '#6c757d',
  mono: 'monospace',
  shadow: '0 4px 16px rgba(0,0,0,0.12)',
}

export default function MlflowModelSelect({ options, value, onChange, loading, variant = 'dark' }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const T = variant === 'dark' ? DARK : LIGHT

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (open) {
      setSearch('')
      setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open])

  const selected = options.find(o => o.value === value) ?? null

  const placeholder = loading
    ? 'Loading…'
    : options.length === 0
      ? 'No models available'
      : '— Select a model —'

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => { if (!loading && options.length > 0) setOpen(o => !o) }}
        disabled={loading || options.length === 0}
        style={{
          width: '100%',
          background: T.bg,
          border: `1px solid ${open ? T.borderOpen : T.border}`,
          borderRadius: 4,
          padding: '6px 32px 6px 10px',
          cursor: loading || options.length === 0 ? 'default' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 2,
          textAlign: 'left',
          transition: 'border-color 0.15s',
          minHeight: 44,
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {selected ? (
          <>
            <span style={{
              fontFamily: T.mono,
              fontSize: 13,
              fontWeight: 700,
              color: T.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
            }}>
              {selected.label}
            </span>
            <span style={{
              fontFamily: T.mono,
              fontSize: 10,
              color: T.textDim,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
            }}>
              {[selected.algorithm, selected.date].filter(Boolean).join(' · ')}
            </span>
          </>
        ) : (
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textDim }}>{placeholder}</span>
        )}
        <span style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          color: T.textDim,
          fontSize: 10,
          pointerEvents: 'none',
          transition: 'transform 0.15s',
        }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: T.bgPanel,
          border: `1px solid ${T.border}`,
          borderRadius: 5,
          zIndex: 200,
          boxShadow: T.shadow,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '6px 8px', borderBottom: `1px solid ${T.border}` }}>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                width: '100%',
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 3,
                padding: '4px 8px',
                fontFamily: T.mono,
                fontSize: 12,
                color: T.text,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {value && (
            <div
              onClick={() => { onChange(null); setOpen(false); setSearch('') }}
              style={{
                padding: '7px 10px',
                borderBottom: `1px solid ${T.border}`,
                cursor: 'pointer',
                fontFamily: T.mono,
                fontSize: 11,
                color: T.textDim,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = T.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              — Clear selection —
            </div>
          )}
          {options.filter(opt => matchesSearch(opt, search)).map(opt => {
            const id = opt.value ?? opt.label
            const isSelected = opt.value === value
            const meta = [opt.algorithm, opt.date].filter(Boolean).join(' · ')
            return (
              <div
                key={id}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  background: isSelected ? T.bgSelected : 'transparent',
                  borderLeft: `2px solid ${isSelected ? T.borderSelected : 'transparent'}`,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.bgHover }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  fontFamily: T.mono,
                  fontSize: 13,
                  fontWeight: 700,
                  color: isSelected ? T.borderSelected : T.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: meta ? 2 : 0,
                }}>
                  {opt.label}
                </div>
                {meta && (
                  <div style={{
                    fontFamily: T.mono,
                    fontSize: 10,
                    color: T.textDim,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {meta}
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}
