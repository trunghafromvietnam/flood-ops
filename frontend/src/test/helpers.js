import { vi } from 'vitest'

export function jsonResponse(status, body) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// routes: { 'GET /api/incidents': (init) => Response | Promise<Response> | Error }
export function mockFetch(routes) {
  const fn = vi.fn(async (url, init = {}) => {
    const path = String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0]
    const key = `${init.method ?? 'GET'} ${path}`
    const handler = routes[key] ?? routes[`* ${path}`]
    if (!handler) return jsonResponse(404, { detail: 'Not Found' })
    const result = await handler(init)
    if (result instanceof Error) throw result
    return result
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

export const RAW_INCIDENTS = [
  {
    id: 'INC-AAAA0001',
    description: 'Water rising',
    people_count: 3,
    phone: null,
    reporter_type: 'SELF',
    status: 'NEW',
    latitude: 17.4689,
    longitude: 106.6223,
    location_method: 'GPS',
    address_text: null,
    created_at: '2026-10-18T01:00:00.000000',
    updated_at: '2026-10-18T01:00:00.000000',
  },
  {
    id: 'CALL-BBBB0002',
    description: 'Caller stranded',
    people_count: null,
    phone: '+84 905 000 000',
    reporter_type: 'PHONE_CALL',
    status: 'NEEDS_REVIEW',
    latitude: null,
    longitude: null,
    location_method: 'VOICE',
    address_text: 'Near the market',
    created_at: '2026-10-18T02:00:00.000000',
    updated_at: '2026-10-18T02:00:00.000000',
  },
]
