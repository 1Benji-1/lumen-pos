import { useState } from 'react'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { useAuth } from '../auth/hooks/useAuth'
import { useProducts } from '../inventory/hooks/useProducts'
import { useOpenCashRegister } from './hooks/useCashRegister'
import { useCart } from './hooks/useCart'
import type { CartLine } from './hooks/useCart'
import { useCreateSale } from './hooks/useCreateSale'
import { useBarcodeScanner } from './hooks/useBarcodeScanner'
import { useThermalPrinter } from './hooks/useThermalPrinter'
import { OpenRegisterForm, CloseRegisterButton } from './components/CashRegisterPanel'
import { ProductGrid } from './components/ProductGrid'
import { CartDrawer } from './components/CartDrawer'
import { ManualBarcodeInput } from './components/ManualBarcodeInput'
import { TicketModal } from './components/TicketModal'

type CompletedSale = {
  saleId: string
  lines: CartLine[]
  total: number
  paymentMethod: 'cash' | 'card'
}

export function PosPage() {
  const { storeId, loading: storeLoading } = useStoreId()
  const { session } = useAuth()
  const { data: cashRegister, isLoading: registerLoading } = useOpenCashRegister(storeId)
  const { data: products } = useProducts(storeId)
  const cart = useCart()
  const createSale = useCreateSale(storeId)
  const { printTicket } = useThermalPrinter()

  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)

  function handleBarcodeScan(barcode: string) {
    const allVariants = products?.flatMap((product) =>
      product.product_variants.map((variant) => ({ product, variant }))
    )

    const found = allVariants?.find((item) => item.variant.barcode === barcode)

    if (!found) {
      alert(`Producto con código "${barcode}" no encontrado`)
      return
    }

    if (found.variant.stock_quantity <= 0) {
      alert(`"${found.product.name}" no tiene stock disponible`)
      return
    }

    cart.addItem({
      variantId: found.variant.id,
      productName: found.product.name,
      variantName: found.variant.name,
      unitPrice: found.variant.sale_price,
      stockAvailable: found.variant.stock_quantity,
    })
  }

  useBarcodeScanner(handleBarcodeScan)

  if (storeLoading || registerLoading) {
    return <div className="text-white p-8">Cargando...</div>
  }

  if (!storeId || !session?.user?.id) {
    return <div className="text-white p-8">No se encontró tu tienda.</div>
  }

  if (!cashRegister) {
    return <OpenRegisterForm storeId={storeId} userId={session.user.id} />
  }

  async function handleConfirmSale(paymentMethod: 'cash' | 'card', customerId: string | null) {
    try {
      const saleId = await createSale.mutateAsync({
        cashRegisterId: cashRegister!.id,
        paymentMethod,
        customerId,
        items: cart.lines.map((l) => ({
          product_variant_id: l.variantId,
          quantity: l.quantity,
        })),
      })
      setCompletedSale({
        saleId,
        lines: cart.lines,
        total: cart.total,
        paymentMethod,
      })
      cart.clearCart()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al registrar la venta')
    }
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-white text-xl font-bold">Punto de venta</h1>
          <CloseRegisterButton storeId={storeId} cashRegisterId={cashRegister.id} />
        </div>

        <ManualBarcodeInput onSubmit={handleBarcodeScan} />

        <p className="text-slate-500 text-xs mb-2">
          Tip: con un escáner físico conectado, apunta y dispara en cualquier parte de esta
          página — se agrega solo, sin necesidad de hacer clic en el campo de arriba.
        </p>

        <ProductGrid storeId={storeId} onAddItem={cart.addItem} />
      </div>

      <CartDrawer
        storeId={storeId}
        lines={cart.lines}
        total={cart.total}
        onUpdateQuantity={cart.updateQuantity}
        onRemoveItem={cart.removeItem}
        onConfirmSale={handleConfirmSale}
        isSaving={createSale.isPending}
      />

      {completedSale && (
        <TicketModal
          saleId={completedSale.saleId}
          lines={completedSale.lines}
          total={completedSale.total}
          paymentMethod={completedSale.paymentMethod}
          onClose={() => setCompletedSale(null)}
          onPrint={printTicket}
        />
      )}
    </div>
  )
}