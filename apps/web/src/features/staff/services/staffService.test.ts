import { beforeEach, describe, expect, it, vi } from 'vitest'

const backend = vi.hoisted(() => {
  const eq = vi.fn().mockResolvedValue({ error: null })
  return {
    invoke: vi.fn(),
    from: vi.fn(() => ({ update: () => ({ eq }), delete: () => ({ eq }) })),
  }
})

vi.mock('../../../shared/lib/supabaseClient', () => ({ supabase: { functions: { invoke: backend.invoke }, from: backend.from } }))

import { deleteStaffMember, toggleStaffStatus, updateStaffRole } from './staffService'

describe('administración de personal', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['cambiar rol', () => updateStaffRole('user-1', 'admin')],
    ['suspender usuario', () => toggleStaffStatus('user-1', false)],
    ['eliminar usuario', () => deleteStaffMember('user-1')],
  ])('no omite una denegación del servidor para %s', async (_name, operation) => {
    backend.invoke.mockResolvedValue({ data: { error: 'No autorizado' }, error: null })
    await expect(operation()).rejects.toThrow('No autorizado')
    expect(backend.from).not.toHaveBeenCalled()
  })

  it('conserva el error de conexión sin intentar una mutación directa', async () => {
    backend.invoke.mockResolvedValue({ data: null, error: new Error('Servidor no disponible') })
    await expect(updateStaffRole('user-1', 'cashier')).rejects.toThrow('Servidor no disponible')
    expect(backend.from).not.toHaveBeenCalled()
  })
})
