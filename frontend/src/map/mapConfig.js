// Geographic scope and base-map settings. See docs/FRONTEND_ARCHITECTURE.md (Map).

// Approximate bounding box of the historical (pre-2025) Quang Binh province, used
// only as the initial and "reset" camera extent. It is NOT a boundary dataset:
// no administrative boundary layer is shipped yet.
export const QUANG_BINH_BOUNDS = [
  [105.6, 16.9], // south-west [lon, lat]
  [107.15, 18.15], // north-east
]

export const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'
export const LABEL_FONT = ['Noto Sans Bold']

// Used when the base-map style cannot be loaded, so operational layers still work.
export const FALLBACK_STYLE = {
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#E9EEF3' } }],
}

export const FOCUS_ZOOM = 13
