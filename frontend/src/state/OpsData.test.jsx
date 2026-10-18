import { describe, expect, it } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'
import { jsonResponse, mockFetch, RAW_INCIDENTS } from '../test/helpers.js'
import { lastMap } from '../test/maplibreMock.js'

function renderAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('data modes', () => {
  it('live mode never falls back to synthetic data when the API fails', async () => {
    mockFetch({
      'GET /api/incidents': () => new TypeError('Failed to fetch'),
      'GET /api/health': () => new TypeError('Failed to fetch'),
    })
    renderAt('/ops/reports')
    expect(await screen.findByText(/Live data could not be loaded/)).toBeInTheDocument()
    expect(screen.queryByText(/SIM-/)).not.toBeInTheDocument()
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Switch to simulation' })).toBeInTheDocument()
  })

  it('switching to simulation is explicit and visibly labelled', async () => {
    const fetchMock = mockFetch({
      'GET /api/incidents': () => new TypeError('Failed to fetch'),
      'GET /api/health': () => new TypeError('Failed to fetch'),
    })
    const user = renderAt('/ops/reports')
    await user.click(await screen.findByRole('button', { name: 'Switch to simulation' }))
    expect(screen.getByText('SIMULATION')).toBeInTheDocument()
    expect(screen.getByText(/SIMULATION · synthetic data/)).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('SIM-INC-001')).toBeInTheDocument()
    expect(within(table).getAllByText('Simulated').length).toBeGreaterThan(0)

    // No backend calls are made while in simulation.
    const callsBefore = fetchMock.mock.calls.length
    await user.click(within(table).getByRole('button', { name: 'SIM-INC-001' }))
    expect(screen.getByText(/Status changes are disabled in simulation/)).toBeInTheDocument()
    expect(fetchMock.mock.calls.length).toBe(callsBefore)
  })

  it('live data stays live: synthetic records never appear next to backend records', async () => {
    mockFetch({ 'GET /api/incidents': () => jsonResponse(200, RAW_INCIDENTS), 'GET /api/health': () => jsonResponse(200, {}) })
    renderAt('/ops/reports')
    const table = await screen.findByRole('table')
    expect(within(table).getByText('INC-AAAA0001')).toBeInTheDocument()
    expect(within(table).queryByText(/SIM-/)).not.toBeInTheDocument()
  })

  it('replay is deterministic and reset restores the initial state', async () => {
    mockFetch({ 'GET /api/incidents': () => jsonResponse(200, []), 'GET /api/health': () => jsonResponse(200, {}) })
    const user = renderAt('/ops/settings')
    await user.click(screen.getByRole('radio', { name: /Replay/ }))
    expect(screen.getByText('Event 0 of 14')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    await user.click(screen.getByRole('button', { name: 'Next event' }))
    expect(screen.getByText('Event 2 of 14')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByText('Event 0 of 14')).toBeInTheDocument()
  })
})

describe('overview map interactions', () => {
  it('focuses the map for events with coordinates and not for events without', async () => {
    mockFetch({
      'GET /api/incidents': () => jsonResponse(200, RAW_INCIDENTS),
      'GET /api/health': () => jsonResponse(200, {}),
      '* /api/incidents/INC-AAAA0001/events': () => jsonResponse(200, []),
      '* /api/incidents/INC-AAAA0001/evidence': () => jsonResponse(200, []),
      '* /api/incidents/CALL-BBBB0002/events': () => jsonResponse(200, []),
      '* /api/incidents/CALL-BBBB0002/evidence': () => jsonResponse(200, []),
    })
    const user = renderAt('/ops')
    const map = lastMap()
    act(() => map.fire('style.load'))
    await screen.findByText('Caller stranded')

    await user.click(screen.getByText('Caller stranded').closest('button'))
    expect(map.calls.filter(([name]) => name === 'flyTo')).toHaveLength(0)
    expect(await screen.findByRole('article', { name: 'Incident CALL-BBBB0002' })).toBeInTheDocument()

    await user.click(screen.getByText('Water rising').closest('button'))
    const flights = map.calls.filter(([name]) => name === 'flyTo')
    expect(flights).toHaveLength(1)
    expect(flights[0][1].center).toEqual([106.6223, 17.4689])
  })

  it('draws markers only for incidents with coordinates', async () => {
    mockFetch({ 'GET /api/incidents': () => jsonResponse(200, RAW_INCIDENTS), 'GET /api/health': () => jsonResponse(200, {}) })
    renderAt('/ops')
    const map = lastMap()
    act(() => map.fire('style.load'))
    await screen.findByText('Caller stranded')
    expect(map.getSource('incidents').data.features.map((f) => f.properties.id)).toEqual(['INC-AAAA0001'])
  })

  it('keeps working when base-map tiles fail', async () => {
    mockFetch({ 'GET /api/incidents': () => jsonResponse(200, RAW_INCIDENTS), 'GET /api/health': () => jsonResponse(200, {}) })
    renderAt('/ops')
    const map = lastMap()
    act(() => map.fire('error', { error: { status: 503 } }))
    expect(map.calls.some(([name]) => name === 'setStyle')).toBe(true)
    expect(screen.getByText(/Base map tiles could not be loaded/)).toBeInTheDocument()
    act(() => map.fire('style.load'))
    await screen.findByText('Caller stranded')
    expect(map.getSource('incidents').data.features).toHaveLength(1)
  })
})
