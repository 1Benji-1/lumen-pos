import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SettingsSidebar } from './SettingsSidebar'

it('opens the module activation section from settings navigation', () => {
  const onSelectSection = vi.fn()
  render(<SettingsSidebar activeSection="general" onSelectSection={onSelectSection} />)
  fireEvent.click(screen.getByRole('button', { name: 'Módulos' }))
  expect(onSelectSection).toHaveBeenCalledWith('modules')
})
