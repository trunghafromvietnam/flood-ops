// Full-screen operational map with floating search, layers, legend and a feature drawer.

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { searchPlace } from '../../api/geocoder.js'
import IncidentDetail from '../../components/IncidentDetail.jsx'
import { LayerControl, MapLegend, layerAvailability } from '../../components/MapOverlays.jsx'
import MapView from '../../map/MapView.jsx'
import { useOps } from '../../state/OpsData.jsx'
import { useGoBack } from '../../state/selection.js'
import FeaturePanel from './FeaturePanel.jsx'

export default function LiveMapPage() {
  const { dataset, preferences } = useOps()
  const goBack = useGoBack()
  const [params, setParams] = useSearchParams()
  const [layers, setLayers] = useState(preferences.layers)
  const [focus, setFocus] = useState(null)
  const [other, setOther] = useState(null)
  const [placeQuery, setPlaceQuery] = useState(params.get('place') ?? '')
  const [placeState, setPlaceState] = useState(null) // { kind, text }

  const incidentId = params.get('incident')
  const selected = incidentId ? dataset.incidents.find((i) => i.id === incidentId) : null

  // Focus the incident named in the URL (e.g. "View on map" from Reports).
  useEffect(() => {
    if (selected?.coords) setFocus({ coords: selected.coords, key: `${selected.id}` })
  }, [selected?.id, Boolean(selected?.coords)])

  // Place search from the header.
  useEffect(() => {
    const place = params.get('place')
    if (place) runPlaceSearch(place)
  }, [params.get('place')])

  async function runPlaceSearch(text) {
    const q = text.trim()
    if (!q) return
    const byId = dataset.incidents.find((i) => i.id.toLowerCase() === q.toLowerCase())
    if (byId) {
      selectIncident(byId.id)
      return
    }
    setPlaceState({ kind: 'loading', text: 'Searching…' })
    try {
      const results = await searchPlace(q)
      if (!results.length) {
        setPlaceState({ kind: 'error', text: `No place found for “${q}”.` })
        return
      }
      setFocus({ coords: results[0].coords, zoom: 12, key: `place-${q}-${Date.now()}` })
      setPlaceState({ kind: 'ok', text: `Showing: ${results[0].label} (OpenStreetMap Nominatim)` })
    } catch (error) {
      setPlaceState({ kind: 'error', text: error.message })
    }
  }

  function selectIncident(id) {
    setOther(null)
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('incident', id)
      next.delete('place')
      return next
    })
  }

  function clearIncident() {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('incident')
      return next
    })
  }

  function onSelect(selection) {
    if (selection.type === 'incident') selectIncident(selection.id)
    else {
      clearIncident()
      setOther(selection)
    }
  }

  return (
    <div className="live-map">
      <h1 className="visually-hidden">Live map</h1>
      <MapView
        className="live-map-view"
        label="Live operational map"
        incidents={dataset.incidents}
        teams={dataset.teams}
        floodAreas={dataset.floodAreas}
        layers={layers}
        selected={selected ? { type: 'incident', id: selected.id } : other}
        onSelect={onSelect}
        focus={focus}
        now={dataset.clock}
      >
        <div className="map-overlay map-overlay-top-left map-toolbar">
          <button type="button" className="btn btn-secondary btn-small" onClick={goBack}>
            <ArrowLeft size={14} aria-hidden="true" /> Back
          </button>
          <form
            className="map-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              runPlaceSearch(placeQuery)
            }}
          >
            <input
              className="input"
              type="search"
              placeholder="Place or incident ID"
              aria-label="Search place or incident ID on the map"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-small" aria-label="Search">
              <Search size={14} aria-hidden="true" />
            </button>
          </form>
          <LayerControl layers={layers} onChange={setLayers} availability={layerAvailability(dataset)} />
          {placeState && (
            <p className={`map-note${placeState.kind === 'error' ? ' is-error' : ''}`} role="status">
              {placeState.text}
            </p>
          )}
        </div>

        <div className="map-overlay map-overlay-bottom-left">
          <MapLegend showTeams={Boolean(dataset.teams)} showFlood={Boolean(dataset.floodAreas?.length)} />
        </div>

        {(selected || other || incidentId) && (
          <aside className="map-drawer" aria-label="Selected feature">
            {selected ? (
              <IncidentDetail incident={selected} onClose={clearIncident} />
            ) : other ? (
              <FeaturePanel selection={other} onClose={() => setOther(null)} />
            ) : (
              <p className="muted">
                Incident {incidentId} is not in the current data.{' '}
                <button type="button" className="link-button" onClick={clearIncident}>
                  Close
                </button>
              </p>
            )}
          </aside>
        )}
      </MapView>
      {selected && !selected.coords && (
        <p className="map-note map-note-floating" role="status">
          {selected.id} has no coordinates, so it is not shown on the map.
        </p>
      )}
    </div>
  )
}
