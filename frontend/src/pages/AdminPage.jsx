import { useRef, useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import MapPlaceholder, { MapMarker } from '../components/MapPlaceholder.jsx'
import { StarIcon } from '../components/Icons.jsx'
import { ADMIN_LINKS } from '../components/navLinks.js'
import { MARKERS } from '../data/mock.js'
import './AdminPage.css'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'teams', label: 'Teams' },
  { id: 'open', label: 'Not rescued' },
]

const MIN_MAP = 35
const MAX_MAP = 80

function matchesFilter(marker, filter, rescued) {
  switch (filter) {
    case 'critical':
      return marker.kind === 'case' && marker.level === 'critical'
    case 'moderate':
      return marker.kind === 'case' && marker.level === 'moderate'
    case 'teams':
      return marker.kind === 'team'
    case 'open':
      return marker.kind === 'case' && !rescued.has(marker.id)
    default:
      return true
  }
}

function matchesQuery(marker, query) {
  if (!query) return true
  const haystack = [marker.id, marker.address, marker.location, marker.phone]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query.toLowerCase())
}

// Rows shown in the detail panel; fields the marker doesn't have are skipped.
function detailRows(marker) {
  const rows =
    marker.kind === 'case'
      ? [
          ['Source', marker.source],
          ['Phone', marker.phone, true],
          ['People', marker.people],
          ['Injuries', marker.injuries],
          ['Situation', marker.situation],
          ['Reported', marker.reported],
          ['Nearest team', marker.nearestTeam],
        ]
      : [
          ['Location', marker.location],
          ['Radio / phone', marker.phone, true],
          ['Members', marker.members],
          ['Equipment', marker.equipment],
          ['Current case', marker.currentCase],
          ['Free in', marker.freeIn],
          ['Cases nearby', marker.nearbyCases],
        ]
  return rows.filter(([, value]) => value)
}

function telHref(phone) {
  return `tel:+1${phone.replace(/\D/g, '')}`
}

