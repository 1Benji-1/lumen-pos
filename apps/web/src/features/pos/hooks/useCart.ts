import { useState } from 'react'

export type CartLine = {
  variantId: string
  productName: string
  variantName: string
  unitPrice: number
  quantity: number
  stockAvailable: number
  unit?: string
  imageUrl?: string | null
  discount?: number // Descuento en Bs sobre esta línea
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([])
  const [globalDiscount, setGlobalDiscount] = useState<number>(0)

  function addItem(item: Omit<CartLine, 'quantity'>) {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === item.variantId)
      if (existing) {
        return prev.map((l) =>
          l.variantId === item.variantId
            ? { ...l, quantity: l.quantity + 1 }
            : l
        )
      }
      return [...prev, { ...item, quantity: 1, discount: 0 }]
    })
  }

  function updateQuantity(variantId: string, quantity: number) {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.variantId !== variantId) return l
          const minQty = l.unit === 'unit' ? 1 : 0.001
          return {
            ...l,
            quantity: Math.max(minQty, quantity),
          }
        })
        .filter((l) => l.quantity > 0)
    )
  }

  function updateLineDiscount(variantId: string, discount: number) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.variantId !== variantId) return l
        const lineMax = l.unitPrice * l.quantity
        return {
          ...l,
          discount: Math.max(0, Math.min(discount, lineMax)),
        }
      })
    )
  }

  function removeItem(variantId: string) {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId))
  }

  function clearCart() {
    setLines([])
    setGlobalDiscount(0)
  }

  // Subtotal = suma de (precio * cantidad - descuento por línea)
  const itemsSubtotal = lines.reduce(
    (sum, l) => sum + Math.max(0, l.unitPrice * l.quantity - (l.discount || 0)),
    0
  )

  // Total final = Subtotal de ítems - Descuento global
  const total = Math.max(0, itemsSubtotal - globalDiscount)

  return {
    lines,
    addItem,
    updateQuantity,
    updateLineDiscount,
    removeItem,
    clearCart,
    itemsSubtotal,
    globalDiscount,
    setGlobalDiscount,
    total,
  }
}