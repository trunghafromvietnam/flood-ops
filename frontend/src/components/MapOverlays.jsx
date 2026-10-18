// Floating map overlays: legend and layer visibility control.
// Layers without a data source are listed as unavailable instead of hidden silently.

import { useState } from 'react'
import { Layers } from 'lucide-react'
import { STATUS_COLORS } from '../map/mapLayers.js'
import { statusLabel } from '../lib/formatters.js'

export function MapLegend({ showIncidents = true, showTeams, showFlood, showReportPoint = false }) {
  return (
    <div className="map-legend" aria-label="Map legend">
      <p className="map-overlay-title">Legend</p>
      <ul>
        {showReportPoint && (
          <li>
            <span className="legend-swatch legend-report" aria-hidden="true" /> Report location
          </li>
        )}
        {showIncidents && <IncidentLegendItems />}
        {showTeams && (
          <>
            <li>
              <span className="legend-swatch legend-team" aria-hidden="true" /> Rescue team, position current
            </li>
            <li>
              <span className="legend-swatch legend-team-stale" aria-hidden="true" /> Rescue team, position stale
            </li>
          </>
        )}
        {showFlood && (
          <li>
            <span className="legend-swatch legend-flood" aria-hidden="true" /> Flood area (simulated)
          </li>
        )}
      </ul>
    </div>
  )
}

function IncidentLegendItems() {
  return (
    <>
      {Object.entries(STATUS_COLORS)
        .filter(([status]) => status !== 'ASSIGNED')
        .map(([status, color]) => (
          <li key={status}>
            <span className="legend-swatch" style={{ background: color }} aria-hidden="true" />
            {status === 'VERIFIED' ? 'Verified / assigned' : statusLabel(status)}
          </li>
        ))}
      <li>
        <span className="legend-swatch legend-closed" aria-hidden="true" /> Rejected / duplicate
      </li>
      <li>
        <span className="legend-swatch legend-drone" aria-hidden="true" /> Drone observation (ring)
      </li>
      <li>
        <span className="legend-swatch legend-cluster" aria-hidden="true" /> Cluster (count)
      </li>
    </>
  )
}

export function LayerControl({ layers, onChange, availability }) {
  const [open, setOpen] = useState(false)
  const rows = [
    { id: 'incidents', label: 'Incident reports' },
    { id: 'teams', label: 'Rescue teams' },
    { id: 'flood', label: 'Flood extent' },
    { id: 'shelters', label: 'Shelters' },
    { id: 'infrastructure', label: 'Critical infrastructure' },
    { id: 'weather', label: 'Weather observations' },
  ]
  return (
    <div className="layer-control">
      <button
        type="button"
        className="btn btn-secondary btn-small"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Layers size={14} aria-hidden="true" /> Layers
      </button>
      {open && (
        <fieldset className="layer-panel">
          <legend className="map-overlay-title">Visible layers</legend>
          {rows.map((row) => {
            const available = availability[row.id]
            return (
              <label key={row.id} className={`layer-row${available ? '' : ' is-unavailable'}`}>
                <input
                  type="checkbox"
                  checked={Boolean(available && layers[row.id])}
                  disabled={!available}
                  onChange={(e) => onChange({ ...layers, [row.id]: e.target.checked })}
                />
                <span>
                  {row.label}
                  {!available && <span className="muted block">No data source</span>}
                </span>
              </label>
            )
          })}
        </fieldset>
      )}
    </div>
  )
}

export function layerAvailability(dataset) {
  return {
    incidents: true,
    teams: Boolean(dataset.teams),
    flood: Boolean(dataset.floodAreas?.length),
    shelters: false,
    infrastructure: false,
    weather: false,
  }
}
