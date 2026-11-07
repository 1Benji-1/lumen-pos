# Fase 0: línea base para la reestructuración

**Fecha:** 2026-11-07
**Rama:** `codex/stabilization-baseline`
**Commit funcional de partida:** `74f7d9d`
**Alcance:** inventario y verificaciones; no se altera la aplicación ni el esquema.

## Decisiones de alcance

- La reestructuración comprende `apps/web` y los contratos/SQL que esa aplicación utiliza.
- `apps/admin` queda fuera de alcance. Los contratos y tablas compartidos se tratarán con compatibilidad para evitar afectar sus consumidores actuales; no se editará su código.
- No se construirá multisucursal.
- No se implementará contratación de módulos adicionales. Se conserva únicamente como idea futura.
- El diseño detallado permanece en [la propuesta de reestructuración](specs/2026-11-07-general-platform-restructuring-draft.md).

## Estado de Git al comenzar

- La rama local seguía a `origin/codex/stabilization-baseline` sin commits pendientes.
- Había un único archivo sin seguimiento: el borrador de diseño de la reestructuración.
- Este documento y el borrador son documentación de fase 0. No hay cambios funcionales.

## Inventario de interfaz y rutas

Fuente: `apps/web/src/app/router/AppRoutes.tsx` y `apps/web/src/shared/components/AppSidebar.tsx`.

| Grupo | Rutas actuales | Protección |
|---|---|---|
| Cuenta | `/login`, `/forgot-password`, `/reset-password` | Autenticación según flujo |
| Inicio | `/` | `dashboard`, `dashboard:view` |
| Inventario | `/inventario`, `/inventario/agregar-producto`, `/inventario/agregar-categoria`, `/inventario/movimientos` | `inventory`, permisos de vista/gestión |
| Inventario avanzado | `/inventario/conteo-fisico`, `/inventario/proveedores`, `/inventario/ordenes-compra`, `/inventario/ajuste-precios` | Además, funciones de plan `physical_count`, `purchase_orders`, `batch_price_adjust` |
| Ventas | `/pos`, `/pos/ventas` | `pos`, `pos:access` |
| Clientes | `/customers` | `customers`, `customers:view` |
| Reportes | `/analytics` | `analytics`, `analytics:view` |
| Equipo | `/staff` | `staff`, `staff:view` |
| Configuración | `/configuracion` | `settings`, `settings:manage` |
| Documentación | `/docs` | Sesión protegida |
| Compatibilidad | `/inventory`, `/settings`, `/pos/cajas`, `/pos/offline` | Redirecciones |

La navegación se define actualmente en bloques estáticos. El dashboard actual combina `DashboardPage` y `FamilyDashboardPage`; aún no existe un dashboard propio para cada una de las tres áreas propuestas.

## Inventario de carpetas y contratos

```text
apps/web/src/app                 arranque, providers y rutas
apps/web/src/features/auth       identidad
apps/web/src/features/dashboard  inicio
apps/web/src/features/pos        ventas y caja
apps/web/src/features/inventory  catálogo, stock y compras
apps/web/src/features/customers  clientes
apps/web/src/features/analytics  reportes
apps/web/src/features/staff      equipo
apps/web/src/features/settings   configuración
apps/web/src/shared              layout, guards, hooks y cliente Supabase
packages/types/src              tipos, catálogo de módulos, categorías, planes, permisos
packages/supabase/functions     create-store y manage-staff
packages/supabase/migrations    39 migraciones cronológicas
packages/supabase/tests         pruebas de comportamiento SQL
```

Puntos de acoplamiento principales:

1. `packages/types/src/modules.ts` contiene `MODULE_REGISTRY` y `CATEGORY_MODULE_DEFAULTS`; actualmente la categoría decide el conjunto de módulos por defecto.
2. `packages/types/src/access.ts` aplica estado de implementación, plan, activación, categoría y permisos.
3. `apps/web/src/shared/hooks/useStoreModules.ts` obtiene `storeId`, sucursal primaria, categoría, plan y activaciones para calcular acceso. La ausencia de la sucursal primaria bloquea la evaluación.
4. `apps/web/src/shared/guards/ModuleGuard.tsx`, `PlanGuard.tsx` y `RoleGuard.tsx` protegen la interfaz; la autorización también existe en SQL.
5. `packages/types/src/business.ts` conserva tipos comerciales antiguos y preajustes de subrubro.
6. `packages/supabase/functions/create-store` y `manage-staff` consumen identidad y `store_id`.

