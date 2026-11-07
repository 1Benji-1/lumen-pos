interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export function LoadingScreen({
  message = 'Cargando...',
  fullScreen = false,
}: LoadingScreenProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 transition-opacity duration-200 ${
        fullScreen ? 'min-h-screen bg-[#E8EDDF]' : 'min-h-[50vh] w-full'
      }`}
      role="status"
      aria-label={message}
    >
      {/* Logo sin fondo ni recubrimiento, con movimiento sutil de subir y bajar */}
      <img
        src="/logo.svg"
        alt="Lumen POS"
        className="w-16 h-16 object-contain animate-logo-bob select-none pointer-events-none"
      />

      {/* Texto cargando... abajo del logo */}
      <p className="mt-4 text-xs sm:text-sm font-medium text-[#242423] tracking-wide">
        {message}
      </p>
    </div>
  )
}
export default LoadingScreen
