import { useState } from 'react'
import type { StaffMember } from '@lumen-pos/types'
import { RoleBadge } from './RoleBadge'
import { EditRoleModal } from './EditRoleModal'
import { DeleteStaffModal } from './DeleteStaffModal'
import { useToggleStaffStatus } from '../hooks/useStaff'
import { translateStaffError } from '../services/staffService'
import { StickyTableWrapper } from '../../../shared/components/StickyTableWrapper'

interface StaffTableProps {
  staff: StaffMember[]
  storeId: string | null
  currentUserId?: string
  isOwner: boolean
  canManage: boolean
}

export function StaffTable({
  staff,
  storeId,
  currentUserId,
  isOwner,
  canManage,
}: StaffTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<StaffMember | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const toggleStatusMutation = useToggleStaffStatus(storeId)

  // Filtrado
  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      (member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  const isFiltered = searchTerm.trim().length > 0 || roleFilter !== 'all'

  async function handleToggleStatus(member: StaffMember) {
    try {
      setFeedbackMessage(null)
      await toggleStatusMutation.mutateAsync({
        userId: member.id,
        isActive: !member.is_active,
      })
    } catch (err: any) {
      setFeedbackMessage(translateStaffError(err.message || 'No fue posible modificar el estado del usuario.'))
    }
  }

  function handleResetFilters() {
    setSearchTerm('')
    setRoleFilter('all')
  }

  return (
    <div className="space-y-4">
      {feedbackMessage && (
        <div className="p-3 rounded-lg bg-[#FEF9E7] border border-[#F5CB5C]/60 text-[#8A6D14] text-xs font-medium flex items-center justify-between shadow-2xs">
          <span>{feedbackMessage}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-[#8A6D14] hover:text-[#242423] ml-2 min-w-[32px] min-h-[32px] flex items-center justify-center text-xs font-bold cursor-pointer"
            aria-label="Cerrar mensaje informativo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de búsqueda, filtros y contador dinámico */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#CFDBD5] shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Campo de búsqueda con botón de limpieza rápida y altura táctil de 44px */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="w-full h-11 pl-9 pr-10 py-2.5 bg-white border border-[#CFDBD5] rounded-lg text-xs text-[#242423] placeholder-[#5A5D5A]/60 focus:outline-none focus:border-[#242423] transition"
            />
            <svg
              aria-hidden="true"
              className="w-4 h-4 text-[#5A5D5A] absolute left-3 top-3.5 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 1114 0z"
              />
            </svg>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-0.5 text-[#5A5D5A] hover:text-[#242423] min-w-[40px] min-h-[40px] flex items-center justify-center rounded transition cursor-pointer"
                title="Limpiar búsqueda"
                aria-label="Limpiar búsqueda de colaboradores"
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Selector de filtro por rol */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5A5D5A] whitespace-nowrap font-medium">Rol:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-11 px-3 py-2.5 bg-white border border-[#CFDBD5] rounded-lg text-xs text-[#242423] focus:outline-none focus:border-[#242423] transition cursor-pointer"
            >
              <option value="all">Todos los roles</option>
              <option value="owner">Propietario</option>
              <option value="admin">Encargado de tienda</option>
              <option value="cashier">Cajero</option>
              <option value="stock_clerk">Encargado de inventario</option>
            </select>
          </div>

          {/* Botón de restablecer filtros si hay filtros activos */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-11 px-3.5 text-xs text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E8EDDF] border border-[#CFDBD5] rounded-lg transition font-medium cursor-pointer shrink-0 inline-flex items-center justify-center"
            >
              Restablecer
            </button>
          )}
        </div>

        {/* Contador dinámico de resultados */}
        <div className="text-xs text-[#5A5D5A] font-medium flex items-center gap-1.5 self-end md:self-auto">
          <span className="font-bold text-[#242423] tabular-nums">{filteredStaff.length}</span>
          <span>{filteredStaff.length === 1 ? 'colaborador' : 'colaboradores'}</span>
          {isFiltered && (
            <span className="text-[#8A6D14] bg-[#FEF9E7] border border-[#F5CB5C]/60 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums">
              de {staff.length}
            </span>
          )}
        </div>
      </div>

      {/* Tabla envuelta en StickyTableWrapper */}
      <StickyTableWrapper maxHeight="max-h-[calc(100vh-320px)]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-[#FAFBF9] border-b border-[#CFDBD5]">
            <tr className="text-[#5A5D5A]">
              <th scope="col" className="py-3 px-4 font-semibold bg-[#FAFBF9]">Colaborador</th>
              <th scope="col" className="py-3 px-4 font-semibold bg-[#FAFBF9]">Rol asignado</th>
              <th scope="col" className="py-3 px-4 font-semibold bg-[#FAFBF9]">Estado</th>
              <th scope="col" className="py-3 px-4 font-semibold bg-[#FAFBF9]">Alta en el sistema</th>
              {canManage && <th scope="col" className="py-3 px-4 font-semibold text-right bg-[#FAFBF9]">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CFDBD5]/60 bg-white">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="py-12 text-center text-[#5A5D5A] text-xs">
                  {isFiltered ? (
                    <div className="space-y-2">
                      <p>No se encontraron colaboradores que coincidan con los filtros aplicados.</p>
                      <button
                        onClick={handleResetFilters}
                        className="text-xs font-semibold text-[#242423] underline hover:no-underline cursor-pointer"
                      >
                        Limpiar búsqueda y filtros
                      </button>
                    </div>
                  ) : (
                    'No hay colaboradores registrados en este comercio.'
                  )}
                </td>
              </tr>
            ) : (
              filteredStaff.map((member) => {
                const isSelf = member.id === currentUserId
                const isMemberOwner = member.role === 'owner'
                const canEditThisMember = canManage && (!isMemberOwner || isOwner)

                return (
                  <tr key={member.id} className="hover:bg-[#FAFBF9] transition">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#242423] flex items-center gap-2">
                        {member.full_name || 'Sin nombre asignado'}
                        {isSelf && (
                          <span className="text-xs bg-[#E8EDDF] text-[#242423] px-2 py-0.5 rounded border border-[#CFDBD5] font-semibold">
                            Tú
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#5A5D5A]">{member.email || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="py-3.5 px-4">
                      {member.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#EFF5EE] text-[#588157] border border-[#BBD2B8]">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#FDF0ED] text-[#BC4749] border border-[#F5C2B8]">
                          Acceso suspendido
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#5A5D5A] text-xs tabular-nums">
                      {new Date(member.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    {canManage && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {canEditThisMember && (
                            <button
                              onClick={() => setEditingMember(member)}
                              className="min-h-[44px] px-3.5 py-2 text-xs text-[#242423] hover:bg-[#E8EDDF] rounded-lg border border-[#CFDBD5] font-semibold transition cursor-pointer inline-flex items-center justify-center"
                              aria-label={`Cambiar rol de ${member.full_name || member.email}`}
                            >
                              Cambiar rol
                            </button>
                          )}

                          {!isSelf && !isMemberOwner && (
                            <button
                              onClick={() => handleToggleStatus(member)}
                              disabled={toggleStatusMutation.isPending}
                              className={`min-h-[44px] px-3.5 py-2 text-xs rounded-lg border font-semibold transition cursor-pointer inline-flex items-center justify-center ${
                                member.is_active
                                  ? 'text-[#BC4749] border-[#F5C2B8] hover:bg-[#FDF0ED]'
                                  : 'text-[#588157] border-[#BBD2B8] hover:bg-[#EFF5EE]'
                              }`}
                              aria-label={`${member.is_active ? 'Suspender' : 'Reactivar'} acceso de ${member.full_name || member.email}`}
                            >
                              {member.is_active ? 'Suspender' : 'Reactivar'}
                            </button>
                          )}

                          {isOwner && !isSelf && !isMemberOwner && (
                            <button
                              onClick={() => setMemberToDelete(member)}
                              className="min-h-[44px] px-3.5 py-2 text-xs text-[#BC4749] hover:bg-[#FDF0ED] border border-transparent hover:border-[#F5C2B8] rounded-lg transition font-semibold cursor-pointer inline-flex items-center justify-center"
                              aria-label={`Desvincular a ${member.full_name || member.email}`}
                            >
                              Desvincular
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </StickyTableWrapper>

      {/* Modal para editar rol */}
      <EditRoleModal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        member={editingMember}
        storeId={storeId}
        isOwner={isOwner}
      />

      {/* Modal formal para confirmar desvinculación con validación de turno activo */}
      <DeleteStaffModal
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        member={memberToDelete}
        storeId={storeId}
      />
    </div>
  )
}
