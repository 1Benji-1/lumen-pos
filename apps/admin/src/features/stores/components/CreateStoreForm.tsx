import { useState } from 'react'
import { createStore } from '../services/adminStoreService'

export function CreateStoreForm() {
  const [email, setEmail] = useState('')
  const [storeName, setStoreName] = useState('')
  const [fullName, setFullName] = useState('')
  const [planCode, setPlanCode] = useState<'standard' | 'pro' | 'enterprise'>('standard')
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trialing' | 'active'>('trialing')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'semiannual' | 'annual'>('monthly')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      await createStore({
        email,
        storeName,
        fullName,
        planCode,
        subscriptionStatus,
        billingCycle: subscriptionStatus === 'active' ? billingCycle : undefined,
      })
      setSuccess(`Tienda "${storeName}" creada. Se envió invitación a ${email}.`)
      setEmail('')
      setStoreName('')
      setFullName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la tienda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 text-white p-8">
      <h2 className="text-xl font-bold">Crear tienda nueva</h2>

      <input
        type="text"
        placeholder="Nombre de la tienda"
        value={storeName}
        onChange={(e) => setStoreName(e.target.value)}
        required
        className="w-full rounded px-3 py-2 text-black"
      />

      <input
        type="text"
        placeholder="Nombre del dueño"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        className="w-full rounded px-3 py-2 text-black"
      />

      <input
        type="email"
        placeholder="Correo del dueño"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded px-3 py-2 text-black"
      />

      <select
        value={planCode}
        onChange={(e) => setPlanCode(e.target.value as typeof planCode)}
        className="w-full rounded px-3 py-2 text-black"
      >
        <option value="standard">Standard</option>
        <option value="pro">Pro</option>
        <option value="enterprise">Enterprise</option>
      </select>

      <select
        value={subscriptionStatus}
        onChange={(e) => setSubscriptionStatus(e.target.value as typeof subscriptionStatus)}
        className="w-full rounded px-3 py-2 text-black"
      >
        <option value="trialing">Trial gratuito (14 días)</option>
        <option value="active">Activa (ya pagó)</option>
      </select>

      {subscriptionStatus === 'active' && (
        <select
          value={billingCycle}
          onChange={(e) => setBillingCycle(e.target.value as typeof billingCycle)}
          className="w-full rounded px-3 py-2 text-black"
        >
          <option value="monthly">Mensual</option>
          <option value="semiannual">Semestral</option>
          <option value="annual">Anual</option>
        </select>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 rounded py-2 disabled:opacity-50"
      >
        {loading ? 'Creando...' : 'Crear tienda'}
      </button>
    </form>
  )
}