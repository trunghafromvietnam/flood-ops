// Preferences and transparent configuration. Only settings with a real effect are shown.

import { useState } from 'react'
import { useGoBack } from '../../state/selection.js'
import { getVersion } from 'maplibre-gl'
import { API_BASE_URL, APP_VERSION, GEOCODER_URL, MAP_STYLE_URL } from '../../config.js'
import { formatDateTime, MODE_LABELS } from '../../lib/formatters.js'
import { MODES, useOps } from '../../state/OpsData.jsx'
import { REFRESH_CHOICES } from '../../state/preferences.js'

const MODE_HELP = {
  LIVE: 'Data from the FloodOps backend. Status changes and uploads are sent to the server.',
  SIMULATION: 'The complete synthetic scenario. Read-only. Nothing is sent to the backend.',
  REPLAY: 'The synthetic scenario event by event, with start, pause, next and reset controls. Read-only.',
}

function safeMapLibreVersion() {
  try {
    return getVersion()
  } catch {
    return 'unknown'
  }
}

export default function SettingsPage() {
  const { mode, setMode, preferences, updatePreferences, health, scenario } = useOps()
  const goBack = useGoBack()
  const [draft, setDraft] = useState(preferences)
  const [saveError, setSaveError] = useState('')

  function save(e) {
    e.preventDefault()
    if (updatePreferences(draft)) goBack()
    else setSaveError('Preferences could not be saved in this browser.')
  }

  return (
    <div className="content-page settings">
      <h1 className="page-heading">Settings</h1>

      <section className="panel-block" id="data-mode" aria-labelledby="mode-title">
        <h2 id="mode-title" className="section-heading">
          Data mode
        </h2>
        <p className="muted small">Applies immediately to this session only. Reloading the page returns to Live.</p>
        <fieldset className="radio-list">
          <legend className="visually-hidden">Operating mode</legend>
          {MODES.map((m) => (
            <label key={m} className={`radio-card${mode === m ? ' is-active' : ''}`}>
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
              <span>
                <strong>{MODE_LABELS[m]}</strong>
                <span className="muted block small">{MODE_HELP[m]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="muted small">Scenario: {scenario.name}</p>
      </section>

      <form className="panel-block" onSubmit={save} aria-labelledby="prefs-title">
        <h2 id="prefs-title" className="section-heading">
          Local preferences
        </h2>
        <p className="muted small">Stored in this browser only. They do not change server behaviour or access.</p>

        <fieldset className="checkbox-list">
          <legend className="label">Map layers shown by default</legend>
          {[
            ['incidents', 'Incident reports'],
            ['teams', 'Rescue teams (when a source exists)'],
            ['flood', 'Flood extent (when a source exists)'],
          ].map(([id, label]) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={draft.layers[id]}
                onChange={(e) => setDraft({ ...draft, layers: { ...draft.layers, [id]: e.target.checked } })}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <label className="field-inline">
          <span>Live refresh interval</span>
          <select
            className="input"
            value={draft.refreshSeconds}
            onChange={(e) => setDraft({ ...draft, refreshSeconds: Number(e.target.value) })}
          >
            {REFRESH_CHOICES.map((s) => (
              <option key={s} value={s}>
                Every {s} seconds
              </option>
            ))}
          </select>
        </label>

        {saveError && <p className="form-error">{saveError}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Save preferences
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => goBack()}>
            Cancel
          </button>
        </div>
      </form>

      <section className="panel-block" aria-labelledby="conn-title">
        <h2 id="conn-title" className="section-heading">
          Connection
        </h2>
        <dl className="detail-list">
          <div>
            <dt>API base URL</dt>
            <dd>{API_BASE_URL || 'Same origin (/api, proxied in development)'}</dd>
          </div>
          <div>
            <dt>Health check</dt>
            <dd>
              {mode !== 'LIVE'
                ? 'Not running outside Live mode'
                : health.state === 'ok'
                  ? `Reachable at ${formatDateTime(health.checkedAt)}`
                  : health.state === 'down'
                    ? `Unavailable at ${formatDateTime(health.checkedAt)}`
                    : 'Checking…'}
            </dd>
          </div>
          <div>
            <dt>Updates</dt>
            <dd>Polling every {preferences.refreshSeconds} s (the backend has no push channel).</dd>
          </div>
          <div>
            <dt>Authentication</dt>
            <dd>None. The backend does not authenticate requests.</dd>
          </div>
        </dl>
      </section>

      <section className="panel-block" aria-labelledby="about-title">
        <h2 id="about-title" className="section-heading">
          Application
        </h2>
        <dl className="detail-list">
          <div>
            <dt>Version</dt>
            <dd>FloodOps frontend {APP_VERSION}</dd>
          </div>
          <div>
            <dt>Map library</dt>
            <dd>MapLibre GL JS {safeMapLibreVersion()}</dd>
          </div>
          <div>
            <dt>Base map</dt>
            <dd>{MAP_STYLE_URL} (OpenFreeMap, OpenMapTiles schema, © OpenStreetMap contributors)</dd>
          </div>
          <div>
            <dt>Place search</dt>
            <dd>{GEOCODER_URL} (used only for map orientation, never as a verified position)</dd>
          </div>
          <div>
            <dt>Boundaries</dt>
            <dd>No administrative boundary dataset is loaded. The initial view is an approximate box around historical Quang Binh.</dd>
          </div>
        </dl>
        <p className="muted small">FloodOps is a prototype. It is not an official emergency service or a certified dispatch system.</p>
      </section>
    </div>
  )
}
