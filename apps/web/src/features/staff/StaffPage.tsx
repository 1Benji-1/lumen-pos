import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { useStorePlan } from '../../shared/hooks/useStorePlan'
import { useStoreEntitlements } from '../../shared/hooks/useStoreEntitlements'
import { useCurrentUserRole } from '../../shared/hooks/useCurrentUserRole'
import { useStoreModules } from '../../shared/hooks/useStoreModules'
import { useStaff } from './hooks/useStaff'
import { StaffTable } from './components/StaffTable'
import { AddStaffModal } from './components/AddStaffModal'
import { RoleMatrixModal } from './components/RoleMatrixModal'
import { MedicalSpecialtiesSection } from './components/MedicalSpecialtiesSection'

export function StaffPage() {
  const { profile } = useStoreModules()
  const { storeId } = useStoreId()
  const { isOwner, hasPermission, email: currentUserEmail } = useCurrentUserRole()
  const {
    data: staff = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useStaff(storeId)
  const { data: storePlan } = useStorePlan(storeId)
  const { getLimit } = useStoreEntitlements()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false)

  const canManageStaff = hasPermission('staff:manage')
  const currentUserId = staff.find((s) => s.email === currentUserEmail)?.id

  // Límites según el plan contratado
  const planCode = (storePlan?.plans as any)?.code
  const planName = (storePlan?.plans as any)?.name || (planCode === 'standard' ? 'Standard' : planCode === 'pro' ? 'Pro' : 'Actual')
  const maxUsers = getLimit('max_users') ?? (planCode === 'standard' ? 2 : planCode === 'pro' ? 6 : 999)
  const isUserLimitReached = staff.length >= maxUsers

  // Métricas rápidas del equipo
  const totalStaff = staff.length
  const activeStaff = staff.filter((s) => s.is_active).length
  const totalCashiers = staff.filter((s) => s.role === 'cashier').length
  const totalOwners = staff.filter((s) => s.role === 'owner').length
  const totalAdmins = staff.filter((s) => s.role === 'admin').length
  const totalStockClerks = staff.filter((s) => s.role === 'stock_clerk').length
  const totalSupervisionAndStock = totalOwners + totalAdmins + totalStockClerks
  const planCapacityPercent = Math.min(100, Math.round((totalStaff / maxUsers) * 100))

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-inventory-view">
      {/* Cabecera principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#CFDBD5] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#242423] tracking-tight">Equipo de trabajo</h1>
          <p className="text-xs text-[#5A5D5A] mt-1">
            Gestión de colaboradores, asignación de roles y control de accesos del comercio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMatrixModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#E8EDDF] text-[#242423] border border-[#CFDBD5] text-xs font-semibold transition flex items-center gap-2 shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <svg aria-hidden="true" className="w-4 h-4 text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Ver matriz de permisos</span>
          </button>

          {canManageStaff && (
            isUserLimitReached ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8A6D14] font-semibold px-2.5 py-1 bg-[#FEF9E7] border border-[#F5CB5C]/60 rounded-lg">
                  Límite alcanzado ({totalStaff}/{maxUsers})
                </span>
                <button
                  type="button"
                  disabled
                  className="px-3.5 py-2 rounded-lg bg-[#E8EDDF] text-[#5A5D5A]/70 cursor-not-allowed text-xs font-semibold border border-[#CFDBD5] flex items-center gap-2"
                  title={`El plan ${planName} permite hasta ${maxUsers} usuarios. Ve a Configuración para actualizar tu plan.`}
                >
                  <svg aria-hidden="true" className="w-4 h-4 text-[#5A5D5A]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Nuevo colaborador</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] text-xs font-bold transition shadow-xs flex items-center gap-2 active:scale-[0.98] cursor-pointer"
              >
                <svg aria-hidden="true" className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Nuevo colaborador</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Banner de salida a upgrade cuando el plan alcanza el límite de usuarios */}
      {isUserLimitReached && (
        <div className="bg-[#FEF9E7] border border-[#F5CB5C]/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5CB5C]/30 border border-[#F5CB5C]/60 flex items-center justify-center shrink-0 text-[#8A6D14]">
              <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-[#242423]">
                Límite de colaboradores alcanzado ({totalStaff} de {maxUsers} licencias ocupadas)
              </div>
              <p className="text-xs text-[#8A6D14] mt-0.5 leading-relaxed">
                Tu comercio ha completado la nómina permitida en el plan <strong>{planName}</strong>. Para incorporar más cajeros o administradores y habilitar turnos simultáneos, actualiza tu suscripción.
              </p>
            </div>
          </div>

          <Link
            to="/configuracion"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#242423] hover:bg-black text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
          >
            <span>Gestionar suscripción</span>
            <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* Banner de aviso si falla la sincronización pero existen datos previos en caché */}
      {isError && staff.length > 0 && (
        <div className="bg-[#FDF0ED] border border-[#F5C2B8] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#BC4749] shadow-2xs">
          <div className="flex items-center gap-2.5">
            <svg aria-hidden="true" className="w-4 h-4 shrink-0 text-[#BC4749]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">
              No fue posible sincronizar la lista más reciente. Mostrando los colaboradores disponibles en caché local.
            </span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-3 py-1.5 rounded-md bg-white border border-[#F5C2B8] text-[#BC4749] hover:bg-[#FAFBF9] font-semibold text-xs transition cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5"
          >
            {isRefetching ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reintentando...</span>
              </>
            ) : (
              <span>Reintentar conexión</span>
            )}
          </button>
        </div>
      )}

      {/* Tarjetas de métricas rápidas reestructuradas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tarjeta 1: Capacidad del Plan con barra de progreso visual */}
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider">Capacidad del plan</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-[#242423] tabular-nums">{totalStaff}</span>
              <span className="text-xs font-semibold text-[#5A5D5A]">/ {maxUsers} plazas</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full h-1.5 bg-[#E8EDDF] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isUserLimitReached ? 'bg-[#BC4749]' : planCapacityPercent >= 80 ? 'bg-[#8A6D14]' : 'bg-[#F5CB5C]'
                }`}
                style={{ width: `${planCapacityPercent}%` }}
              />
            </div>
            <div className="text-xs text-[#5A5D5A] mt-1.5 font-medium flex items-center justify-between">
              <span>{isUserLimitReached ? 'Cupo completo' : `${maxUsers - totalStaff} plazas libres`}</span>
              <span className="tabular-nums font-semibold">{planCapacityPercent}%</span>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Personal Activo con acceso operativo hoy */}
        <div className="bg-white border border-[#BBD2B8] rounded-xl p-4 shadow-xs bg-[#EFF5EE]/30 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-[#588157] uppercase tracking-wider">Personal activo</div>
            <div className="text-2xl font-bold text-[#588157] mt-1 tabular-nums">{activeStaff}</div>
          </div>
          <div className="text-xs text-[#588157] font-medium mt-3">
            {totalStaff === 0
              ? 'Sin colaboradores'
              : activeStaff === totalStaff
              ? '100% con acceso habilitado'
              : `${totalStaff - activeStaff} con acceso suspendido`}
          </div>
        </div>

        {/* Tarjeta 3: Cajeros / Mostrador */}
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider">Cajeros / Mostrador</div>
            <div className="text-2xl font-bold text-[#8A6D14] mt-1 tabular-nums">{totalCashiers}</div>
          </div>
          <div className="text-xs text-[#5A5D5A] mt-3">
            {totalCashiers === 1 ? '1 operador en punto de venta' : `${totalCashiers} operadores en punto de venta`}
          </div>
        </div>

        {/* Tarjeta 4: Supervisión e Inventario (Dueños, Admins y Encargados de stock) */}
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-[#5A5D5A] uppercase tracking-wider">Supervisión e Inventario</div>
            <div className="text-2xl font-bold text-[#242423] mt-1 tabular-nums">{totalSupervisionAndStock}</div>
          </div>
          <div
            className="text-xs text-[#5A5D5A] mt-3 truncate font-medium"
            title={`${totalOwners} dueño(s) · ${totalAdmins} admin · ${totalStockClerks} inventario`}
          >
            {[
              totalOwners > 0 && `${totalOwners} dueño${totalOwners > 1 ? 's' : ''}`,
              totalAdmins > 0 && `${totalAdmins} admin${totalAdmins > 1 ? 's' : ''}`,
              totalStockClerks > 0 && `${totalStockClerks} inventario`,
            ]
              .filter(Boolean)
              .join(' · ') || 'Sin personal asignado'}
          </div>
        </div>
      </div>

      {/* Estado de carga inicial */}
      {isLoading && staff.length === 0 && (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-12 text-center text-xs text-[#5A5D5A] shadow-xs flex flex-col items-center justify-center gap-3">
          <svg className="w-6 h-6 animate-spin text-[#5A5D5A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Cargando colaboradores del comercio...</span>
        </div>
      )}

      {/* Estado de error inicial sin datos en caché */}
      {isError && staff.length === 0 && (
        <div className="bg-white border border-[#F5C2B8] rounded-2xl p-8 text-center shadow-xs max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-[#FDF0ED] flex items-center justify-center mx-auto mb-3 text-[#BC4749]">
            <svg aria-hidden="true" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-[#242423]">No se pudo cargar la nómina de colaboradores</h3>
          <p className="text-xs text-[#5A5D5A] mt-1 max-w-sm mx-auto leading-relaxed">
            {(error as Error)?.message || 'Ocurrió un problema de conexión al sincronizar los colaboradores de la tienda.'}
          </p>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="mt-5 px-4 py-2 rounded-lg bg-[#242423] text-white hover:bg-black font-semibold text-xs transition inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <svg aria-hidden="true" className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefetching ? 'Reintentando...' : 'Reintentar conexión'}</span>
          </button>
        </div>
      )}

      {/* Tabla de colaboradores (se preserva si hay datos en caché o no hay error) */}
      {(staff.length > 0 || (!isLoading && !isError)) && (
        <StaffTable
          staff={staff}
          storeId={storeId}
          currentUserId={currentUserId}
          isOwner={isOwner}
          canManage={canManageStaff}
        />
      )}

      {profile?.categoryId === 'consultorios_clinicas' && storeId && !isError && (
        <MedicalSpecialtiesSection storeId={storeId} staff={staff} isOwner={isOwner} />
      )}

      {/* Modales */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        storeId={storeId}
        isOwner={isOwner}
      />

      <RoleMatrixModal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
      />
    </div>
  )
}
export default StaffPage
