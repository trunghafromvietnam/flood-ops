// Place search (OpenStreetMap Nominatim). Results only move the map so the user
// can orient themselves; they are never submitted as GPS or as a confirmed position.

import { GEOCODER_URL } from '../config.js'
import { QUANG_BINH_BOUNDS } from '../map/mapConfig.js'
import { toCoords } from './contracts.js'

const MIN_INTERVAL_MS = 1100 // Nominatim usage policy: max 1 request per second
let lastRequestAt = 0

export async function searchPlace(query, { signal } = {}) {
  const q = query.trim()
  if (!q) return []
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequestAt = Date.now()

  const [[west, south], [east, north]] = QUANG_BINH_BOUNDS
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '5',
    countrycodes: 'vn',
    viewbox: `${west},${north},${east},${south}`, // prefer, but do not restrict to, the region
  })

  let res
  try {
    res = await fetch(`${GEOCODER_URL}?${params}`, { signal, headers: { Accept: 'application/json' } })
  } catch {
    throw new Error('Place search is unavailable right now.')
  }
  if (!res.ok) throw new Error('Place search is unavailable right now.')
  const data = await res.json().catch(() => [])

  return (Array.isArray(data) ? data : [])
    .map((item) => ({
      label: item.display_name,
      coords: toCoords(Number(item.lat), Number(item.lon)),
    }))
    .filter((item) => item.coords)
}
