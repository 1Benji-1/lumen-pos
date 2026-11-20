# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Dueños y Encargados de Comercio:** Gestionan catálogo de productos, variantes, precios, compras a proveedores, control de colaboradores, configuración del negocio y analítica de ventas y rentabilidad.
- **Cajeros y Vendedores de Mostrador:** Operan la atención en el punto de venta (POS) en horas pico y momentos de calma; escanean productos, aplican pagos combinados, gestionan la caja registradora (apertura, movimientos, arqueo ciego al cierre) y atienden a clientes físicos.

## Product Purpose

Lumen POS es un sistema de punto de venta (POS) y gestión comercial de mostrador diseñado para el comercio minorista independiente y pequeñas cadenas en Latinoamérica. Su propósito es brindar velocidad de cobro extrema, control certero del inventario y del dinero en caja, y continuidad operativa total incluso ante fallas de conexión a internet.

El éxito significa filas de cobro que avanzan sin fricción, turnos de caja que cuadran sin sospechas, e información clara para que el dueño tome decisiones acertadas sobre su stock y rentabilidad.

## Positioning

Un POS de mostrador ultra-rápido, offline-first y especializado por sub-rubro comercial, que no traba la venta ante falta momentánea de stock ni caídas de red, y que prescinde de la complejidad burocrática de los ERP tradicionales.

## Operating Context

- **Entorno de Mostrador:** Mostradores de atención física con tráfico variable y picos de alta demanda donde cada segundo cuenta.
- **Dispositivos:** PCs de escritorio, notebooks, tablets y terminales todo-en-uno táctiles, acompañados de lectores de códigos de barras (USB/Bluetooth) e impresoras térmicas de tickets (58mm / 80mm).
- **Conectividad Inestable:** Comercios en zonas con microcortes frecuentes de internet; el sistema opera en modo desconectado mediante IndexedDB y se sincroniza automáticamente al recuperar la red.
- **Rituales de Turno:** Apertura con fondo inicial, registro de gastos e ingresos con motivo, y cierre de turno con arqueo ciego para garantizar la transparencia del efectivo.

## Capabilities and Constraints

- **Punto de Venta (POS):** Búsqueda predictiva instantánea, lector de códigos de barras, catálogo con imágenes o cuadrícula rápida, venta por unidades o variantes, tolerancia de stock negativo configurable, múltiples métodos de pago (Efectivo, Tarjeta, QR, Transferencia, Split/Dividido), calculadora de cambio y emisión de tickets térmicos.
- **Gestión de Cajas:** Soporte multi-caja según plan, apertura de turnos, registro de movimientos de efectivo (entradas y salidas), corte X parcial y arqueo ciego final con cálculo de sobrante/faltante.
- **Inventario Especializado:** 7 sub-rubros de retail (comercio general, minimarkets, ropa/calzado, ferretería, farmacia/cosmética, librería/bazar, tecnología), variantes por atributos (talla, color, etc.), control de lotes y fechas de vencimiento, alertas de stock mínimo, ajustes rápidos de inventario, movimientos kardex, proveedores, órdenes de compra y ajuste masivo de precios.
- **Clientes y Fidelización:** Directorio de clientes con historial de compras y asociación directa al ticket.
- **Equipo y Roles:** Jerarquía de permisos (Dueño, Administrador, Cajero) con limitación de usuarios por plan.
- **Planes Comerciales:** Niveles Standard, Pro y Business con feature flags y límites dinámicos gestionados desde el panel Super Admin.
- **Stack Tecnológico:** SPA moderna en React 19, TypeScript, Tailwind CSS v4, Vite, TanStack Query v5, Supabase (PostgreSQL, Auth, RLS) y PWA/IndexedDB para resiliencia offline.

## Brand Commitments

- **Nombre:** Lumen POS.
- **Identidad Visual:** Tema CLARO con calidez orgánica y estética limpia: fondo general en Soft Linen (`#E8EDDF`), texto de alto contraste en Carbon Black (`#242423`), superficies secundarias en blanco y Alabaster (`#FFFFFF`, `#E5E5E5`, `#CFDBD5`), y acentos especiales puntuales en Tuscan Sun (`#F5CB5C`).

## Evidence on Hand

- Código fuente completo y funcional en `apps/web/src`, `apps/admin/src`, `packages/types` y `packages/supabase`.
- Modelo relacional probado en PostgreSQL con RLS y procedimientos almacenados.
- Especificaciones de producto documentadas en `plan-consolidacion-retail-subrubros.md` y `plan-configuracion-ajustes.md`.

## Product Principles

1. **La venta es sagrada:** Ningún corte de internet, validación secundaria o desfase de stock temporal puede bloquear el cobro al cliente en el mostrador.
2. **Cero burocracia operativa:** Las acciones más frecuentes (escanear, cobrar, emitir ticket) deben ejecutarse en la menor cantidad de pasos y toques posibles.
3. **Arqueo ciego para confianza mutua:** El sistema nunca muestra el total esperado de caja durante el conteo del cierre, garantizando auditorías transparentes y justas.
4. **Adaptable a la realidad del rubro:** La interfaz exhibe únicamente los campos y comodidades que tienen sentido para el tipo de comercio (tallas para moda, vencimientos para farmacia, unidades para ferretería).

## Accessibility & Inclusion

- Contraste visual AAA (12.9:1) con texto Carbon Black sobre fondo claro Soft Linen.
- Áreas táctiles amplias (mínimo 44x44px) diseñadas para uso ágil con los dedos en pantallas táctiles.
- Flujo 100% operable mediante teclado físico y emulación de teclado de lectores de códigos de barras (HID).
- Interfaz en Español (LATAM) con términos cotidianos de comercio.
