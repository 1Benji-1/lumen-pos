import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { StaffMember } from '@lumen-pos/types'
import { getMedicalSpecialties, setMedicalSpecialties } from '../services/medicalSpecialtiesService'

const specialties = [
  ['medicina_general', 'Medicina general'], ['odontologia', 'Odontología'],
  ['psicologia', 'Psicología'], ['pediatria', 'Pediatría'],
  ['fisioterapia', 'Fisioterapia'], ['nutricion', 'Nutrición'],
  ['dermatologia', 'Dermatología'], ['otra', 'Otra especialidad'],
] as const
const emptyProfessionals: Awaited<ReturnType<typeof getMedicalSpecialties>> = []

export function MedicalSpecialtiesSection({ storeId, staff, isOwner }: {
  storeId: string; staff: StaffMember[]; isOwner: boolean
}) {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const { data = emptyProfessionals, isLoading, isError } = useQuery({
    queryKey: ['medical-specialties', storeId], queryFn: () => getMedicalSpecialties(storeId),
  })
  const activeStaff = staff.filter(member => member.is_active)

  async function save() {
    if (!userId) return
    setSaving(true); setFeedback('')
    try {
      await setMedicalSpecialties(userId, selected)
      await queryClient.invalidateQueries({ queryKey: ['medical-specialties', storeId] })
      setFeedback('Especialidades guardadas.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudieron guardar las especialidades.')
    } finally { setSaving(false) }
  }

  return <section aria-labelledby="medical-specialties-title" className="rounded-xl border border-[#CFDBD5] bg-white p-5 space-y-4">
    <div>
      <h2 id="medical-specialties-title" className="text-base font-semibold text-[#242423]">Especialidades del equipo</h2>
      <p className="mt-1 text-sm text-[#5A5D5A]">Asigna especialidades a cada profesional del consultorio. No cambian el plan ni otorgan acceso clínico.</p>
    </div>
    {isLoading ? <p className="text-sm">Cargando especialidades...</p> : isError ? <p role="alert" className="text-sm text-[#BC4749]">No se pudieron cargar las especialidades.</p> : <>
      <label className="block max-w-md text-sm font-medium" htmlFor="medical-professional">Profesional</label>
      <select id="medical-professional" value={userId} onChange={event => { setUserId(event.target.value); setSelected(data.find(item => item.user_id === event.target.value)?.specialties ?? []); setFeedback('') }} className="block min-h-11 w-full max-w-md rounded-lg border border-[#CFDBD5] bg-white px-3 text-sm">
        <option value="">Selecciona un profesional</option>
        {activeStaff.map(member => <option key={member.id} value={member.id}>{member.full_name || member.email}</option>)}
      </select>
      {userId && <>
        <fieldset disabled={!isOwner} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="mb-2 text-sm font-medium">Especialidades</legend>
          {specialties.map(([id, label]) => <label key={id} className="flex min-h-11 items-center gap-2 rounded-lg border border-[#CFDBD5] px-3 text-sm">
            <input type="checkbox" aria-label={label} checked={selected.includes(id)} onChange={event => setSelected(current => event.target.checked ? [...current, id] : current.filter(value => value !== id))} />{label}
          </label>)}
        </fieldset>
        {isOwner && <button type="button" onClick={save} disabled={saving} className="min-h-11 rounded-lg bg-[#F5CB5C] px-4 text-sm font-semibold text-[#242423] disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar especialidades'}</button>}
      </>}
      {feedback && <p role="status" className="text-sm text-[#242423]">{feedback}</p>}
    </>}
  </section>
}
