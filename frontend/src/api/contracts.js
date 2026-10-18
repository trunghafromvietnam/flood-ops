// Shapes and enum values confirmed against backend/app/main.py and backend/app/models/.
// See docs/API_CONTRACT.md. Do not add values here that the backend does not define.

// ReportCreate.reporter_type pattern ^(SELF|THIRD_PARTY)$.
// DRONE and PHONE_CALL are set by the backend for drone ingestion and voice calls.
export const REPORTER_TYPES = ['SELF', 'THIRD_PARTY', 'PHONE_CALL', 'DRONE']

// ALLOWED_STATUSES in main.py. The backend accepts any transition between them.
export const STATUSES = ['NEW', 'NEEDS_REVIEW', 'VERIFIED', 'ASSIGNED', 'RESOLVED', 'REJECTED', 'DUPLICATE']
export const CLOSED_STATUSES = new Set(['RESOLVED', 'REJECTED', 'DUPLICATE'])

// LocationInput.method is a free string; these are the values the backend documents or sets.
export const LOCATION_METHODS = ['GPS', 'MAP_PIN', 'MANUAL', 'DRONE_ESTIMATE', 'VOICE', 'UNKNOWN']

export const LIMITS = {
  descriptionMax: 2000, // ReportCreate.description max_length
  phoneMax: 32,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp'], // evidence + drone upload
  // The backend sets no size limit; this is a frontend-only guard.
  imageMaxBytes: 10 * 1024 * 1024,
}

// Same rule as ReportCreate.phone.
export const PHONE_PATTERN = /^\+?[0-9 ().-]{6,31}$/

// SQLite drops the timezone, so the backend sends UTC times without a "Z".
export function parseServerTime(value) {
  if (!value) return null
  const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function finiteOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// Coordinates are used only when both are present, finite and in range.
export function toCoords(latitude, longitude) {
  const lat = finiteOrNull(latitude)
  const lon = finiteOrNull(longitude)
  if (lat === null || lon === null) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}

// Backend Incident -> the record shape every view uses.
export function normalizeIncident(raw) {
  return {
    id: String(raw.id),
    description: raw.description ?? '',
    peopleCount: Number.isInteger(raw.people_count) ? raw.people_count : null,
    phone: raw.phone ?? null,
    reporterType: raw.reporter_type ?? 'UNKNOWN',
    status: raw.status ?? 'UNKNOWN',
    coords: toCoords(raw.latitude, raw.longitude),
    locationMethod: raw.location_method ?? null,
    addressText: raw.address_text ?? null,
    createdAt: parseServerTime(raw.created_at),
    updatedAt: parseServerTime(raw.updated_at),
  }
}

export function normalizeIncidentEvent(raw) {
  return {
    id: raw.id,
    incidentId: raw.incident_id,
    previousStatus: raw.previous_status ?? null,
    newStatus: raw.new_status,
    note: raw.note ?? null,
    createdAt: parseServerTime(raw.created_at),
  }
}

// storage_key is a server path: deliberately not exposed to the UI.
export function normalizeEvidence(raw) {
  return {
    id: raw.id,
    incidentId: raw.incident_id,
    filename: raw.filename,
    contentType: raw.content_type,
    createdAt: parseServerTime(raw.created_at),
  }
}
