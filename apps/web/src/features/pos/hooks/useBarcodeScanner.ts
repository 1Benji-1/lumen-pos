import { useEffect, useRef } from 'react'

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now()
      const gap = now - lastKeyTimeRef.current

      console.log(`Tecla: "${e.key}" | gap: ${gap}ms | buffer antes: "${bufferRef.current}"`)

      if (gap > 300) {
        bufferRef.current = ''
      }
      lastKeyTimeRef.current = now

      if (e.key === 'Enter') {
        console.log(`Enter presionado. Buffer final: "${bufferRef.current}"`)
        if (bufferRef.current.length >= 4) {
          onScan(bufferRef.current)
        } else {
          console.log('Buffer muy corto, se ignora.')
        }
        bufferRef.current = ''
        return
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onScan])
}