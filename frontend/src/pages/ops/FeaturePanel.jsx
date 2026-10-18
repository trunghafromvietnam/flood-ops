// Details for non-incident map features (flood areas and teams) in a floating panel.

import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useOps } from '../../state/OpsData.jsx'
import { formatCoords, formatDateTime, formatRelative } from '../../lib/formatters.js'
import { teamFreshness } from '../../lib/derive.js'
import { Badge, SimulatedTag } from '../../components/StatusBadge.jsx'

export const TEAM_STATUS_LABELS = {
  AVAILABLE: 'Available',
  EN_ROUTE: 'En route',
  ON_SCENE: 'On scene',
  OFF_DUTY: 'Off duty',
}

export function FreshnessBadge({ team, now }) {
  const freshness = teamFreshness(team, now)
  if (freshness === 'missing') return <Badge tone="warning">No position</Badge>
  if (freshness === 'stale') return <Badge tone="warning">Position stale</Badge>
  return <Badge tone="success">Position current</Badge>
}

export function TeamSummary({ team }) {
  const { dataset } = useOps()
  return (
    <div className="team-summary">
      <div className="badge-row">
        <Badge tone="outline">{TEAM_STATUS_LABELS[team.status] ?? `Unknown (${team.status})`}</Badge>
        <FreshnessBadge team={team} now={dataset.clock} />
        {team.simulated && <SimulatedTag />}
      </div>
      <dl className="detail-list">
        <div>
          <dt>Assignment</dt>
          <dd>
            {team.assignment ? (
              <Link to={`/ops?incident=${encodeURIComponent(team.assignment)}`}>{team.assignment}</Link>
            ) : (
              'None recorded'
            )}
          </dd>
        </div>
        <div>
          <dt>Last position</dt>
          <dd>
            {formatCoords(team.coords)}
            {team.locationUpdatedAt && (
              <span className="muted block">
                {formatDateTime(team.locationUpdatedAt)} ({formatRelative(team.locationUpdatedAt, dataset.clock)})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Last status update</dt>
          <dd>{formatDateTime(team.lastUpdateAt)}</dd>
        </div>
      </dl>
    </div>
  )
}

export default function FeaturePanel({ selection, onClose }) {
  const { dataset } = useOps()
  let title = selection.id
  let body = null

  if (selection.type === 'flood') {
    const area = dataset.floodAreas?.find((a) => a.id === selection.id)
    if (area) {
      title = area.name
      body = (
        <>
          <div className="badge-row">
            <Badge tone="sim">{area.kind === 'SIMULATED' ? 'Simulated' : area.kind}</Badge>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Type</dt>
              <dd>Illustrative polygon. Not observed, measured or forecast.</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{dataset.source}</dd>
            </div>
            <div>
              <dt>Scenario time</dt>
              <dd>{formatDateTime(area.observedAt)}</dd>
            </div>
          </dl>
        </>
      )
    }
  } else if (selection.type === 'team') {
    const team = dataset.teams?.find((t) => t.id === selection.id)
    if (team) {
      title = `${team.id} · ${team.name}`
      body = <TeamSummary team={team} />
    }
  }

  return (
    <div className="feature-panel">
      <div className="detail-header">
        <h2 className="detail-title small-title">{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close details" title="Close details">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {body ?? <p className="muted">This feature is no longer in the current data.</p>}
    </div>
  )
}
