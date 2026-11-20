import { useState, useEffect, useRef, type ReactNode, type UIEvent } from 'react'

interface StickyTableWrapperProps {
  children: ReactNode
  className?: string
  maxHeight?: string
  dark?: boolean
}

export function StickyTableWrapper({
  children,
  className = '',
  maxHeight = 'max-h-[calc(100vh-230px)]',
  dark = false,
}: StickyTableWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const floatingBarRef = useRef<HTMLDivElement>(null)

  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false)
  const [showFloatingScroll, setShowFloatingScroll] = useState(false)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [floatingBarMetrics, setFloatingBarMetrics] = useState({ left: 0, width: 0 })

  const isSyncingFromTable = useRef(false)
  const isSyncingFromFloating = useRef(false)

  // Medir dimensiones y determinar si se necesita la barra de scroll flotante
  const updateMetrics = () => {
    const el = scrollRef.current
    if (!el) return

    const overflowX = el.scrollWidth > el.clientWidth + 2
    setHasHorizontalOverflow(overflowX)
    setScrollWidth(el.scrollWidth)

    if (!overflowX) {
      setShowFloatingScroll(false)
      return
    }

    const rect = el.getBoundingClientRect()
    setFloatingBarMetrics({
      left: rect.left,
      width: rect.width,
    })

    // La barra flotante sticky se muestra cuando:
    // 1. La tabla está visible en pantalla (rect.top < window.innerHeight)
    // 2. La parte inferior de la tabla está por debajo del viewport (rect.bottom > window.innerHeight)
    // 3. La tabla no ha salido completamente por arriba (rect.bottom > 80)
    const isVisible =
      rect.top < window.innerHeight &&
      rect.bottom > window.innerHeight &&
      rect.bottom > 80
    setShowFloatingScroll(isVisible)
  }

  useEffect(() => {
    updateMetrics()

    const handleScrollOrResize = () => {
      updateMetrics()
    }

    window.addEventListener('scroll', handleScrollOrResize, { passive: true })
    window.addEventListener('resize', handleScrollOrResize, { passive: true })

    // Observer para cambios de tamaño en el contenido de la tabla
    let resizeObserver: ResizeObserver | null = null
    if (scrollRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateMetrics()
      })
      resizeObserver.observe(scrollRef.current)
    }

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize)
      window.removeEventListener('resize', handleScrollOrResize)
      resizeObserver?.disconnect()
    }
  }, [])

  // Sincronizar scroll horizontal desde la tabla hacia la barra flotante
  const handleTableScroll = (e: UIEvent<HTMLDivElement>) => {
    if (isSyncingFromFloating.current) {
      isSyncingFromFloating.current = false
      return
    }
    if (floatingBarRef.current) {
      isSyncingFromTable.current = true
      floatingBarRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  // Sincronizar scroll horizontal desde la barra flotante hacia la tabla
  const handleFloatingScroll = (e: UIEvent<HTMLDivElement>) => {
    if (isSyncingFromTable.current) {
      isSyncingFromTable.current = false
      return
    }
    if (scrollRef.current) {
      isSyncingFromFloating.current = true
      scrollRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Contenedor principal con scroll vertical y horizontal */}
      <div
        ref={scrollRef}
        onScroll={handleTableScroll}
        className={`overflow-auto min-h-[350px] rounded-xl shadow-xs scrollbar-thin ${maxHeight} ${
          dark
            ? 'bg-slate-900 border border-slate-800'
            : 'bg-white border border-[#CFDBD5]'
        } ${className}`}
      >
        {children}
      </div>

      {/* Barra de scroll horizontal sticky que permanece anclada al fondo de la pantalla mientras la tabla está visible */}
      {hasHorizontalOverflow && showFloatingScroll && (
        <div
          ref={floatingBarRef}
          onScroll={handleFloatingScroll}
          style={{
            left: `${floatingBarMetrics.left}px`,
            width: `${floatingBarMetrics.width}px`,
          }}
          className={`fixed bottom-0 z-30 overflow-x-auto shadow-lg py-1 transition-opacity duration-150 scrollbar-thin ${
            dark
              ? 'bg-slate-900 border-t border-slate-800'
              : 'bg-[#E8EDDF] border-t border-[#CFDBD5]'
          }`}
          aria-hidden="true"
        >
          {/* Elemento fantasma para replicar exactamente el ancho scrolleable de la tabla */}
          <div style={{ width: `${scrollWidth}px`, height: '6px' }} />
        </div>
      )}
    </div>
  )
}
export default StickyTableWrapper
