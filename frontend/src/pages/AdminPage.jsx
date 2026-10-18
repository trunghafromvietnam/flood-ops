import { useEffect, useRef, useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import MapPlaceholder, { MapMarker } from '../components/MapPlaceholder.jsx'
import { StarIcon } from '../components/Icons.jsx'
import { ADMIN_LINKS } from '../components/navLinks.js'
import { MARKERS } from '../data/mock.js'
import { listIncidents, parseServerTime, updateStatus } from '../api.js'
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
const REFRESH_MS = 10000

// Rescue teams have no backend API yet, so they still come from mock data.
const TEAMS = MARKERS.filter((m) => m.kind === 'team')

const CLOSED_STATUSES = new Set(['RESOLVED', 'REJECTED', 'DUPLICATE'])

function isRescued(marker) {
  return marker.status === 'RESOLVED'
}

function isOpenCase(marker) {
  return marker.kind === 'case' && !CLOSED_STATUSES.has(marker.status)
}

// Status a case goes back to when "rescued" is unticked.
function initialStatus(incident) {
  return incident.reporter_type === 'DRONE' ? 'NEEDS_REVIEW' : 'NEW'
}

function formatReported(createdAt) {
  const date = parseServerTime(createdAt)
  if (!date) return null
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const minutes = Math.max(0, Math.round((Date.now() - date) / 60000))
  const ago = minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} h ago`
  return `${time} · ${ago}`
}

// Matches the map legend: phone calls and drones are critical, web forms moderate.
const CRITICAL_SOURCES = new Set(['PHONE_CALL', 'DRONE'])

const SOURCES = {
  PHONE_CALL: 'Phone call (AI line)',
  DRONE: 'Drone',
  SELF: 'Web form · victim',
  THIRD_PARTY: 'Web form · someone else',
}

// Turn backend incidents into map markers. The map is still a placeholder,
// so coordinates are spread over the box (10–90%) by their bounding box.
// Incidents without coordinates get no x / y and only show up in search.
function toCaseMarkers(incidents) {
  const located = incidents.filter((i) => i.latitude != null && i.longitude != null)
  const lats = located.map((i) => i.latitude)
  const lons = located.map((i) => i.longitude)
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)]
  const [minLon, maxLon] = [Math.min(...lons), Math.max(...lons)]
  const scale = (value, min, max) => (max === min ? 50 : 10 + (80 * (value - min)) / (max - min))

  return incidents.map((i) => {
    const hasCoords = i.latitude != null && i.longitude != null
    return {
      id: i.id,
      kind: 'case',
      level: CRITICAL_SOURCES.has(i.reporter_type) ? 'critical' : 'moderate',
      source: SOURCES[i.reporter_type] ?? i.reporter_type,
      status: i.status,
      initialStatus: initialStatus(i),
      x: hasCoords ? scale(i.longitude, minLon, maxLon) : null,
      y: hasCoords ? 100 - scale(i.latitude, minLat, maxLat) : null,
      address:
        i.address_text ??
        (hasCoords ? `${i.latitude.toFixed(5)}, ${i.longitude.toFixed(5)}` : 'Unknown location'),
      phone: i.phone,
      people: i.people_count != null ? String(i.people_count) : null,
      reported: formatReported(i.created_at),
      description: i.description || 'No description.',
    }
  })
}

function matchesFilter(marker, filter) {
  switch (filter) {
    case 'critical':
      return marker.kind === 'case' && marker.level === 'critical'
    case 'moderate':
      return marker.kind === 'case' && marker.level === 'moderate'
    case 'teams':
      return marker.kind === 'team'
    case 'open':
      return isOpenCase(marker)
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
          ['Status', marker.status],
          ['Phone', marker.phone, true],
          ['People', marker.people],
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
          ['Cases nearby', marker.nearbyCases],
        ]
  return rows.filter(([, value]) => value)
}

// Keep a leading "+" for international numbers, drop spaces and punctuation.
function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export default function AdminPage() {
  const [incidents, setIncidents] = useState([])
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [mapSize, setMapSize] = useState(62)
  const splitRef = useRef(null)

  // Poll the backend so new reports and drone images show up without a reload.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listIncidents()
        if (cancelled) return
        data.sort((a, b) => parseServerTime(b.created_at) - parseServerTime(a.created_at))
        setIncidents(data)
        setLoadError('')
        setSelectedId((id) => id ?? data[0]?.id ?? null)
      } catch (err) {
        if (!cancelled) setLoadError(err.message)
      }
    }
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const markers = [...toCaseMarkers(incidents), ...TEAMS]
  const visible = markers.filter((m) => matchesFilter(m, filter) && matchesQuery(m, query))
  const selected = markers.find((m) => m.id === selectedId)
  const openCases = markers.filter(isOpenCase).length
  const unmapped = markers.filter((m) => m.kind === 'case' && m.x == null).length
  const teamCount = TEAMS.length

  async function toggleRescued(marker) {
    const next = isRescued(marker) ? marker.initialStatus : 'RESOLVED'
    try {
      const updated = await updateStatus(marker.id, next, 'Changed from dispatcher map')
      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    } catch (err) {
      setLoadError(`Could not update ${marker.id}: ${err.message}`)
    }
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
          {unmapped > 0 && ` · ${unmapped} without coordinates (search to find them)`}
        </p>
        {loadError && <p className="form-error">Backend error: {loadError}</p>}

        <div className="admin-split" ref={splitRef} style={{ '--map-size': `${mapSize}%` }}>
          {/* ---------- Map ---------- */}
          <MapPlaceholder className="admin-map">
            {visible.filter((m) => m.x != null).map((m) => (
              <MapMarker
                key={m.id}
                type={m.kind === 'team' ? 'team' : m.level}
                x={m.x}
                y={m.y}
                selected={m.id === selectedId}
                dimmed={isRescued(m)}
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
                isRescued={isRescued(selected)}
                onToggleRescued={() => toggleRescued(selected)}
              />
            )}

            <p className="panel-footnote">Click any marker on the map to see its details here.</p>
          </aside>
        </div>
      </main>
    </div>
  )
}

function Detail({ marker, isRescued, onToggleRescued }) {
  const isCase = marker.kind === 'case'

  let badgeClass = null
  let badgeText = null
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
        {badgeText && <span className={`badge ${badgeClass}`}>{badgeText}</span>}
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
        <h3>{isCase ? 'Description' : 'Current task'}</h3>
        <p>{isCase ? marker.description : marker.task}</p>
      </div>

      <div className="detail-actions">
        {isCase && (
          <label className="rescued-check">
            <input type="checkbox" checked={isRescued} onChange={onToggleRescued} />
            <span>
              <strong>Mark as rescued</strong>
              <small className={isRescued ? 'is-ok' : ''}>
                Status: {isRescued ? 'rescued' : 'waiting for rescue'}
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
        </div>
      </div>
    </section>
  )
}
