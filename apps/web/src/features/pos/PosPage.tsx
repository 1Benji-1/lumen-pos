import { useState, useEffect, useRef } from 'react'
import { useStoreId } from '../../shared/hooks/useStoreId'
import { useStorePlan } from '../../shared/hooks/useStorePlan'
import { useStoreEntitlements } from '../../shared/hooks/useStoreEntitlements'
import { useAuth } from '../auth/hooks/useAuth'
import { useProducts } from '../inventory/hooks/useProducts'
import { useOpenCashRegister } from './hooks/useCashRegister'
import { useCart } from './hooks/useCart'
import type { CartLine } from './hooks/useCart'
import { useCreateSale } from './hooks/useCreateSale'
import { useBarcodeScanner } from './hooks/useBarcodeScanner'
import { useThermalPrinter } from './hooks/useThermalPrinter'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import {
  cacheProductsForOffline,
  getCachedProductsForOffline,
  useOfflineSalesCount,
  useOfflineSyncStatus,
} from './services/offlinePosService'
import { OpenRegisterForm, CloseRegisterAction, CashMovementActions } from './components/CashRegisterPanel'
import { ProductGrid } from './components/ProductGrid'
import { CartDrawer } from './components/CartDrawer'
import { CheckoutModal } from './components/CheckoutModal'
import { TicketModal } from './components/TicketModal'
import { PosNavTabs } from './components/PosNavTabs'
import { LoadingScreen } from '../../shared/components/LoadingScreen'
import type { PaymentMethod, PaymentSplitItem, OfflineSalePayload } from '@lumen-pos/types'
import { useStoreSettings } from '../settings/hooks/useStoreSettings'
import { PosToastProvider, usePosToast } from './context/PosToastContext'

