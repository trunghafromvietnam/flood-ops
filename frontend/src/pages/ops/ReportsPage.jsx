// Searchable, filterable incident list with a detail drawer.
// Filters run client-side on the full list: the backend has no query parameters.
// Filter values live in the URL so Back returns to the same filtered list.

import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { REPORTER_TYPES, STATUSES } from '../../api/contracts.js'
import IncidentDetail from '../../components/IncidentDetail.jsx'
import StateMessage from '../../components/StateMessage.jsx'
import StatusBadge, { SimulatedTag } from '../../components/StatusBadge.jsx'
import { matchesIncidentQuery } from '../../lib/derive.js'
import {
  formatDateTime,
  formatTime,
  locationSummary,
  sourceLabel,
  statusLabel,
  verificationLabel,
} from '../../lib/formatters.js'
import { useOps } from '../../state/OpsData.jsx'

function startOfDay(text) {
  const d = text ? new Date(`${text}T00:00:00`) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

export function filterIncidents(incidents, { q, status, source, location, from, to }) {
  const fromDate = startOfDay(from)
  const toDate = startOfDay(to)
  const toEnd = toDate ? new Date(toDate.getTime() + 86400000) : null
  return incidents.filter((i) => {
    if (!matchesIncidentQuery(i, q ?? '')) return false
    if (status && i.status !== status) return false
    if (source && i.reporterType !== source) return false
    if (location === 'mapped' && !i.coords) return false
    if (location === 'unmapped' && i.coords) return false
    if (fromDate && (!i.createdAt || i.createdAt < fromDate)) return false
    if (toEnd && (!i.createdAt || i.createdAt >= toEnd)) return false
    return true
  })
}

export default function ReportsPage() {
  const { dataset, refresh } = useOps()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const filters = {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    source: params.get('source') ?? '',
    location: params.get('location') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  }
  const selectedId = params.get('incident')
  const selected = selectedId ? dataset.incidents.find((i) => i.id === selectedId) : null

  function setParam(name, value) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(name, value)
        else next.delete(name)
        return next
      },
      { replace: name !== 'incident' },
    )
  }

  const filterKey = params.toString()
  // `filters` is rebuilt from the URL each render; filterKey is its stable identity.
  const rows = useMemo(() => filterIncidents(dataset.incidents, filters), [dataset.incidents, filterKey])
  const anyFilter = Object.values(filters).some(Boolean)

  let body
  if (!dataset.loaded && dataset.loading) body = <StateMessage kind="loading" title="Loading reports…" />
  else if (!dataset.loaded && dataset.error?.isAuth)
    body = <StateMessage kind="denied" title="You are not authorised to view reports." />
  else if (!dataset.loaded && dataset.error)
    body = (
      <StateMessage kind="error" title="Reports could not be loaded.">
        {dataset.error.message} This does not mean there are no reports.
      </StateMessage>
    )
  else if (dataset.incidents.length === 0)
    body = (
      <StateMessage kind="empty" title="No reports found.">
        {dataset.mode === 'LIVE' ? 'The backend returned an empty list.' : 'The replay has not reached any report yet.'}
      </StateMessage>
    )
  else if (rows.length === 0) body = <StateMessage kind="empty" title="No reports match these filters." />
  else
    body = (
      <div className="table-wrap">
        <table className="data-table">
          <caption className="visually-hidden">Incident reports</caption>
          <thead>
            <tr>
              <th scope="col">Incident</th>
              <th scope="col">Received</th>
              <th scope="col">Location</th>
              <th scope="col">Source</th>
              <th scope="col">Status</th>
              <th scope="col">Verification</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className={i.id === selectedId ? 'is-selected' : ''}>
                <th scope="row">
                  <button type="button" className="row-button" onClick={() => setParam('incident', i.id)}>
                    {i.id}
                  </button>
                  {i.simulated && <SimulatedTag />}
                </th>
                <td title={formatDateTime(i.createdAt)}>
                  {formatTime(i.createdAt)}
                  <span className="muted block small">{formatDateTime(i.createdAt).split(',')[0]}</span>
                </td>
                <td>
                  <span className="cell-clip">{locationSummary(i)}</span>
                  {!i.coords && <span className="muted block small">No coordinates</span>}
                </td>
                <td>{sourceLabel(i.reporterType)}</td>
                <td>
                  <StatusBadge status={i.status} />
                </td>
                <td>{verificationLabel(i.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

  return (
    <div className={`list-page${selected ? ' has-drawer' : ''}`}>
      <div className="list-main">
        <div className="page-title-row">
          <h1 className="page-heading">Reports</h1>
          {dataset.mode === 'LIVE' && (
            <button type="button" className="btn btn-secondary btn-small" onClick={refresh} disabled={dataset.loading}>
              <RefreshCw size={14} aria-hidden="true" className={dataset.loading ? 'spin' : ''} /> Refresh
            </button>
          )}
          {dataset.lastSuccess && <span className="muted small">Updated {formatTime(dataset.lastSuccess)}</span>}
        </div>

        <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
          <label className="field-inline grow">
            <span>Search</span>
            <input
              className="input"
              type="search"
              placeholder="ID, place, description or phone"
              value={filters.q}
              onChange={(e) => setParam('q', e.target.value)}
            />
          </label>
          <label className="field-inline">
            <span>Status</span>
            <select className="input" value={filters.status} onChange={(e) => setParam('status', e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-inline">
            <span>Source</span>
            <select className="input" value={filters.source} onChange={(e) => setParam('source', e.target.value)}>
              <option value="">All</option>
              {REPORTER_TYPES.map((s) => (
                <option key={s} value={s}>
                  {sourceLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-inline">
            <span>Location</span>
            <select className="input" value={filters.location} onChange={(e) => setParam('location', e.target.value)}>
              <option value="">All</option>
              <option value="mapped">Has coordinates</option>
              <option value="unmapped">No coordinates</option>
            </select>
          </label>
          <label className="field-inline">
            <span>From</span>
            <input className="input" type="date" value={filters.from} onChange={(e) => setParam('from', e.target.value)} />
          </label>
          <label className="field-inline">
            <span>To</span>
            <input className="input" type="date" value={filters.to} onChange={(e) => setParam('to', e.target.value)} />
          </label>
          {anyFilter && (
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => setParams(selectedId ? { incident: selectedId } : {}, { replace: true })}
            >
              Clear filters
            </button>
          )}
        </form>
        <p className="muted small">
          Showing {rows.length} of {dataset.incidents.length}. There is no severity filter: the backend stores no
          severity field.
        </p>

        {body}
      </div>

      {selectedId && (
        <aside className="drawer" aria-label="Incident details">
          {selected ? (
            <IncidentDetail
              incident={selected}
              onClose={() => setParam('incident', '')}
              onViewOnMap={(i) => navigate(`/ops/map?incident=${encodeURIComponent(i.id)}`)}
            />
          ) : (
            <StateMessage kind="unavailable" title={`Incident ${selectedId} is not in the current data.`} />
          )}
        </aside>
      )}
    </div>
  )
}
