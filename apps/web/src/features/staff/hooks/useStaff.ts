import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserRole } from '@lumen-pos/types'
import {
  getStaffMembers,
  createStaffMember,
  updateStaffRole,
  toggleStaffStatus,
  deleteStaffMember,
  checkMemberActiveRegister,
  type CreateStaffInput,
} from '../services/staffService'

export function useStaff(storeId: string | null) {
  return useQuery({
    queryKey: ['staff', storeId],
    queryFn: () => getStaffMembers(storeId!),
    enabled: !!storeId,
  })
}

export function useCreateStaff(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStaffInput) => createStaffMember(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', storeId] })
    },
  })
}

export function useUpdateStaffRole(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateStaffRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', storeId] })
    },
  })
}

export function useToggleStaffStatus(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      toggleStaffStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', storeId] })
    },
  })
}

export function useCheckActiveRegister(storeId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ['active-cash-register-check', storeId, userId],
    queryFn: () => checkMemberActiveRegister(storeId!, userId!),
    enabled: !!storeId && !!userId,
  })
}

export function useDeleteStaff(storeId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => deleteStaffMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', storeId] })
    },
  })
}
