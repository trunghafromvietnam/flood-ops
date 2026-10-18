// Display labels and formatting. Unknown values are shown as such, never guessed.

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })

export function formatDateTime(date) {
  return date instanceof Date && !Number.isNaN(date.getTime()) ? dateTimeFormat.format(date) : 'Not available'
}

export function formatTime(date) {
  return date instanceof Date && !Number.isNaN(date.getTime()) ? timeFormat.format(date) : '—'
}

export function formatRelative(date, now = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'unknown time'
  const minutes = Math.round((now - date) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.floor(hours / 24)} days ago`
}

export function formatCoords(coords) {
  return coords ? `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}` : 'No coordinates'
}

export function formatPeople(count) {
  return Number.isInteger(count) ? String(count) : 'Unknown'
}

const STATUS_LABELS = {
  NEW: 'New',
  NEEDS_REVIEW: 'Needs review',
  VERIFIED: 'Verified',
  ASSIGNED: 'Assigned',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
  DUPLICATE: 'Duplicate',
}

// tone drives colour; the text label is always shown alongside it.
const STATUS_TONES = {
  NEW: 'critical',
  NEEDS_REVIEW: 'warning',
  VERIFIED: 'info',
  ASSIGNED: 'info',
  RESOLVED: 'success',
  REJECTED: 'neutral',
  DUPLICATE: 'neutral',
}

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? `Unknown status (${status ?? 'none'})`
}

export function statusTone(status) {
  return STATUS_TONES[status] ?? 'neutral'
}

// Verification is derived from the workflow status; the backend has no separate field.
export function verificationLabel(status) {
  switch (status) {
    case 'NEW':
      return 'Reported · unverified'
    case 'NEEDS_REVIEW':
      return 'Needs review'
    case 'VERIFIED':
    case 'ASSIGNED':
      return 'Verified by operator'
    case 'RESOLVED':
      return 'Closed · resolved'
    case 'REJECTED':
      return 'Rejected'
    case 'DUPLICATE':
      return 'Marked duplicate'
    default:
      return 'Unknown'
  }
}

const SOURCE_LABELS = {
  SELF: 'Web form · self',
  THIRD_PARTY: 'Web form · third party',
  PHONE_CALL: 'Phone call',
  DRONE: 'Drone observation',
}

export function sourceLabel(reporterType) {
  return SOURCE_LABELS[reporterType] ?? `Unknown source (${reporterType ?? 'none'})`
}

const METHOD_LABELS = {
  GPS: 'Device location, reported by the sender',
  MAP_PIN: 'Map point chosen by the sender',
  MANUAL: 'Typed place description',
  VOICE: 'Spoken address, geocoded by the server',
  DRONE_ESTIMATE: 'Drone GPS estimate',
  UNKNOWN: 'Unknown method',
}

export function locationMethodLabel(method) {
  return method ? (METHOD_LABELS[method] ?? method) : 'Not recorded'
}

export const EVENT_CATEGORY_LABELS = {
  FORM_REPORT: 'Form report',
  PHONE_REPORT: 'Phone report',
  DRONE_OBSERVATION: 'Drone observation',
  SAFETY_CONFIRMATION: 'Safety confirmation',
  STATUS_CHANGE: 'Status change',
}

export function eventCategoryLabel(category) {
  return EVENT_CATEGORY_LABELS[category] ?? category
}

export const MODE_LABELS = {
  LIVE: 'Live',
  SIMULATION: 'Simulation',
  REPLAY: 'Replay',
}

// Short location line for lists.
export function locationSummary(incident) {
  if (incident.addressText) return incident.addressText
  if (incident.coords) return formatCoords(incident.coords)
  return 'Location unresolved'
}
