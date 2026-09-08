import { useState } from 'react'

export function ManualBarcodeInput({ onSubmit }: { onSubmit: (barcode: string) => void }) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value.trim().length === 0) return
    onSubmit(value.trim())
    setValue('')
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
        type="text"
        placeholder="Ingresar código de barras manualmente"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded px-3 py-2 text-black text-sm"
      />
      <button type="submit" className="bg-slate-700 text-white rounded px-4 text-sm">
        Agregar
      </button>
    </form>
  )
}