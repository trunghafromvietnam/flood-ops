// Chronological event list. Selecting an event reports it to the parent, which
// focuses the map only when the event has real coordinates.

import { Activity, Camera, FileText, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { eventCategoryLabel, formatDateTime, formatTime, statusLabel, verificationLabel } from '../lib/formatters.js'
import { SimulatedTag } from './StatusBadge.jsx'

const CATEGORY_ICONS = {
  FORM_REPORT: FileText,
  PHONE_REPORT: Phone,
  DRONE_OBSERVATION: Camera,
  SAFETY_CONFIRMATION: ShieldCheck,
  STATUS_CHANGE: Activity,
}

const TIME_KIND = {
  received: 'received',
  recorded: 'recorded',
  scenario: 'scenario time',
}

export default function ActivityList({ events, selectedId, onSelect, compact = false }) {
  return (
    <ol className={`activity-list${compact ? ' is-compact' : ''}`}>
      {events.map((event) => {
        const Icon = CATEGORY_ICONS[event.category] ?? Activity
        const selected = event.id === selectedId
        return (
          <li key={event.id}>
            <button
              type="button"
              className={`activity-item${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelect?.(event)}
            >
              <span className={`activity-icon cat-${event.category.toLowerCase()}`} aria-hidden="true">
                <Icon size={15} />
              </span>
              <span className="activity-main">
                <span className="activity-top">
                  <strong>{eventCategoryLabel(event.category)}</strong>
                  <time dateTime={event.time?.toISOString()} title={`${formatDateTime(event.time)} (${TIME_KIND[event.timeKind]})`}>
                    {formatTime(event.time)}
                  </time>
                </span>
                <span className="activity-desc">{event.description}</span>
                <span className="activity-meta">
                  {event.incidentId && <span>{event.incidentId}</span>}
                  {event.teamId && <span>{event.teamId}</span>}
                  {!compact && <span>{event.source}</span>}
                  {event.status && <span>{event.category === 'STATUS_CHANGE' ? statusLabel(event.status) : verificationLabel(event.status)}</span>}
                  {event.coords ? (
                    <span className="has-coords">
                      <MapPin size={12} aria-hidden="true" /> on map
                    </span>
                  ) : (
                    <span className="no-coords">no coordinates</span>
                  )}
                  {event.mode !== 'LIVE' && <SimulatedTag />}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
