import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ReportPage from './ReportPage.jsx'
import { jsonResponse, mockFetch, RAW_INCIDENTS } from '../test/helpers.js'
import { lastMap } from '../test/maplibreMock.js'

function setup() {
  render(
    <MemoryRouter>
      <ReportPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const placeInput = () => screen.getByRole('textbox', { name: 'Place name, address or landmark' })
const submit = () => screen.getByRole('button', { name: /Submit Emergency Report|Sending report/ })

describe('ReportPage', () => {
  it('requires a location before sending anything', async () => {
    const fetchMock = mockFetch({})
    const user = setup()
    await user.click(submit())
    expect(screen.getByRole('alert')).toHaveTextContent(/Share your location/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a negative people count', async () => {
    const fetchMock = mockFetch({})
    const user = setup()
    await user.type(placeInput(), 'Kien Giang')
    await user.type(screen.getByRole('textbox', { name: 'People requiring assistance' }), '-2')
    await user.click(submit())
    expect(screen.getAllByText('The number of people cannot be negative.').length).toBeGreaterThan(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows success only with the ID returned by the server', async () => {
    const fetchMock = mockFetch({ 'POST /api/reports': () => jsonResponse(201, { ...RAW_INCIDENTS[0], id: 'INC-FROMSRV1' }) })
    const user = setup()
    await user.type(placeInput(), 'Kien Giang')
    await user.click(submit())
    expect(await screen.findByText('INC-FROMSRV1')).toBeInTheDocument()
    expect(screen.getByText(/does not mean a rescue team has been sent/)).toBeInTheDocument()
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toMatchObject({ reporter_type: 'SELF', people_count: null, location: { method: 'MANUAL', address_text: 'Kien Giang' } })
  })

  it('keeps the form values when the server rejects the report', async () => {
    mockFetch({ 'POST /api/reports': () => jsonResponse(422, { detail: 'Provide coordinates or address_text' }) })
    const user = setup()
    await user.type(placeInput(), 'Kien Giang')
    await user.type(screen.getByRole('textbox', { name: 'Describe the situation' }), 'Roof')
    await user.click(submit())
    expect(await screen.findByText(/The server did not accept the report/)).toBeInTheDocument()
    expect(placeInput()).toHaveValue('Kien Giang')
    expect(screen.getByRole('textbox', { name: 'Describe the situation' })).toHaveValue('Roof')
  })

  it('reports a network failure without claiming success', async () => {
    mockFetch({ 'POST /api/reports': () => new TypeError('Failed to fetch') })
    const user = setup()
    await user.type(placeInput(), 'Kien Giang')
    await user.click(submit())
    expect(await screen.findByText(/The report was not sent/)).toBeInTheDocument()
    expect(screen.queryByText('Report received')).not.toBeInTheDocument()
  })

  it('sends only one request on rapid double submission', async () => {
    let release
    const fetchMock = mockFetch({
      'POST /api/reports': () => new Promise((resolve) => (release = () => resolve(jsonResponse(201, RAW_INCIDENTS[0])))),
    })
    const user = setup()
    await user.type(placeInput(), 'Kien Giang')
    const form = submit().closest('form')
    await act(async () => {
      form.requestSubmit()
      form.requestSubmit()
    })
    expect(submit()).toBeDisabled()
    await act(async () => release())
    expect(await screen.findByText('Report received')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('explains a denied location permission and invents no coordinates', async () => {
    const getCurrentPosition = vi.fn((ok, fail) => fail({ code: 1 }))
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
    const user = setup()
    await user.click(screen.getByRole('button', { name: /Use current location/ }))
    expect(screen.getByText(/Location permission was denied/)).toBeInTheDocument()
    expect(screen.getByText(/No coordinates selected/)).toBeInTheDocument()
  })

  it('uses device coordinates only after geolocation succeeds', async () => {
    const getCurrentPosition = vi.fn((ok) => ok({ coords: { latitude: 17.2165, longitude: 106.786, accuracy: 12.4 } }))
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } })
    const fetchMock = mockFetch({ 'POST /api/reports': () => jsonResponse(201, RAW_INCIDENTS[0]) })
    const user = setup()
    await user.click(screen.getByRole('button', { name: /Use current location/ }))
    expect(screen.getByText('17.21650, 106.78600')).toBeInTheDocument()
    expect(screen.getByText(/accuracy about ±12 m/)).toBeInTheDocument()
    await user.click(submit())
    await screen.findByText('Report received')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).location).toMatchObject({ latitude: 17.2165, longitude: 106.786, method: 'GPS' })
  })

  it('sets a MAP_PIN point only in picking mode', async () => {
    const user = setup()
    const map = lastMap()
    act(() => map.fire('style.load'))
    act(() => map.fire('click', { point: {}, lngLat: { lat: 17.3, lng: 106.5 } }))
    expect(screen.getByText(/No coordinates selected/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Select on map/ }))
    act(() => map.fire('click', { point: {}, lngLat: { lat: 17.3, lng: 106.5 } }))
    expect(screen.getByText('17.30000, 106.50000')).toBeInTheDocument()
    expect(screen.getByText('Map point chosen by the sender')).toBeInTheDocument()
  })
})
