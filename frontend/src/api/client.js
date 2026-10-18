// Centralised HTTP client for the FloodOps backend.
// Every request has a timeout, can be cancelled, and fails with an ApiError
// whose message is safe to show to users (no stack traces or server internals).

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config.js'

export class ApiError extends Error {
  // kind: 'network' | 'timeout' | 'http' | 'parse' | 'aborted'
  constructor(kind, message, { status = null, detail = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.detail = detail
  }

  get isValidation() {
    return this.status === 400 || this.status === 422
  }

  get isAuth() {
    return this.status === 401 || this.status === 403
  }
}

// FastAPI sends `detail` as a string (HTTPException) or a list (validation errors).
export function describeHttpError(status, body) {
  const detail = body?.detail
  if (status === 401 || status === 403) return 'You are not authorised to do this.'
  if (status === 404) return typeof detail === 'string' ? detail : 'Not found.'
  if (status >= 500) return 'The server had a problem. Try again shortly.'
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc.filter((p) => p !== 'body').join('.') : ''
        return field ? `${field}: ${d.msg}` : d.msg
      })
      .join('; ')
  }
  return `Request failed (${status}).`
}

export async function request(path, { method = 'GET', json, form, signal, timeoutMs } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs ?? REQUEST_TIMEOUT_MS)
  const onAbort = () => controller.abort('aborted')
  signal?.addEventListener('abort', onAbort)

  const init = { method, signal: controller.signal, headers: {} }
  if (json !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(json)
  } else if (form) {
    init.body = form // browser sets the multipart boundary
  }

  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init)
  } catch {
    if (controller.signal.aborted) {
      throw controller.signal.reason === 'timeout'
        ? new ApiError('timeout', 'The server did not respond in time.')
        : new ApiError('aborted', 'Request cancelled.')
    }
    throw new ApiError('network', 'Cannot reach the FloodOps server. Check your connection.')
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', onAbort)
  }

  const text = await res.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      if (res.ok) throw new ApiError('parse', 'The server sent an unreadable response.')
    }
  }

  if (!res.ok) {
    throw new ApiError('http', describeHttpError(res.status, body), {
      status: res.status,
      detail: body?.detail ?? null,
    })
  }
  return body
}
