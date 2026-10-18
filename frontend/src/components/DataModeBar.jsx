// Banner under the header: live-data errors / staleness, the simulation label,
// and replay transport controls. Shown only when there is something to say.

import { AlertTriangle, Pause, Play, RefreshCw, RotateCcw, SkipForward } from 'lucide-react'
import { useOps } from '../state/OpsData.jsx'
import { formatDateTime, formatTime } from '../lib/formatters.js'

export default function DataModeBar() {
  const { mode, dataset, refresh, setMode, replay, scenario } = useOps()

  if (mode === 'LIVE') {
    if (dataset.error) {
      return (
        <div className="mode-bar mode-bar-error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            Live data could not be loaded: {dataset.error.message}
            {dataset.lastSuccess
              ? ` Showing records from ${formatTime(dataset.lastSuccess)} (stale).`
              : ' No records are shown.'}
          </span>
          <button type="button" className="btn btn-small btn-secondary" onClick={refresh}>
            <RefreshCw size={14} aria-hidden="true" /> Retry
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setMode('SIMULATION')}>
            Switch to simulation
          </button>
        </div>
      )
    }
    if (dataset.stale) {
      return (
        <div className="mode-bar mode-bar-warning" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Data may be out of date. Last successful update {formatTime(dataset.lastSuccess)}.</span>
        </div>
      )
    }
    return null
  }

  const label = `${mode === 'REPLAY' ? 'REPLAY' : 'SIMULATION'} · synthetic data · ${scenario.name}`

  return (
    <div className="mode-bar mode-bar-sim" role="status">
      <strong className="sim-label">{label}</strong>
      <span className="sim-clock">Scenario time {formatDateTime(dataset.clock)}</span>
      {mode === 'REPLAY' && (
        <div className="replay-controls" aria-label="Replay controls">
          <span className="replay-progress">
            Event {replay.cursor} of {replay.total}
          </span>
          {replay.cursor === 0 ? (
            <button type="button" className="btn btn-small btn-secondary" onClick={() => replay.action('start')}>
              <Play size={14} aria-hidden="true" /> Start
            </button>
          ) : replay.playing ? (
            <button type="button" className="btn btn-small btn-secondary" onClick={() => replay.action('pause')}>
              <Pause size={14} aria-hidden="true" /> Pause
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-small btn-secondary"
              onClick={() => replay.action('resume')}
              disabled={replay.cursor >= replay.total}
            >
              <Play size={14} aria-hidden="true" /> Resume
            </button>
          )}
          <button
            type="button"
            className="btn btn-small btn-secondary"
            onClick={() => replay.action('next')}
            disabled={replay.cursor >= replay.total}
          >
            <SkipForward size={14} aria-hidden="true" /> Next event
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => replay.action('reset')}>
            <RotateCcw size={14} aria-hidden="true" /> Reset
          </button>
        </div>
      )}
      <button type="button" className="btn btn-small btn-ghost" onClick={() => setMode('LIVE')}>
        Return to live
      </button>
    </div>
  )
}