export default function AdminPage() {
  const [selectedId, setSelectedId] = useState('FO-0412')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [rescued, setRescued] = useState(() => new Set())
  const [teamStatus, setTeamStatus] = useState({})
  const [mapSize, setMapSize] = useState(62)
  const splitRef = useRef(null)

  const visible = MARKERS.filter((m) => matchesFilter(m, filter, rescued) && matchesQuery(m, query))
  const selected = MARKERS.find((m) => m.id === selectedId)
  const openCases = MARKERS.filter((m) => m.kind === 'case' && !rescued.has(m.id)).length
  const teamCount = MARKERS.filter((m) => m.kind === 'team').length

  function toggleRescued(id) {
    // TODO(api): save rescued status to the backend.
    setRescued((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function statusOf(team) {
    return teamStatus[team.id] ?? team.status
  }

  // ---- Drag handle: resize map vs. panel ----
  function startDrag(e) {
    e.preventDefault()
    const box = splitRef.current.getBoundingClientRect()
    const onMove = (ev) => {
      const pct = ((ev.clientX - box.left) / box.width) * 100
      setMapSize(Math.min(MAX_MAP, Math.max(MIN_MAP, pct)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.classList.remove('is-resizing')
    }
    document.body.classList.add('is-resizing')
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function handleKeyResize(e) {
    if (e.key === 'ArrowLeft') setMapSize((s) => Math.max(MIN_MAP, s - 2))
    if (e.key === 'ArrowRight') setMapSize((s) => Math.min(MAX_MAP, s + 2))
  }

  return (
    <div className="page admin-page">
      <Navbar
        links={ADMIN_LINKS}
        action={<span className="btn btn-primary btn-pill dispatcher-tag">Dispatcher view</span>}
      />

      <main className="page-main admin-main">
        <h1 className="page-title">Rescue Operations Map</h1>
        <p className="page-subtitle">
          Live · {openCases} open cases · {teamCount} rescue teams nearby
        </p>

        <div className="admin-split" ref={splitRef} style={{ '--map-size': `${mapSize}%` }}>
          {/* ---------- Map ---------- */}
          <MapPlaceholder className="admin-map">
            {visible.map((m) => (
              <MapMarker
                key={m.id}
                type={m.kind === 'team' ? 'team' : m.level}
                x={m.x}
                y={m.y}
                selected={m.id === selectedId}
                dimmed={rescued.has(m.id)}
                label={m.kind === 'team' ? m.id : `Case ${m.id}`}
                onClick={() => setSelectedId(m.id)}
              />
            ))}

            <ul className="map-legend">
              <li>
                <span className="legend-dot legend-critical" /> Critical (call or drone)
              </li>
              <li>
                <span className="legend-dot legend-moderate" /> Moderate (web form)
              </li>
              <li>
                <StarIcon size={20} /> Rescue team
              </li>
            </ul>
          </MapPlaceholder>

          {/* ---------- Drag handle ---------- */}
          <div
            className="split-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize map and details"
            aria-valuenow={Math.round(mapSize)}
            aria-valuemin={MIN_MAP}
            aria-valuemax={MAX_MAP}
            tabIndex={0}
            onPointerDown={startDrag}
            onKeyDown={handleKeyResize}
            onDoubleClick={() => setMapSize(62)}
          >
            <span className="split-grip" />
          </div>

          {/* ---------- Search + details ---------- */}
          <aside className="card admin-panel">
            <div className="panel-search">
              <input
                className="input panel-search-input"
                type="search"
                placeholder="Search address, phone or case ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="button" className="btn btn-primary">
                Filters
              </button>
            </div>

            <div className="panel-filters">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`filter-chip${filter === f.id ? ' is-active' : ''}`}
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {query && (
              <ul className="search-results">
                {visible.length === 0 && <li className="hint">No matches.</li>}
                {visible.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={`search-result${m.id === selectedId ? ' is-active' : ''}`}
                      onClick={() => setSelectedId(m.id)}
                    >
                      <strong>{m.id}</strong>
                      <span>{m.address ?? m.location}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <hr className="divider" />

            {selected && (
              <Detail
                marker={selected}
                isRescued={rescued.has(selected.id)}
                onToggleRescued={() => toggleRescued(selected.id)}
                teamStatus={selected.kind === 'team' ? statusOf(selected) : null}
                onToggleTeam={() =>
                  setTeamStatus((prev) => ({
                    ...prev,
                    [selected.id]: statusOf(selected) === 'available' ? 'busy' : 'available',
                  }))
                }
              />
            )}

            <p className="panel-footnote">Click any marker on the map to see its details here.</p>
          </aside>
        </div>
      </main>
    </div>
  )
}

function Detail({ marker, isRescued, onToggleRescued, teamStatus, onToggleTeam }) {
  const isCase = marker.kind === 'case'

  let badgeClass = 'badge-blue'
  let badgeText = teamStatus === 'available' ? 'AVAILABLE' : 'ON A MISSION'
  if (isCase) {
    const fromDrone = marker.source.startsWith('Drone')
    badgeClass = marker.level === 'critical' ? 'badge-red' : 'badge-yellow'
    badgeText =
      marker.level === 'critical'
        ? `CRITICAL · ${fromDrone ? 'DRONE' : 'PHONE CALL'}`
        : 'MODERATE · WEB FORM'
    if (isRescued) {
      badgeClass = 'badge-green'
      badgeText = 'RESCUED'
    }
  }

  return (
    <section className="detail">
      <div className="detail-head">
        <span className="detail-id">{isCase ? `CASE #${marker.id}` : 'RESCUE TEAM'}</span>
        <span className={`badge ${badgeClass}`}>{badgeText}</span>
      </div>
      <h2 className="detail-title">{isCase ? marker.address : marker.id}</h2>

      <dl className="detail-list">
        {detailRows(marker).map(([label, value, isPhone]) => (
          <div key={label} className="detail-row">
            <dt>{label}</dt>
            <dd>{isPhone ? <a href={telHref(value)}>{value}</a> : value}</dd>
          </div>
        ))}
      </dl>

      <div className="detail-summary">
        <h3>{isCase ? 'AI summary' : 'Current task'}</h3>
        <p>{isCase ? marker.summary : marker.task}</p>
      </div>

      <div className="detail-actions">
        {isCase ? (
          <label className="rescued-check">
            <input type="checkbox" checked={isRescued} onChange={onToggleRescued} />
            <span>
              <strong>Mark as rescued</strong>
              <small className={isRescued ? 'is-ok' : ''}>
                Status: {isRescued ? 'rescued' : 'waiting for rescue'}
              </small>
            </span>
          </label>
        ) : (
          <label className="rescued-check">
            <input type="checkbox" checked={teamStatus === 'available'} onChange={onToggleTeam} />
            <span>
              <strong>Available for new case</strong>
              <small className={teamStatus === 'available' ? 'is-ok' : ''}>
                Status: {teamStatus === 'available' ? 'free' : 'busy'}
              </small>
            </span>
          </label>
        )}

        <div className="detail-buttons">
          {marker.phone ? (
            <a href={telHref(marker.phone)} className="btn btn-outline">
              {isCase ? 'Call back' : 'Call team'}
            </a>
          ) : (
            <button type="button" className="btn btn-outline" disabled>
              No phone
            </button>
          )}
          {/* TODO(api): assign / dispatch through the backend */}
          <button type="button" className="btn btn-primary">
            {isCase ? 'Assign team' : 'Send to case'}
          </button>
        </div>
      </div>
    </section>
  )
}
