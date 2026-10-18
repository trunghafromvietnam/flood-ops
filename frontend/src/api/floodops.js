// FloodOps backend endpoints. The only module that knows API paths.
// Each function maps 1:1 to a route in backend/app/main.py.

import { request } from './client.js'
import { normalizeEvidence, normalizeIncident, normalizeIncidentEvent } from './contracts.js'

const enc = encodeURIComponent

export function getHealth(options) {
  return request('/api/health', options)
}

// body: ReportCreate { description?, people_count?, phone?, reporter_type, location? }
export async function createReport(body, options) {
  return normalizeIncident(await request('/api/reports', { ...options, method: 'POST', json: body }))
}

// No pagination or filters on the backend: always the full list.
export async function listIncidents(options) {
  const data = await request('/api/incidents', options)
  return Array.isArray(data) ? data.map(normalizeIncident) : []
}

export async function getIncident(id, options) {
  return normalizeIncident(await request(`/api/incidents/${enc(id)}`, options))
}

export async function updateIncidentStatus(id, status, note, options) {
  const json = { status, note: note?.trim() ? note.trim() : null }
  return normalizeIncident(
    await request(`/api/incidents/${enc(id)}/status`, { ...options, method: 'PATCH', json }),
  )
}

export async function listIncidentEvents(id, options) {
  const data = await request(`/api/incidents/${enc(id)}/events`, options)
  return Array.isArray(data) ? data.map(normalizeIncidentEvent) : []
}

export async function listIncidentEvidence(id, options) {
  const data = await request(`/api/incidents/${enc(id)}/evidence`, options)
  return Array.isArray(data) ? data.map(normalizeEvidence) : []
}

export function uploadIncidentEvidence(id, file, options) {
  const form = new FormData()
  form.append('file', file)
  return request(`/api/incidents/${enc(id)}/evidence`, { ...options, method: 'POST', form })
}

// Multipart: file, latitude?, longitude?, platform?, note?
export function ingestDroneObservation({ file, latitude, longitude, platform, note }, options) {
  const form = new FormData()
  form.append('file', file)
  if (latitude != null && longitude != null) {
    form.append('latitude', String(latitude))
    form.append('longitude', String(longitude))
  }
  if (platform) form.append('platform', platform)
  if (note) form.append('note', note)
  return request('/api/drone/observations', { ...options, method: 'POST', form })
}
