import { Link, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { ADMIN_LINKS, CLIENT_LINKS } from '../components/navLinks.js'
import './ComingSoonPage.css'

const TITLES = {
  '/how-it-works': 'How it works',
  '/track': 'Track my report',
  '/admin/reports': 'Reports',
  '/admin/teams': 'Rescue teams',
}

// Placeholder for pages that are planned but not built yet.
export default function ComingSoonPage() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const title = TITLES[pathname] ?? 'Page not found'

  return (
    <div className="page">
      <Navbar links={isAdmin ? ADMIN_LINKS : CLIENT_LINKS} />
      <main className="page-main coming-soon">
        <div className="card coming-soon-card">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">This page is coming soon.</p>
          <Link to={isAdmin ? '/admin' : '/'} className="btn btn-primary">
            {isAdmin ? 'Back to live map' : 'Back to report form'}
          </Link>
        </div>
      </main>
    </div>
  )
}
