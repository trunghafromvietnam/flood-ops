// Operational map layers: GeoJSON builders (pure) and MapLibre layer definitions.
// Records without valid coordinates never become features.

import { toCoords } from '../api/contracts.js'
import { teamFreshness } from '../lib/derive.js'
import { LABEL_FONT } from './mapConfig.js'

const COLORS = {
  primary: '#1677E8',
  navy: '#102B40',
  success: '#16845B',
  warning: '#D99116',
  critical: '#D9363E',
  flood: '#55B7D1',
  neutral: '#8A96A3',
  white: '#FFFFFF',
}

export const STATUS_COLORS = {
  NEW: COLORS.critical,
  NEEDS_REVIEW: COLORS.warning,
  VERIFIED: COLORS.primary,
  ASSIGNED: COLORS.primary,
  RESOLVED: COLORS.success,
}

// Layer ids grouped by the toggle that controls them.
export const LAYER_GROUPS = {
  incidents: ['incident-clusters', 'incident-cluster-count', 'incident-points', 'incident-selected'],
  teams: ['team-points', 'team-labels', 'team-selected'],
  flood: ['flood-fill', 'flood-outline'],
}

const point = (coords, properties) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [coords.lon, coords.lat] },
  properties,
})

const collection = (features) => ({ type: 'FeatureCollection', features })

export function incidentsToGeoJSON(incidents) {
  return collection(
    incidents
      .map((i) => ({ i, coords: i.coords && toCoords(i.coords.lat, i.coords.lon) }))
      .filter(({ coords }) => coords)
      .map(({ i, coords }) =>
        point(coords, { id: i.id, status: i.status, reporterType: i.reporterType }),
      ),
  )
}

export function teamsToGeoJSON(teams, now) {
  return collection(
    (teams ?? [])
      .map((t) => ({ t, coords: t.coords && toCoords(t.coords.lat, t.coords.lon) }))
      .filter(({ coords }) => coords)
      .map(({ t, coords }) =>
        point(coords, { id: t.id, label: t.id, freshness: teamFreshness(t, now) }),
      ),
  )
}

export function floodToGeoJSON(areas) {
  return collection(
    (areas ?? []).map((a) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [a.ring] },
      properties: { id: a.id, kind: a.kind },
    })),
  )
}

export function reportPointToGeoJSON(coords) {
  const valid = coords && toCoords(coords.lat, coords.lon)
  return collection(valid ? [point(valid, { id: 'report-point' })] : [])
}

const statusColor = [
  'match',
  ['get', 'status'],
  ...Object.entries(STATUS_COLORS).flat(),
  COLORS.neutral,
]

// Adds sources and layers once per style (call again after a style swap).
export function addOperationalLayers(map) {
  if (map.getSource('incidents')) return

  map.addSource('flood', { type: 'geojson', data: collection([]) })
  map.addSource('incidents', {
    type: 'geojson',
    data: collection([]),
    cluster: true,
    clusterRadius: 40,
    clusterMaxZoom: 12,
  })
  map.addSource('teams', { type: 'geojson', data: collection([]) })
  map.addSource('report-point', { type: 'geojson', data: collection([]) })

  map.addLayer({
    id: 'flood-fill',
    type: 'fill',
    source: 'flood',
    paint: { 'fill-color': COLORS.flood, 'fill-opacity': 0.3 },
  })
  map.addLayer({
    id: 'flood-outline',
    type: 'line',
    source: 'flood',
    paint: { 'line-color': '#2C8FAA', 'line-width': 1.5, 'line-dasharray': [3, 2] },
  })

  map.addLayer({
    id: 'incident-clusters',
    type: 'circle',
    source: 'incidents',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': COLORS.navy,
      'circle-opacity': 0.85,
      'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 50, 24],
      'circle-stroke-color': COLORS.white,
      'circle-stroke-width': 2,
    },
  })
  map.addLayer({
    id: 'incident-cluster-count',
    type: 'symbol',
    source: 'incidents',
    filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': LABEL_FONT, 'text-size': 12 },
    paint: { 'text-color': COLORS.white },
  })
  map.addLayer({
    id: 'incident-selected',
    type: 'circle',
    source: 'incidents',
    filter: ['==', ['get', 'id'], ''],
    paint: {
      'circle-radius': 14,
      'circle-color': 'rgba(22, 119, 232, 0.15)',
      'circle-stroke-color': COLORS.primary,
      'circle-stroke-width': 2.5,
    },
  })
  map.addLayer({
    id: 'incident-points',
    type: 'circle',
    source: 'incidents',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': statusColor,
      'circle-radius': 7,
      // Drone observations get a navy ring so the source is visible on the map.
      'circle-stroke-color': ['match', ['get', 'reporterType'], 'DRONE', COLORS.navy, COLORS.white],
      'circle-stroke-width': ['match', ['get', 'reporterType'], 'DRONE', 3, 2],
    },
  })

  map.addLayer({
    id: 'team-selected',
    type: 'circle',
    source: 'teams',
    filter: ['==', ['get', 'id'], ''],
    paint: {
      'circle-radius': 14,
      'circle-color': 'rgba(22, 132, 91, 0.15)',
      'circle-stroke-color': COLORS.success,
      'circle-stroke-width': 2.5,
    },
  })
  map.addLayer({
    id: 'team-points',
    type: 'circle',
    source: 'teams',
    paint: {
      'circle-color': ['match', ['get', 'freshness'], 'current', COLORS.success, COLORS.white],
      'circle-radius': 6,
      'circle-stroke-color': ['match', ['get', 'freshness'], 'current', COLORS.white, COLORS.success],
      'circle-stroke-width': 2.5,
    },
  })
  map.addLayer({
    id: 'team-labels',
    type: 'symbol',
    source: 'teams',
    minzoom: 9,
    layout: {
      'text-field': ['get', 'label'],
      'text-font': LABEL_FONT,
      'text-size': 11,
      'text-offset': [0, 1.3],
      'text-anchor': 'top',
    },
    paint: { 'text-color': COLORS.navy, 'text-halo-color': COLORS.white, 'text-halo-width': 1.5 },
  })

  map.addLayer({
    id: 'report-point',
    type: 'circle',
    source: 'report-point',
    paint: {
      'circle-color': COLORS.critical,
      'circle-radius': 9,
      'circle-stroke-color': COLORS.white,
      'circle-stroke-width': 3,
    },
  })
}

export function setGroupVisibility(map, group, visible) {
  for (const id of LAYER_GROUPS[group] ?? []) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
  }
}
