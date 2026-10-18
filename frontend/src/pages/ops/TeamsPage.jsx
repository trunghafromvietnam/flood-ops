// Rescue teams. The backend has no team endpoint, so LIVE mode shows the gap
// instead of a directory; SIMULATION/REPLAY show the synthetic scenario teams.

import { useState } from 'react'
import StateMessage from '../../components/StateMessage.jsx'
import { SimulatedTag } from '../../components/StatusBadge.jsx'
import MapView from '../../map/MapView.jsx'
import { matchesTeamQuery, teamFreshness } from '../../lib/derive.js'
import { formatRelative } from '../../lib/formatters.js'
import { useOps } from '../../state/OpsData.jsx'
import { useSelectedTeam } from '../../state/selection.js'
import { FreshnessBadge, TEAM_STATUS_LABELS, TeamSummary } from './FeaturePanel.jsx'

export default function TeamsPage() {
  const { dataset, setMode } = useOps()
  const [selectedId, setSelectedId] = useSelectedTeam()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [focus, setFocus] = useState(null)

  if (!dataset.teams) {
    return (
      <div className="content-page">
        <h1 className="page-heading">Rescue Teams</h1>
        <StateMessage
          kind="unavailable"
          title="No rescue-team data source"
          action={
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setMode('SIMULATION')}>
              View simulated teams
            </button>
          }
        >
          The FloodOps backend has no endpoint for teams, positions or assignments, so no team directory is shown in
          live mode. See docs/API_CONTRACT.md (missing capabilities).
        </StateMessage>
      </div>
    )
  }

  const teams = dataset.teams.filter((t) => matchesTeamQuery(t, query) && (!status || t.status === status))
  const selected = dataset.teams.find((t) => t.id === selectedId)

  function select(team) {
    setSelectedId(team.id)
    if (team.coords) setFocus({ coords: team.coords, zoom: 12, key: `${team.id}-${Date.now()}` })
  }

  return (
    <div className="split-page">
      <section className="split-list" aria-label="Team list">
        <h1 className="page-heading">Rescue Teams</h1>
        <div className="filters">
          <label className="field-inline grow">
            <span>Search</span>
            <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Team ID or name" />
          </label>
          <label className="field-inline">
            <span>Status</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {Object.entries(TEAM_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {teams.length === 0 ? (
          <StateMessage kind="empty" title="No teams match these filters." />
        ) : (
          <ul className="card-list">
            {teams.map((team) => (
              <li key={team.id}>
                <button
                  type="button"
                  className={`list-card${team.id === selectedId ? ' is-selected' : ''}`}
                  aria-pressed={team.id === selectedId}
                  onClick={() => select(team)}
                >
                  <span className="list-card-top">
                    <strong>{team.id}</strong>
                    {team.simulated && <SimulatedTag />}
                  </span>
                  <span>{team.name}</span>
                  <span className="list-card-meta">
                    <span>{TEAM_STATUS_LABELS[team.status] ?? team.status}</span>
                    <FreshnessBadge team={team} now={dataset.clock} />
                    {teamFreshness(team, dataset.clock) !== 'missing' && (
                      <span className="muted">updated {formatRelative(team.locationUpdatedAt, dataset.clock)}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <section className="panel-block" aria-label={`Team ${selected.id}`}>
            <h2 className="section-heading">
              {selected.id} · {selected.name}
            </h2>
            <TeamSummary team={selected} />
          </section>
        )}
      </section>

      <MapView
        className="split-map"
        label="Team positions"
        incidents={dataset.incidents}
        teams={dataset.teams}
        floodAreas={null}
        layers={{ incidents: true, teams: true, flood: false }}
        selected={selected ? { type: 'team', id: selected.id } : null}
        onSelect={(sel) => sel.type === 'team' && select(dataset.teams.find((t) => t.id === sel.id))}
        focus={focus}
        now={dataset.clock}
      />
    </div>
  )
}
