import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import MapPlaceholder, { MapMarker } from '../components/MapPlaceholder.jsx'
import { CLIENT_LINKS } from '../components/navLinks.js'
import { PICKED_ADDRESS } from '../data/mock.js'
import { IMAGE_TYPES, createReport, uploadEvidence } from '../api.js'
import './ReportPage.css'

// Location modes. Auto-detect is the default; the other two are optional.
const LOCATION_MODES = [
  { id: 'auto', label: 'Auto-detect (default)' },
  { id: 'type', label: 'Type address' },
  { id: 'map', label: 'Pick on map' },
]

const MODE_HINTS = {
  auto: 'Wrong spot? Typing or picking on the map is optional.',
  type: 'The map moves to the address you type.',
  map: 'The pin in the middle of the map is the spot you send.',
}

const ROLES = [
  { id: 'victim', label: 'I am the victim', reporterType: 'SELF' },
  { id: 'witness', label: 'Reporting for someone else', reporterType: 'THIRD_PARTY' },
]

const MAX_DESCRIPTION = 500

// Same rule as the backend: optional "+", then 6–31 digits, spaces or ( ) . -
const PHONE_PATTERN = /^\+?[0-9 ().-]{6,31}$/

export default function ReportPage() {
  const [mode, setMode] = useState('auto')
  const [typedAddress, setTypedAddress] = useState('')
  const [pickedAddress, setPickedAddress] = useState('')
  const [role, setRole] = useState('victim')
  const [phone, setPhone] = useState('')
  const [people, setPeople] = useState(1)
  const [photos, setPhotos] = useState([])
  const [description, setDescription] = useState('')
  const [coords, setCoords] = useState(null)
  const [geoError, setGeoError] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { id, photosSent, photosFailed }

  // Auto-detect: ask the browser for GPS once, the first time this mode is shown.
  useEffect(() => {
    if (mode !== 'auto' || coords || geoError) return
    if (!navigator.geolocation) {
      setGeoError('This browser cannot share its location. Type the address instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setGeoError('Could not get your location. Type the address or pick it on the map.'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }, [mode, coords, geoError])

  const address =
    mode === 'auto'
      ? coords
        ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
        : ''
      : mode === 'type'
        ? typedAddress
        : pickedAddress
  const phoneValid = phone.trim() === '' || PHONE_PATTERN.test(phone.trim())
  const canSubmit = address.trim() !== '' && people >= 1 && phoneValid && !sending

  function buildLocation() {
    if (mode === 'auto') return { ...coords, method: 'GPS' }
    if (mode === 'type') return { method: 'MANUAL', address_text: typedAddress.trim() }
    return { method: 'MAP_PIN', address_text: pickedAddress }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSending(true)
    setError('')
    try {
      const incident = await createReport({
        description: description.trim() || null,
        people_count: people,
        phone: phone.trim() || null,
        reporter_type: ROLES.find((r) => r.id === role).reporterType,
        location: buildLocation(),
      })
      // The report is already saved; a failed photo should not undo that.
      let photosFailed = 0
      for (const photo of photos) {
        try {
          await uploadEvidence(incident.id, photo)
        } catch {
          photosFailed += 1
        }
      }
      setResult({ id: incident.id, photosSent: photos.length - photosFailed, photosFailed })
    } catch (err) {
      setError(`Could not send the report: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  function resetForm() {
    setMode('auto')
    setTypedAddress('')
    setPickedAddress('')
    setRole('victim')
    setPhone('')
    setPeople(1)
    setPhotos([])
    setDescription('')
    setError('')
    setResult(null)
  }

  return (
    <div className="page">
      <Navbar
        links={CLIENT_LINKS}
        action={
          <Link to="/sos" className="btn btn-danger btn-pill sos-button">
            SOS · Chat / Call AI
          </Link>
        }
      />

      <main className="page-main">
        <h1 className="page-title">Report a Flood Emergency</h1>
        <p className="page-subtitle">
          Your report goes straight to rescue teams. Fields marked * are required.
        </p>

        <div className="report-layout">
          {/* ---------- Left: form or confirmation ---------- */}
          {result ? (
            <section className="card report-form report-done">
              <h2 className="done-title">Your report was sent</h2>
              <p className="page-subtitle">
                Rescue teams can see it now. Stay where you are if it is safe, and keep your phone
                on.
              </p>
              <dl className="done-summary">
                <div>
                  <dt>Report ID</dt>
                  <dd>{result.id}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{address}</dd>
                </div>
                {phone.trim() && (
                  <div>
                    <dt>Phone</dt>
                    <dd>{phone.trim()}</dd>
                  </div>
                )}
                <div>
                  <dt>People</dt>
                  <dd>{people}</dd>
                </div>
                <div>
                  <dt>Photos</dt>
                  <dd>{result.photosSent}</dd>
                </div>
              </dl>
              {result.photosFailed > 0 && (
                <p className="form-error">
                  {result.photosFailed} photo{result.photosFailed > 1 ? 's' : ''} could not be
                  uploaded. Your report was still sent.
                </p>
              )}
              <div className="done-actions">
                <Link to="/track" className="btn btn-primary">
                  Track my report
                </Link>
                <button type="button" className="btn btn-outline" onClick={resetForm}>
                  Send another report
                </button>
              </div>
            </section>
          ) : (
            <form className="card report-form" onSubmit={handleSubmit}>
              {/* 1. Location */}
              <section className="field">
                <div className="field-head">
                  <h2 className="field-label">1. Location *</h2>
                  <p className="hint">{MODE_HINTS[mode]}</p>
                </div>

                <div className="segmented" role="tablist" aria-label="Location mode">
                  {LOCATION_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="tab"
                      aria-selected={m.id === mode}
                      className={`segmented-item${m.id === mode ? ' is-active' : ''}`}
                      onClick={() => setMode(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {mode === 'auto' && (
                  <input
                    className="input"
                    readOnly
                    placeholder={geoError || 'Detecting your location…'}
                    value={coords ? `Detected: ${address}` : ''}
                    aria-label="Detected address"
                  />
                )}
                {mode === 'type' && (
                  <input
                    className="input"
                    name="address"
                    autoFocus
                    placeholder="Enter street, city or zip code"
                    value={typedAddress}
                    onChange={(e) => setTypedAddress(e.target.value)}
                    aria-label="Address"
                  />
                )}
                {mode === 'map' && (
                  <input
                    className="input"
                    readOnly
                    placeholder="No spot picked yet. Move the map, then press Pick here."
                    value={pickedAddress ? `Pinned: ${pickedAddress}` : ''}
                    aria-label="Picked address"
                  />
                )}
              </section>

              <hr className="divider" />

              {/* 2. Role */}
              <section className="field">
                <h2 className="field-label">2. Who are you? *</h2>
                <div className="chips" role="radiogroup" aria-label="Who are you">
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={role === r.id}
                      className={`chip${role === r.id ? ' is-active' : ''}`}
                      onClick={() => setRole(r.id)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </section>

              <hr className="divider" />

              {/* 3. Phone */}
              <section className="field">
                <h2 className="field-label">3. Phone number (optional)</h2>
                <input
                  className="input"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="+84 905 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!phoneValid}
                  aria-label="Phone number"
                />
                <p className={phoneValid ? 'hint' : 'form-error'}>
                  {phoneValid
                    ? 'Rescue teams use this to call you back.'
                    : 'Use digits only, with an optional + at the start.'}
                </p>
              </section>

              <hr className="divider" />

              {/* 4 + 5. People and photos side by side */}
              <div className="field-row">
                <section className="field">
                  <h2 className="field-label">4. People at location *</h2>
                  <div className="stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      aria-label="Fewer people"
                      disabled={people <= 1}
                      onClick={() => setPeople((n) => Math.max(1, n - 1))}
                    >
                      −
                    </button>
                    <input
                      className="stepper-value"
                      type="number"
                      name="people"
                      min="1"
                      value={people}
                      onChange={(e) => setPeople(Math.max(1, Number(e.target.value) || 1))}
                      aria-label="Number of people"
                    />
                    <button
                      type="button"
                      className="stepper-btn stepper-btn-primary"
                      aria-label="More people"
                      onClick={() => setPeople((n) => n + 1)}
                    >
                      +
                    </button>
                  </div>
                  <p className="hint">Incl. children, elderly, injured</p>
                </section>

                <section className="field">
                  <h2 className="field-label">5. Photos (optional)</h2>
                  <label className="upload">
                    <input
                      type="file"
                      name="photos"
                      accept={IMAGE_TYPES.join(',')}
                      capture="environment"
                      multiple
                      onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
                    />
                    {photos.length > 0
                      ? `${photos.length} photo${photos.length > 1 ? 's' : ''} added`
                      : 'Upload or take a photo'}
                  </label>
                  <p className="hint">Time and location are sent automatically.</p>
                </section>
              </div>

              <hr className="divider" />

              {/* 6. Description */}
              <section className="field">
                <h2 className="field-label">6. Description (optional)</h2>
                <div className="textarea-wrap">
                  <textarea
                    name="description"
                    rows="4"
                    maxLength={MAX_DESCRIPTION}
                    placeholder="Water level, injuries, children / elderly, pets, can you reach the roof?..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <span className="textarea-count">
                    {description.length} / {MAX_DESCRIPTION}
                  </span>
                </div>
              </section>

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="btn btn-primary submit-button" disabled={!canSubmit}>
                {sending ? 'Sending…' : 'Send Rescue Request'}
              </button>
            </form>
          )}

          {/* ---------- Right: map ---------- */}
          <MapPlaceholder className="report-map">
            <MapMarker type="pin" x={50} y={45} label="Your location" />

            <div className="map-search">
              <div className="map-search-row">
                <input
                  className="input map-search-input"
                  placeholder={
                    mode === 'map' ? 'Drag the map to move the pin' : 'City or Zip Code Search'
                  }
                  readOnly={mode === 'map'}
                />
                {mode === 'map' ? (
                  <button
                    type="button"
                    className="btn btn-danger map-search-button"
                    onClick={() => setPickedAddress(PICKED_ADDRESS)}
                  >
                    Pick here
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary map-search-button">
                    Search
                  </button>
                )}
              </div>
              <button type="button" className="link-button" onClick={() => setMode('auto')}>
                Use my location
              </button>
            </div>
          </MapPlaceholder>
        </div>
      </main>
    </div>
  )
}
