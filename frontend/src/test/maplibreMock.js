// Minimal MapLibre stand-in that records calls so tests can assert map behaviour.

export const maps = []

export class Map {
  constructor(options) {
    this.options = options
    this.handlers = {}
    this.sources = {}
    this.layers = {}
    this.calls = []
    this.zoom = 8
    maps.push(this)
  }

  on(event, layerOrFn, maybeFn) {
    const key = maybeFn ? `${event}:${layerOrFn}` : event
    ;(this.handlers[key] ??= []).push(maybeFn ?? layerOrFn)
    return this
  }

  fire(event, payload) {
    for (const fn of this.handlers[event] ?? []) fn(payload)
  }

  addControl() {}
  addSource(id, spec) {
    this.sources[id] = { spec, data: spec.data, setData: (d) => (this.sources[id].data = d), getClusterExpansionZoom: async () => 10 }
  }
  getSource(id) {
    return this.sources[id]
  }
  addLayer(layer) {
    this.layers[layer.id] = { ...layer, visibility: 'visible' }
  }
  getLayer(id) {
    return this.layers[id]
  }
  setLayoutProperty(id, prop, value) {
    if (prop === 'visibility') this.layers[id].visibility = value
  }
  setFilter(id, filter) {
    this.layers[id].filter = filter
  }
  setStyle(style) {
    this.calls.push(['setStyle', style])
  }
  flyTo(options) {
    this.calls.push(['flyTo', options])
  }
  easeTo(options) {
    this.calls.push(['easeTo', options])
  }
  fitBounds(bounds) {
    this.calls.push(['fitBounds', bounds])
  }
  getZoom() {
    return this.zoom
  }
  queryRenderedFeatures() {
    return []
  }
  getCanvas() {
    return { style: {} }
  }
  resize() {}
  remove() {
    this.removed = true
  }
}

export class AttributionControl {}
export class ScaleControl {}
export const getVersion = () => 'test'
export const setWorkerUrl = () => {}

export function lastMap() {
  return maps[maps.length - 1]
}

export function resetMaps() {
  maps.length = 0
}
