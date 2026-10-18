import { describe, expect, it } from 'vitest'
import { Map as FakeMap } from '../test/maplibreMock.js'
import {
  addOperationalLayers,
  incidentsToGeoJSON,
  reportPointToGeoJSON,
  setGroupVisibility,
  teamsToGeoJSON,
} from './mapLayers.js'

describe('GeoJSON builders', () => {
  it('creates markers only for valid coordinates', () => {
    const fc = incidentsToGeoJSON([
      { id: 'A', status: 'NEW', reporterType: 'SELF', coords: { lat: 17.4, lon: 106.6 } },
      { id: 'B', status: 'NEW', reporterType: 'SELF', coords: null },
      { id: 'C', status: 'NEW', reporterType: 'SELF', coords: { lat: 120, lon: 106.6 } },
      { id: 'D', status: 'NEW', reporterType: 'SELF', coords: { lat: Number.NaN, lon: 106.6 } },
    ])
    expect(fc.features.map((f) => f.properties.id)).toEqual(['A'])
    expect(fc.features[0].geometry.coordinates).toEqual([106.6, 17.4])
  })

  it('skips teams without a position and flags stale ones', () => {
    const now = new Date('2026-01-01T12:00:00Z')
    const fc = teamsToGeoJSON(
      [
        { id: 'T1', coords: { lat: 17, lon: 106 }, locationUpdatedAt: new Date('2026-01-01T11:58:00Z') },
        { id: 'T2', coords: { lat: 17, lon: 106 }, locationUpdatedAt: new Date('2026-01-01T10:00:00Z') },
        { id: 'T3', coords: null, locationUpdatedAt: null },
      ],
      now,
    )
    expect(fc.features.map((f) => [f.properties.id, f.properties.freshness])).toEqual([
      ['T1', 'current'],
      ['T2', 'stale'],
    ])
    expect(teamsToGeoJSON(null, now).features).toEqual([])
  })

  it('draws no report point without coordinates', () => {
    expect(reportPointToGeoJSON(null).features).toHaveLength(0)
  })
})

describe('layer visibility', () => {
  it('toggles every layer in a group', () => {
    const map = new FakeMap({})
    addOperationalLayers(map)
    setGroupVisibility(map, 'teams', false)
    expect(map.getLayer('team-points').visibility).toBe('none')
    expect(map.getLayer('team-labels').visibility).toBe('none')
    expect(map.getLayer('incident-points').visibility).toBe('visible')
    setGroupVisibility(map, 'teams', true)
    expect(map.getLayer('team-points').visibility).toBe('visible')
  })
})
