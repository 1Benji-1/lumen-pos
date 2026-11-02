import { useState } from 'react'
import { useStoreId } from '../../shared/hooks/useStoreId'
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from './hooks/useSuppliers'
import { InventoryDrawer } from './components/InventoryDrawer'
import { InventoryNavTabs } from './components/InventoryNavTabs'
import { LoadingScreen } from '../../shared/components/LoadingScreen'
import { StickyTableWrapper } from '../../shared/components/StickyTableWrapper'
import type { Supplier } from '@lumen-pos/types'

export function SuppliersPage() {
  const { storeId, loading } = useStoreId()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { data: suppliers, isLoading } = useSuppliers(storeId)
  const createSupplier = useCreateSupplier(storeId)
  const updateSupplier = useUpdateSupplier(storeId)
  const deleteSupplier = useDeleteSupplier(storeId)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [search, setSearch] = useState('')

  // Modal form states
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [taxId, setTaxId] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function openCreateModal() {
    setEditingSupplier(null)
    setName('')
    setContactName('')
    setPhone('')
    setEmail('')
    setTaxId('')
    setAddress('')
    setNotes('')
    setError(null)
    setModalOpen(true)
  }

  function openEditModal(s: Supplier) {
    setEditingSupplier(s)
    setName(s.name)
    setContactName(s.contact_name ?? '')
    setPhone(s.phone ?? '')
    setEmail(s.email ?? '')
    setTaxId(s.tax_id ?? '')
    setAddress(s.address ?? '')
    setNotes(s.notes ?? '')
    setError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('El nombre del proveedor es obligatorio.')
      return
    }

    try {
      if (editingSupplier) {
        await updateSupplier.mutateAsync({
          id: editingSupplier.id,
          input: {
            name: name.trim(),
            contact_name: contactName.trim() || null,
            phone: phone.trim() || null,
            email: email.trim() || null,
            tax_id: taxId.trim() || null,
            address: address.trim() || null,
            notes: notes.trim() || null,
          },
        })
      } else {
        await createSupplier.mutateAsync({
          name: name.trim(),
          contact_name: contactName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          tax_id: taxId.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
        })
      }
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el proveedor')
    }
  }

  async function handleDelete(s: Supplier) {
    if (window.confirm(`¿Desea eliminar el proveedor "${s.name}"?`)) {
      try {
        await deleteSupplier.mutateAsync(s.id)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al eliminar proveedor')
      }
    }
  }

  if (loading || isLoading) return <LoadingScreen message="Cargando proveedores..." />
  if (!storeId) return <div className="text-[#BC4749] p-8 text-sm text-center">No se encontró tu tienda asociada.</div>

  const filteredSuppliers = (suppliers ?? []).filter((s) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(term) ||
      (s.contact_name && s.contact_name.toLowerCase().includes(term)) ||
      (s.tax_id && s.tax_id.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.phone && s.phone.toLowerCase().includes(term))
    )
  })

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-inventory-view">
      <InventoryDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#242423] tracking-tight">Proveedores</h1>
          <p className="text-xs text-[#5A5D5A] mt-1">
            Directorio de fabricantes, distribuidores y contactos comerciales asociados a los productos.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-md bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <svg className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo proveedor
        </button>
      </div>

      {/* Sub-navegación de Inventario */}
      <InventoryNavTabs />

      {/* Buscador */}
      <div className="bg-white border border-[#CFDBD5] rounded-xl p-3.5 shadow-xs">
        <input
          type="text"
          placeholder="Buscar por nombre, contacto, NIT o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#E8EDDF]/20 border border-[#CFDBD5] rounded-md px-3.5 py-2 text-xs text-[#242423] placeholder-[#5A5D5A] focus:outline-none focus:border-[#242423] focus:bg-white transition"
        />
      </div>

      {/* Tabla de proveedores */}
      {isLoading ? (
        <div className="text-[#5A5D5A] py-8 text-center text-sm">Cargando proveedores...</div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-12 text-center shadow-xs">
          <p className="text-[#5A5D5A] text-sm">No se encontraron proveedores registrados.</p>
        </div>
      ) : (
        <StickyTableWrapper>
          <table className="w-full text-left text-sm">
            <thead className="table-sticky-header text-[#5A5D5A] text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Correo</th>
                <th className="py-3 px-4">NIT / Identificación</th>
                <th className="py-3 px-4">Dirección</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFDBD5]/40 text-xs">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-[#E8EDDF]/20 transition">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-[#242423] block">{s.name}</span>
                    {s.notes && <span className="text-xs text-[#5A5D5A]">{s.notes}</span>}
                  </td>
                  <td className="py-3 px-4 text-[#333533]">{s.contact_name || '—'}</td>
                  <td className="py-3 px-4 text-[#333533] font-mono tabular-nums">{s.phone || '—'}</td>
                  <td className="py-3 px-4 text-[#333533]">{s.email || '—'}</td>
                  <td className="py-3 px-4 font-mono text-[#5A5D5A] tabular-nums">{s.tax_id || '—'}</td>
                  <td className="py-3 px-4 text-[#5A5D5A] truncate max-w-xs">{s.address || '—'}</td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => openEditModal(s)}
                      className="px-2.5 py-1 rounded bg-[#E8EDDF]/50 hover:bg-[#E8EDDF] border border-[#CFDBD5] text-[#242423] text-xs font-medium transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="px-2.5 py-1 rounded hover:bg-[#FDF0ED] border border-transparent hover:border-[#F0B2B4] text-[#BC4749] text-xs font-medium transition"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </StickyTableWrapper>
      )}

      {/* Modal de Crear / Editar Proveedor */}
      {modalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/50 animate-modal-backdrop"
        >
          <div className="bg-white border border-[#CFDBD5] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 text-[#242423] animate-modal-panel">
            <div className="flex justify-between items-center border-b border-[#CFDBD5] pb-3">
              <h3 className="font-bold text-base text-[#242423]">
                {editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#5A5D5A] hover:text-[#242423] p-1 rounded-lg hover:bg-[#E8EDDF] transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                  Nombre de la empresa o proveedor *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Distribuidora del Valle S.R.L."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm focus:outline-none focus:border-[#242423]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                    Persona de contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Morales"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm focus:outline-none focus:border-[#242423]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                    Teléfono / Celular
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. +591 70000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm tabular-nums focus:outline-none focus:border-[#242423]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="ventas@proveedor.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm focus:outline-none focus:border-[#242423]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                    NIT / Identificación fiscal
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 1020304050"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm tabular-nums focus:outline-none focus:border-[#242423]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                  Dirección física
                </label>
                <input
                  type="text"
                  placeholder="Av. Principal #123, Zona Industrial"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm focus:outline-none focus:border-[#242423]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#5A5D5A] uppercase tracking-wider mb-1">
                  Notas adicionales
                </label>
                <textarea
                  rows={2}
                  placeholder="Días de entrega, plazos de pago, condiciones comerciales..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-[#242423] bg-white border border-[#CFDBD5] text-sm focus:outline-none focus:border-[#242423]"
                />
              </div>

              {error && <p className="text-[#BC4749] text-xs">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-white hover:bg-[#E8EDDF] text-[#242423] font-medium py-2 rounded-md text-sm border border-[#CFDBD5] transition shadow-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createSupplier.isPending || updateSupplier.isPending}
                  className="flex-1 bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-semibold py-2 rounded-md text-sm transition shadow-xs disabled:opacity-50"
                >
                  {createSupplier.isPending || updateSupplier.isPending
                    ? 'Guardando...'
                    : editingSupplier
                      ? 'Actualizar proveedor'
                      : 'Guardar proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default SuppliersPage
