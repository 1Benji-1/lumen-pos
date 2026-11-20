import { BarcodeSvg } from '../../inventory/components/BarcodeSvg'

export interface TicketPreviewCardProps {
  commercialName?: string | null
  legalName?: string | null
  taxId?: string | null
  phone?: string | null
  address?: string | null
  ticketHeader?: string | null
  ticketFooter?: string | null
  ticketLegalDisclaimer?: string | null
  printLogoOnTicket?: boolean
  logoUrl?: string | null
  printCashierName?: boolean
  cashierName?: string | null
  currencySymbol?: string
  currentTime?: string
  showTaxDetails?: boolean

  // Opciones de etiqueta
  barcodeLabelSize?: '50x30' | '40x25'
  barcodeLabelShowPrice?: boolean
  barcodeLabelShowStoreName?: boolean
}

export function TicketPreviewCard({
  commercialName,
  legalName,
  taxId,
  phone,
  address,
  ticketHeader,
  ticketFooter,
  ticketLegalDisclaimer,
  printLogoOnTicket = false,
  logoUrl,
  printCashierName = false,
  cashierName = 'Cajero Turno 1',
  currencySymbol = 'Bs',
  currentTime,
  showTaxDetails = false,
  barcodeLabelSize = '50x30',
  barcodeLabelShowPrice = true,
  barcodeLabelShowStoreName = true,
}: TicketPreviewCardProps) {
  return (
    <div className="space-y-5">
      {/* 1. Vista Previa de Ticket Térmico */}
      <div className="bg-white border border-[#CFDBD5] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#CFDBD5]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#588157] shrink-0" />
            <span className="text-xs font-bold text-[#242423] uppercase tracking-wider">
              Ticket Térmico (80mm)
            </span>
          </div>
          <span className="text-[11px] text-[#5A5D5A] font-medium bg-[#E8EDDF] px-2 py-0.5 rounded">
            En vivo
          </span>
        </div>

        {/* Papel térmico con sombra y estilo de impresión */}
        <div className="bg-[#FAFBF9] text-black p-4 sm:p-5 font-mono text-[11px] rounded-lg border border-[#CFDBD5] space-y-3 leading-tight select-none shadow-xs">
          {/* Logo si está activo */}
          {printLogoOnTicket && logoUrl && (
            <div className="flex justify-center mb-2">
              <img
                src={logoUrl}
                alt={commercialName || 'Logo de tienda'}
                className="max-h-12 max-w-[130px] object-contain"
                onError={(e) => {
                  ;(e.currentTarget as HTMLElement).style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Encabezado */}
          <div className="text-center space-y-0.5 break-words">
            <p className="font-bold text-sm tracking-wider uppercase text-[#242423]">
              {commercialName || 'NOMBRE DE TU TIENDA'}
            </p>

            {(showTaxDetails || legalName) && legalName && (
              <p className="text-[10px] text-[#333533]">{legalName}</p>
            )}

            {(showTaxDetails || taxId) && taxId && (
              <p className="text-[10px] text-[#333533] font-sans">NIT/RUC: {taxId}</p>
            )}

            {address && <p className="text-[10px] text-[#5A5D5A] font-sans">{address}</p>}
            {phone && <p className="text-[10px] text-[#5A5D5A] font-sans">Tel: {phone}</p>}

            {ticketHeader && (
              <p className="text-[10px] text-[#242423] italic pt-1 border-t border-dotted border-[#CFDBD5] mt-1">
                {ticketHeader}
              </p>
            )}

            <p className="text-[9px] text-[#5A5D5A] pt-1">
              Ticket #8a4d7b29 • {new Date().toLocaleDateString()} {currentTime || '12:00'}
            </p>

            {/* Nombre del cajero si está habilitado */}
            {printCashierName && (
              <p className="text-[10px] text-[#5A5D5A] font-sans font-medium pt-0.5">
                Atendido por: <span className="text-[#242423]">{cashierName}</span>
              </p>
            )}
          </div>

          {/* Cuerpo de productos */}
          <div className="border-t border-b border-dashed border-[#CFDBD5] py-2.5 space-y-1.5 tabular-nums">
            <div className="flex justify-between font-bold text-[#242423]">
              <span>1 x Producto Ejemplo</span>
              <span>{currencySymbol} 25.00</span>
            </div>
            <div className="flex justify-between text-[#5A5D5A] text-[10px]">
              <span>2 x Artículo Variante</span>
              <span>{currencySymbol} 40.00</span>
            </div>
          </div>

          {/* Totales y cambio */}
          <div className="space-y-1 text-right tabular-nums">
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-[#CFDBD5] text-[#242423]">
              <span>TOTAL:</span>
              <span>{currencySymbol} 65.00</span>
            </div>
            <div className="text-[10px] text-[#5A5D5A] flex justify-between">
              <span>Pago Efectivo:</span>
              <span>{currencySymbol} 100.00</span>
            </div>
            <div className="text-[10px] text-[#588157] font-bold flex justify-between">
              <span>Cambio / Vuelto:</span>
              <span>{currencySymbol} 35.00</span>
            </div>
          </div>

          {/* Pie de ticket y política */}
          <div className="border-t border-dashed border-[#CFDBD5] pt-2 text-center text-[10px] text-[#5A5D5A] italic break-words">
            <p>{ticketFooter || '¡Gracias por su compra! Vuelva pronto.'}</p>
          </div>

          {/* Leyenda legal al pie si está configurada */}
          {ticketLegalDisclaimer && (
            <div className="pt-2 text-[9px] text-[#5A5D5A] text-center border-t border-dotted border-[#CFDBD5] font-sans uppercase tracking-tight leading-snug break-words">
              <p>{ticketLegalDisclaimer}</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Vista Previa de Etiqueta Adhesiva de Código de Barras */}
      <div className="bg-white border border-[#CFDBD5] rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#CFDBD5]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8A6D14] shrink-0" />
            <span className="text-xs font-bold text-[#242423] uppercase tracking-wider">
              Etiqueta de Góndola
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#8A6D14] bg-[#FEF9E7] border border-[#F5CB5C]/60 px-2 py-0.5 rounded">
            {barcodeLabelSize === '50x30' ? '50 x 30 mm' : '40 x 25 mm'}
          </span>
        </div>

        {/* Sticker Adhesivo */}
        <div className="flex justify-center p-2 bg-[#FAFBF9] rounded-lg border border-[#CFDBD5]">
          <div
            className={`bg-white border border-dashed border-[#CFDBD5] rounded-md shadow-xs flex flex-col items-center justify-center p-3 text-center transition-all ${
              barcodeLabelSize === '50x30' ? 'w-56 min-h-[120px]' : 'w-48 min-h-[105px]'
            }`}
          >
            {barcodeLabelShowStoreName && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#242423] truncate max-w-full block mb-1">
                {commercialName || 'NOMBRE DE TIENDA'}
              </span>
            )}

            <span className="text-[11px] font-medium text-[#242423] truncate max-w-full block">
              Producto Ejemplo SKU
            </span>

            <div className="my-1 w-full flex justify-center">
              <BarcodeSvg value="200001004" height={26} className="scale-90" />
            </div>

            {barcodeLabelShowPrice && (
              <div className="mt-0.5 font-bold text-xs text-[#242423] tabular-nums">
                {currencySymbol} 45.00
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
