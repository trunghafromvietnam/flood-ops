// Values computed from records: metrics, activity events, team freshness, search.
// Pure functions so the same rules apply to live, simulation and replay data.

import { CLOSED_STATUSES } from '../api/contracts.js'
import { sourceLabel, statusLabel, locationSummary } from './formatters.js'

export const TEAM_STALE_AFTER_MIN = 15

export function categoryForReporter(reporterType) {
  switch (reporterType) {
    case 'SELF':
    case 'THIRD_PARTY':
      return 'FORM_REPORT'
    case 'PHONE_CALL':
      return 'PHONE_REPORT'
    case 'DRONE':
      return 'DRONE_OBSERVATION'
    default:
      return 'FORM_REPORT'
  }
}

export function isOpen(incident) {
  return !CLOSED_STATUSES.has(incident.status)
}

// Metric definitions are listed in docs/FRONTEND_ARCHITECTURE.md.
// value === null means "cannot be calculated from the available data".
export function computeMetrics({ incidents, teams, safetyConfirmations }) {
  const open = incidents.filter(isOpen)
  const known = open.filter((i) => Number.isInteger(i.peopleCount))
  const unknownPeople = open.length - known.length

  return [
    {
      id: 'new',
      label: 'New reports',
      value: incidents.filter((i) => i.status === 'NEW').length,
      definition: 'Incidents with status NEW.',
    },
    {
      id: 'review',
      label: 'Awaiting review',
      value: incidents.filter((i) => i.status === 'NEEDS_REVIEW').length,
      definition: 'Incidents with status NEEDS_REVIEW (drone observations start here).',
    },
    {
      id: 'people',
      label: 'People reported',
      value: known.reduce((sum, i) => sum + i.peopleCount, 0),
      note: unknownPeople > 0 ? `+ ${unknownPeople} open with count unknown` : null,
      definition:
        'Sum of people_count on open incidents (not RESOLVED, REJECTED or DUPLICATE). Reported by senders, not verified; duplicates may overlap.',
    },
    {
      id: 'safe',
      label: 'Confirmed safe today',
      value: safetyConfirmations
        ? safetyConfirmations.reduce((sum, e) => sum + (e.peopleSafe ?? 0), 0)
        : null,
      definition: 'People confirmed safe by safety-confirmation events today.',
      unavailable: safetyConfirmations ? null : 'The backend has no safety-confirmation data.',
    },
    {
      id: 'teams',
      label: 'Active rescue teams',
      value: teams ? teams.filter((t) => t.status !== 'OFF_DUTY').length : null,
      definition: 'Teams whose latest status is not OFF_DUTY.',
      unavailable: teams ? null : 'The backend has no rescue-team data.',
    },
  ]
}

// One intake event per incident, timed by when the server received it.
export function intakeEvents(incidents, mode) {
  return incidents.map((incident) => ({
    id: `intake-${incident.id}`,
    category: categoryForReporter(incident.reporterType),
    time: incident.createdAt,
    timeKind: 'received',
    description: incident.description || 'No description provided.',
    source: sourceLabel(incident.reporterType),
    incidentId: incident.id,
    teamId: null,
    coords: incident.coords,
    location: locationSummary(incident),
    status: incident.status,
    mode,
  }))
}

// Status history from GET /api/incidents/{id}/events. The first event of each
// incident (previous_status null) is its intake; later ones are status changes.
export function historyEvents(incidents, eventsByIncident, mode) {
  const byId = new Map(incidents.map((i) => [i.id, i]))
  const out = []
  for (const [incidentId, events] of Object.entries(eventsByIncident)) {
    const incident = byId.get(incidentId)
    if (!incident) continue
    for (const event of events) {
      const isIntake = event.previousStatus == null
      out.push({
        id: `event-${event.id}`,
        category: isIntake ? categoryForReporter(incident.reporterType) : 'STATUS_CHANGE',
        time: event.createdAt,
        timeKind: 'recorded',
        description: isIntake
          ? incident.description || event.note || 'Incident created.'
          : `${statusLabel(event.previousStatus)} → ${statusLabel(event.newStatus)}${event.note ? ` · ${event.note}` : ''}`,
        source: isIntake ? sourceLabel(incident.reporterType) : 'Operator status update',
        incidentId,
        teamId: null,
        coords: incident.coords,
        location: locationSummary(incident),
        status: event.newStatus,
        note: event.note,
        mode,
      })
    }
  }
  return sortEventsNewestFirst(out)
}

export function sortEventsNewestFirst(events) {
  return [...events].sort((a, b) => (b.time?.getTime() ?? 0) - (a.time?.getTime() ?? 0))
}

// 'current' | 'stale' | 'missing'
export function teamFreshness(team, now) {
  if (!team.coords || !team.locationUpdatedAt) return 'missing'
  const ageMin = (now - team.locationUpdatedAt) / 60000
  return ageMin > TEAM_STALE_AFTER_MIN ? 'stale' : 'current'
}

export function matchesIncidentQuery(incident, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [incident.id, incident.addressText, incident.description, incident.phone]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(q))
}

export function matchesTeamQuery(team, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [team.id, team.name].filter(Boolean).some((v) => v.toLowerCase().includes(q))
}
