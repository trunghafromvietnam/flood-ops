// Compact header shared by every operations view.

import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Search, Wifi, WifiOff } from 'lucide-react'
import GearMenu from './GearMenu.jsx'
import Logo from './Logo.jsx'
import { useOps } from '../state/OpsData.jsx'
import { matchesIncidentQuery, matchesTeamQuery } from '../lib/derive.js'
import { formatTime, locationSummary, MODE_LABELS } from '../lib/formatters.js'

export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="header-left">
        <GearMenu />
        <Link to="/ops" className="header-brand" aria-label="FloodOps operations overview">
          <Logo size={26} />
        </Link>
      </div>
      <HeaderSearch />
      <div className="header-right">
        <ModeBadge />
        <ConnectionStatus />
        <span className="header-identity" title="The backend has no authentication. Anyone with the URL can use this console.">
          Not signed in
        </span>
      </div>
    </header>
  )
}

export function ModeBadge() {
  const { mode } = useOps()
  return (
    <Link
      to="/ops/settings#data-mode"
      className={`mode-badge mode-${mode.toLowerCase()}`}
      title="Operating mode. Change it in Settings."
    >
      <span className="mode-dot" aria-hidden="true" />
      <span>
        <span className="visually-hidden">Operating mode: </span>
        {MODE_LABELS[mode].toUpperCase()}
      </span>
    </Link>
  )
}

function ConnectionStatus() {
  const { mode, health } = useOps()
  if (mode !== 'LIVE') {
    return <span className="connection connection-idle">Backend not in use</span>
  }
  if (health.state === 'ok') {
    return (
      <span className="connection connection-ok" title={`Health check passed at ${formatTime(health.checkedAt)}`}>
        <Wifi size={14} aria-hidden="true" /> Backend reachable · {formatTime(health.checkedAt)}
      </span>
    )
  }
  if (health.state === 'down') {
    return (
      <span className="connection connection-down" role="status">
        <WifiOff size={14} aria-hidden="true" /> Backend unavailable
        {health.lastOkAt && ` · last OK ${formatTime(health.lastOkAt)}`}
      </span>
    )
  }
  return <span className="connection connection-idle">Checking backend…</span>
}

function HeaderSearch() {
  const { dataset } = useOps()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const listId = useId()

  const q = query.trim()
  const incidents = q ? dataset.incidents.filter((i) => matchesIncidentQuery(i, q)).slice(0, 5) : []
  const teams = q && dataset.teams ? dataset.teams.filter((t) => matchesTeamQuery(t, q)).slice(0, 3) : []

  function go(path) {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!q) return
    const exact = dataset.incidents.find((i) => i.id.toLowerCase() === q.toLowerCase())
    if (exact) return go(`/ops/map?incident=${encodeURIComponent(exact.id)}`)
    go(`/ops/map?place=${encodeURIComponent(q)}`)
  }

  return (
    <form className="header-search" role="search" onSubmit={onSubmit}>
      <Search size={16} className="header-search-icon" aria-hidden="true" />
      <input
        type="search"
        className="input header-search-input"
        placeholder="Search place, incident ID or team ID"
        aria-label="Search place, incident ID or team ID"
        aria-controls={listId}
        aria-expanded={open && Boolean(q)}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      />
      {open && q && (
        <ul id={listId} className="header-search-results">
          {incidents.map((i) => (
            <li key={i.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/ops/map?incident=${encodeURIComponent(i.id)}`)}>
                <strong>{i.id}</strong>
                <span>{locationSummary(i)}</span>
              </button>
            </li>
          ))}
          {teams.map((t) => (
            <li key={t.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/ops/teams?team=${encodeURIComponent(t.id)}`)}>
                <strong>{t.id}</strong>
                <span>{t.name}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/ops/map?place=${encodeURIComponent(q)}`)}>
              <MapPin size={14} aria-hidden="true" />
              <span>Find place “{q}” on the map</span>
            </button>
          </li>
        </ul>
      )}
    </form>
  )
}
