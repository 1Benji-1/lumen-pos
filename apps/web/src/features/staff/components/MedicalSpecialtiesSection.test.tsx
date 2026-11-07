import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MedicalSpecialtiesSection } from './MedicalSpecialtiesSection'

const backend = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn() }))
vi.mock('../services/medicalSpecialtiesService', () => ({
  getMedicalSpecialties: backend.list,
  setMedicalSpecialties: backend.save,
}))
afterEach(cleanup)

it('lets an owner assign a specialty to an existing professional', async () => {
  backend.list.mockResolvedValue([])
  backend.save.mockResolvedValue(undefined)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MedicalSpecialtiesSection storeId="store-a" isOwner staff={[{
    id: 'doctor-a', store_id: 'store-a', full_name: 'Ana', email: 'ana@example.test', role: 'admin', is_active: true, created_at: '2026-01-01',
  }]} /></QueryClientProvider>)
  fireEvent.change(await screen.findByLabelText('Profesional'), { target: { value: 'doctor-a' } })
  fireEvent.click(screen.getByLabelText('Pediatría'))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar especialidades' }))
  await waitFor(() => expect(backend.save).toHaveBeenCalledWith('doctor-a', ['pediatria']))
})
