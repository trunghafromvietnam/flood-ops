import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import MapPlaceholder, { MapMarker } from '../components/MapPlaceholder.jsx'
import { CLIENT_LINKS } from '../components/navLinks.js'
import { DETECTED_ADDRESS, PICKED_ADDRESS } from '../data/mock.js'
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
  { id: 'victim', label: 'I am the victim' },
  { id: 'witness', label: 'Reporting for someone else' },
]

const MAX_DESCRIPTION = 500

export default function ReportPage() {
  const [mode, setMode] = useState('auto')
  const [typedAddress, setTypedAddress] = useState('')
  const [pickedAddress, setPickedAddress] = useState('')
  const [role, setRole] = useState('victim')
  const [people, setPeople] = useState(1)
  const [photos, setPhotos] = useState([])
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const address =
    mode === 'auto' ? DETECTED_ADDRESS : mode === 'type' ? typedAddress : pickedAddress
  const canSubmit = address.trim() !== '' && people >= 1

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    // TODO(api): POST the report (address, role, people, photos, description) to the backend.
    setSubmitted(true)
  }

  function resetForm() {
    setMode('auto')
    setTypedAddress('')
    setPickedAddress('')
    setRole('victim')
    setPeople(1)
    setPhotos([])
    setDescription('')
    setSubmitted(false)
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
          {submitted ? (
            <section className="card report-form report-done">
              <h2 className="done-title">Your report was sent</h2>
              <p className="page-subtitle">
                Rescue teams can see it now. Stay where you are if it is safe, and keep your phone
                on.
              </p>
              <dl className="done-summary">
                <div>
                  <dt>Location</dt>
                  <dd>{address}</dd>
                </div>
                <div>
                  <dt>People</dt>
                  <dd>{people}</dd>
                </div>
                <div>
                  <dt>Photos</dt>
                  <dd>{photos.length}</dd>
                </div>
              </dl>
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
                    value={`Detected: ${DETECTED_ADDRESS}`}
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

              {/* 3 + 4. People and photos side by side */}
              <div className="field-row">
                <section className="field">
                  <h2 className="field-label">3. People at location *</h2>
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
                  <h2 className="field-label">4. Photos (optional)</h2>
                  <label className="upload">
                    <input
                      type="file"
                      name="photos"
                      accept="image/*"
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

              {/* 5. Description */}
              <section className="field">
                <h2 className="field-label">5. Description (optional)</h2>
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

              <button type="submit" className="btn btn-primary submit-button" disabled={!canSubmit}>
                Send Rescue Request
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