type CompletedSale = {
  saleId: string
  lines: CartLine[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
  payments?: PaymentSplitItem[]
  customerEmail?: string | null
}

function PosPageContent() {
  const { toast } = usePosToast()
  const { storeId, loading: storeLoading } = useStoreId()
  const { settings } = useStoreSettings(storeId)
  const { data: storePlan, isLoading: planLoading } = useStorePlan(storeId)
  const { isFeatureEnabled } = useStoreEntitlements()
  const { session } = useAuth()
  const isOnline = useOnlineStatus()

  const offlineCount = useOfflineSalesCount(storeId)
  const isSyncing = useOfflineSyncStatus()

  const allowsMultipleRegisters = isFeatureEnabled('multiple_cash_registers')

  const { data: cashRegister, isLoading: registerLoading } = useOpenCashRegister(
    storeId,
    session?.user?.id,
    allowsMultipleRegisters
  )
  const { data: liveProducts } = useProducts(storeId, { includeInactive: false })

  // Caching offline de productos
  useEffect(() => {
    if (storeId && liveProducts && liveProducts.length > 0) {
      cacheProductsForOffline(storeId, liveProducts)
    }
  }, [storeId, liveProducts])


  // Productos efectivos: de la red o del cache offline
  const products = liveProducts || (storeId ? getCachedProductsForOffline(storeId) : null)

  const cart = useCart()
  const createSale = useCreateSale(storeId)
  const { printTicket } = useThermalPrinter()

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const checkoutAttempt = useRef<{ fingerprint: string; sale: OfflineSalePayload; locked?: boolean } | null>(null)
  const savingRef = useRef(false)
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('Consumidor final')
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState<string>('')

  function handleSelectCustomer(id: string, name?: string, email?: string) {
    setSelectedCustomerId(id)
    setSelectedCustomerName(name || 'Consumidor final')
    if (email) setSelectedCustomerEmail(email)
  }

  // Atajo de teclado F2 (o F4) para abrir el cobro velozmente en navegador
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === 'F2' || e.key === 'F4') {
        e.preventDefault()
        if (cart.lines.length > 0 && !isCheckoutOpen && !completedSale) {
          setIsCheckoutOpen(true)
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [cart.lines.length, isCheckoutOpen, completedSale])

  function handleBarcodeScan(barcode: string) {
    const allVariants = products?.flatMap(product =>
      product.product_variants.map(variant => ({ product, variant }))
    )

    if (!cashRegister && isOnline) {
      toast.warning('Debe iniciar un turno de caja para agregar productos al carrito')
      return
    }

    const found = allVariants?.find(item => item.variant.barcode === barcode)

    if (!found) {
      toast.warning(`Producto con código "${barcode}" no encontrado`)
      return
    }

    const available = Number(found.variant.stock_quantity)
    if (settings?.allow_negative_stock === false) {
      if (available <= 0) {
        toast.error(`No hay stock disponible para "${found.product.name}" (Stock: 0).`)
        return
      }
      const inCart = cart.lines.find((l) => l.variantId === found.variant.id)?.quantity || 0
      if (inCart + 1 > available) {
        toast.warning(`Stock insuficiente de "${found.product.name}". Máximo disponible: ${available}.`)
        return
      }
    }

    cart.addItem({
      variantId: found.variant.id,
      productName: found.product.name,
      variantName: found.variant.name,
      unitPrice: Number(found.variant.sale_price),
      stockAvailable: available,
      unit: found.variant.unit,
      imageUrl: found.variant.image_url || found.product.image_url,
    })
  }

  function handleAddToCart(item: Omit<CartLine, 'quantity'>) {
    if (!cashRegister && isOnline) {
      toast.warning('Debe iniciar un turno de caja para agregar productos al carrito')
      return
    }

    if (settings?.allow_negative_stock === false) {
      if (item.stockAvailable <= 0) {
        toast.error(`No hay stock disponible para "${item.productName}" (Stock: 0).`)
        return
      }
      const inCart = cart.lines.find((l) => l.variantId === item.variantId)?.quantity || 0
      if (inCart + 1 > item.stockAvailable) {
        toast.warning(`Stock insuficiente de "${item.productName}". Máximo disponible: ${item.stockAvailable}.`)
        return
      }
    }
    cart.addItem(item)
  }

  useBarcodeScanner(handleBarcodeScan)

  if (storeLoading || registerLoading || planLoading) {
    return <LoadingScreen message="Cargando punto de venta y caja..." />
  }

  if (!storeId || !session?.user?.id) {
    return <div className="text-[#BC4749] p-8 text-sm text-center">No se encontró tu tienda asociada.</div>
  }

  async function handleConfirmSale(params: {
    paymentMethod: PaymentMethod
    customerId: string | null
    discount: number
    payments?: PaymentSplitItem[]
    customerEmail?: string | null
  }) {
    if (savingRef.current) return
    if (!cashRegister?.id || cashRegister.opened_by !== session?.user?.id) {
      toast.error('Debe iniciar su propio turno de caja antes de registrar una venta.')
      return
    }
    const draft = {
      storeId: storeId!, userId: session!.user.id, cashRegisterId: cashRegister.id,
      paymentMethod: params.paymentMethod, customerId: params.customerId,
      discount: params.discount, payments: params.payments, customerEmail: params.customerEmail,
      items: cart.lines.map(line => ({ product_variant_id: line.variantId, quantity: line.quantity,
        unit_price: line.unitPrice, discount: line.discount, productName: line.productName, variantName: line.variantName })),
      total: cart.total,
    }
    const fingerprint = JSON.stringify(draft)
    if (!checkoutAttempt.current?.locked && checkoutAttempt.current?.fingerprint !== fingerprint) {
      checkoutAttempt.current = { fingerprint, sale: { ...draft, offlineId: crypto.randomUUID(), createdAt: new Date().toISOString(), synced: false } }
    }
    savingRef.current = true
    try {
      const saleId = await createSale.mutateAsync({ sale: checkoutAttempt.current.sale, isOnline })
      setIsCheckoutOpen(false)
      setSelectedCustomerId('')
      setSelectedCustomerName('Consumidor final')
      setSelectedCustomerEmail('')
      setCompletedSale({
        saleId,
        lines: cart.lines,
        subtotal: cart.itemsSubtotal,
        discount: cart.globalDiscount,
        total: cart.total,
        paymentMethod: params.paymentMethod,
        payments: params.payments,
        customerEmail: params.customerEmail,
      })
      cart.clearCart()
      checkoutAttempt.current = null
    } catch (err) {
      if (typeof err === 'object' && err) {
        if ('saleAttemptLocked' in err && err.saleAttemptLocked && checkoutAttempt.current) checkoutAttempt.current.locked = true
        if ('saleAttemptResolved' in err && err.saleAttemptResolved) checkoutAttempt.current = null
      }
      const errorMsg = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String(err.message) : 'Error al registrar la venta'
      toast.error(errorMsg)
    } finally {
      savingRef.current = false
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="flex-1 p-4 flex flex-col h-full overflow-hidden">
        {/* Cabecera Unificada y Compacta del Punto de Venta (Fija) */}
        <div className="shrink-0 mb-3 pb-2.5 border-b border-[#CFDBD5] flex flex-wrap items-center justify-between gap-2.5">
          {/* Lado izquierdo: Título + información compacta de turno + accesos rápidos */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[#242423] text-lg font-bold tracking-tight">Punto de venta</h1>

            {cashRegister ? (
              <div className="flex items-center gap-2 text-xs text-[#5A5D5A]">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#E8EDDF]/60 border border-[#CFDBD5] font-mono text-[11px] font-semibold text-[#242423]">
                  <span>Fondo: {settings?.currency_symbol || 'Bs'} {Number(cashRegister.opening_amount).toFixed(2)}</span>
                  <span className="text-[#CFDBD5]">•</span>
                  <span>{new Date(cashRegister.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>

                {cashRegister &&
                  settings?.max_cash_register_hours &&
                  (now - new Date(cashRegister.opened_at).getTime()) / (1000 * 60 * 60) >=
                    settings.max_cash_register_hours && (
                    <span className="px-2 py-0.5 bg-[#FEF9E7] text-[#8A6D14] border border-[#F5CB5C]/50 rounded-full text-[11px] font-bold inline-flex items-center gap-1 animate-pulse">
                      ⚠️ Turno {Math.floor((now - new Date(cashRegister.opened_at).getTime()) / (1000 * 60 * 60))}h
                    </span>
                  )}
              </div>
            ) : isOnline ? (
              <span className="inline-flex items-center gap-1.5 text-[#8A6D14] text-xs font-medium bg-[#FEF9E7] px-2.5 py-0.5 rounded-full border border-[#F5CB5C]/50">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A6D14]" />
                Sin turno activo
              </span>
            ) : (
              <span className="text-xs text-[#5A5D5A]">Modo sin conexión</span>
            )}

            {offlineCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                isSyncing
                  ? 'bg-[#FEF9E7] text-[#8A6D14] border-[#F5CB5C]/50'
                  : 'bg-[#FDF0ED] text-[#BC4749] border-[#F0B2B4]'
              }`}>
                {isSyncing ? `Sincronizando ${offlineCount}...` : `${offlineCount} pendiente${offlineCount !== 1 ? 's' : ''}`}
              </span>
            )}
          </div>

          {/* Lado derecho: Operaciones de caja compactas (+ Ingreso, − Retiro, Corte X) y Cerrar caja */}
          {cashRegister && (
            <div className="flex items-center gap-2">
              <CashMovementActions
                storeId={storeId}
                cashRegisterId={cashRegister.id}
                userId={session.user.id}
                storeName={storePlan?.name ?? ''}
              />
              <CloseRegisterAction
                storeId={storeId}
                cashRegisterId={cashRegister.id}
                storeName={storePlan?.name ?? ''}
              />
            </div>
          )}
        </div>

        {/* Submenú de navegación de Punto de Venta (Fijo) */}
        <div className="shrink-0">
          <PosNavTabs className="mb-3" />
        </div>

        {!cashRegister && isOnline ? (
          <div className="flex-1 overflow-y-auto">
            <OpenRegisterForm
              storeId={storeId}
              userId={session.user.id}
              allowsMultipleRegisters={allowsMultipleRegisters}
            />
          </div>
        ) : (
          <ProductGrid storeId={storeId} onAddItem={handleAddToCart} />
        )}
      </div>

      {(cashRegister || !isOnline) && (
        <CartDrawer
          storeId={storeId}
          lines={cart.lines}
          itemsSubtotal={cart.itemsSubtotal}
          globalDiscount={cart.globalDiscount}
          setGlobalDiscount={cart.setGlobalDiscount}
          total={cart.total}
          onUpdateQuantity={cart.updateQuantity}
          onUpdateLineDiscount={cart.updateLineDiscount}
          onRemoveItem={cart.removeItem}
          onClearCart={cart.clearCart}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={handleSelectCustomer}
          selectedCustomerEmail={selectedCustomerEmail}
          onUpdateCustomerEmail={setSelectedCustomerEmail}
          onOpenCheckout={() => setIsCheckoutOpen(true)}
        />
      )}

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        storeId={storeId}
        lines={cart.lines}
        itemsSubtotal={cart.itemsSubtotal}
        globalDiscount={cart.globalDiscount}
        total={cart.total}
        customerId={selectedCustomerId || null}
        customerName={selectedCustomerName}
        initialCustomerEmail={selectedCustomerEmail}
        onConfirmSale={handleConfirmSale}
        isSaving={createSale.isPending}
      />

      {completedSale && (
        <TicketModal
          saleId={completedSale.saleId}
          lines={completedSale.lines}
          subtotal={completedSale.subtotal}
          discount={completedSale.discount}
          total={completedSale.total}
          paymentMethod={completedSale.paymentMethod}
          payments={completedSale.payments}
          customerEmail={completedSale.customerEmail}
          storeName={storePlan?.name ?? ''}
          storeId={storeId}
          onClose={() => setCompletedSale(null)}
          onPrint={printTicket}
        />
      )}
    </div>
  )
}

export function PosPage() {
  return (
    <PosToastProvider>
      <PosPageContent />
    </PosToastProvider>
  )
}

export default PosPage
