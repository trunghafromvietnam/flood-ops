// Distinct loading / empty / error / unavailable / denied states, so an empty
// list is never mistaken for "no emergencies" when the data simply failed to load.

import { AlertTriangle, Info, Lock, RefreshCw } from 'lucide-react'

const ICONS = { error: AlertTriangle, unavailable: Info, denied: Lock, empty: Info }

export default function StateMessage({ kind, title, children, action }) {
  if (kind === 'loading') {
    return (
      <div className="state-message state-loading" role="status">
        <RefreshCw size={16} className="spin" aria-hidden="true" />
        <span>{title ?? 'Loading…'}</span>
      </div>
    )
  }
  const Icon = ICONS[kind] ?? Info
  return (
    <div className={`state-message state-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <p className="state-title">{title}</p>}
        {children && <div className="state-body">{children}</div>}
        {action && <div className="state-action">{action}</div>}
      </div>
    </div>
  )
}
