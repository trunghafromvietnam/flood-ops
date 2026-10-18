import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom has no WebGL: replace MapLibre with a recording test double.
vi.mock('maplibre-gl', () => import('./maplibreMock.js'))

afterEach(() => {
  cleanup()
  localStorage.clear()
})
