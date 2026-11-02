import { useState, useRef, useEffect } from 'react'
import { useRetailSubrubro } from '../../../shared/hooks/useRetailSubrubro'

export function ManualBarcodeInput({ onSubmit }: { onSubmit: (barcode: string) => void }) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { config } = useRetailSubrubro()

  useEffect(() => {
    if (config.autoFocusBarcode && inputRef.current) {
      inputRef.current.focus()
    }
  }, [config.autoFocusBarcode])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value.trim().length === 0) return
    onSubmit(value.trim())
    setValue('')
    if (config.autoFocusBarcode && inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      // Evita que estas teclas lleguen al listener global del
      // escáner automático, para que no se mezclen ambos flujos.
      onKeyDown={(e) => e.stopPropagation()}
      className="flex gap-2 mb-4"
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Ingresar o escanear código de barras..."
        aria-label="Ingresar o escanear código de barras"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-md px-3.5 py-2.5 text-[#242423] text-xs bg-white border border-[#CFDBD5] placeholder-[#5A5D5A] focus:outline-none focus:border-[#242423] shadow-xs"
      />
      <button
        type="submit"
        aria-label="Agregar producto por código de barras"
        className="bg-[#F5CB5C] hover:bg-[#E5B946] text-[#242423] font-semibold rounded-md px-5 text-xs transition shadow-xs flex items-center justify-center"
      >
        Agregar
      </button>
    </form>
  )
}