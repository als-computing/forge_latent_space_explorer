import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onSetUpSession: () => void
}

export default function NoSessionModal({ open, onClose, onSetUpSession }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Layer 1: clickable dark backdrop — greying out everything behind it */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 2000,
          background: 'rgba(4,7,12,0.78)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      />

      {/* Layer 2: grid texture + card — pointer-events passthrough so clicks outside card hit the backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 2001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Subtle grid texture */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.04 }}
          viewBox="0 0 560 320"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="no-session-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4f8ef7" strokeWidth=".5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#no-session-grid)" />
        </svg>

        {/* Card — re-enable pointer events on just the card */}
        <div
          style={{
            position: 'relative',
            pointerEvents: 'auto',
            textAlign: 'center',
            maxWidth: 340,
            width: '90vw',
            padding: '40px 40px',
            background: 'rgba(15,21,32,0.96)',
            border: '1px solid rgba(79,142,247,0.22)',
            borderRadius: 12,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4, color: 'white' }}>◆</div>

          <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 10 }}>
            No session configured
          </div>

          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.7,
            marginBottom: 28,
          }}>
            Choose a dataset, preprocessing settings, and model to begin exploring the latent space.
          </div>

          <button
            onClick={() => { onClose(); onSetUpSession() }}
            style={{
              padding: '10px 28px',
              background: '#4f8ef7',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          >
            <span>▶</span> Set Up Session
          </button>

          <div style={{
            marginTop: 16,
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            color: 'rgba(255,255,255,0.25)',
          }}>
            or select a past job run in the sidebar
          </div>
        </div>
      </div>
    </>
  )
}
