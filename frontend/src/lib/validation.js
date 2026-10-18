// Form and data validation. Mirrors backend rules where they exist (backend/app/main.py)
// so users get the error before the request, but the server stays the authority.

import { LIMITS, PHONE_PATTERN, toCoords } from '../api/contracts.js'

// Both empty -> no coordinates. One empty -> error (the backend requires pairs).
export function parseCoordinatePair(latText, lonText) {
  const latRaw = String(latText ?? '').trim()
  const lonRaw = String(lonText ?? '').trim()
  if (!latRaw && !lonRaw) return { coords: null, error: null }
  if (!latRaw || !lonRaw) {
    return { coords: null, error: 'Enter both latitude and longitude, or neither.' }
  }
  const lat = Number(latRaw)
  const lon = Number(lonRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { coords: null, error: 'Coordinates must be numbers.' }
  }
  const coords = toCoords(lat, lon)
  if (!coords) {
    return { coords: null, error: 'Latitude must be -90 to 90 and longitude -180 to 180.' }
  }
  return { coords, error: null }
}

// Empty means "unknown" (null), never zero.
export function parsePeopleCount(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return { value: null, error: null }
  if (!/^-?\d+$/.test(raw)) return { value: null, error: 'Enter a whole number.' }
  const value = Number(raw)
  if (value < 0) return { value: null, error: 'The number of people cannot be negative.' }
  if (value > 100000) return { value: null, error: 'That number looks too large. Check it.' }
  return { value, error: null }
}

export function validatePhone(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return null
  if (raw.length > LIMITS.phoneMax || !PHONE_PATTERN.test(raw)) {
    return 'Use digits, spaces or ( ) . - with an optional + at the start.'
  }
  return null
}

export function validateImageFile(file) {
  if (!file) return 'Choose an image file.'
  if (!LIMITS.imageTypes.includes(file.type)) return `${file.name}: only JPEG, PNG or WEBP images.`
  if (file.size > LIMITS.imageMaxBytes) {
    return `${file.name}: larger than ${LIMITS.imageMaxBytes / (1024 * 1024)} MB.`
  }
  return null
}

// Water level and severity have no backend fields. They are written as labelled
// lines at the start of the description so the information is not silently lost.
export const WATER_LEVELS = [
  { value: '', label: 'Not specified' },
  { value: 'Ankle level', label: 'Ankle level' },
  { value: 'Knee level', label: 'Knee level' },
  { value: 'Waist level', label: 'Waist level' },
  { value: 'Very deep / dangerous current', label: 'Very deep / dangerous current' },
  { value: 'Unknown', label: 'Unknown' },
]

export const REPORTED_SEVERITIES = [
  { value: '', label: 'Not specified' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
  { value: 'Unknown', label: 'Unknown' },
]

export function buildReportDescription({ waterLevel, severity, description }) {
  const lines = []
  if (waterLevel) lines.push(`Reported water level: ${waterLevel}`)
  if (severity) lines.push(`Reported severity: ${severity}`)
  const text = String(description ?? '').trim()
  if (text) lines.push(lines.length ? `\n${text}` : text)
  return lines.join('\n')
}

// form: { reporterType, coords, locationMethod, addressText, waterLevel, severity,
//         description, peopleText, phone, photos }
// Returns { errors, payload }. payload is null when there are errors.
export function validateReportForm(form) {
  const errors = {}

  if (!['SELF', 'THIRD_PARTY'].includes(form.reporterType)) {
    errors.reporterType = 'Choose who you are reporting for.'
  }

  const address = String(form.addressText ?? '').trim()
  if (!form.coords && !address) {
    errors.location = 'Share your location, pick a point on the map, or describe the place.'
  }
  if (form.coords && !toCoords(form.coords.lat, form.coords.lon)) {
    errors.location = 'The selected coordinates are not valid.'
  }

  const people = parsePeopleCount(form.peopleText)
  if (people.error) errors.people = people.error

  const phoneError = validatePhone(form.phone)
  if (phoneError) errors.phone = phoneError

  const description = buildReportDescription(form)
  if (description.length > LIMITS.descriptionMax) {
    errors.description = `Too long: ${description.length} of ${LIMITS.descriptionMax} characters.`
  }

  const photoErrors = (form.photos ?? []).map(validateImageFile).filter(Boolean)
  if (photoErrors.length) errors.photos = photoErrors.join(' ')

  if (Object.keys(errors).length) return { errors, payload: null }

  const location = {
    latitude: form.coords ? form.coords.lat : null,
    longitude: form.coords ? form.coords.lon : null,
    method: form.coords ? form.locationMethod : 'MANUAL',
    address_text: address || null,
  }

  return {
    errors,
    payload: {
      reporter_type: form.reporterType,
      description: description || null,
      people_count: people.value,
      phone: String(form.phone ?? '').trim() || null,
      location,
    },
  }
}
