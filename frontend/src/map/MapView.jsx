// The one operational map component. Every view renders this with its own data;
// map lifecycle, layers and selection live here so they are never duplicated.

import { useEffect, useRef, useState } from 'react'
import { AttributionControl, Map as MapLibreMap, ScaleControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre locates its worker next to its own module, which Vite's dependency
// pre-bundling breaks. Point it at the (self-contained) worker file explicitly.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { Maximize, Minimize, Minus, Plus, RotateCcw } from 'lucide-react'
import { MAP_STYLE_URL } from '../config.js'
import { FALLBACK_STYLE, FOCUS_ZOOM, QUANG_BINH_BOUNDS } from './mapConfig.js'
import {
  addOperationalLayers,
  floodToGeoJSON,
  incidentsToGeoJSON,
  reportPointToGeoJSON,
  setGroupVisibility,
  teamsToGeoJSON,
} from './mapLayers.js'

setWorkerUrl(workerUrl)

const CLICKABLE =['incident-points', 'incident-clusters', 'team-points', 'flood-fill']
const DEFAULT_LAYERS = { incidents: true, teams: true, flood: true }

/**
 * Props
 *  incidents, teams, floodAreas  records to draw (teams/floodAreas may be null = no source)
 *  reportPoint                    { lat, lon } for the public report page
 *  selected                       { type: 'incident' | 'team' | 'flood', id } | null
 *  onSelect(selection)            feature clicked
 *  onMapClick(coords)             empty map clicked (point picking); omit to disable
 *  focus                          { coords, key } — fly there whenever `key` changes
 *  layers                         { incidents, teams, flood } visibility
 *  now                            reference time for team freshness (scenario clock in demos)
 *  label                          accessible name of the map region
 *  children                       floating overlays (legend, layer control, ...)
 */
export default function MapView({
  incidents = [],
  teams = null,
  floodAreas = null,
  reportPoint = null,
  selected = null,
  onSelect,
  onMapClick,
  focus = null,
  layers = DEFAULT_LAYERS,
  now,
  label = 'Operational map',
  className = '',
  children,
}) {
  const wrapperRef = useRef(null)
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const callbacks = useRef({})
  callbacks.current = { onSelect, onMapClick }

  const [ready, setReady] = useState(false)
  const [styleVersion, setStyleVersion] = useState(0)
  const [failure, setFailure] = useState(null) // 'webgl' | null
  const [tileProblem, setTileProblem] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  // ---- Create / destroy the map ----
  useEffect(() => {
    let map
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        bounds: QUANG_BINH_BOUNDS,
        fitBoundsOptions: { padding: 24 },
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      })
    } catch {
      setFailure('webgl')
      return undefined
    }
    mapRef.current = map
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
    map.touchZoomRotate?.disableRotation?.()

    let styleLoaded = false
    map.on('style.load', () => {
      styleLoaded = true
      addOperationalLayers(map)
      setStyleVersion((v) => v + 1)
      setReady(true)
    })

    map.on('error', (event) => {
      // The base style never loaded: swap in a blank style so data layers still work.
      if (!styleLoaded) {
        styleLoaded = true
        setTileProblem(true)
        map.setStyle(FALLBACK_STYLE)
        return
      }
      const status = event?.error?.status
      if (event?.sourceId && !['incidents', 'teams', 'flood', 'report-point'].includes(event.sourceId)) {
        setTileProblem(true)
      } else if (status && status >= 400) {
        setTileProblem(true)
      }
    })

    map.on('click', (event) => {
      const hits = map.queryRenderedFeatures(event.point, {
        layers: CLICKABLE.filter((id) => map.getLayer(id)),
      })
      const hit = hits[0]
      if (!hit) {
        callbacks.current.onMapClick?.({ lat: event.lngLat.lat, lon: event.lngLat.lng })
        return
      }
      if (hit.layer.id === 'incident-clusters') {
        const source = map.getSource('incidents')
        Promise.resolve(source.getClusterExpansionZoom(hit.properties.cluster_id))
          .then((zoom) => map.easeTo({ center: hit.geometry.coordinates, zoom }))
          .catch(() => {})
        return
      }
      const type =
        hit.layer.id === 'team-points' ? 'team' : hit.layer.id === 'flood-fill' ? 'flood' : 'incident'
      callbacks.current.onSelect?.({ type, id: hit.properties.id })
    })

    for (const id of CLICKABLE) {
      map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''))
    }

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.resize()) : null
    observer?.observe(containerRef.current)

    return () => {
      observer?.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ---- Push data into sources ----
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.getSource('incidents')?.setData(incidentsToGeoJSON(incidents))
    map.getSource('teams')?.setData(teamsToGeoJSON(teams, now ?? new Date()))
    map.getSource('flood')?.setData(floodToGeoJSON(floodAreas))
    map.getSource('report-point')?.setData(reportPointToGeoJSON(reportPoint))
  }, [ready, styleVersion, incidents, teams, floodAreas, reportPoint, now])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    for (const group of Object.keys(DEFAULT_LAYERS)) setGroupVisibility(map, group, layers[group] !== false)
  }, [ready, styleVersion, layers])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const incidentId = selected?.type === 'incident' ? selected.id : ''
    const teamId = selected?.type === 'team' ? selected.id : ''
    if (map.getLayer('incident-selected')) map.setFilter('incident-selected', ['==', ['get', 'id'], incidentId])
    if (map.getLayer('team-selected')) map.setFilter('team-selected', ['==', ['get', 'id'], teamId])
  }, [ready, styleVersion, selected])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !focus?.coords) return
    map.flyTo({
      center: [focus.coords.lon, focus.coords.lat],
      zoom: Math.max(map.getZoom(), focus.zoom ?? FOCUS_ZOOM),
      essential: true,
    })
  }, [ready, focus?.key])

  // ---- Controls ----
  function zoomBy(delta) {
    const map = mapRef.current
    if (map) map.easeTo({ zoom: map.getZoom() + delta })
  }

  function resetView() {
    mapRef.current?.fitBounds(QUANG_BINH_BOUNDS, { padding: 24 })
  }

  async function toggleFullscreen() {
    const el = wrapperRef.current
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await el?.requestFullscreen?.()
    } catch {
      // Fullscreen refused by the browser: nothing else to do.
    }
  }

  useEffect(() => {
    const onChange = () => {
      setFullscreen(Boolean(document.fullscreenElement))
      mapRef.current?.resize()
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  return (
    <div ref={wrapperRef} className={`map-view ${className}`} role="region" aria-label={label}>
      <div ref={containerRef} className="map-canvas" data-testid="map-canvas" />

      {failure === 'webgl' && (
        <div className="map-failure" role="status">
          The interactive map cannot run in this browser (WebGL unavailable). Records remain
          available in the lists.
        </div>
      )}

      {tileProblem && (
        <p className="map-banner" role="status">
          Base map tiles could not be loaded. Operational markers are still shown.
        </p>
      )}

      {!failure && (
        <div className="map-controls" aria-label="Map controls">
          <button type="button" className="icon-button" onClick={() => zoomBy(1)} aria-label="Zoom in" title="Zoom in">
            <Plus size={16} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" onClick={() => zoomBy(-1)} aria-label="Zoom out" title="Zoom out">
            <Minus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={resetView}
            aria-label="Reset view to Quang Binh"
            title="Reset view to Quang Binh"
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
            title={fullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {fullscreen ? <Minimize size={16} aria-hidden="true" /> : <Maximize size={16} aria-hidden="true" />}
          </button>
        </div>
      )}

      {children}
    </div>
  )
}
