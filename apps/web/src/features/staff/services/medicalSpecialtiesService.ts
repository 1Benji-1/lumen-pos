import { supabase } from '../../../shared/lib/supabaseClient'

export interface MedicalProfessional {
  user_id: string
  specialties: string[]
}

export async function getMedicalSpecialties(storeId: string): Promise<MedicalProfessional[]> {
  const { data, error } = await supabase.from('medical_professionals')
    .select('user_id,specialties').eq('store_id', storeId)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function setMedicalSpecialties(userId: string, specialties: string[]): Promise<void> {
  const { error } = await supabase.rpc('set_medical_specialties', {
    p_user_id: userId, p_specialties: specialties,
  })
  if (error) throw new Error(error.message)
}
