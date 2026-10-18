import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'

export default function NotFoundPage() {
  return (
    <div className="public-page">
      <header className="public-header">
        <Link to="/" aria-label="FloodOps home">
          <Logo size={30} />
        </Link>
      </header>
      <main className="access-main">
        <div className="access-card">
          <h1 className="page-heading">Page not found</h1>
          <p className="muted">This address does not match any FloodOps page.</p>
          <div className="form-actions">
            <Link to="/" className="btn btn-primary">
              Go to start
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
