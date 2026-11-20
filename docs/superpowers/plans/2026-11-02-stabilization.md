# Lumen POS Stabilization Implementation Plan

**Goal:** base verificable para modificar Lumen POS sin comprometer datos, ventas y caja.
**Architecture:** conservación del monorepo; cambios aditivos SQL, servicios comprobables, pruebas de integración y validación automatizada.
**Tech Stack:** React, TypeScript, Vite, Supabase/PostgreSQL, Vitest.
**Spec:** `docs/superpowers/specs/2026-11-02-stabilization-design.md`.

## Global Constraints
Conservar cambios previos. No commits automáticos, publicación ni resets de bases existentes. Checkout actual autorizado. Cada agente tiene archivos exclusivos. Probar comportamiento, no buscar cadenas en el código. Documentar cualquier bloqueo o deuda pendiente con exactitud.

## Review Focus
Reintentos después de una respuesta perdida; cambios entre cuentas; mutación de claves foráneas entre tiendas; devoluciones concurrentes; ventas sin stock con política restrictiva. Los responsables incluyen estos casos en las pruebas del dominio.

### Task 1: Entorno y controles — controlador
- [x] Guardar copia y línea base del checkout actual.
- [x] Arreglar comandos raíz/configuración Turbo e instalación reproducible; añadir Vitest y pruebas ejecutables.
- [x] Añadir comando SQL aislado y CI, sin depender de una base del usuario.
- [x] Comprobar typecheck, build, tests y deuda de lint sin ocultarla.

### Task 2: PostgreSQL — agente database
**Files:** nuevas migraciones en `packages/supabase/migrations`, `packages/supabase/tests`, `scripts/test-db.sh`.
**Interfaces:** `create_sale` conserva los argumentos actuales y añade al final `p_idempotency_key text default null`; admite reintentos autorizados de caja cerrada solo cuando existe la clave y la caja pertenece al cajero. `p_created_at timestamptz default null` conserva fecha original offline si resulta necesario y se comunica al controlador. Nuevas funciones de permisos compartidas para políticas.
- [x] Preparar pruebas SQL de las regresiones y ejecutar contra migraciones previas, registrando el fallo real.
- [x] Añadir migración correctiva para permisos/RLS y operaciones de ventas, reembolsos y analítica; no editar migraciones históricas.
- [x] Bloquear elevación de privilegios, cruces de tenant, usuarios inactivos y cambios comerciales por usuarios de tienda.
- [x] Corregir los campos faltantes de ventas/pagos, validar entradas, serializar stock/reembolsos y añadir idempotencia por tienda.
- [x] Comprobar pruebas sobre PostgreSQL nuevo y reportar los contratos exactos.

### Task 3: POS offline y arqueo — agente offline
**Files:** `apps/web/src/features/pos`, `packages/types/src/pos.ts`; no migraciones ni configuración raíz.
**Interfaces:** `createSale` envía `p_idempotency_key` y opcionalmente `p_created_at`; el controlador regenera tipos. Tests `*.test.ts` con Vitest; fake-indexeddb disponible en raíz.
- [x] Escribir y observar fallar pruebas de unión de colas, pérdida de respuesta, fallo de almacenamiento y caja inválida.
- [x] Confirmar persistencia antes de completar venta local; fusionar colas por ID y limpiar ambas de forma segura.
- [x] Usar clave estable también para reintentos online, prevenir concurrencia entre pestañas y espaciar reintentos fallidos.
- [x] Corregir doble descuento por devolución en reporte de caja y cubrir efectivo simple/mixto.
- [x] Corregir invalidaciones de QueryClient que no coinciden con las claves reales.
- [x] Reportar pruebas red/green y límites offline restantes.

### Task 4: Identidad y administración — agente identity
**Files:** `packages/supabase/functions`, `apps/web/src/features/auth`, `apps/web/src/shared/hooks/useStoreId.ts`, `apps/web/src/shared/hooks/useCurrentUserRole.ts`, `apps/web/src/app/router/ProtectedRoute.tsx`, providers de ambas apps, `apps/admin/src/shared/hooks/useAuth.ts`, `apps/admin/src/features/auth`; pruebas propias. No SQL, POS ni configuración raíz.
- [x] Escribir y observar fallar pruebas de autorización, pertenencia de usuario, fallos MFA y errores de perfil.
- [x] Verificar usuario objetivo antes de borrar Auth; impedir operación por usuario inactivo; validar roles/propietarios y límites administrativos; CORS y errores consistentes en create-store.
- [x] Evitar bloqueo del callback Auth y apertura de MFA ante errores; limpiar caché entre cuentas.
- [x] Sustituir carga infinita de perfil/plan por estado de error recuperable sin conceder acceso.
- [x] Reportar pruebas y cambios exactos.

### Task 5: Integración, revisión y documentación — controlador
- [x] Revisar contratos de todos los agentes y ejecutar la suite completa.
- [x] Corregir analítica fallback del cliente, regenerar tipos SQL y resolver conflictos.
- [x] Revisar diff desde copia inicial mediante agente independiente y corregir hallazgos materiales.
- [x] Actualizar README y ledger con instrucciones, evidencias y límites reales.

## Cierre

Ejecutado y verificado localmente. Evidencias, revisión final y deuda pendiente: `docs/superpowers/stabilization-ledger.md`; comandos y límites: `docs/STABILIZATION.md`. Lint estricto mantiene deuda heredada explícita; CI está configurado, sin ejecución remota afirmada.
