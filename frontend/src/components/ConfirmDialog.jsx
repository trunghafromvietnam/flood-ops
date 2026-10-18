// Modal confirmation for consequential actions. Focus moves into the dialog,
// Escape cancels, and focus returns to the trigger when it closes.

import { useEffect, useId, useRef } from 'react'

export default function ConfirmDialog({ title, children, confirmLabel, busy, onConfirm, onCancel }) {
  const titleId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    dialogRef.current?.querySelector('[data-autofocus]')?.focus()
    return () => previous?.focus?.()
  }, [])

  function onKeyDown(e) {
    if (e.key === 'Escape' && !busy) onCancel()
    if (e.key !== 'Tab') return
    const focusable = dialogRef.current.querySelectorAll('button:not([disabled]), textarea, input, select')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy} data-autofocus>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
