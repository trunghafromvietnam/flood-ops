// Access step before the operations console. The backend has no authentication,
// so this screen does not ask for credentials it cannot check: it states plainly
// that access is not enforced. Real authorization must be built on the server.

import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import StateMessage from '../components/StateMessage.jsx'

export default function AccessPage() {
  return (
    <div className="public-page access">
      <header className="public-header">
        <Link to="/" aria-label="FloodOps home">
          <Logo size={30} />
        </Link>
      </header>

      <main className="access-main">
        <div className="access-card">
          <Lock size={22} aria-hidden="true" />
          <h1 className="page-heading">Rescue operations access</h1>
          <StateMessage kind="error" title="Access control is not enforced">
            The FloodOps backend has no authentication. This console and its API are open to anyone who can reach
            them. Do not expose it publicly or use it with real personal data until server-side authorization exists.
          </StateMessage>
          <p className="muted small">
            When the backend adds authentication, this page will ask for the verification it requires. No access code
            is stored in this application.
          </p>
          <div className="form-actions">
            <Link to="/ops" className="btn btn-primary">
              Continue to operations console
            </Link>
            <Link to="/" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
