// Build-time configuration (Vite env vars, see .env.example).
// Nothing here is secret: everything in this file ships to the browser.

// Empty string = same origin. In dev, Vite proxies /api to the backend (vite.config.js).
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export const REQUEST_TIMEOUT_MS = 15000

// Vector base map. OpenFreeMap is free, keyless, and requires attribution
// (the style carries it). Override per deployment if its usage policy does not fit.
export const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty'

// Place search for orientation on the map. Nominatim's policy allows light,
// user-triggered use only (no autocomplete), max 1 request per second.
export const GEOCODER_URL =
  import.meta.env.VITE_GEOCODER_URL || 'https://nominatim.openstreetmap.org/search'

export const APP_VERSION = '0.2.0'
