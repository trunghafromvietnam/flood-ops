import { describe, expect, it } from 'vitest'
import { normalizeIncident } from '../api/contracts.js'
import { RAW_INCIDENTS } from '../test/helpers.js'
import { computeMetrics, historyEvents, intakeEvents, teamFreshness } from './derive.js'

const incidents = RAW_INCIDENTS.map(normalizeIncident)

describe('computeMetrics', () => {
  it('computes counts from records and marks unsupported metrics unavailable', () => {
    const metrics = Object.fromEntries(
      computeMetrics({ incidents, teams: null, safetyConfirmations: null }).map((m) => [m.id, m]),
    )
    expect(metrics.new.value).toBe(1)
    expect(metrics.review.value).toBe(1)
    expect(metrics.people.value).toBe(3)
    expect(metrics.people.note).toMatch(/1 open with count unknown/)
    expect(metrics.safe.value).toBeNull()
    expect(metrics.teams.value).toBeNull()
  })

  it('excludes closed incidents from people reported', () => {
    const closed = incidents.map((i) => ({ ...i, status: 'RESOLVED' }))
    const people = computeMetrics({ incidents: closed, teams: null, safetyConfirmations: null }).find((m) => m.id === 'people')
    expect(people.value).toBe(0)
  })
})

describe('activity events', () => {
  it('derives intake events by source without inventing coordinates', () => {
    const events = intakeEvents(incidents, 'LIVE')
    expect(events.map((e) => e.category)).toEqual(['FORM_REPORT', 'PHONE_REPORT'])
    expect(events[1].coords).toBeNull()
    expect(events[0].timeKind).toBe('received')
  })

  it('splits history into intake and status-change events, newest first', () => {
    const history = {
      'INC-AAAA0001': [
        { id: 1, previousStatus: null, newStatus: 'NEW', note: 'created', createdAt: new Date('2026-10-18T01:00:00Z') },
        { id: 2, previousStatus: 'NEW', newStatus: 'VERIFIED', note: 'ok', createdAt: new Date('2026-10-18T03:00:00Z') },
      ],
    }
    const events = historyEvents(incidents, history, 'LIVE')
    expect(events.map((e) => e.category)).toEqual(['STATUS_CHANGE', 'FORM_REPORT'])
    expect(events[0].description).toBe('New → Verified · ok')
  })
})

describe('teamFreshness', () => {
  const now = new Date('2026-01-01T12:00:00Z')
  it('distinguishes current, stale and missing positions', () => {
    expect(teamFreshness({ coords: { lat: 1, lon: 1 }, locationUpdatedAt: new Date('2026-01-01T11:55:00Z') }, now)).toBe('current')
    expect(teamFreshness({ coords: { lat: 1, lon: 1 }, locationUpdatedAt: new Date('2026-01-01T11:00:00Z') }, now)).toBe('stale')
    expect(teamFreshness({ coords: null, locationUpdatedAt: null }, now)).toBe('missing')
  })
})
