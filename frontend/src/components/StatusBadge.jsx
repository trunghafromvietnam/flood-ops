// Text labels with a colour tone. Colour is never the only signal: the label is always shown.

import { statusLabel, statusTone } from '../lib/formatters.js'

export function Badge({ tone = 'neutral', children, title }) {
  return (
    <span className={`badge badge-${tone}`} title={title}>
      {children}
    </span>
  )
}

export default function StatusBadge({ status }) {
  return <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>
}

export function SimulatedTag() {
  return (
    <Badge tone="sim" title="Synthetic record from the demo scenario">
      Simulated
    </Badge>
  )
}
