import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createStore } from '../services/adminStoreService'
import { BUSINESS_FAMILIES, BUSINESS_CATEGORIES, getDefaultModuleIds, MODULE_REGISTRY, type BusinessFamilyId, type BusinessCategoryId, type PlanCode } from '@lumen-pos/types'

interface CreateStoreModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateStoreModal({ isOpen, onClose }: CreateStoreModalProps) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [storeName, setStoreName] = useState('')
  const [fullName, setFullName] = useState('')
  const [familyId, setFamilyId] = useState<BusinessFamilyId>('retail')
  const [categoryId, setCategoryId] = useState<BusinessCategoryId>('comercio_general')
  const [planCode, setPlanCode] = useState<PlanCode>('standard')
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trialing' | 'active'>('trialing')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'semiannual' | 'annual'>('monthly')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      await createStore({
        email: email.trim(),
        storeName: storeName.trim(),
        fullName: fullName.trim(),
        familyId,
        categoryId,
        planCode,
        subscriptionStatus,
        billingCycle: subscriptionStatus === 'active' ? billingCycle : undefined,
      })

      setSuccess(`Tienda "${storeName}" creada exitosamente. Se envió la invitación a ${email}.`)
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] })

      setTimeout(() => {
        handleClose()
      }, 1200)
    } catch (err: any) {
      setError(err.message || 'Error al crear la tienda')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setEmail('')
    setStoreName('')
    setFullName('')
    setFamilyId('retail')
    setCategoryId('comercio_general')
    setPlanCode('standard')
    setSubscriptionStatus('trialing')
    setBillingCycle('monthly')
    setError(null)
    setSuccess(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-store-modal-title"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100"
      >
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 id="create-store-modal-title" className="text-base font-semibold text-zinc-950 dark:text-white tracking-tight">
              Crear nueva tienda
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Alta manual de comercio, asignación de rubro y vinculación del propietario.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar modal"
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="create-store-name" className="block text-xs font-medium text-zinc-800 dark:text-zinc-300 mb-1">
              Nombre de la tienda
            </label>
            <input
              id="create-store-name"
              type="text"
              required
              placeholder="Ej. Ferretería Central"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
            />
          </div>

          <div>
            <label htmlFor="create-owner-name" className="block text-xs font-medium text-zinc-800 dark:text-zinc-300 mb-1">
              Nombre del propietario
            </label>
            <input
              id="create-owner-name"
              type="text"
              required
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
            />
          </div>

          <div>
            <label htmlFor="create-owner-email" className="block text-xs font-medium text-zinc-800 dark:text-zinc-300 mb-1">
              Correo electrónico del propietario
            </label>
            <input
              id="create-owner-email"
              type="email"
              required
              placeholder="propietario@comercio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
            />
          </div>

          <div>
            <label htmlFor="create-family" className="block text-xs font-medium text-zinc-800 dark:text-zinc-300 mb-1">
              Familia comercial
            </label>
            <select id="create-family" value={familyId} onChange={(e) => {
              const nextFamily = e.target.value as BusinessFamilyId
              setFamilyId(nextFamily)
              setCategoryId(Object.values(BUSINESS_CATEGORIES).find(category => category.familyId === nextFamily)!.id)
            }} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition">
              {Object.values(BUSINESS_FAMILIES).map(family => <option key={family.id} value={family.id}>{family.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="create-category" className="block text-xs font-medium text-zinc-800 dark:text-zinc-300 mb-1">
              Categoría
            </label>
            <select
              id="create-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value as BusinessCategoryId)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
              required
            >
              {Object.values(BUSINESS_CATEGORIES).filter(category => category.familyId === familyId).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              {getDefaultModuleIds(categoryId).filter(id => MODULE_REGISTRY[id].implementationStatus === 'available').map(id => MODULE_REGISTRY[id].name).join(' · ')} disponibles según plan. Los demás módulos de esta categoría están planificados.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-300 mb-1">
                Plan
              </label>
              <select
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value as PlanCode)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
              >
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-300 mb-1">
                Estado inicial
              </label>
              <select
                value={subscriptionStatus}
                onChange={(e) => setSubscriptionStatus(e.target.value as 'trialing' | 'active')}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
              >
                <option value="trialing">Período de prueba (14 días)</option>
                <option value="active">Activa</option>
              </select>
            </div>
          </div>

          {subscriptionStatus === 'active' && (
            <div>
              <label className="block text-xs font-medium text-zinc-800 dark:text-zinc-300 mb-1">
                Ciclo de facturación
              </label>
              <select
                value={billingCycle}
                onChange={(e) =>
                  setBillingCycle(e.target.value as 'monthly' | 'semiannual' | 'annual')
                }
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition"
              >
                <option value="monthly">Mensual</option>
                <option value="semiannual">Semestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 disabled:opacity-50 text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              {loading ? 'Creando tienda...' : 'Crear tienda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
