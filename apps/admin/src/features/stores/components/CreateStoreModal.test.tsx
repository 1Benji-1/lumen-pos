import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateStoreModal } from './CreateStoreModal'
import { createStore } from '../services/adminStoreService'

vi.mock('../services/adminStoreService', () => ({ createStore: vi.fn().mockResolvedValue({}) }))

describe('CreateStoreModal', () => {
  it('lets an administrator create a service store with its selected category', async () => {
    render(<QueryClientProvider client={new QueryClient()}><CreateStoreModal isOpen onClose={() => {}} /></QueryClientProvider>)
    fireEvent.change(screen.getByLabelText('Nombre de la tienda'), { target: { value: 'Barbería Sol' } })
    fireEvent.change(screen.getByLabelText('Nombre del propietario'), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText('Correo electrónico del propietario'), { target: { value: 'ana@example.com' } })
    fireEvent.change(screen.getByLabelText('Familia comercial'), { target: { value: 'services' } })
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'barberia_belleza' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear tienda' }))
    await waitFor(() => expect(createStore).toHaveBeenCalledWith(expect.objectContaining({ familyId: 'services', categoryId: 'barberia_belleza' })))
    expect(screen.getByText(/creada exitosamente/)).toBeTruthy()
  })
})
