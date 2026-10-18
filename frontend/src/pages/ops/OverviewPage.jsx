// Operations overview: summary or selected incident, intake activity, dominant map.

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import ActivityList from '../../components/ActivityList.jsx'
import IncidentDetail from '../../components/IncidentDetail.jsx'
import { LayerControl, MapLegend, layerAvailability } from '../../components/MapOverlays.jsx'
import StateMessage from '../../components/StateMessage.jsx'
import MapView from '../../map/MapView.jsx'
import { computeMetrics } from '../../lib/derive.js'
import { useOps } from '../../state/OpsData.jsx'
import { useSelectedIncident } from '../../state/selection.js'
import FeaturePanel from './FeaturePanel.jsx'

const OVERVIEW_EVENT_LIMIT = 40

export default function OverviewPage() {
  const { dataset, preferences } = useOps()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useSelectedIncident()
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [focus, setFocus] = useState(null)
  const [layers, setLayers] = useState(preferences.layers)
  const [otherFeature, setOtherFeature] = useState(null) // flood area clicked on the map
  const [activityOpen, setActivityOpen] = useState(true)

  const selected = selectedId ? dataset.incidents.find((i) => i.id === selectedId) : null
  const metrics = useMemo(() => computeMetrics(dataset), [dataset])
  const events = dataset.activity.slice(0, OVERVIEW_EVENT_LIMIT)

  function selectEvent(event) {
    setSelectedEventId(event.id)
    if (event.incidentId) setSelectedId(event.incidentId)
    // Focus only when the event has real coordinates; never invent a location.
    if (event.coords) setFocus({ coords: event.coords, key: `${event.id}-${Date.now()}` })
  }

  function onMapSelect(selection) {
    if (selection.type === 'incident') {
      setOtherFeature(null)
      setSelectedId(selection.id)
    } else if (selection.type === 'team') {
      navigate(`/ops/teams?team=${encodeURIComponent(selection.id)}`)
    } else {
      setOtherFeature(selection)
    }
  }

  return (
    <div className="overview">
      <section className="ops-panel" aria-label="Operational summary">
        <div className="panel-block">
          {selectedId && !selected ? (
            <StateMessage kind="unavailable" title={`Incident ${selectedId} is not in the current data.`}>
              It may belong to another operating mode, or it has not loaded yet.{' '}
              <button type="button" className="link-button" onClick={() => setSelectedId(null)}>
                Back to summary
              </button>
            </StateMessage>
          ) : selected ? (
            <IncidentDetail
              incident={selected}
              onClose={() => setSelectedId(null)}
              onViewOnMap={(i) => setFocus({ coords: i.coords, key: `${i.id}-${Date.now()}` })}
            />
          ) : (
            <Summary metrics={metrics} />
          )}
        </div>

        <div className="panel-block activity-block">
          <div className="panel-heading">
            <h2 className="section-heading">Activity</h2>
            <button
              type="button"
              className="link-button activity-toggle"
              aria-expanded={activityOpen}
              onClick={() => setActivityOpen((v) => !v)}
            >
              {activityOpen ? 'Hide' : 'Show'}
            </button>
            <Link to="/ops/activity" className="link-button">
              Full log <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {activityOpen && (
            <>
              {dataset.mode === 'LIVE' && (
                <p className="muted small">Intake events from incident records. Status changes are in the full log.</p>
              )}
              {!dataset.loaded && dataset.loading ? (
                <StateMessage kind="loading" title="Loading activity…" />
              ) : !dataset.loaded && dataset.error ? (
                <StateMessage kind="error" title="Activity unavailable: live data did not load." />
              ) : events.length === 0 ? (
                <StateMessage kind="empty" title={dataset.mode === 'REPLAY' ? 'Replay not started.' : 'No events yet.'} />
              ) : (
                <ActivityList events={events} selectedId={selectedEventId} onSelect={selectEvent} compact />
              )}
            </>
          )}
        </div>
      </section>

      <MapView
        className="overview-map"
        label="Incident map"
        incidents={dataset.incidents}
        teams={dataset.teams}
        floodAreas={dataset.floodAreas}
        layers={layers}
        selected={selected ? { type: 'incident', id: selected.id } : null}
        onSelect={onMapSelect}
        focus={focus}
        now={dataset.clock}
      >
        <div className="map-overlay map-overlay-top-left">
          <LayerControl layers={layers} onChange={setLayers} availability={layerAvailability(dataset)} />
        </div>
        <div className="map-overlay map-overlay-bottom-left">
          <MapLegend showTeams={Boolean(dataset.teams)} showFlood={Boolean(dataset.floodAreas?.length)} />
        </div>
        {otherFeature && (
          <div className="map-overlay map-overlay-top-right">
            <FeaturePanel selection={otherFeature} onClose={() => setOtherFeature(null)} />
          </div>
        )}
      </MapView>
    </div>
  )
}

function Summary({ metrics }) {
  const { dataset } = useOps()
  const unmapped = dataset.incidents.filter((i) => !i.coords).length
  return (
    <div>
      <h1 className="page-heading">Overview</h1>
      {!dataset.loaded && dataset.loading ? (
        <StateMessage kind="loading" title="Loading incidents…" />
      ) : !dataset.loaded && dataset.error ? (
        <StateMessage kind="error" title="Metrics unavailable: live data did not load." />
      ) : (
        <>
          <dl className="metric-grid">
            {metrics.map((m) => (
              <div key={m.id} className="metric" title={m.definition}>
                <dt>{m.label}</dt>
                <dd>
                  {m.value === null ? (
                    <span className="metric-unavailable">Not available</span>
                  ) : (
                    <span className="metric-value">{m.value}</span>
                  )}
                  {m.note && <span className="metric-note">{m.note}</span>}
                  {m.unavailable && <span className="metric-note">{m.unavailable}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <p className="muted small">
            {dataset.incidents.length} incident{dataset.incidents.length === 1 ? '' : 's'} total
            {unmapped > 0 && ` · ${unmapped} without coordinates (listed in Reports, not on the map)`}.
          </p>
          <details className="definitions">
            <summary>Metric definitions</summary>
            <dl>
              {metrics.map((m) => (
                <div key={m.id}>
                  <dt>{m.label}</dt>
                  <dd>{m.definition}</dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      )}
    </div>
  )
}
