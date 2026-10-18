import { describe, expect, it } from 'vitest'
import {
  buildReportDescription,
  parseCoordinatePair,
  parsePeopleCount,
  validateImageFile,
  validateReportForm,
} from './validation.js'

const base = {
  reporterType: 'SELF',
  coords: null,
  locationMethod: null,
  addressText: '',
  waterLevel: '',
  severity: '',
  peopleText: '',
  description: '',
  phone: '',
  photos: [],
}

describe('parseCoordinatePair', () => {
  it('accepts both empty as no coordinates', () => {
    expect(parseCoordinatePair('', '')).toEqual({ coords: null, error: null })
  })
  it('rejects a lone latitude or longitude', () => {
    expect(parseCoordinatePair('17.4', '').error).toMatch(/both/)
  })
  it('rejects out-of-range and non-numeric values', () => {
    expect(parseCoordinatePair('91', '106').error).toMatch(/-90 to 90/)
    expect(parseCoordinatePair('17', '181').error).toMatch(/-180 to 180/)
    expect(parseCoordinatePair('abc', '106').error).toMatch(/numbers/)
  })
  it('parses valid pairs', () => {
    expect(parseCoordinatePair('17.4689', '106.6223').coords).toEqual({ lat: 17.4689, lon: 106.6223 })
  })
})

describe('parsePeopleCount', () => {
  it('treats empty as unknown (null), not zero', () => {
    expect(parsePeopleCount('')).toEqual({ value: null, error: null })
  })
  it('rejects negative and non-integer numbers', () => {
    expect(parsePeopleCount('-1').error).toMatch(/negative/)
    expect(parsePeopleCount('2.5').error).toMatch(/whole number/)
  })
  it('accepts zero and positive integers', () => {
    expect(parsePeopleCount('0').value).toBe(0)
    expect(parsePeopleCount('4').value).toBe(4)
  })
})

describe('validateReportForm', () => {
  it('requires coordinates or a place description', () => {
    const { errors, payload } = validateReportForm(base)
    expect(payload).toBeNull()
    expect(errors.location).toBeTruthy()
  })

  it('builds a text-only location payload with MANUAL method', () => {
    const { payload } = validateReportForm({ ...base, addressText: ' Kien Giang ' })
    expect(payload.location).toEqual({ latitude: null, longitude: null, method: 'MANUAL', address_text: 'Kien Giang' })
    expect(payload.people_count).toBeNull()
  })

  it('keeps the coordinate source as the method', () => {
    const { payload } = validateReportForm({ ...base, coords: { lat: 17.2, lon: 106.7 }, locationMethod: 'MAP_PIN' })
    expect(payload.location).toMatchObject({ latitude: 17.2, longitude: 106.7, method: 'MAP_PIN' })
  })

  it('rejects invalid coordinates', () => {
    const { errors } = validateReportForm({ ...base, coords: { lat: 95, lon: 106 }, locationMethod: 'GPS' })
    expect(errors.location).toMatch(/not valid/)
  })

  it('rejects a negative people count and a bad phone', () => {
    const { errors } = validateReportForm({ ...base, addressText: 'x', peopleText: '-3', phone: 'call me' })
    expect(errors.people).toBeTruthy()
    expect(errors.phone).toBeTruthy()
  })

  it('only sends backend-defined reporter types', () => {
    const { errors } = validateReportForm({ ...base, addressText: 'x', reporterType: 'DRONE' })
    expect(errors.reporterType).toBeTruthy()
  })

  it('writes water level and severity into the description, not new fields', () => {
    const { payload } = validateReportForm({ ...base, addressText: 'x', waterLevel: 'Waist level', severity: 'High', description: 'Roof' })
    expect(payload.description).toBe('Reported water level: Waist level\nReported severity: High\n\nRoof')
    expect(Object.keys(payload).sort()).toEqual(['description', 'location', 'people_count', 'phone', 'reporter_type'])
  })
})

describe('buildReportDescription', () => {
  it('returns only the user text when nothing was selected', () => {
    expect(buildReportDescription({ waterLevel: '', severity: '', description: ' text ' })).toBe('text')
  })
})

describe('validateImageFile', () => {
  it('accepts supported images and rejects other types and oversize files', () => {
    expect(validateImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBeNull()
    expect(validateImageFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).toMatch(/only JPEG/)
    const big = new File(['x'], 'big.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })
    expect(validateImageFile(big)).toMatch(/larger than/)
  })
})
