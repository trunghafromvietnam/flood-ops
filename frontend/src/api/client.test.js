import { describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './client.js'
import * as api from './floodops.js'
import { jsonResponse, mockFetch, RAW_INCIDENTS } from '../test/helpers.js'

describe('request', () => {
  it('returns parsed JSON on success', async () => {
    mockFetch({ 'GET /api/health': () => jsonResponse(200, { status: 'ok' }) })
    await expect(request('/api/health')).resolves.toEqual({ status: 'ok' })
  })

  it('turns FastAPI validation lists into a readable message', async () => {
    mockFetch({
      'POST /api/reports': () =>
        jsonResponse(422, { detail: [{ loc: ['body', 'people_count'], msg: 'must be >= 0' }] }),
    })
    const error = await request('/api/reports', { method: 'POST', json: {} }).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.isValidation).toBe(true)
    expect(error.message).toBe('people_count: must be >= 0')
  })

  it('hides server internals on 5xx', async () => {
    mockFetch({ 'GET /api/incidents': () => jsonResponse(500, { detail: 'Traceback (most recent call last)…' }) })
    const error = await request('/api/incidents').catch((e) => e)
    expect(error.message).not.toMatch(/Traceback/)
    expect(error.status).toBe(500)
  })

  it('reports authorization failures distinctly', async () => {
    mockFetch({ 'GET /api/incidents': () => jsonResponse(403, { detail: 'Forbidden' }) })
    const error = await request('/api/incidents').catch((e) => e)
    expect(error.isAuth).toBe(true)
  })

  it('reports network failures as kind=network', async () => {
    mockFetch({ 'GET /api/incidents': () => new TypeError('Failed to fetch') })
    const error = await request('/api/incidents').catch((e) => e)
    expect(error.kind).toBe('network')
  })

  it('times out slow requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))),
    )
    const error = await request('/api/incidents', { timeoutMs: 10 }).catch((e) => e)
    expect(error.kind).toBe('timeout')
  })

  it('treats a 404 on an unsupported endpoint as an error, never as data', async () => {
    mockFetch({})
    const error = await request('/api/teams').catch((e) => e)
    expect(error.status).toBe(404)
  })
})

describe('floodops endpoints', () => {
  it('lists and normalizes incidents, keeping missing coordinates as null', async () => {
    mockFetch({ 'GET /api/incidents': () => jsonResponse(200, RAW_INCIDENTS) })
    const [a, b] = await api.listIncidents()
    expect(a.coords).toEqual({ lat: 17.4689, lon: 106.6223 })
    expect(a.createdAt.toISOString()).toBe('2026-10-18T01:00:00.000Z')
    expect(b.coords).toBeNull()
    expect(b.peopleCount).toBeNull()
  })

  it('fetches a single incident by encoded id', async () => {
    const fetchMock = mockFetch({ 'GET /api/incidents/INC-AAAA0001': () => jsonResponse(200, RAW_INCIDENTS[0]) })
    const incident = await api.getIncident('INC-AAAA0001')
    expect(incident.id).toBe('INC-AAAA0001')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/incidents/INC-AAAA0001')
  })

  it('submits a report as JSON to POST /api/reports', async () => {
    const fetchMock = mockFetch({ 'POST /api/reports': () => jsonResponse(201, RAW_INCIDENTS[0]) })
    const body = { reporter_type: 'SELF', location: { latitude: null, longitude: null, method: 'MANUAL', address_text: 'x' } }
    const created = await api.createReport(body)
    expect(created.id).toBe('INC-AAAA0001')
    const init = fetchMock.mock.calls[0][1]
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual(body)
  })

  it('sends status updates with PATCH and a null note when empty', async () => {
    const fetchMock = mockFetch({
      'PATCH /api/incidents/INC-AAAA0001/status': () => jsonResponse(200, { ...RAW_INCIDENTS[0], status: 'VERIFIED' }),
    })
    const updated = await api.updateIncidentStatus('INC-AAAA0001', 'VERIFIED', '  ')
    expect(updated.status).toBe('VERIFIED')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ status: 'VERIFIED', note: null })
  })

  it('surfaces a rejected status as an error', async () => {
    mockFetch({ 'PATCH /api/incidents/X/status': () => jsonResponse(400, { detail: 'Invalid status' }) })
    await expect(api.updateIncidentStatus('X', 'BOGUS')).rejects.toThrow('Invalid status')
  })

  it('omits drone coordinates unless both are present', async () => {
    const fetchMock = mockFetch({ 'POST /api/drone/observations': () => jsonResponse(201, { id: 'OBS-1' }) })
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    await api.ingestDroneObservation({ file, latitude: 17.1, longitude: null, platform: 'P' })
    const form = fetchMock.mock.calls[0][1].body
    expect(form.has('latitude')).toBe(false)
    expect(form.get('platform')).toBe('P')
  })
})
