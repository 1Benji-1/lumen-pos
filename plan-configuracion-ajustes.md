# Plan de Implementación — Módulo de Configuración y Ajustes (`/configuracion`)

Este documento define la arquitectura, diseño funcional y hoja de ruta técnica para implementar el **Módulo Central de Configuración y Ajustes de Tienda** en Lumen POS.

---

## 1. Visión y Objetivos

Actualmente, valores como el símbolo de moneda (`Bs`), la zona horaria (UTC / navegador local), los datos de emisión de tickets y las políticas operativas (ventas con stock negativo, límites de turno de caja) están fijos o implícitos en el código.

El objetivo de este módulo es:
1. **Soporte Multi-País y Regionalización:** Permitir definir la **zona horaria oficial del comercio** (evitando discrepancias si dueños o cajeros se conectan desde distintas zonas horarias o países) y la **moneda de trabajo** (Bs, $, S/., €, etc.).
2. **Personalización del Comprobante / Ticket:** Configurar nombre comercial, NIT / RUC / Tax ID, dirección, teléfono, logo y mensaje de despedida en el ticket térmico.
3. **Políticas de Negocio Flexibles:** Dar al dueño la potestad de activar o desactivar reglas operativas (permitir stock negativo, sugerir fondo de caja, alertas de turnos prolongados).
4. **Seguridad y Control de Acceso:** Restringido exclusivamente al rol **Propietario / Dueño (`owner`)** mediante el permiso [`settings:manage`](file:///home/bulaciayoel/Documentos/lumen-pos/packages/types/src/staff.ts#L192-L197).

---

## 2. Arquitectura de Datos (Base de Datos)

Se propone crear la tabla `store_settings` con relación **1 a 1** con `stores`:

```sql
create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  
  -- Identidad y Datos del Negocio
  legal_name text,
  commercial_name text,
  tax_id text, -- NIT, RUC, RFC, RUT, etc.
  phone text,
  email text,
  address text,
  city text,
  country text default 'Bolivia',
  logo_url text,

  -- Regionalización y Horas
  timezone text not null default 'America/La_Paz',
  currency_symbol text not null default 'Bs',
  currency_code text not null default 'BOB',
  decimal_places integer not null default 2,
  
  -- Políticas de Punto de Venta y Cajas
  allow_negative_stock boolean not null default true,
  max_cash_register_hours integer not null default 16, -- alerta si una caja lleva >16h abierta
  default_opening_cash numeric(10,2) not null default 0.00,
  require_customer_for_sale boolean not null default false,

  -- Configuración de Tickets Térmicos
  ticket_header text, -- Mensaje superior
  ticket_footer text default '¡Gracias por su compra! Vuelva pronto.',
  auto_print_ticket boolean not null default true,
  show_tax_details boolean not null default false,

  -- Políticas de Inventario y Alertas
  default_low_stock_threshold integer not null default 5,
  expiry_alert_days integer not null default 30,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Políticas RLS
alter table public.store_settings enable row level security;

create policy "Ver configuración de mi tienda"
  on public.store_settings for select
  using (store_id = public.get_my_store_id());

create policy "Modificar configuración de mi tienda"
  on public.store_settings for update
  using (store_id = public.get_my_store_id() and public.is_store_owner());

create policy "Insertar configuración de mi tienda"
  on public.store_settings for insert
  with check (store_id = public.get_my_store_id() and public.is_store_owner());
```

---

## 3. Estructura de la Interfaz de Usuario (UI / UX)

Ruta sugerida: `/configuracion` (accesible desde el menú de navegación principal).

### Diseño por Pestañas / Secciones:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Configuración del Negocio                                            │
│  Gestiona la identidad de tu empresa, moneda, zona horaria y políticas │
├────────────────────────────────────────────────────────────────────────┤
│  [ Identidad y Tickets ]  [ Regionalización ]  [ Ventas y Caja ]  [ Inventario ]
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  (Contenido según la pestaña seleccionada)                             │
│                                                                        │
│                                           [ Descartar ]  [ Guardar ]   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Pestaña 1: Identidad del Comercio y Ticket
- **Datos comerciales:** Nombre de fantasía, Razón Social, NIT / RUC, Teléfono, Dirección y Ciudad.
- **Logo del comercio:** Carga de imagen para cabecera del sistema y ticket.
- **Diseño del Ticket:**
  - Mensaje de pie de ticket editable (*"Cambios válidos dentro de las 48h con este ticket"*).
  - Interruptor para imprimir comprobante automáticamente al cobrar.
  - **Vista previa interactiva del ticket en vivo:** Mientras el usuario edita los textos, al costado derecho se muestra una maqueta visual del ticket térmico de 80mm / 58mm en tiempo real.

#### Pestaña 2: Regionalización y Horas
- **Zona Horaria de la Tienda:**
  - Selector con búsqueda de ciudades/zonas IANA principales (`America/La_Paz`, `America/Lima`, `America/Bogota`, `America/Santiago`, `America/Buenos_Aires`, `America/Mexico_City`, `Europe/Madrid`, etc.).
  - Muestra un reloj en vivo: *"Hora oficial de la tienda: 18:35:10 (GMT -4)"*.
- **Símbolo de Moneda:**
  - Selección rápida (`Bs`, `$`, `S/.`, `€`, `Q`, `₡`, etc.) o símbolo personalizado.
  - Código ISO (`BOB`, `USD`, `PEN`, `EUR`).

#### Pestaña 3: Políticas de Punto de Venta y Caja
- **Venta con Stock Negativo:**
  - Interruptor: `[✓] Permitir registrar ventas aunque el stock en sistema sea insuficiente`.
  - Explicación: *"Si está activo, el cajero puede vender productos físicos en góndola; el inventario quedará en negativo hasta reponer stock."*
- **Control de Caja Registradora:**
  - Alerta de turno prolongado: Notificar al cajero si la caja permanece abierta más de `X` horas.
  - Fondo de apertura sugerido: Monto predeterminado al abrir caja (ej. `Bs 150.00`).
- **Exigir cliente en ventas:**
  - Interruptor para obligar a seleccionar o crear cliente antes de cobrar.

#### Pestaña 4: Inventario y Alertas
- **Umbral de Stock Bajo Predeterminado:** Cantidad mínima por defecto al crear nuevos productos (ej. 5 unidades).
- **Margen de Alerta de Vencimiento:** Días de anticipación para pintar de color ámbar las alertas de caducidad (ej. 30 días, 15 días).

---

## 4. Puntos de Integración con el Sistema Existente

Una vez guardadas las configuraciones, se integrarán de forma reactiva y centralizada a través de un contexto o hook `useStoreSettings()`:

1. **Punto de Venta (`PosPage.tsx`, `CartDrawer.tsx`):**
   - El símbolo de moneda (`Bs`) se reemplaza dinámicamente por `settings.currency_symbol`.
   - La regla de permitir o bloquear ventas sin stock leerá `settings.allow_negative_stock`.
2. **Ticket Térmico (`TicketModal.tsx`):**
   - El ticket mostrará `settings.commercial_name`, `settings.tax_id`, `settings.address`, `settings.phone` y el pie personalizado `settings.ticket_footer`.
3. **Control de Cajas (`CashRegisterPanel.tsx`):**
   - Mostrará el fondo de apertura sugerido en el input inicial.
   - Si la caja lleva más de `settings.max_cash_register_hours` abierta, mostrará una advertencia destacada recomendando el arqueo.
4. **Reportes y Analíticas (`AnalyticsPage.tsx`, `dateRanges.ts`):**
   - Los cálculos de "Hoy", "Ayer" y "Este mes" utilizarán la zona horaria oficial del negocio `settings.timezone` en lugar del reloj local del navegador, garantizando reportes idénticos sin importar desde qué país se consulten.

---

## 5. Hoja de Ruta de Implementación Sugerida

- [ ] **Paso 1: Migración SQL y Tipos**
  - Crear tabla `store_settings` y trigger de inicialización automática al crear una tienda.
  - Actualizar `packages/types` con las interfaces de configuración.
- [ ] **Paso 2: Servicios y Hooks**
  - Implementar `settingsService.ts` (`getStoreSettings`, `updateStoreSettings`).
  - Crear hook `useStoreSettings` con React Query y caché reactivo.
- [ ] **Paso 3: Pantalla `/configuracion`**
  - Implementar [`SettingsPage.tsx`](file:///home/bulaciayoel/Documentos/lumen-pos/apps/web/src/features/settings/SettingsPage.tsx) con sus componentes de pestañas y vista previa del ticket.
  - Proteger la ruta en `AppRoutes.tsx` con `RoleGuard requiredPermission="settings:manage"`.
- [ ] **Paso 4: Propagación Global**
  - Reemplazar símbolos fijos por el valor dinámico en POS, Catálogo, Comprobantes y Reportes.
  - Sincronizar zona horaria en el cálculo de períodos de reporte.

---

> [!NOTE]
> Este plan queda documentado y listo. No se aplicará ningún cambio en el código hasta que el usuario dé la orden explícita de iniciar la implementación.
