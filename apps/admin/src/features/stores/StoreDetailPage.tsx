import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import type { AdminStoreItem, SubscriptionStatus, BillingCycle } from '@lumen-pos/types'
import {
  useStore,
  usePlans,
  useStoreStaff,
  useStoreCashRegisters,
  useStorePayments,
  useToggleStoreSuspension,
  useExtendStoreTrial,
  useAdminToggleUserStatus,
  useAdminSendPasswordReset,
  useForceCloseCashRegister,
  useUpdateStoreSubscription,
  useRecordPaymentAndRenew,
} from './hooks/useAdminStores'
import type { StoreCashRegisterItem } from './services/adminStoreService'
import { ConfirmationModal, type ChangeItem } from '../../shared/components/ConfirmationModal'
import { StoreStatusBadge } from './components/StoreStatusBadge'
import { BusinessTypeBadge } from './components/BusinessTypeBadge'
import { StoreOverridesTab } from './components/StoreOverridesTab'
import { useToast } from '../../shared/context/ToastContext'

type TabKey = 'overview' | 'subscription' | 'staff' | 'registers' | 'payments' | 'overrides'

export function StoreDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  const { store, isLoading } = useStore(id)
  const { data: plans = [] } = usePlans()

  const currentTab = (searchParams.get('tab') as TabKey) || 'overview'
  const activeTab: TabKey = ['overview', 'subscription', 'staff', 'registers', 'payments', 'overrides'].includes(currentTab)
    ? currentTab
    : 'overview'

  const setActiveTab = (tab: TabKey) => {
    setSearchParams({ tab })
  }

  const { data: staffList = [], isLoading: loadingStaff } = useStoreStaff(store?.id || null)
  const { data: registersList = [], isLoading: loadingRegisters } = useStoreCashRegisters(store?.id || null)
  const { data: paymentsList = [], isLoading: loadingPayments } = useStorePayments(store?.id || null)

  const toggleSuspensionMutation = useToggleStoreSuspension()
  const extendTrialMutation = useExtendStoreTrial()
  const toggleUserStatusMutation = useAdminToggleUserStatus()
  const sendPasswordResetMutation = useAdminSendPasswordReset()
  const forceCloseRegisterMutation = useForceCloseCashRegister()
  const updateSubscriptionMutation = useUpdateStoreSubscription()
  const recordPaymentMutation = useRecordPaymentAndRenew()

  const [isConfirmSuspensionOpen, setIsConfirmSuspensionOpen] = useState(false)
  const [isConfirmSubscriptionOpen, setIsConfirmSubscriptionOpen] = useState(false)
  const [pendingSubscriptionChanges, setPendingSubscriptionChanges] = useState<ChangeItem[]>([])
  const [isConfirmCloseRegisterOpen, setIsConfirmCloseRegisterOpen] = useState(false)
  const [registerToClose, setRegisterToClose] = useState<StoreCashRegisterItem | null>(null)

  const [editPlanId, setEditPlanId] = useState('')
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('active')
  const [editBillingCycle, setEditBillingCycle] = useState<BillingCycle>('monthly')
  const [editTrialEndsAt, setEditTrialEndsAt] = useState('')
  const [editSubscriptionEndsAt, setEditSubscriptionEndsAt] = useState('')
  const [editGracePeriodDays, setEditGracePeriodDays] = useState(5)
  const [editError, setEditError] = useState<string | null>(null)

  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'qr' | 'transfer' | 'cash'>('qr')
  const [payReference, setPayReference] = useState('')
  const [useManualRenewalDate, setUseManualRenewalDate] = useState(false)
  const [payManualDate, setPayManualDate] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [payError, setPayError] = useState<string | null>(null)
  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = useState(false)
  const [pendingPaymentChanges, setPendingPaymentChanges] = useState<ChangeItem[]>([])

  useEffect(() => {
    if (store) {
      setEditPlanId(store.plan_id || '')
      setEditStatus(store.subscription_status)
      setEditBillingCycle(store.billing_cycle || 'monthly')
      setEditTrialEndsAt(
        store.trial_ends_at ? new Date(store.trial_ends_at).toISOString().split('T')[0] : ''
      )
      setEditSubscriptionEndsAt(
        store.subscription_ends_at ? new Date(store.subscription_ends_at).toISOString().split('T')[0] : ''
      )
      setEditGracePeriodDays(store.grace_period_days ?? 5)
    }
  }, [store])

  const handleConfirmToggleSuspension = async () => {
    if (!store) return
    try {
      await toggleSuspensionMutation.mutateAsync({
        storeId: store.id,
        currentStatus: store.subscription_status,
      })
      setIsConfirmSuspensionOpen(false)
      const nextStatus = store.subscription_status === 'suspended' ? 'activa' : 'suspendida'
      toast.success(`La tienda "${store.name}" ahora está ${nextStatus}.`)
    } catch (err: any) {
      setIsConfirmSuspensionOpen(false)
      toast.error(`Error al cambiar estado: ${err.message}`)
    }
  }

  const handleExtendTrial = async (days: number) => {
    if (!store) return
    try {
      const newDate = await extendTrialMutation.mutateAsync({
        storeId: store.id,
        daysToAdd: days,
        currentTrialEndsAt: store.trial_ends_at,
      })
      toast.success(`Prórroga aplicada con éxito (+${days} días). Nuevo límite: ${new Date(newDate).toLocaleDateString('es-BO')}`)
    } catch (err: any) {
      toast.error(`Error extendiendo prueba: ${err.message}`)
    }
  }

  const handleSendResetLink = async (email: string) => {
    if (!email) return
    try {
      await sendPasswordResetMutation.mutateAsync(email)
      toast.success(`Enlace de recuperación enviado a ${email}.`)
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar enlace de recuperación.')
    }
  }

  const calculateProposedRenewalDate = (baseStore: AdminStoreItem, cycle: BillingCycle) => {
    const base = baseStore.subscription_ends_at
      ? new Date(baseStore.subscription_ends_at)
      : new Date()
    const now = new Date()
    const startDate = base > now ? base : now
    const target = new Date(startDate)

    if (cycle === 'annual') {
      target.setFullYear(target.getFullYear() + 1)
    } else if (cycle === 'semiannual') {
      target.setMonth(target.getMonth() + 6)
    } else {
      target.setMonth(target.getMonth() + 1)
    }
    return target.toISOString()
  }

  const handleRequestSaveSubscription = (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return
    setEditError(null)

    const todayStr = new Date().toISOString().split('T')[0]
    if (editTrialEndsAt && editTrialEndsAt < todayStr) {
      setEditError('La fecha de expiración de prueba no puede ser anterior a hoy.')
      toast.error('La fecha de expiración de prueba no puede ser anterior a hoy.')
      return
    }

    const currentPlan = plans.find((p) => p.id === store.plan_id)
    const nextPlan = plans.find((p) => p.id === editPlanId)

    const changes: ChangeItem[] = []

    if (store.plan_id !== editPlanId) {
      changes.push({
        label: 'Plan contratado',
        before: currentPlan?.name || store.plan_name || 'Sin plan',
        after: nextPlan?.name || 'Nuevo plan',
      })
    }

    if (store.subscription_status !== editStatus) {
      changes.push({
        label: 'Estado de suscripción',
        before: store.subscription_status,
        after: editStatus,
      })
    }

    if ((store.billing_cycle || 'monthly') !== editBillingCycle) {
      changes.push({
        label: 'Ciclo de facturación',
        before: store.billing_cycle || 'monthly',
        after: editBillingCycle,
      })
    }

    const prevTrialStr = store.trial_ends_at ? new Date(store.trial_ends_at).toISOString().split('T')[0] : ''
    if (prevTrialStr !== editTrialEndsAt) {
      changes.push({
        label: 'Límite de prueba (Trial)',
        before: prevTrialStr ? new Date(prevTrialStr).toLocaleDateString('es-BO') : 'Sin prueba',
        after: editTrialEndsAt ? new Date(editTrialEndsAt).toLocaleDateString('es-BO') : 'Sin prueba',
      })
    }

    const prevSubStr = store.subscription_ends_at ? new Date(store.subscription_ends_at).toISOString().split('T')[0] : ''
    if (prevSubStr !== editSubscriptionEndsAt) {
      changes.push({
        label: 'Vencimiento de suscripción',
        before: prevSubStr ? new Date(prevSubStr).toLocaleDateString('es-BO') : 'Indefinido',
        after: editSubscriptionEndsAt ? new Date(editSubscriptionEndsAt).toLocaleDateString('es-BO') : 'Indefinido',
      })
    }

    if ((store.grace_period_days ?? 5) !== Number(editGracePeriodDays)) {
      changes.push({
        label: 'Días de gracia comercial',
        before: `${store.grace_period_days ?? 5} días`,
        after: `${editGracePeriodDays} días`,
      })
    }

    if (changes.length === 0) {
      toast.info('No se detectaron cambios en la suscripción.')
      return
    }

    setPendingSubscriptionChanges(changes)
    setIsConfirmSubscriptionOpen(true)
  }

  const handleConfirmSaveSubscription = async () => {
    if (!store) return
    try {
      await updateSubscriptionMutation.mutateAsync({
        storeId: store.id,
        payload: {
          planId: editPlanId,
          subscriptionStatus: editStatus,
          billingCycle: editBillingCycle,
          trialEndsAt: editTrialEndsAt ? new Date(editTrialEndsAt).toISOString() : undefined,
          subscriptionEndsAt: editSubscriptionEndsAt ? new Date(editSubscriptionEndsAt).toISOString() : undefined,
          gracePeriodDays: Number(editGracePeriodDays),
        },
      })
      setIsConfirmSubscriptionOpen(false)
      toast.success('Suscripción actualizada exitosamente.')
    } catch (err: any) {
      setIsConfirmSubscriptionOpen(false)
      const msg = err.message || 'Error al actualizar suscripción'
      setEditError(msg)
      toast.error(msg)
    }
  }

  const handleConfirmForceClose = async () => {
    if (!registerToClose || !store) return
    const regLabel = registerToClose.opened_by_name
      ? `operada por ${registerToClose.opened_by_name}`
      : `#${registerToClose.id.slice(0, 8)}`
    try {
      await forceCloseRegisterMutation.mutateAsync({
        registerId: registerToClose.id,
        storeId: store.id,
      })
      setIsConfirmCloseRegisterOpen(false)
      setRegisterToClose(null)
      toast.success(`Caja (${regLabel}) cerrada administrativamente con éxito.`)
    } catch (err: any) {
      setIsConfirmCloseRegisterOpen(false)
      toast.error(`Error al cerrar caja: ${err.message}`)
    }
  }

  const handleOpenPaymentForm = () => {
    if (!store) return
    const plan = plans.find((p) => p.id === store.plan_id)
    setPayAmount(plan ? String(plan.monthly_price) : '0')
    setPayMethod('qr')
    setPayReference('')
    setPayNotes('')
    setPayError(null)
    setUseManualRenewalDate(false)

    const proposed = calculateProposedRenewalDate(store, store.billing_cycle || 'monthly')
    setPayManualDate(proposed.split('T')[0])
    setIsPaymentFormOpen(true)
  }

  const handleRequestRecordPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return
    setPayError(null)

    const val = Number(payAmount)
    if (isNaN(val) || val <= 0) {
      setPayError('El monto debe ser un número positivo mayor a 0.')
      toast.error('El monto debe ser mayor a 0.')
      return
    }

    const newDateIso = useManualRenewalDate
      ? new Date(payManualDate).toISOString()
      : calculateProposedRenewalDate(store, store.billing_cycle || 'monthly')

    const changes: ChangeItem[] = [
      {
        label: 'Monto a registrar',
        before: '—',
        after: `Bs. ${val.toFixed(2)}`,
      },
      {
        label: 'Método de pago',
        before: '—',
        after: payMethod === 'qr' ? 'QR Simple' : payMethod === 'transfer' ? 'Transferencia' : 'Efectivo',
      },
      {
        label: 'Nueva fecha de vencimiento',
        before: store.subscription_ends_at ? new Date(store.subscription_ends_at).toLocaleDateString('es-BO') : 'Sin fecha',
        after: new Date(newDateIso).toLocaleDateString('es-BO'),
      },
      {
        label: 'Estado de suscripción',
        before: store.subscription_status,
        after: 'Activa',
      },
    ]

    setPendingPaymentChanges(changes)
    setIsConfirmPaymentOpen(true)
  }

  const handleConfirmPayment = async () => {
    if (!store) return
    try {
      await recordPaymentMutation.mutateAsync({
        storeId: store.id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        reference: payReference.trim() || undefined,
        manualEndDate: useManualRenewalDate ? payManualDate : undefined,
        notes: payNotes.trim() || undefined,
      })
      setIsConfirmPaymentOpen(false)
      setIsPaymentFormOpen(false)
      toast.success('Pago registrado y ciclo renovado con éxito.')
    } catch (err: any) {
      setIsConfirmPaymentOpen(false)
      const msg = err.message || 'Error al registrar el pago'
      setPayError(msg)
      toast.error(msg)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs">
        Cargando información detallada del comercio...
      </div>
    )
  }

  if (!store) {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">Comercio no encontrado</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          No se encontró ninguna tienda con el identificador solicitado o fue eliminada.
        </p>
        <Link
          to="/stores"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 rounded-lg transition"
        >
          Volver a la lista de tiendas
        </Link>
      </div>
    )
  }

  const overridesCount = Object.keys(store.feature_overrides || {}).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/stores')}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer group"
          >
            <svg
              className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Volver al directorio de tiendas</span>
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-start md:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-zinc-900 dark:text-white text-xl shrink-0 shadow-inner">
              {store.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">{store.name}</h1>
                <StoreStatusBadge status={store.subscription_status} />
                <BusinessTypeBadge
                  businessType={store.business_type}
                  industrySubType={store.industry_sub_type}
                />
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {store.plan_name || 'Sin plan'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>ID: <code className="font-mono text-zinc-700 dark:text-zinc-300">{store.id}</code></span>
                <span className="text-zinc-400 dark:text-zinc-600" aria-hidden="true">·</span>
                <span>Propietario: <strong className="text-zinc-900 dark:text-zinc-200">{store.owner_name || 'Sin asignar'}</strong></span>
                {store.owner_email && (
                  <>
                    <span className="text-zinc-400 dark:text-zinc-600" aria-hidden="true">·</span>
                    <span className="font-mono text-zinc-500 dark:text-zinc-400">{store.owner_email}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center shrink-0">
            <button
              type="button"
              onClick={() => setIsConfirmSuspensionOpen(true)}
              disabled={toggleSuspensionMutation.isPending}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition border cursor-pointer ${
                store.subscription_status === 'suspended'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80 dark:hover:bg-emerald-900/80'
                  : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80 dark:hover:bg-rose-900/80'
              }`}
            >
              {store.subscription_status === 'suspended' ? 'Reactivar comercio' : 'Suspender comercio'}
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-950 dark:text-white bg-zinc-100/60 dark:bg-zinc-800/40'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/40 dark:hover:bg-zinc-800/20'
          }`}
        >
          <span>Visión General</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscription')}
          className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'subscription'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-950 dark:text-white bg-zinc-100/60 dark:bg-zinc-800/40'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/40 dark:hover:bg-zinc-800/20'
          }`}
        >
          <span>Suscripción</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'staff'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-950 dark:text-white bg-zinc-100/60 dark:bg-zinc-800/40'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/40 dark:hover:bg-zinc-800/20'
          }`}
        >
          <span>Colaboradores</span>
          <span className="px-1.5 py-0.2 rounded text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            {staffList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('registers')}
          className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'registers'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-950 dark:text-white bg-zinc-100/60 dark:bg-zinc-800/40'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/40 dark:hover:bg-zinc-800/20'
          }`}
        >
          <span>Cajas y Arqueos</span>
          {(store.open_registers_count ?? 0) > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'payments'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-950 dark:text-white bg-zinc-100/60 dark:bg-zinc-800/40'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/40 dark:hover:bg-zinc-800/20'
          }`}
        >
          <span>Cobranzas</span>
          <span className="px-1.5 py-0.2 rounded text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            {paymentsList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overrides')}
          className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'overrides'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-950 dark:text-white bg-zinc-100/60 dark:bg-zinc-800/40'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100/40 dark:hover:bg-zinc-800/20'
          }`}
        >
          <span>Límites y Módulos</span>
          {overridesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[11px] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold">
              {overridesCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block">
                Colaboradores Activos
              </span>
              <span className="text-2xl font-bold text-zinc-950 dark:text-white mt-1 block font-mono">
                {store.active_users_count ?? 0}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                Límite: {store.plan_features?.max_users ?? 'Ilimitado'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block">
                Cajas en Vivo
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-zinc-950 dark:text-white font-mono">
                  {store.open_registers_count ?? 0}
                </span>
                {(store.open_registers_count ?? 0) > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                Límite: {store.plan_features?.max_cash_registers ?? 'Ilimitado'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block">
                Catálogo de Productos
              </span>
              <span className="text-2xl font-bold text-zinc-950 dark:text-white mt-1 block font-mono">
                {store.products_count ?? 0}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                Límite: {store.plan_features?.max_products ?? 'Ilimitado'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block">
                Clientes Registrados
              </span>
              <span className="text-2xl font-bold text-zinc-950 dark:text-white mt-1 block font-mono">
                {store.customers_count ?? 0}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 block">Base comercial</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Prórrogas Comerciales de Emergencia
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Extiende el acceso de prueba o agrega días de cortesía en caso de micro-cortes o demoras bancarias con comprobantes pendientes de conciliación.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleExtendTrial(7)}
                disabled={extendTrialMutation.isPending}
                className="px-3.5 py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
              >
                +7 días de prueba
              </button>
              <button
                type="button"
                onClick={() => handleExtendTrial(15)}
                disabled={extendTrialMutation.isPending}
                className="px-3.5 py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
              >
                +15 días de prueba
              </button>
              <button
                type="button"
                onClick={() => handleExtendTrial(30)}
                disabled={extendTrialMutation.isPending}
                className="px-3.5 py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
              >
                +30 días de prueba
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subscription' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <form onSubmit={handleRequestSaveSubscription} className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">
                Configuración de Plan y Facturación
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Modifica el plan asignado, el ciclo de cobro y los vencimientos de la tienda.
              </p>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-300 text-xs">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="edit-plan-select" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                  Plan Contratado
                </label>
                <select
                  id="edit-plan-select"
                  value={editPlanId}
                  onChange={(e) => setEditPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 cursor-pointer"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Bs. {p.monthly_price}/mes
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-status-select" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                  Estado de Suscripción
                </label>
                <select
                  id="edit-status-select"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as SubscriptionStatus)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 cursor-pointer"
                >
                  <option value="trialing">En prueba (Trial)</option>
                  <option value="active">Activa</option>
                  <option value="past_due">En gracia (Past due)</option>
                  <option value="suspended">Suspendida</option>
                  <option value="canceled">Cancelada</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-cycle-select" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                  Ciclo de Facturación
                </label>
                <select
                  id="edit-cycle-select"
                  value={editBillingCycle}
                  onChange={(e) => setEditBillingCycle(e.target.value as BillingCycle)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 cursor-pointer"
                >
                  <option value="monthly">Mensual</option>
                  <option value="semiannual">Semestral</option>
                  <option value="annual">Anual</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-grace-input" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                  Días de Gracia Comercial
                </label>
                <input
                  id="edit-grace-input"
                  type="number"
                  min="0"
                  max="60"
                  value={editGracePeriodDays}
                  onChange={(e) => setEditGracePeriodDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-trial-date" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                  Fecha de Límite de Prueba (Trial)
                </label>
                <input
                  id="edit-trial-date"
                  type="date"
                  value={editTrialEndsAt}
                  onChange={(e) => setEditTrialEndsAt(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-sub-date" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                  Fecha de Vencimiento de Suscripción
                </label>
                <input
                  id="edit-sub-date"
                  type="date"
                  value={editSubscriptionEndsAt}
                  onChange={(e) => setEditSubscriptionEndsAt(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end">
              <button
                type="submit"
                disabled={updateSubscriptionMutation.isPending}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {updateSubscriptionMutation.isPending ? 'Guardando...' : 'Guardar cambios de suscripción'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">Colaboradores de la Tienda</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Usuarios con acceso a las terminales POS y panel operativo de este comercio.
              </p>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {staffList.length} registrados
            </span>
          </div>

          {loadingStaff ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs">Cargando equipo...</div>
          ) : staffList.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs">
              No hay colaboradores vinculados a esta tienda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950/80 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-5 py-3">Nombre</th>
                    <th className="px-5 py-3">Correo</th>
                    <th className="px-5 py-3">Rol</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                  {staffList.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-850/40 transition">
                      <td className="px-5 py-3.5 font-medium text-zinc-950 dark:text-white">
                        {u.full_name || 'Sin nombre'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-500 dark:text-zinc-400">
                        {u.email || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {u.role === 'owner' ? 'Propietario' : u.role === 'admin' ? 'Administrador' : u.role === 'cashier' ? 'Cajero' : 'Bodeguero'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() =>
                            toggleUserStatusMutation.mutate({
                              userId: u.id,
                              isActive: !u.is_active,
                              storeId: store.id,
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer border ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/70 dark:hover:bg-emerald-900/60'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/70 dark:hover:bg-rose-900/60'
                          }`}
                        >
                          {u.is_active ? 'Activo' : 'Bloqueado'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {u.email ? (
                          <button
                            type="button"
                            onClick={() => handleSendResetLink(u.email!)}
                            className="text-xs text-zinc-900 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-white font-medium transition cursor-pointer hover:underline"
                          >
                            Restablecer clave
                          </button>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'registers' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">Turnos de Caja y Arqueo</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Supervisión en vivo de cajas abiertas y cierres administrativos de emergencia.
              </p>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {registersList.length} turnos registrados
            </span>
          </div>

          {loadingRegisters ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs">Cargando cajas...</div>
          ) : registersList.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs">
              No hay turnos de caja registrados para esta tienda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950/80 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Operador</th>
                    <th className="px-5 py-3">Apertura</th>
                    <th className="px-5 py-3">Monto Inicial</th>
                    <th className="px-5 py-3">Monto Cierre</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                  {registersList.map((reg) => (
                    <tr key={reg.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-850/40 transition">
                      <td className="px-5 py-3.5">
                        {reg.status === 'open' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Abierta
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            Cerrada
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-zinc-950 dark:text-white">
                        {reg.opened_by_name || 'Cajero no asignado'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-500 dark:text-zinc-400">
                        {new Date(reg.opened_at).toLocaleDateString('es-BO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-900 dark:text-zinc-200">
                        Bs. {Number(reg.opening_amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-700 dark:text-zinc-300">
                        {reg.closing_amount !== null ? `Bs. ${Number(reg.closing_amount).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {reg.status === 'open' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRegisterToClose(reg)
                              setIsConfirmCloseRegisterOpen(true)
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/80 dark:hover:bg-rose-900 rounded transition cursor-pointer"
                          >
                            Forzar Cierre
                          </button>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">Cobranzas y Registro de Pagos</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Conciliación manual de transferencias bancarias, pagos QR y renovaciones de ciclo.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenPaymentForm}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              + Registrar Cobro Manual
            </button>
          </div>

          {isPaymentFormOpen && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-6 space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <h4 className="text-sm font-bold text-zinc-950 dark:text-white">Nuevo Comprobante de Cobranza</h4>
                <button
                  type="button"
                  onClick={() => setIsPaymentFormOpen(false)}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              {payError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-300 text-xs">
                  {payError}
                </div>
              )}

              <form onSubmit={handleRequestRecordPayment} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="pay-amount-input" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                      Monto Cobrado (Bs.)
                    </label>
                    <input
                      id="pay-amount-input"
                      type="number"
                      step="0.01"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="pay-method-select" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                      Método de Pago
                    </label>
                    <select
                      id="pay-method-select"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as 'qr' | 'transfer' | 'cash')}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 cursor-pointer"
                    >
                      <option value="qr">Pago QR Simple</option>
                      <option value="transfer">Transferencia Bancaria</option>
                      <option value="cash">Efectivo en Mano</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pay-ref-input" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                    Referencia / N° de Comprobante
                  </label>
                  <input
                    id="pay-ref-input"
                    type="text"
                    placeholder="Ej. TRANSF-098273 o Código de aprobación"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pay-notes-input" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                    Notas Administrativas (Opcional)
                  </label>
                  <input
                    id="pay-notes-input"
                    type="text"
                    placeholder="Ej. Renovación acordada vía WhatsApp"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPaymentFormOpen(false)}
                    className="px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
                  >
                    Continuar y Confirmar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Historial de Cobros</h4>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{paymentsList.length} pagos</span>
            </div>

            {loadingPayments ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs">Cargando pagos...</div>
            ) : paymentsList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 text-xs">
                No hay pagos registrados para esta tienda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/80 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-5 py-3">Fecha</th>
                      <th className="px-5 py-3">Monto</th>
                      <th className="px-5 py-3">Método</th>
                      <th className="px-5 py-3">Referencia</th>
                      <th className="px-5 py-3">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                    {paymentsList.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-850/40 transition">
                        <td className="px-5 py-3.5 font-mono text-zinc-500 dark:text-zinc-400">
                          {new Date(p.created_at).toLocaleDateString('es-BO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Bs. {Number(p.amount).toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            {p.payment_method === 'qr' ? 'QR Simple' : p.payment_method === 'transfer' ? 'Transferencia' : 'Efectivo'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-zinc-700 dark:text-zinc-300">
                          {p.reference || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">
                          {p.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'overrides' && (
        <StoreOverridesTab store={store} />
      )}

      <ConfirmationModal
        isOpen={isConfirmSuspensionOpen}
        onClose={() => setIsConfirmSuspensionOpen(false)}
        onConfirm={handleConfirmToggleSuspension}
        isPending={toggleSuspensionMutation.isPending}
        title={store.subscription_status === 'suspended' ? 'Reactivar tienda' : 'Suspender tienda'}
        description={
          store.subscription_status === 'suspended'
            ? `¿Deseas reactivar el acceso de "${store.name}" a la terminal POS y restaurar sus operaciones?`
            : `¿Deseas suspender a "${store.name}"? Los colaboradores perderán acceso inmediato a la terminal POS y no podrán realizar ventas ni iniciar sesión.`
        }
        confirmText={store.subscription_status === 'suspended' ? 'Reactivar acceso' : 'Suspender acceso'}
        variant={store.subscription_status === 'suspended' ? 'primary' : 'danger'}
        changes={[
          {
            label: 'Estado de la suscripción',
            before: store.subscription_status === 'suspended' ? 'Suspendida' : 'Activa',
            after: store.subscription_status === 'suspended' ? 'Activa' : 'Suspendida',
          },
        ]}
      />

      <ConfirmationModal
        isOpen={isConfirmSubscriptionOpen}
        onClose={() => setIsConfirmSubscriptionOpen(false)}
        onConfirm={handleConfirmSaveSubscription}
        isPending={updateSubscriptionMutation.isPending}
        title="Confirmar cambios en suscripción"
        description={`Se aplicarán las siguientes modificaciones para "${store.name}":`}
        changes={pendingSubscriptionChanges}
        confirmText="Guardar cambios"
        variant="primary"
      />

      <ConfirmationModal
        isOpen={isConfirmCloseRegisterOpen}
        onClose={() => {
          setIsConfirmCloseRegisterOpen(false)
          setRegisterToClose(null)
        }}
        onConfirm={handleConfirmForceClose}
        isPending={forceCloseRegisterMutation.isPending}
        title="Cierre forzado administrativo de caja"
        description="Esta acción forzará el cierre de la caja de forma inmediata para desbloquear el turno. El arqueo se calculará automáticamente con las ventas registradas para no desfasar el Corte Z."
        confirmText="Forzar cierre de caja"
        variant="danger"
        changes={
          registerToClose
            ? [
                {
                  label: 'Turno de caja',
                  before: 'Abierta',
                  after: 'Cerrada administrativamente',
                },
                {
                  label: 'Operador del turno',
                  before: registerToClose.opened_by_name || 'Sin asignar',
                  after: 'Cierre por Super Administrador',
                },
              ]
            : []
        }
      />

      <ConfirmationModal
        isOpen={isConfirmPaymentOpen}
        onClose={() => setIsConfirmPaymentOpen(false)}
        onConfirm={handleConfirmPayment}
        isPending={recordPaymentMutation.isPending}
        title="Confirmar registro de cobro manual"
        description={`Se registrará el cobro y se actualizarán las fechas de servicio para "${store.name}":`}
        changes={pendingPaymentChanges}
        confirmText="Confirmar y registrar pago"
        variant="primary"
      />
    </div>
  )
}
