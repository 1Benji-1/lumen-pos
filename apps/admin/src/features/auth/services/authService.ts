import { supabase } from '../../../shared/lib/supabaseClient'

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getMfaAssuranceLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw error
  return data
}

export async function listMfaFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error
  return data
}

export async function enrollMfaTotp(friendlyName?: string) {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'Lumen POS Admin',
    friendlyName,
  })
  if (error) throw error
  return data
}

export async function challengeAndVerifyMfa(factorId: string, code: string) {
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  })
  if (challengeError) throw challengeError

  const { data, error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })
  if (verifyError) throw verifyError
  return data
}

export async function unenrollMfaFactor(factorId: string) {
  const { data, error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw error
  return data
}