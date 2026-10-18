// Compact gear dropdown that replaces the permanent sidebar.
// Opens below the button, closes on selection, outside click or Escape,
// and supports arrow-key navigation between items.

import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Activity,
  Camera,
  ClipboardList,
  LayoutDashboard,
  MapIcon,
  Settings,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { selectionQuery } from '../state/selection.js'

export const OPS_VIEWS = [
  { to: '/ops', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/ops/reports', label: 'Reports', icon: ClipboardList },
  { to: '/ops/map', label: 'Live Map', icon: MapIcon },
  { to: '/ops/teams', label: 'Rescue Teams', icon: Users },
  { to: '/ops/drone', label: 'Drone Evidence', icon: Camera },
  { to: '/ops/activity', label: 'Activity Log', icon: Activity },
  { to: '/ops/settings', label: 'Settings', icon: SlidersHorizontal },
]

export function isActiveView(view, pathname) {
  return view.end ? pathname === view.to || pathname === `${view.to}/` : pathname.startsWith(view.to)
}

export default function GearMenu() {
  const [open, setOpen] = useState(false)
  const { pathname, search } = useLocation()
  const menuId = useId()
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const itemRefs = useRef([])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    const active = OPS_VIEWS.findIndex((v) => isActiveView(v, pathname))
    itemRefs.current[active >= 0 ? active : 0]?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, pathname])

  function onMenuKeyDown(e) {
    const items = itemRefs.current.filter(Boolean)
    const index = items.indexOf(document.activeElement)
    let next = null
    if (e.key === 'ArrowDown') next = (index + 1) % items.length
    if (e.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = items.length - 1
    if (e.key === 'Tab') setOpen(false)
    if (next !== null) {
      e.preventDefault()
      items[next].focus()
    }
  }

  const query = selectionQuery(search)

  return (
    <div className="gear" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`gear-button${open ? ' is-open' : ''}`}
        aria-label="Navigation menu"
        title="Navigation menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <Settings size={18} aria-hidden="true" />
      </button>

      <ul
        id={menuId}
        role="menu"
        aria-label="Operations views"
        className={`gear-menu${open ? ' is-open' : ''}`}
        hidden={!open}
        onKeyDown={onMenuKeyDown}
      >
        {OPS_VIEWS.map((view, i) => {
          const Icon = view.icon
          const active = isActiveView(view, pathname)
          return (
            <li role="none" key={view.to}>
              <Link
                ref={(el) => (itemRefs.current[i] = el)}
                role="menuitem"
                to={`${view.to}${query}`}
                className={`gear-item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{view.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
