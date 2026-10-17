import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { PhoneIcon } from '../components/Icons.jsx'
import { AI_HOTLINE, CALL_SUMMARY } from '../data/mock.js'
import './SosCallPage.css'

// Demo view for judges: shows the live call and what the AI has understood so far.
// In real use the victim's phone dials the hotline directly; this summary is
// built in the background. TODO(api): fill CALL_SUMMARY from the call / AI API.
const SUMMARY_ROWS = CALL_SUMMARY

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${String(m).padStart(2, '0')}:${s}`
}

const PROGRESS_STEPS = [
  { label: 'Received', state: 'done' },
  { label: 'AI analyzed', state: 'done' },
  { label: 'Queued', state: 'current' },
  { label: 'Rescuer assigned', state: 'todo' },
]

export default function SosCallPage() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="page">
      <Navbar
        variant="dark"
        links={[{ to: '/', label: 'Back to report form' }]}
        action={<span className="btn btn-danger btn-pill sos-live">SOS MODE · LIVE</span>}
      />

      <main className="page-main sos-main">
        <div className="sos-layout">
          {/* ---------- Left: call ---------- */}
          <section className="card call-card">
            <header className="call-header">
              <div className="call-avatar">AI</div>
              <div>
                <h1 className="call-title">AI Rescue Assistant</h1>
                <p className="call-online">On the line · Powered by Photon AI</p>
              </div>
              <span className="demo-tag">DEMO VIEW · for judges</span>
            </header>

            <div className="call-body">
              <div className="call-pulse" aria-hidden="true">
                <span className="pulse-ring" />
                <span className="pulse-ring" />
                <span className="pulse-ring" />
                <div className="call-circle">
                  <PhoneIcon size={96} />
                </div>
              </div>

              <h2 className="call-status">Calling FloodOps AI line…</h2>
              <p className="call-meta">
                {AI_HOTLINE} · {formatDuration(seconds)}
              </p>
              <p className="call-listening">AI is listening and analyzing in real time</p>
            </div>

            <Link to="/" className="btn btn-danger btn-pill end-call">
              End call
            </Link>
          </section>

          {/* ---------- Right: what the AI understood ---------- */}
          <aside className="card summary-card">
            <header>
              <h2 className="summary-title">What the AI understood</h2>
              <p className="hint">Auto-extracted from the call · updates live</p>
            </header>

            <hr className="divider" />

            <dl className="summary-list">
              {SUMMARY_ROWS.map((row) => (
                <div key={row.label} className="summary-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
              <div className="summary-row">
                <dt>Urgency</dt>
                <dd>
                  <span className="badge badge-red">HIGH</span>
                </dd>
              </div>
            </dl>

            <div className="queue-box">
              <div>
                <p className="hint">In rescue queue</p>
                <p className="queue-position">#12 of 104</p>
              </div>
              <p className="queue-eta">Est. response ~25 min</p>
            </div>

            <div>
              <h3 className="progress-title">Progress</h3>
              <ol className="progress">
                {PROGRESS_STEPS.map((step) => (
                  <li key={step.label} className={`progress-step is-${step.state}`}>
                    <span className="progress-dot" />
                    <span className="progress-label">{step.label}</span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="summary-note">
              A human dispatcher reviews every AI summary before sending a rescue team. Wrong info?
              Just tell the AI on the call.
            </p>
          </aside>
        </div>

        <p className="sos-banner">
          In real use: the victim taps Call, the phone dials our hotline, the AI talks with them,
          and this summary is built in the background for rescuers.
        </p>
      </main>
    </div>
  )
}
