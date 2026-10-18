// Operational history. In LIVE mode it is built from GET /api/incidents/{id}/events
// for every incident (there is no global event endpoint); the first event of each
// incident is its intake, later ones are status changes.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import ActivityList from '../../components/ActivityList.jsx'
import StateMessage from '../../components/StateMessage.jsx'
import { EVENT_CATEGORY_LABELS, formatCoords, formatDateTime, MODE_LABELS } from '../../lib/formatters.js'
import { historyEvents } from '../../lib/derive.js'
import { useOps } from '../../state/OpsData.jsx'

const CONCURRENCY = 4
const RANGES = [
  { value: '', label: 'Any time' },
  { value: '60', label: 'Last hour' },
  { value: '360', label: 'Last 6 hours' },
  { value: '1440', label: 'Last 24 hours' },
]

async function loadAllHistory(incidents, loadHistory, signal) {
  const results = {}
  let failed = 0
  const queue = [...incidents]
  async function worker() {
    while (queue.length) {
      const incident = queue.shift()
      try {
        results[incident.id] = await loadHistory(incident.id, { signal })
      } catch (error) {
        if (error.kind === 'aborted') throw error
        failed += 1
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return { results, failed }
}

function useLiveHistory() {
  const { dataset, loadHistory } = useOps()
  const [state, setState] = useState({ loading: false, events: null, failed: 0, loadedAt: null })
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const ready = dataset.mode === 'LIVE' && dataset.loaded
  const incidentKey = dataset.incidents.map((i) => `${i.id}:${i.updatedAt?.getTime()}`).join('|')

  useEffect(() => {
    if (!ready) return undefined
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true }))
    loadAllHistory(dataset.incidents, loadHistory, controller.signal)
      .then(({ results, failed }) =>
        setState({ loading: false, events: historyEvents(dataset.incidents, results, 'LIVE'), failed, loadedAt: new Date() }),
      )
      .catch(() => {})
    return () => controller.abort()
    // Reload when incidents change or on demand, not on every render.
  }, [ready, incidentKey, version])

  return { ...state, reload }
}

export default function ActivityLogPage() {
  const { dataset } = useOps()
  const live = useLiveHistory()
  const [categories, setCategories] = useState(() => new Set(Object.keys(EVENT_CATEGORY_LABELS)))
  const [query, setQuery] = useState('')
  const [range, setRange] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const allEvents = dataset.mode === 'LIVE' ? live.events ?? [] : dataset.activity
  const events = useMemo(() => {
    const q = query.trim().toLowerCase()
    const since = range ? dataset.clock.getTime() - Number(range) * 60000 : null
    return allEvents.filter(
      (e) =>
        categories.has(e.category) &&
        (!since || (e.time && e.time.getTime() >= since)) &&
        (!q || [e.description, e.incidentId, e.teamId, e.source].filter(Boolean).some((v) => v.toLowerCase().includes(q))),
    )
  }, [allEvents, categories, query, range, dataset.clock])
  const selected = allEvents.find((e) => e.id === selectedId)

  function toggleCategory(id) {
    setCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  let body
  if (dataset.mode === 'LIVE' && !dataset.loaded) {
    body = dataset.error ? (
      <StateMessage kind="error" title="Activity could not be loaded.">
        {dataset.error.message}
      </StateMessage>
    ) : (
      <StateMessage kind="loading" title="Loading incidents…" />
    )
  } else if (dataset.mode === 'LIVE' && live.events === null) {
    body = <StateMessage kind="loading" title="Loading event history…" />
  } else if (allEvents.length === 0) {
    body = <StateMessage kind="empty" title={dataset.mode === 'REPLAY' ? 'Replay not started.' : 'No events recorded.'} />
  } else if (events.length === 0) {
    body = <StateMessage kind="empty" title="No events match these filters." />
  } else {
    body = <ActivityList events={events} selectedId={selectedId} onSelect={(e) => setSelectedId(e.id)} />
  }

  return (
    <div className={`list-page${selected ? ' has-drawer' : ''}`}>
      <div className="list-main">
        <div className="page-title-row">
          <h1 className="page-heading">Activity Log</h1>
          {dataset.mode === 'LIVE' && (
            <button type="button" className="btn btn-secondary btn-small" onClick={live.reload} disabled={live.loading}>
              <RefreshCw size={14} aria-hidden="true" className={live.loading ? 'spin' : ''} /> Reload history
            </button>
          )}
        </div>
        {dataset.mode === 'LIVE' && (
          <p className="muted small">
            Built from each incident&apos;s status history. Safety confirmations are not recorded by the backend, so
            that category is empty in live mode. Refreshed by polling, not pushed.
          </p>
        )}
        {live.failed > 0 && dataset.mode === 'LIVE' && (
          <StateMessage kind="error" title={`History for ${live.failed} incident(s) could not be loaded. The log is incomplete.`} />
        )}

        <div className="filters">
          <label className="field-inline grow">
            <span>Search</span>
            <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Text, incident or team ID" />
          </label>
          <label className="field-inline">
            <span>Time</span>
            <select className="input" value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="chip-group">
            <legend className="visually-hidden">Event categories</legend>
            {Object.entries(EVENT_CATEGORY_LABELS).map(([id, label]) => (
              <label key={id} className={`chip${categories.has(id) ? ' is-active' : ''}`}>
                <input type="checkbox" checked={categories.has(id)} onChange={() => toggleCategory(id)} />
                {label}
              </label>
            ))}
          </fieldset>
        </div>

        {body}
      </div>

      {selected && (
        <aside className="drawer" aria-label="Event details">
          <EventDetail event={selected} onClose={() => setSelectedId(null)} />
        </aside>
      )}
    </div>
  )
}

const TIME_KIND_LABELS = {
  received: 'Received by the server',
  recorded: 'Recorded by the server',
  scenario: 'Scenario time (synthetic)',
}

function EventDetail({ event, onClose }) {
  return (
    <article className="incident-detail">
      <div className="detail-header">
        <div>
          <p className="detail-kicker">{EVENT_CATEGORY_LABELS[event.category]}</p>
          <h2 className="detail-title">{event.id}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close details" title="Close details">
          ×
        </button>
      </div>
      <dl className="detail-list">
        <div>
          <dt>{TIME_KIND_LABELS[event.timeKind]}</dt>
          <dd>{formatDateTime(event.time)}</dd>
        </div>
        <div>
          <dt>Event time at source</dt>
          <dd className="muted">Not provided</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{event.source}</dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd className="pre-wrap">{event.description}</dd>
        </div>
        {event.incidentId && (
          <div>
            <dt>Incident</dt>
            <dd>
              <Link to={`/ops?incident=${encodeURIComponent(event.incidentId)}`}>{event.incidentId}</Link>
            </dd>
          </div>
        )}
        {event.teamId && (
          <div>
            <dt>Team</dt>
            <dd>
              <Link to={`/ops/teams?team=${encodeURIComponent(event.teamId)}`}>{event.teamId}</Link>
            </dd>
          </div>
        )}
        <div>
          <dt>Coordinates</dt>
          <dd>{formatCoords(event.coords)}</dd>
        </div>
        <div>
          <dt>Operating mode</dt>
          <dd>{MODE_LABELS[event.mode]}</dd>
        </div>
      </dl>
      {event.coords && event.incidentId && (
        <Link className="btn btn-secondary btn-small" to={`/ops/map?incident=${encodeURIComponent(event.incidentId)}`}>
          Show on map
        </Link>
      )}
    </article>
  )
}
