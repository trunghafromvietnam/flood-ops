// The selected incident / team lives in the URL (?incident=ID, ?team=ID), so it is
// shared across views, survives back/forward, and is never copied between pages.

import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Back within the app; falls back to a route when the page was opened directly
// (react-router keeps the history index in history.state.idx).
export function useGoBack(fallback = '/ops') {
  const navigate = useNavigate()
  return useCallback(() => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate(fallback)
  }, [navigate, fallback])
}

function useParam(name) {
  const [params, setParams] = useSearchParams()
  const value = params.get(name)
  const setValue = useCallback(
    (next, { replace = false } = {}) => {
      setParams(
        (prev) => {
          const copy = new URLSearchParams(prev)
          if (next) copy.set(name, next)
          else copy.delete(name)
          return copy
        },
        { replace },
      )
    },
    [name, setParams],
  )
  return [value, setValue]
}

export const useSelectedIncident = () => useParam('incident')
export const useSelectedTeam = () => useParam('team')

// Query string to carry the selection when switching views.
export function selectionQuery(search) {
  const params = new URLSearchParams(search)
  const keep = new URLSearchParams()
  for (const key of ['incident', 'team']) {
    if (params.get(key)) keep.set(key, params.get(key))
  }
  const text = keep.toString()
  return text ? `?${text}` : ''
}
