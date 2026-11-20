import {
  ROLE_DEFINITIONS,
  PERMISSION_CATALOG,
  type UserRole,
  type Permission,
} from '@lumen-pos/types'

interface RoleMatrixModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RoleMatrixModal({ isOpen, onClose }: RoleMatrixModalProps) {
  if (!isOpen) return null

  const rolesList: UserRole[] = ['owner', 'admin', 'cashier', 'stock_clerk']
  const permissionsList = Object.values(PERMISSION_CATALOG)

  // Agrupar permisos por módulo
  const groupedPermissions = permissionsList.reduce<Record<string, typeof permissionsList>>(
    (acc, perm) => {
      acc[perm.module] = acc[perm.module] || []
      acc[perm.module].push(perm)
      return acc
    },
    {}
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#242423]/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#CFDBD5] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Cabecera */}
        <div className="p-6 border-b border-[#CFDBD5] flex items-center justify-between bg-[#FAFBF9]">
          <div>
            <h2 className="text-lg font-bold text-[#242423] tracking-tight">
              Catálogo de roles y permisos operativos
            </h2>
            <p className="text-xs text-[#5A5D5A] mt-1">
              Estructura predefinida de accesos y responsabilidades para los colaboradores de la tienda.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A5D5A] hover:text-[#242423] min-w-[44px] min-h-[44px] rounded-lg hover:bg-[#E8EDDF] transition cursor-pointer inline-flex items-center justify-center"
            aria-label="Cerrar modal de catálogo de roles"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#242423] bg-white">
          {/* Tarjetas resumen de roles */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {rolesList.map((r) => {
              const def = ROLE_DEFINITIONS[r]
              return (
                <div
                  key={r}
                  className="p-3.5 rounded-xl bg-[#FAFBF9] border border-[#CFDBD5] flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#242423]">{def.title}</span>
                    </div>
                    <p className="text-xs text-[#5A5D5A] leading-relaxed mb-3">
                      {def.description}
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-[#5A5D5A] border-t border-[#CFDBD5]/60 pt-2">
                    <span className="tabular-nums font-bold text-[#242423]">{def.permissions.length}</span> permisos habilitados
                  </div>
                </div>
              )
            })}
          </div>

          {/* Matriz detallada de permisos */}
          <div className="border border-[#CFDBD5] rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAFBF9] border-b border-[#CFDBD5] text-[#242423]">
                    <th scope="col" className="py-3 px-4 font-bold w-1/3">Módulo / Permiso operativo</th>
                    {rolesList.map((r) => (
                      <th scope="col" key={r} className="py-3 px-3 font-bold text-center w-1/6">
                        {ROLE_DEFINITIONS[r].shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFDBD5]/60">
                  {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
                    <tr key={moduleName} className="contents">
                      <tr className="bg-[#FAFBF9]">
                        <td
                          colSpan={5}
                          className="py-2 px-4 font-bold text-[#5A5D5A] text-xs uppercase tracking-wider"
                        >
                          {moduleName}
                        </td>
                      </tr>
                      {perms.map((p) => (
                        <tr key={p.code} className="hover:bg-[#FAFBF9]/80 transition">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-[#242423]">{p.name}</div>
                            <div className="text-xs text-[#5A5D5A]">{p.description}</div>
                          </td>
                          {rolesList.map((r) => {
                            const has = ROLE_DEFINITIONS[r].permissions.includes(p.code as Permission)
                            return (
                              <td key={r} className="py-2.5 px-3 text-center">
                                {has ? (
                                  <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#EFF5EE] text-[#588157]"
                                    title={`Permiso habilitado para ${ROLE_DEFINITIONS[r].title}`}
                                  >
                                    <svg aria-hidden="true" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </span>
                                ) : (
                                  <span className="text-[#CFDBD5] font-light" aria-hidden="true">—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="p-4 border-t border-[#CFDBD5] bg-[#FAFBF9] flex justify-end">
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-lg bg-white hover:bg-[#FAFBF9] text-[#242423] border border-[#CFDBD5] text-xs font-semibold transition cursor-pointer inline-flex items-center justify-center"
          >
            Cerrar catálogo
          </button>
        </div>
      </div>
    </div>
  )
}
