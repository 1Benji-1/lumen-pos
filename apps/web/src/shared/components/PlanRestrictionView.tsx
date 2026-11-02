import { useNavigate } from 'react-router-dom'

interface PlanRestrictionViewProps {
  title?: string
  description?: string
  planName?: string | null
  fallbackPath?: string
}

export function PlanRestrictionView({
  title = 'Función no disponible en tu plan actual',
  description,
  planName,
  fallbackPath = '/',
}: PlanRestrictionViewProps) {
  const navigate = useNavigate()

  function handleGoBack() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallbackPath)
    }
  }

  return (
    <div className="min-h-[55vh] flex items-center justify-center p-6 animate-inventory-view">
      <div className="max-w-md w-full bg-white border border-[#CFDBD5] rounded-xl p-6 sm:p-8 text-center shadow-sm">
        {/* Icono de función bloqueada con acento Tuscan Sun */}
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#FEF9E7] border border-[#F5CB5C]/50 flex items-center justify-center text-[#8A6D14]">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-[#242423] tracking-tight mb-2">
          {title}
        </h2>

        <p className="text-xs sm:text-sm text-[#5A5D5A] leading-relaxed mb-6">
          {description ?? (
            <>
              Esta característica no está incluida en tu suscripción{' '}
              {planName ? <span className="text-[#242423] font-semibold">({planName})</span> : ''}.
              Consulta con tu coordinador o soporte técnico para ampliar tu suscripción.
            </>
          )}
        </p>

        {/* Acciones de navegación con botón volver atrás */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:flex-1 px-4 py-2.5 rounded-lg bg-[#242423] hover:bg-[#333533] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver atrás
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full sm:flex-1 px-4 py-2.5 rounded-lg bg-white hover:bg-[#E8EDDF] text-[#242423] text-xs font-medium border border-[#CFDBD5] flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 shadow-2xs"
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  )
}
export default PlanRestrictionView
