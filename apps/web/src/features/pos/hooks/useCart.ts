import { useState } from 'react'

export type CartLine = {
  variantId: string
  productName: string
  variantName: string
  unitPrice: number
  quantity: number
  stockAvailable: number
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([])

  function addItem(item: Omit<CartLine, 'quantity'>) {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === item.variantId)
      if (existing) {
        return prev.map((l) =>
          l.variantId === item.variantId
            ? { ...l, quantity: Math.min(l.quantity + 1, l.stockAvailable) }
            : l
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  function updateQuantity(variantId: string, quantity: number) {
    setLines((prev) =>
      prev
        .map((l) =>
          l.variantId === variantId
            ? { ...l, quantity: Math.max(1, Math.min(quantity, l.stockAvailable)) }
            : l
        )
        .filter((l) => l.quantity > 0)
    )
  }

  function removeItem(variantId: string) {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId))
  }

  function clearCart() {
    setLines([])
  }

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)

  return { lines, addItem, updateQuantity, removeItem, clearCart, total }
}