import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App.jsx'
import { jsonResponse, mockFetch, RAW_INCIDENTS } from './test/helpers.js'

function renderAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('navigation', () => {
  it('landing → public report, and back', async () => {
    const user = renderAt('/')
    await user.click(screen.getByRole('link', { name: /Report an Emergency/ }))
    expect(screen.getByRole('heading', { name: 'Report a flood emergency' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Back to start/ }))
    expect(screen.getByRole('heading', { name: 'Flood Emergency Coordination' })).toBeInTheDocument()
  })

  it('landing → access verification → operations console', async () => {
    mockFetch({
      'GET /api/incidents': () => jsonResponse(200, RAW_INCIDENTS),
      'GET /api/health': () => jsonResponse(200, { status: 'ok' }),
    })
    const user = renderAt('/')
    await user.click(screen.getByRole('link', { name: /Rescue Operations/ }))
    expect(screen.getByText('Access control is not enforced')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Continue to operations console' }))
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })

  it('redirects the old dispatcher URL to the console', async () => {
    mockFetch({ 'GET /api/incidents': () => jsonResponse(200, []), 'GET /api/health': () => jsonResponse(200, { status: 'ok' }) })
    renderAt('/admin')
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument()
  })

  it('keeps the selected incident when switching views', async () => {
    mockFetch({
      'GET /api/incidents': () => jsonResponse(200, RAW_INCIDENTS),
      'GET /api/health': () => jsonResponse(200, { status: 'ok' }),
      'GET /api/incidents/INC-AAAA0001/events': () => jsonResponse(200, []),
      'GET /api/incidents/INC-AAAA0001/evidence': () => jsonResponse(200, []),
    })
    const user = renderAt('/ops/reports?incident=INC-AAAA0001')
    expect(await screen.findByRole('article', { name: 'Incident INC-AAAA0001' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Navigation menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Overview' }))
    expect(await screen.findByRole('article', { name: 'Incident INC-AAAA0001' })).toBeInTheDocument()
  })

  it('shows a not-found page for unknown URLs', () => {
    renderAt('/nope')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('Reports view states', () => {
  it('shows an error, not an empty list, when the API is unavailable', async () => {
    mockFetch({
      'GET /api/incidents': () => new TypeError('Failed to fetch'),
      'GET /api/health': () => new TypeError('Failed to fetch'),
    })
    renderAt('/ops/reports')
    expect(await screen.findByText('Reports could not be loaded.')).toBeInTheDocument()
    expect(screen.getByText(/does not mean there are no reports/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('distinguishes no reports from no matches', async () => {
    mockFetch({ 'GET /api/incidents': () => jsonResponse(200, RAW_INCIDENTS), 'GET /api/health': () => jsonResponse(200, {}) })
    const user = renderAt('/ops/reports')
    expect(await screen.findByRole('table')).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'zzz-no-match')
    expect(screen.getByText('No reports match these filters.')).toBeInTheDocument()
  })
})

describe('status update', () => {
  it('confirms, sends PATCH, and reconciles with the server list', async () => {
    let status = 'NEW'
    const fetchMock = mockFetch({
      'GET /api/incidents': () => jsonResponse(200, [{ ...RAW_INCIDENTS[0], status }]),
      'GET /api/health': () => jsonResponse(200, {}),
      'GET /api/incidents/INC-AAAA0001/events': () => jsonResponse(200, []),
      'GET /api/incidents/INC-AAAA0001/evidence': () => jsonResponse(200, []),
      'PATCH /api/incidents/INC-AAAA0001/status': (init) => {
        status = JSON.parse(init.body).status
        return jsonResponse(200, { ...RAW_INCIDENTS[0], status })
      },
    })
    const user = renderAt('/ops/reports?incident=INC-AAAA0001')
    await screen.findByRole('article', { name: 'Incident INC-AAAA0001' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'New status' }), 'VERIFIED')
    await user.click(screen.getByRole('button', { name: 'Update status' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('New → Verified')
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Change status' }))
    expect(await screen.findByText('Server confirmed status Verified.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('Verified').length).toBeGreaterThan(0))
  })

  it('shows the server error when the update is rejected', async () => {
    mockFetch({
      'GET /api/incidents': () => jsonResponse(200, [RAW_INCIDENTS[0]]),
      'GET /api/health': () => jsonResponse(200, {}),
      'GET /api/incidents/INC-AAAA0001/events': () => jsonResponse(200, []),
      'GET /api/incidents/INC-AAAA0001/evidence': () => jsonResponse(200, []),
      'PATCH /api/incidents/INC-AAAA0001/status': () => jsonResponse(403, { detail: 'nope' }),
    })
    const user = renderAt('/ops/reports?incident=INC-AAAA0001')
    await screen.findByRole('article', { name: 'Incident INC-AAAA0001' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'New status' }), 'RESOLVED')
    await user.click(screen.getByRole('button', { name: 'Update status' }))
    await user.click(screen.getByRole('button', { name: 'Change status' }))
    expect(await screen.findByText('You are not authorised to do this.')).toBeInTheDocument()
  })
})
