import { NavLink } from 'react-router-dom'

const TABS = [
  { label: 'Explore', to: '/explore' },
  { label: 'Live', to: '/live' },
  { label: 'Replay', to: '/replay' },
  { label: 'Run', to: '/run' },
]

interface HeaderProps {
  jobRunning?: boolean
}

export default function Header({ jobRunning }: HeaderProps) {
  return (
    <nav style={{
      backgroundColor: '#343a40',
      padding: '0 1rem',
      position: 'sticky',
      top: 0,
      zIndex: 1100,
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'space-between',
      width: '100%',
      boxSizing: 'border-box',
      height: 72,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h3 style={{ color: 'white', margin: 0, padding: 0 }}>
          Latent Space Explorer
        </h3>
        {jobRunning && (
          <>
            <style>{`
              @keyframes lse-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
            `}</style>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 6,
              border: '1px solid rgba(245,158,11,0.5)',
              background: 'rgba(245,158,11,0.15)',
              color: '#f59e0b', fontSize: '0.875rem', fontWeight: 500,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#f59e0b', flexShrink: 0,
                animation: 'lse-pulse 1.2s ease-in-out infinite',
              }} />
              <span>dim reduction running…</span>
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 4, padding: '0 1rem' }}>
        {TABS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: isActive ? 600 : 400,
              borderBottom: isActive ? '3px solid white' : '3px solid transparent',
              transition: 'color 0.15s, border-color 0.15s',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>

    </nav>
  )
}
