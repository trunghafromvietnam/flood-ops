// Thin wrappers around the FastAPI backend (see backend/app/main.py).
// In dev, Vite proxies /api to http://127.0.0.1:8000 (vite.config.js).

// Image types the backend accepts for evidence uploads.
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

async function request(path, options) {
  const res = await fetch(path, options)
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(errorMessage(body, res.status))
  return body
}

// FastAPI returns `detail` as a string (our own errors) or a list (validation errors).
function errorMessage(body, status) {
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join('; ')
  return `Request failed (${status})`
}

function sendJson(method, path, data) {
  return request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// SQLite drops the timezone, so the backend sends UTC times without a "Z".
export function parseServerTime(value) {
  if (!value) return null
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
}

export function createReport(report) {
  return sendJson('POST', '/api/reports', report)
}

export function listIncidents() {
  return request('/api/incidents')
}

export function updateStatus(incidentId, status, note) {
  return sendJson('PATCH', `/api/incidents/${incidentId}/status`, { status, note })
}

export function listEvents(incidentId) {
  return request(`/api/incidents/${incidentId}/events`)
}

export function uploadEvidence(incidentId, file) {
  const form = new FormData()
  form.append('file', file)
  return request(`/api/incidents/${incidentId}/evidence`, { method: 'POST', body: form })
}
