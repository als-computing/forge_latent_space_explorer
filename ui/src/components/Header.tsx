import { CircleHelp } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const GITHUB_URL = 'https://github.com/mlexchange/mlex_latent_explorer'
const DOCS_URL = 'https://mlexchange.als.lbl.gov'

const TABS = [
  { label: 'Explore', to: '/explore' },
  { label: 'Live', to: '/live' },
  { label: 'Replay', to: '/replay' },
]

const iconButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 5,
  color: '#00313C',
  backgroundColor: 'white',
  border: '0px',
  cursor: 'pointer',
  borderRadius: 4,
  marginRight: '1rem',
  textDecoration: 'none',
}

function GithubIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.203 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z" />
    </svg>
  )
}

export default function Header() {
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
        <img src="/mlex.png" alt="MLEx logo" height={56} />
        <h3 style={{ color: 'white', margin: 0, padding: 0 }}>
          MLExchange | Latent Space Explorer
        </h3>
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

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <a href={GITHUB_URL} title="Go to GitHub Repository" style={iconButtonStyle} target="_blank" rel="noreferrer">
          <GithubIcon size={40} />
        </a>
        <a href={DOCS_URL} title="Go to Docs" style={iconButtonStyle} target="_blank" rel="noreferrer">
          <CircleHelp size={40} />
        </a>
      </div>
    </nav>
  )
}
