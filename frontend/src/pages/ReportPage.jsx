// Public emergency report: form (left) + interactive map (right).
// Always talks to the live backend. Success is shown only after the server
// confirms, with the ID the server returned.

import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Crosshair, FileText, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { LIMITS } from '../api/contracts.js'
import { createReport, uploadIncidentEvidence } from '../api/floodops.js'
import { searchPlace } from '../api/geocoder.js'
import Logo from '../components/Logo.jsx'
import { MapLegend } from '../components/MapOverlays.jsx'
import MapView from '../map/MapView.jsx'
import { formatCoords, locationMethodLabel } from '../lib/formatters.js'
import {
  REPORTED_SEVERITIES,
  WATER_LEVELS,
  buildReportDescription,
  validateReportForm,
} from '../lib/validation.js'

const EMPTY_FORM = {
  reporterType: 'SELF',
  coords: null,
  locationMethod: null, // 'GPS' | 'MAP_PIN'
  accuracy: null,
  addressText: '',
  waterLevel: '',
  severity: '',
  peopleText: '',
  description: '',
  phone: '',
  photos: [],
}

const GEO_MESSAGES = {
  requesting: 'Requesting your location. Your browser may ask for permission.',
  denied: 'Location permission was denied. Pick the point on the map or describe the place instead.',
  unavailable: 'Your device could not determine its location. Pick the point on the map or describe the place.',
  timeout: 'Getting your location took too long. Try again, or pick the point on the map.',
  unsupported: 'This browser cannot share its location. Pick the point on the map or describe the place.',
}