El registro actual distingue siete módulos disponibles (`dashboard`, `pos`, `inventory`, `customers`, `analytics`, `staff`, `settings`) y varios módulos marcados `planned`. Estos últimos no equivalen a funciones implementadas. Incluyen `multi_branch`; ese registro histórico no autoriza desarrollarlo.

## Inventario de datos y SQL

Las 39 migraciones crean actualmente 26 tablas identificadas por sentencias `CREATE TABLE`:

| Conjunto | Tablas actuales que deben preservarse o migrarse con compatibilidad |
|---|---|
| Identidad y suscripción | `stores`, `users`, `plans`, `subscription_payments`, `store_settings` |
| Activación y acceso | `branches`, `module_catalog`, `module_activations`, `module_activation_audit`, `category_module_defaults`, `role_permissions` |
| Comercio | `categories`, `products`, `product_variants`, `customers`, `cash_registers`, `cash_movements`, `sales`, `sale_items`, `sale_payments`, `suppliers`, `stock_movements`, `purchase_orders`, `purchase_order_items` |
| Perfil médico | `medical_professionals` |
| Otros | `app_feedback` |

Este inventario enumera estructuras del repositorio. No es un volcado ni una copia de datos de una base desplegada. Antes de una migración de tablas se deberá identificar el entorno de datos concreto, hacer respaldo recuperable y verificar recuentos e integridad. La fase 0 respalda la rama de código.

Límites de seguridad actuales:

- `20261104010000_primary_branches.sql`: sucursal primaria y vínculo con tienda.
- `20261104020000_module_activations.sql`: catálogo, activaciones y auditoría.
- `20261105010000_module_access_core.sql`: valores por categoría, permisos de rol y cálculo SQL de acceso.
- `20261105020000_module_write_guards.sql`: protección de escrituras y cambios de perfil.
- `20261105030000_module_rpc_guards.sql`: autorización en funciones RPC.
- `20261105040000_module_read_policies.sql`: restricciones de lectura RLS.
- `20261107010000_medical_service_profile.sql` y `20261107020000_medical_specialties_module_guard.sql`: perfil profesional y protección.

Las migraciones históricas no se reescribirán. Cualquier renombre futuro requerirá migraciones nuevas y una secuencia compatible con consumidores compartidos.

## Pruebas críticas de regresión para las próximas fases

1. Iniciar sesión, cargar organización y denegar perfiles inactivos o sin organización.
2. Mantener las rutas y el menú existentes mientras se mueven carpetas.
3. Preservar autorización por rol, plan, módulo y estado de suscripción en interfaz y SQL.
4. Mantener aislamiento entre organizaciones en lecturas, escrituras y funciones RPC.
5. Venta normal, venta sin conexión e idempotencia de reintentos.
6. Apertura, movimientos y cierre de caja existentes dentro de Ventas.
7. Reembolsos y su impacto único en stock y efectivo.
8. Catálogo, variantes, stock, conteos, proveedores, órdenes de compra y recepción.
9. Historial de clientes, reportes y configuración.
10. Perfil profesional existente y permisos de especialidades.
11. Confirmar que consumidores compartidos fuera de `apps/web` siguen compilando, aunque no se cambie su código.

## Verificación de fase 0

| Comando | Resultado |
|---|---|
| `pnpm check` | Salida 0. Typecheck correcto; 161 pruebas en 31 archivos; lint basal sin regresiones (deuda heredada: Web 81 errores/4 advertencias y Admin 38 errores/1 advertencia); builds de Web y Admin correctos. Ambos builds advierten que hay bundles mayores a 500 kB. |
| `pnpm test:db` | Salida 0 sobre PostgreSQL temporal aislado; incluye migraciones, RLS, RPC y concurrencia. |

No se han ejecutado pruebas manuales de interfaz en esta fase. El objetivo es fijar una línea base automatizada y un mapa de dependencias antes de cambiar comportamiento.
