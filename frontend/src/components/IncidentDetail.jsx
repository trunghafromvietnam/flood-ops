// One incident: reported facts (labelled as reported), workflow status,
// evidence references, status history and the status-change action.

import { useEffect, useState } from 'react'
import { MapPin, Phone, X } from 'lucide-react'
import { STATUSES } from '../api/contracts.js'
import { useOps } from '../state/OpsData.jsx'
import {
  formatCoords,
  formatDateTime,
  formatPeople,
  locationMethodLabel,
  sourceLabel,
  statusLabel,
  verificationLabel,
} from '../lib/formatters.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import StateMessage from './StateMessage.jsx'
import StatusBadge, { Badge, SimulatedTag } from './StatusBadge.jsx'

function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

function useIncidentRecords(loader, incident) {
  const [state, setState] = useState({ loading: true, items: [], error: null })
  const id = incident.id
  const version = incident.updatedAt?.getTime() ?? 0
  useEffect(() => {
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    loader(id, { signal: controller.signal })
      .then((items) => setState({ loading: false, items, error: null }))
      .catch((error) => {
        if (error.kind !== 'aborted') setState({ loading: false, items: [], error })
      })
    return () => controller.abort()
  }, [loader, id, version])
  return state
}

export default function IncidentDetail({ incident, onClose, onViewOnMap, headingLevel = 2 }) {
  const { dataset } = useOps()
  const Heading = `h${headingLevel}`

  return (
    <article className="incident-detail" aria-label={`Incident ${incident.id}`}>
      <header className="detail-header">
        <div>
          <p className="detail-kicker">{sourceLabel(incident.reporterType)}</p>
          <Heading className="detail-title">{incident.id}</Heading>
        </div>
        {onClose && (
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close details" title="Close details">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="badge-row">
        <StatusBadge status={incident.status} />
        <Badge tone="outline">{verificationLabel(incident.status)}</Badge>
        {!incident.coords && <Badge tone="warning">Location unresolved</Badge>}
        {incident.simulated && <SimulatedTag />}
      </div>

      <dl className="detail-list">
        <div>
          <dt>Received</dt>
          <dd title="Time the server recorded the report. The time of the event itself is not provided.">
            {formatDateTime(incident.createdAt)}
          </dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatDateTime(incident.updatedAt)}</dd>
        </div>
        <div>
          <dt>Reported location</dt>
          <dd>
            {incident.addressText && <span className="block">{incident.addressText}</span>}
            <span className="block">{formatCoords(incident.coords)}</span>
            <span className="muted block">{locationMethodLabel(incident.locationMethod)}</span>
          </dd>
        </div>
        <div>
          <dt>People needing help</dt>
          <dd>
            {formatPeople(incident.peopleCount)} <span className="muted">(reported)</span>
          </dd>
        </div>
        <div>
          <dt>Reported severity</dt>
          <dd className="muted">Not a stored field. Check the description.</dd>
        </div>
        {incident.phone && (
          <div>
            <dt>Call-back phone</dt>
            <dd>
              <a href={telHref(incident.phone)}>{incident.phone}</a>
            </dd>
          </div>
        )}
      </dl>

      <section className="detail-section">
        <h3 className="section-label">Description (as reported)</h3>
        <p className="detail-description">{incident.description || 'No description provided.'}</p>
      </section>

      <div className="detail-buttons">
        {incident.coords && onViewOnMap && (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => onViewOnMap(incident)}>
            <MapPin size={14} aria-hidden="true" /> View on map
          </button>
        )}
        {incident.phone && (
          <a className="btn btn-secondary btn-small" href={telHref(incident.phone)}>
            <Phone size={14} aria-hidden="true" /> Call back
          </a>
        )}
      </div>

      <StatusChange incident={incident} readOnly={dataset.readOnly} />
      <EvidenceSection incident={incident} />
      <HistorySection incident={incident} />
    </article>
  )
}

function StatusChange({ incident, readOnly }) {
  const { updateStatus } = useOps()
  const [next, setNext] = useState('')
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { kind: 'error' | 'ok', text }

  useEffect(() => {
    setNext('')
    setNote('')
    setMessage(null)
  }, [incident.id])

  if (readOnly) {
    return (
      <section className="detail-section">
        <h3 className="section-label">Status</h3>
        <p className="muted">Status changes are disabled in simulation and replay. Nothing is sent to the backend.</p>
      </section>
    )
  }

  async function confirm() {
    setBusy(true)
    setMessage(null)
    try {
      const updated = await updateStatus(incident.id, next, note)
      setMessage({ kind: 'ok', text: `Server confirmed status ${statusLabel(updated.status)}.` })
      setNext('')
      setNote('')
    } catch (error) {
      setMessage({ kind: 'error', text: error.message })
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <section className="detail-section">
      <h3 className="section-label">Change status</h3>
      <form
        className="status-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (next) setConfirming(true)
        }}
      >
        <label className="field-inline">
          <span>New status</span>
          <select className="input" value={next} onChange={(e) => setNext(e.target.value)}>
            <option value="">Choose…</option>
            {STATUSES.filter((s) => s !== incident.status).map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="field-inline">
          <span>Note (optional)</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </label>
        <button type="submit" className="btn btn-primary btn-small" disabled={!next || busy}>
          Update status
        </button>
      </form>
      {message && (
        <p className={message.kind === 'error' ? 'form-error' : 'form-ok'} role={message.kind === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
      {confirming && (
        <ConfirmDialog
          title={`Change ${incident.id} status?`}
          confirmLabel="Change status"
          busy={busy}
          onConfirm={confirm}
          onCancel={() => setConfirming(false)}
        >
          <p>
            {statusLabel(incident.status)} → <strong>{statusLabel(next)}</strong>
          </p>
          <p className="muted">This is recorded in the incident history on the server.</p>
        </ConfirmDialog>
      )}
    </section>
  )
}

function EvidenceSection({ incident }) {
  const { loadEvidence } = useOps()
  const { loading, items, error } = useIncidentRecords(loadEvidence, incident)
  return (
    <section className="detail-section">
      <h3 className="section-label">Evidence</h3>
      {loading ? (
        <StateMessage kind="loading" title="Loading evidence…" />
      ) : error ? (
        <StateMessage kind="error" title="Evidence could not be loaded.">
          {error.message}
        </StateMessage>
      ) : items.length === 0 ? (
        <p className="muted">No evidence attached.</p>
      ) : (
        <ul className="plain-list">
          {items.map((e) => (
            <li key={e.id}>
              <strong>{e.filename}</strong> <span className="muted">· {e.contentType} · received {formatDateTime(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function HistorySection({ incident }) {
  const { loadHistory } = useOps()
  const { loading, items, error } = useIncidentRecords(loadHistory, incident)
  return (
    <section className="detail-section">
      <h3 className="section-label">Status history</h3>
      {loading ? (
        <StateMessage kind="loading" title="Loading history…" />
      ) : error ? (
        <StateMessage kind="error" title="History could not be loaded.">
          {error.message}
        </StateMessage>
      ) : items.length === 0 ? (
        <p className="muted">No history recorded.</p>
      ) : (
        <ol className="timeline">
          {items.map((e) => (
            <li key={e.id}>
              <span className="timeline-time">{formatDateTime(e.createdAt)}</span>
              <span>
                {e.previousStatus ? `${statusLabel(e.previousStatus)} → ` : 'Created as '}
                {statusLabel(e.newStatus)}
              </span>
              {e.note && <span className="muted block">{e.note}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
