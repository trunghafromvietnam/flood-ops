import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import GearMenu from './GearMenu.jsx'

function Where() {
  const { pathname, search } = useLocation()
  return <p data-testid="where">{pathname + search}</p>
}

function setup(path = '/ops?incident=INC-1') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <button type="button">outside</button>
      <GearMenu />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('GearMenu', () => {
  it('opens on click and lists every operational view', async () => {
    const user = setup()
    const button = screen.getByRole('button', { name: 'Navigation menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const items = screen.getAllByRole('menuitem').map((el) => el.textContent)
    expect(items).toEqual(['Overview', 'Reports', 'Live Map', 'Rescue Teams', 'Drone Evidence', 'Activity Log', 'Settings'])
    expect(screen.getByRole('menuitem', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
  })

  it('closes on Escape and returns focus to the button', async () => {
    const user = setup()
    const button = screen.getByRole('button', { name: 'Navigation menu' })
    await user.click(button)
    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('closes on outside click', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Navigation menu' }))
    await user.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.getByRole('button', { name: 'Navigation menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports arrow keys and navigates while keeping the selected incident', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Navigation menu' }))
    expect(screen.getByRole('menuitem', { name: 'Overview' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Reports' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveFocus()
    await user.click(screen.getByRole('menuitem', { name: 'Live Map' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/ops/map?incident=INC-1')
    expect(screen.getByRole('button', { name: 'Navigation menu' })).toHaveAttribute('aria-expanded', 'false')
  })
})
