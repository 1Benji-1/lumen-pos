import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getStores,
  getPlans,
  updateStoreFeatures,
  updateStoreSubscription,
  toggleStoreSuspension,
  extendStoreTrial,
  getStoreStaff,
  adminToggleUserStatus,
  sendUserPasswordReset,
  getStoreCashRegisters,
  forceCloseCashRegister,
  getStorePayments,
  recordPaymentAndRenew,
} from '../services/adminStoreService'
import type { SubscriptionStatus, BillingCycle, RetailSubType } from '@lumen-pos/types'

export function useStores() {
  return useQuery({
    queryKey: ['admin-stores'],
    queryFn: () => getStores(),
  })
}

export function useStore(storeId: string | undefined) {
  const { data: stores = [], isLoading, error } = useStores()
  const store = stores.find((s) => s.id === storeId) || null
  return { store, isLoading, error }
}

export function usePlans() {
  return useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => getPlans(),
  })
}

export function useUpdateStoreFeatures() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      storeId,
      featureOverrides,
    }: {
      storeId: string
      featureOverrides: Record<string, any>
    }) => updateStoreFeatures(storeId, featureOverrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] })
    },
  })
}

export function useUpdateStoreSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      storeId,
      payload,
    }: {
      storeId: string
      payload: {
        planId?: string
        subscriptionStatus?: SubscriptionStatus
        billingCycle?: BillingCycle | null
        trialEndsAt?: string
        subscriptionEndsAt?: string
        gracePeriodDays?: number
        name?: string
        industrySubType?: RetailSubType
      }
    }) => updateStoreSubscription(storeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] })
    },
  })
}

export function useToggleStoreSuspension() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      storeId,
      currentStatus,
    }: {
      storeId: string
      currentStatus: SubscriptionStatus
    }) => toggleStoreSuspension(storeId, currentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] })
    },
  })
}

export function useExtendStoreTrial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      storeId,
      daysToAdd,
      currentTrialEndsAt,
    }: {
      storeId: string
      daysToAdd: number
      currentTrialEndsAt?: string
    }) => extendStoreTrial(storeId, daysToAdd, currentTrialEndsAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] })
    },
  })
}

export function useStoreStaff(storeId: string | null) {
  return useQuery({
    queryKey: ['admin-store-staff', storeId],
    queryFn: () => (storeId ? getStoreStaff(storeId) : Promise.resolve([])),
    enabled: !!storeId,
  })
}

export function useAdminToggleUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      isActive,
    }: {
      userId: string
      isActive: boolean
      storeId: string
    }) => adminToggleUserStatus(userId, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-store-staff', variables.storeId] })
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] })
    },
  })
}

export function useAdminSendPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => sendUserPasswordReset(email),
  })
}

export function useStoreCashRegisters(storeId: string | null) {
  return useQuery({
    queryKey: ['admin-store-cash-registers', storeId],
    queryFn: () => (storeId ? getStoreCashRegisters(storeId) : Promise.resolve([])),
    enabled: !!storeId,
  })
}

export function useForceCloseCashRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      registerId,
    }: {
      registerId: string
      storeId: string
    }) => forceCloseCashRegister(registerId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-store-cash-registers', variables.storeId] })
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] })
    },
  })
}

export function useStorePayments(storeId: string | null) {
  return useQuery({
    queryKey: ['admin-store-payments', storeId],
    queryFn: () => (storeId ? getStorePayments(storeId) : Promise.resolve([])),
    enabled: !!storeId,
  })
}

export function useRecordPaymentAndRenew() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      storeId: string
      amount: number
      paymentMethod: 'transfer' | 'qr' | 'cash'
      reference?: string
      manualEndDate?: string
      notes?: string
    }) => recordPaymentAndRenew(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-store-payments', variables.storeId] })
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] })
    },
  })
}