export default function ReportPage() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [geoState, setGeoState] = useState(null)
  const [picking, setPicking] = useState(false)
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeNote, setPlaceNote] = useState(null)
  const [focus, setFocus] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState(null)
  const inFlight = useRef(false)
  const fileInput = useRef(null)
  const errorSummary = useRef(null)

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))
  const descriptionPrefixLength = buildReportDescription({ ...form, description: '' }).length
  const descriptionMax = LIMITS.descriptionMax - descriptionPrefixLength - (descriptionPrefixLength ? 2 : 0)

  function requestCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoState('unsupported')
      return
    }
    setGeoState('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        update({ coords, locationMethod: 'GPS', accuracy: Math.round(pos.coords.accuracy) })
        setGeoState(null)
        setPicking(false)
        setFocus({ coords, zoom: 15, key: `gps-${Date.now()}` })
      },
      (err) => setGeoState(err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    )
  }

  function onMapClick(coords) {
    if (!picking) return
    update({ coords, locationMethod: 'MAP_PIN', accuracy: null })
    setPicking(false)
  }

  async function findPlace(e) {
    e.preventDefault()
    if (!placeQuery.trim()) return
    setPlaceNote({ kind: 'info', text: 'Searching…' })
    try {
      const results = await searchPlace(placeQuery)
      if (!results.length) {
        setPlaceNote({ kind: 'error', text: 'No place found. Describe the location in the text field instead.' })
        return
      }
      setFocus({ coords: results[0].coords, zoom: 14, key: `place-${Date.now()}` })
      setPicking(true)
      setPlaceNote({
        kind: 'info',
        text: `Map moved to ${results[0].label}. Tap the map to mark the exact point. The search result itself is not sent.`,
      })
    } catch (error) {
      setPlaceNote({ kind: 'error', text: error.message })
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (inFlight.current) return // duplicate-submit guard (double click, Enter key)
    const { errors: found, payload } = validateReportForm(form)
    setErrors(found)
    setSubmitError('')
    if (!payload) {
      requestAnimationFrame(() => errorSummary.current?.focus())
      return
    }

    inFlight.current = true
    setSubmitting(true)
    try {
      const incident = await createReport(payload)
      // The report is saved; a failed photo must not undo or hide that.
      let photosFailed = 0
      for (const photo of form.photos) {
        try {
          await uploadIncidentEvidence(incident.id, photo)
        } catch {
          photosFailed += 1
        }
      }
      setResult({ incident, photosSent: form.photos.length - photosFailed, photosFailed })
    } catch (error) {
      setSubmitError(
        error.isValidation
          ? `The server did not accept the report: ${error.message}`
          : `The report was not sent. ${error.message} Your answers are kept; try again.`,
      )
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  function startOver() {
    setForm(EMPTY_FORM)
    setErrors({})
    setResult(null)
    setSubmitError('')
    setGeoState(null)
    setPlaceNote(null)
    setPlaceQuery('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const errorList = Object.values(errors)

  return (
    <div className="public-page report-page">
      <header className="public-header">
        <Link to="/" aria-label="FloodOps home">
          <Logo size={28} />
        </Link>
        <Link to="/" className="btn btn-ghost btn-small">
          <ArrowLeft size={14} aria-hidden="true" /> Back to start
        </Link>
      </header>

      <main className="report-layout">
        <section className="report-panel" aria-labelledby="report-title">
          <h1 id="report-title" className="page-heading">
            Report a flood emergency
          </h1>
          <p className="guidance">
            If you are in immediate danger, also contact local emergency services by any means available. FloodOps is
            not an official emergency hotline.
          </p>

          {result ? (
            <div className="report-success" role="status" aria-live="polite">
              <h2 className="section-heading">Report received</h2>
              <p>
                The FloodOps server recorded your report as <strong className="incident-id">{result.incident.id}</strong>.
              </p>
              <p className="muted">
                Receiving a report does not mean a rescue team has been sent. Rescue coordinators review reports and
                may call you back if you gave a phone number.
              </p>
              {form.photos.length > 0 && (
                <p className={result.photosFailed ? 'form-error' : 'muted'}>
                  Photos uploaded: {result.photosSent} of {form.photos.length}
                  {result.photosFailed > 0 && '. Some photos could not be uploaded; the report itself was saved.'}
                </p>
              )}
              <div className="form-actions">
                <button type="button" className="btn btn-primary" onClick={startOver}>
                  Submit another report
                </button>
                <Link to="/" className="btn btn-ghost">
                  Back to start
                </Link>
              </div>
            </div>
          ) : (
            <form className="report-form" onSubmit={onSubmit} noValidate>
              {errorList.length > 0 && (
                <div className="error-summary" role="alert" tabIndex={-1} ref={errorSummary}>
                  <p className="state-title">Please fix the following:</p>
                  <ul>
                    {errorList.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              <fieldset className="form-section">
                <legend className="section-label">Who are you reporting for?</legend>
                <div className="segmented">
                  {[
                    ['SELF', 'I need help'],
                    ['THIRD_PARTY', 'I am reporting for someone else'],
                  ].map(([value, label]) => (
                    <label key={value} className={`segmented-item${form.reporterType === value ? ' is-active' : ''}`}>
                      <input
                        type="radio"
                        name="reporterType"
                        value={value}
                        checked={form.reporterType === value}
                        onChange={() => update({ reporterType: value })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="form-section" aria-describedby="location-status">
                <legend className="section-label">Incident location *</legend>
                <div className="button-row">
                  <button type="button" className="btn btn-secondary btn-small" onClick={requestCurrentLocation} disabled={geoState === 'requesting'}>
                    <LocateFixed size={14} aria-hidden="true" /> Use current location
                  </button>
                  <button
                    type="button"
                    className={`btn btn-small ${picking ? 'btn-primary' : 'btn-secondary'}`}
                    aria-pressed={picking}
                    onClick={() => setPicking((v) => !v)}
                  >
                    <Crosshair size={14} aria-hidden="true" /> {picking ? 'Tap the map…' : 'Select on map'}
                  </button>
                  {form.coords && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => update({ coords: null, locationMethod: null, accuracy: null })}
                    >
                      <X size={14} aria-hidden="true" /> Clear point
                    </button>
                  )}
                </div>

                <div id="location-status" className={`location-status${form.coords ? ' has-point' : ''}`} aria-live="polite">
                  {form.coords ? (
                    <>
                      <MapPin size={14} aria-hidden="true" />
                      <span>
                        {formatCoords(form.coords)}
                        <span className="muted block small">
                          {locationMethodLabel(form.locationMethod)}
                          {form.accuracy != null && ` · accuracy about ±${form.accuracy} m`}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className="muted">No coordinates selected. A place description below is enough.</span>
                  )}
                </div>
                {geoState && <p className={geoState === 'requesting' ? 'hint' : 'form-error'}>{GEO_MESSAGES[geoState]}</p>}

                <label className="field">
                  <span className="label">Place name, address or landmark</span>
                  <input
                    className="input"
                    value={form.addressText}
                    onChange={(e) => update({ addressText: e.target.value })}
                    placeholder="e.g. house near the bridge, Kien Giang, Le Thuy"
                    aria-invalid={Boolean(errors.location)}
                    autoComplete="street-address"
                  />
                </label>
                {errors.location && <p className="form-error">{errors.location}</p>}
              </fieldset>

              <div className="form-section form-pair">
                <label className="field">
                  <span className="label">Reported water level</span>
                  <select className="input" value={form.waterLevel} onChange={(e) => update({ waterLevel: e.target.value })}>
                    {WATER_LEVELS.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="label">Reported severity</span>
                  <select className="input" value={form.severity} onChange={(e) => update({ severity: e.target.value })}>
                    {REPORTED_SEVERITIES.map((o) => (
                      <option key={o.label} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="hint">Water level and severity are added to the start of your description.</p>

              <div className="form-section form-pair">
                <div className="field">
                  <label className="label" htmlFor="report-people">
                    People requiring assistance
                  </label>
                  <input
                    id="report-people"
                    className="input"
                    inputMode="numeric"
                    value={form.peopleText}
                    onChange={(e) => update({ peopleText: e.target.value })}
                    aria-invalid={Boolean(errors.people)}
                    aria-describedby="people-hint"
                  />
                  <span id="people-hint" className="hint">
                    Leave empty if unknown.
                  </span>
                  {errors.people && <span className="form-error">{errors.people}</span>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="report-phone">
                    Call-back phone (optional)
                  </label>
                  <input
                    id="report-phone"
                    className="input"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    placeholder="+84 …"
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone && <span className="form-error">{errors.phone}</span>}
                </div>
              </div>

              <div className="field form-section">
                <label className="label" htmlFor="report-description">
                  Describe the situation
                </label>
                <textarea
                  id="report-description"
                  aria-describedby="description-count"
                  className="input"
                  rows={4}
                  maxLength={Math.max(0, descriptionMax)}
                  value={form.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Describe the location, current conditions, immediate dangers, and assistance required."
                  aria-invalid={Boolean(errors.description)}
                />
                <span id="description-count" className="hint">
                  {form.description.length} / {Math.max(0, descriptionMax)} characters
                </span>
                {errors.description && <span className="form-error">{errors.description}</span>}
              </div>

              <div className="field form-section">
                <label className="label" htmlFor="report-photos">
                  Photos (optional)
                </label>
                <input
                  id="report-photos"
                  aria-describedby="photos-hint"
                  ref={fileInput}
                  type="file"
                  accept={LIMITS.imageTypes.join(',')}
                  multiple
                  onChange={(e) => update({ photos: Array.from(e.target.files ?? []) })}
                  aria-invalid={Boolean(errors.photos)}
                />
                <span id="photos-hint" className="hint">
                  JPEG, PNG or WEBP, up to 10 MB each. Uploaded after the report is saved.
                </span>
                {errors.photos && <span className="form-error">{errors.photos}</span>}
              </div>

              {submitError && (
                <p className="form-error submit-error" role="alert">
                  {submitError}
                </p>
              )}

              <button type="submit" className="btn btn-danger btn-block" disabled={submitting} aria-busy={submitting}>
                <FileText size={16} aria-hidden="true" />
                {submitting ? 'Sending report…' : 'Submit Emergency Report'}
              </button>
            </form>
          )}
        </section>

        <MapView
          className={`report-map${picking ? ' is-picking' : ''}`}
          label="Report location map"
          incidents={[]}
          reportPoint={form.coords}
          onMapClick={onMapClick}
          focus={focus}
        >
          <form className="map-overlay map-overlay-top-left map-search" role="search" onSubmit={findPlace}>
            <input
              className="input"
              type="search"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder="Find a place on the map"
              aria-label="Find a place on the map"
            />
            <button type="submit" className="btn btn-primary btn-small" aria-label="Find place">
              <Search size={14} aria-hidden="true" />
            </button>
          </form>
          {(placeNote || picking) && (
            <p className={`map-note map-note-top${placeNote?.kind === 'error' ? ' is-error' : ''}`} role="status">
              {placeNote?.text ?? 'Tap the map to mark the incident location.'}
            </p>
          )}
          <div className="map-overlay map-overlay-bottom-left">
            <MapLegend showIncidents={false} showTeams={false} showFlood={false} showReportPoint />
          </div>
        </MapView>
      </main>
    </div>
  )
}
