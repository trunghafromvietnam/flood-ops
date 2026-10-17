import { NavLink, Link } from 'react-router-dom'
import { DropLogo } from './Icons.jsx'
import './Navbar.css'

// variant: "light" (client form, admin) | "dark" (SOS call page)
export default function Navbar({ variant = 'light', links = [], action }) {
  return (
    <header className={`navbar navbar-${variant}`}>
      <Link to="/" className="navbar-brand">
        <DropLogo size={40} />
        <span>FloodOps</span>
      </Link>

      <nav className="navbar-links">
        {links.map((link) => (
          <NavLink key={link.to + link.label} to={link.to} end className="navbar-link">
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="navbar-action">{action}</div>
    </header>
  )
}
