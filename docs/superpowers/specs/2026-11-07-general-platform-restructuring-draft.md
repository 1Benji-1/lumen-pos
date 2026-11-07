# Propuesta de reestructuración de la plataforma

**Estado:** borrador en revisión
**Fecha:** 2026-11-07
**Alcance:** producto, navegación y arquitectura de código
**Importante:** este documento no autoriza todavía cambios de código, base de datos ni interfaz.

## 1. Propósito

La aplicación dejará de concebirse como un POS para tiendas. Será una plataforma general con tres áreas iniciales:

1. Comercio.
2. Gastronomía.
3. Salud.

El nombre definitivo todavía no está decidido. El núcleo debe eliminar conceptos exclusivos de tiendas como `store`, `store_id` y “tienda”. La operación multisucursal queda fuera del alcance actual.

La plataforma de clientes tendrá un núcleo neutral, módulos funcionales grandes, navegación y dashboard propios por área y planes. La contratación de módulos adicionales queda como posibilidad futura, fuera de esta reestructuración.

## 2. Reglas de organización

- **Núcleo:** infraestructura común utilizada por todas las áreas.
- **Módulo:** capacidad empresarial grande con datos, reglas y permisos propios.
- **Pestaña:** entrada de navegación hacia una parte de uno o varios módulos.
- **Opción:** acción interna, como imprimir, devolver, reprogramar o emitir una receta.
- **Área:** composición de módulos, navegación y experiencia para un tipo de operación.

Comercio, Gastronomía y Salud utilizan el núcleo completo. Ninguna área hereda de otra. Las áreas combinan capacidades; no copian código.

Una pestaña no se convierte automáticamente en módulo y cada botón tampoco debe convertirse en uno.

## 3. Estructura del producto

```text
PLATAFORMA
├── Núcleo común
├── Área Comercio
├── Área Gastronomía
├── Área Salud
└── Planes
```

### Núcleo común

```text
NÚCLEO
├── Organización
├── Autenticación
├── Usuarios
├── Roles y permisos
├── Plan y suscripción
├── Módulos contratados
├── Seguridad
├── Auditoría
└── Configuración general
```

| Componente | Estado actual |
|---|---|
| Organización | Incluido, pero utiliza conceptos de tienda |
| Autenticación | Ya incluido |
| Usuarios | Ya incluido |
| Roles y permisos | Ya incluido; requiere nombres generales |
| Plan y suscripción | Ya incluido |
| Módulos contratados | Ya incluido |
| Seguridad de interfaz, servidor y SQL | Ya incluido |
| Auditoría | Incluido parcialmente |
| Configuración | Incluido parcialmente |

El cliente no verá una pestaña “Núcleo”. Estas capacidades aparecerán principalmente en Equipo, Configuración y Mi cuenta.

La entidad técnica central será `organization`. La interfaz podrá mostrar “negocio”, “establecimiento”, “consultorio” o “clínica” según el contexto.

## 4. Comercio

### Módulos

1. **Ventas — ya incluido.** Venta, carrito, pagos, turno, efectivo, comprobantes, historial, devoluciones y operación sin conexión. Caja es una función interna de Ventas.
2. **Productos e inventario — ya incluido.** Productos, variantes, categorías, precios, costos, códigos de barras, existencias, Kardex, ajustes, conteos, vencimientos y etiquetas.
3. **Compras — incluido en gran parte.** Proveedores, órdenes de compra, recepción, costos, ingreso de existencias e historial.
4. **Clientes — incluido; crédito no incluido.** Datos, historial, métricas, observaciones, crédito y deuda opcionales.
5. **Gestión — incluido parcialmente.** Indicadores, reportes, auditoría, equipo y configuración.

### Pestañas

```text
Inicio
Vender
Ventas
Productos
Inventario
Compras
Clientes
Reportes
Equipo
Configuración
```

Productos e Inventario son dos pestañas del mismo módulo.

### Dashboard

```text
INICIO — COMERCIO
├── Ventas de hoy
├── Cantidad de transacciones
├── Ticket promedio
├── Estado del turno de venta
├── Comparación con el día anterior
├── Productos con poco stock
├── Productos próximos a vencer
├── Productos más vendidos
├── Ventas recientes
└── Acciones rápidas
    ├── Nueva venta
    ├── Crear producto
    ├── Registrar compra
    └── Realizar conteo
```

## 5. Gastronomía

### Módulos

1. **Operación gastronómica — no incluido.** Pedidos, mesas, para llevar, estados, envío a cocina, preparación, entrega, cobro, división y cancelación. Pedidos, Mesas y Cocina son secciones de la misma operación.
2. **Menú y producción — incluido parcialmente.** Platos, bebidas, categorías, precios, modificadores, recetas, ingredientes, costeo y disponibilidad. El catálogo básico existe; producción todavía no.
3. **Inventario y compras — incluido parcialmente.** Ingredientes, existencias, consumo por receta, mermas, vencimientos, proveedores y compras. Inventario y compras generales existen; recetas y mermas no.
4. **Clientes — incluido parcialmente.** Información, historial de pedidos, preferencias, observaciones y fidelización futura.
5. **Gestión gastronómica — incluido parcialmente.** Ventas, pedidos, tiempos de preparación, platos más vendidos, rentabilidad, mermas y equipo.

### Pestañas

```text
Inicio
Pedidos
Mesas
Cocina
Menú
Inventario
Compras
Clientes
Reportes
Equipo
Configuración
```

Mesas puede ocultarse para una dark kitchen. Cocina puede ocultarse si el establecimiento no utiliza pantalla de preparación.

### Dashboard

```text
INICIO — GASTRONOMÍA
├── Ventas de hoy
├── Pedidos activos
├── Pedidos esperando preparación
├── Pedidos listos para entregar
├── Tiempo promedio de preparación
├── Mesas ocupadas y disponibles
├── Platos no disponibles
├── Ingredientes con poco stock
├── Platos más vendidos
└── Acciones rápidas
    ├── Crear pedido
    ├── Ver cocina
    ├── Abrir mesa
    └── Actualizar disponibilidad
```

## 6. Salud

Salud será inicialmente una solución médica general. No se diseñará alrededor de especialidades y no tendrá Caja de Comercio, productos, inventario ni compras obligatorios.

### Módulos

1. **Gestión clínica — no incluido.** Pacientes, historia clínica, antecedentes, alergias, consultas, signos vitales, diagnósticos, tratamientos, evoluciones, archivos, recetas, indicaciones, certificados y órdenes. Estas son funciones de un solo módulo, no módulos separados.
2. **Agenda — no incluido.** Calendario, citas, disponibilidad, reprogramaciones, cancelaciones, estados de atención y recordatorios futuros.
3. **Administración médica — opcional, no incluido.** Servicios, honorarios, cobros, pagos pendientes, deudas, comprobantes, resumen de ingresos y métodos de pago. No exige apertura de caja, cierre X/Z ni conteo de efectivo.
4. **Gestión del consultorio — no incluido para Salud.** Estadísticas, pacientes nuevos, citas, seguimientos, rendimiento de agenda, equipo y configuración.

La especialidad será un dato opcional del profesional, no un módulo ni un criterio de arquitectura.

### Pestañas

```text
Inicio
Agenda
Pacientes
Atención
Administración     ← solo si fue contratada
Reportes
Equipo
Configuración
```

La historia clínica se abre dentro del paciente. Las recetas se crean durante una consulta y quedan en su historia.

```text
Pacientes
├── Buscar o registrar paciente
├── Ver expediente
└── Consultar historia clínica

Atención
├── Pacientes esperando
├── Iniciar consulta
├── Consultas en curso
└── Seguimientos pendientes
```

### Dashboard

```text
INICIO — SALUD
├── Próxima cita
├── Citas de hoy
├── Pacientes esperando
├── Atendidos hoy
├── Citas pendientes y canceladas
├── Seguimientos pendientes
├── Pacientes recientes
├── Agenda del día
└── Acciones rápidas
    ├── Agendar cita
    ├── Registrar paciente
    ├── Iniciar consulta
    └── Buscar historia clínica
```

Con Administración médica contratada se agregan Cobrado hoy, Pagos pendientes y Registrar cobro. No se muestran ventas, productos, inventario ni caja.

## 7. Pestañas comunes

```text
Equipo
├── Usuarios
├── Invitaciones
├── Roles
├── Permisos
└── Actividad

Configuración
├── Datos de la organización
├── Preferencias
├── Seguridad
├── Comprobantes y documentos
├── Plan y suscripción
└── Módulos contratados
```

El contenido se adapta al área sin duplicar la infraestructura común.

## 8. Planes

```text
ORGANIZACIÓN
├── Área
│   ├── Comercio
│   ├── Gastronomía
│   └── Salud
├── Plan
│   ├── Standard
│   ├── Pro
│   └── Enterprise
```

- El área define la experiencia.
- El plan define límites y nivel de funciones.
- El rol determina lo que cada usuario puede hacer.

La venta de módulos adicionales no se implementará en las fases actuales. El diseño podrá revisarse más adelante si se decide ofrecerla.

## 9. Resumen controlado de módulos

| Área | Módulos principales |
|---|---|
| Comercio | Ventas; Productos e inventario; Compras; Clientes; Gestión |
| Gastronomía | Operación gastronómica; Menú y producción; Inventario y compras; Clientes; Gestión gastronómica |
| Salud | Gestión clínica; Agenda; Administración médica opcional; Gestión del consultorio |
| Común | Organización, usuarios, permisos, suscripción, seguridad y configuración |

La regla central es:

> Una pestaña organiza la navegación. Una opción ejecuta una acción. Solo se considera módulo una capacidad empresarial grande, con datos, reglas y permisos propios.

## 10. Implementación en la estructura de carpetas

### 10.1 Decisión arquitectónica

Se conservará el monorepo actual:

```text
apps/web                 sistema utilizado por los clientes
packages/types           contratos y tipos compartidos
packages/supabase        base de datos, políticas y funciones de servidor
packages/ui-config       configuración visual compartida
```

No se crearán tres aplicaciones independientes. Comercio, Gastronomía y Salud vivirán en `apps/web` y compartirán autenticación, permisos, componentes y servicios.

### 10.2 Estructura objetivo completa

```text
lumen-pos/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       ├── core/
│   │       ├── areas/
│   │       ├── modules/
│   │       └── shared/
├── packages/
│   ├── types/
│   ├── supabase/
│   └── ui-config/
├── scripts/
└── docs/
```

### 10.3 Aplicación de clientes: `apps/web`

```text
apps/web/src/
├── app/
│   ├── providers/
│   │   ├── AppProviders.tsx
│   │   ├── AuthProvider.tsx
│   │   └── QueryProvider.tsx
│   ├── router/
│   │   ├── AppRoutes.tsx
│   │   ├── AreaRoutes.tsx
│   │   └── ProtectedRoute.tsx
│   ├── shell/
│   │   ├── AppLayout.tsx
│   │   ├── AppSidebar.tsx
│   │   └── NavigationHeader.tsx
│   └── main.tsx
│
├── core/
│   ├── auth/
│   ├── organizations/
│   ├── users/
│   ├── access/
│   ├── subscriptions/
│   ├── configuration/
│   └── audit/
│
├── areas/
│   ├── commerce/
│   │   ├── commerce.area.ts
│   │   ├── commerce.navigation.ts
│   │   ├── commerce.routes.tsx
│   │   └── CommerceDashboardPage.tsx
│   ├── gastronomy/
│   │   ├── gastronomy.area.ts
│   │   ├── gastronomy.navigation.ts
│   │   ├── gastronomy.routes.tsx
│   │   └── GastronomyDashboardPage.tsx
│   └── health/
│       ├── health.area.ts
│       ├── health.navigation.ts
│       ├── health.routes.tsx
│       └── HealthDashboardPage.tsx
│
├── modules/
│   ├── sales/
│   ├── catalog-inventory/
│   ├── procurement/
│   ├── customers/
│   ├── reporting/
│   ├── gastronomy-operations/
│   ├── menu-production/
│   ├── scheduling/
│   ├── clinical-management/
│   └── medical-administration/
│
└── shared/
    ├── components/
    ├── hooks/
    ├── lib/
    ├── services/
    ├── validation/
    └── styles/
```

#### Responsabilidad de cada nivel

| Carpeta | Responsabilidad |
|---|---|
| `app` | Arranque, proveedores, enrutamiento y estructura visual general |
| `core` | Capacidades obligatorias y neutrales utilizadas por todas las áreas |
| `areas` | Decide dashboard, navegación, rutas y módulos que componen cada área |
| `modules` | Contiene la funcionalidad empresarial real |
| `shared` | Componentes y utilidades sin reglas de negocio |

### 10.4 Las áreas son configuración, no duplicación

Un archivo de área declara la composición. Conceptualmente:

```ts
export const commerceArea = {
  id: 'commerce',
  dashboard: CommerceDashboardPage,
  modules: [
    'sales',
    'catalog_inventory',
    'procurement',
    'customers',
    'reporting',
  ],
  navigation: commerceNavigation,
}
```

```ts
export const healthArea = {
  id: 'health',
  dashboard: HealthDashboardPage,
  modules: [
    'scheduling',
    'clinical_management',
    'reporting',
  ],
  optionalModules: ['medical_administration'],
  navigation: healthNavigation,
}
```

Esto no significa herencia. El área únicamente declara qué módulos combina y cómo los presenta.

### 10.5 Anatomía estándar de un módulo

Todos los módulos seguirán una forma predecible:

```text
modules/clinical-management/
├── pages/
│   ├── PatientsPage.tsx
│   └── CarePage.tsx
├── components/
├── hooks/
├── services/
├── validation/
├── permissions.ts
├── routes.tsx
├── index.ts
└── tests colocados junto al archivo probado
```

- `pages`: pantallas asociadas a rutas.
- `components`: piezas visuales propias del módulo.
- `hooks`: coordinación de estado y consultas.
- `services`: acceso a Supabase o API.
- `validation`: reglas de entrada.
- `permissions.ts`: permisos requeridos por operación.
- `routes.tsx`: rutas aportadas por el módulo.
- `index.ts`: interfaz pública del módulo.

Los demás módulos no importarán archivos internos. Solo consumirán lo exportado desde `index.ts`. Esto reduce acoplamiento.

### 10.6 Ejemplos concretos de módulos

```text
modules/sales/
├── pages/
│   ├── SellPage.tsx
│   └── SalesHistoryPage.tsx
├── components/
│   ├── cart/
│   ├── checkout/
│   ├── cash-session/
│   └── receipts/
├── hooks/
├── services/
│   ├── salesService.ts
│   └── offlineSalesService.ts
├── permissions.ts
├── routes.tsx
└── index.ts
```

Caja permanece dentro de Ventas como `cash-session`; no se crea un módulo nuevo.

```text
modules/clinical-management/
├── pages/
│   ├── PatientsPage.tsx
│   └── CarePage.tsx
├── components/
│   ├── patient-profile/
│   ├── clinical-history/
│   ├── consultation/
│   └── clinical-documents/
├── hooks/
├── services/
├── validation/
├── permissions.ts
├── routes.tsx
└── index.ts
```

Historia, antecedentes, diagnósticos y recetas permanecen como secciones internas de Gestión clínica.

```text
modules/gastronomy-operations/
├── pages/
│   ├── OrdersPage.tsx
│   ├── TablesPage.tsx
│   └── KitchenPage.tsx
├── components/
│   ├── ordering/
│   ├── tables/
│   └── kitchen-board/
├── hooks/
├── services/
├── permissions.ts
├── routes.tsx
└── index.ts
```

Pedidos, Mesas y Cocina son páginas de Operación gastronómica, no tres módulos independientes.

### 10.7 Rutas

Las rutas tendrán un prefijo por área para evitar colisiones y hacer explícito el contexto:

```text
/commerce/dashboard
/commerce/sell
/commerce/inventory

/gastronomy/dashboard
/gastronomy/orders
/gastronomy/kitchen

/health/dashboard
/health/agenda
/health/patients
/health/care
```

El usuario no elige libremente el prefijo. La organización determina su área y el router solo monta las rutas autorizadas para ella.

Las pestañas opcionales, como Administración médica, solo se agregan a la navegación y al router cuando el módulo está contratado y el usuario tiene permiso.

### 10.8 Núcleo y autorización

```text
core/access/
├── guards/
│   ├── AuthGuard.tsx
│   ├── AreaGuard.tsx
│   ├── ModuleGuard.tsx
│   ├── PlanGuard.tsx
│   └── PermissionGuard.tsx
├── hooks/
│   ├── useOrganization.ts
│   ├── useEntitlements.ts
│   └── useCurrentUserPermissions.ts
├── services/
└── access.types.ts
```

El acceso seguirá esta secuencia:

```text
Sesión válida
→ organización activa
→ área correcta
→ módulo contratado
→ plan y límites válidos
→ permiso del usuario
→ autorización del servidor y SQL
```

La interfaz no será la única barrera. Las políticas SQL, triggers y funciones de servidor conservarán la misma autorización.

### 10.9 Tipos compartidos: `packages/types`

```text
packages/types/src/
├── core/
│   ├── organization.ts
│   ├── identity.ts
│   ├── access.ts
│   ├── plan.ts
│   ├── subscription.ts
│   └── module.ts
├── commerce/
│   ├── sales.ts
│   ├── inventory.ts
│   ├── procurement.ts
│   └── customers.ts
├── gastronomy/
│   ├── orders.ts
│   ├── menu.ts
│   ├── kitchen.ts
│   └── recipes.ts
├── health/
│   ├── patient.ts
│   ├── appointment.ts
│   ├── clinical-record.ts
│   ├── consultation.ts
│   └── medical-billing.ts
├── database.generated.ts
└── index.ts
```

Este paquete tendrá contratos y reglas puras compartibles. No contendrá React, Supabase Client ni componentes visuales.

Los nombres de código se mantendrán en inglés para ser consistentes con el proyecto; los textos visibles seguirán en español.

### 10.10 Base de datos y servidor: `packages/supabase`

```text
packages/supabase/
├── migrations/
├── functions/
│   ├── _shared/
│   │   ├── auth/
│   │   ├── access/
│   │   ├── validation/
│   │   └── responses/
│   ├── organizations/
│   ├── staff/
│   ├── commerce/
│   ├── gastronomy/
│   └── health/
└── tests/
    ├── core/
    ├── commerce/
    ├── gastronomy/
    └── health/
```

Las migraciones seguirán siendo cronológicas porque Supabase las ejecuta en orden. No se reescribirán migraciones históricas ya aplicadas. Los cambios de nombres se harán mediante nuevas migraciones controladas.

Las tablas se agruparán conceptualmente:

```text
Núcleo
organizations
organization_users
roles
permissions
subscriptions
module_activations
organization_settings

Comercio compartido
products
inventory_movements
sales
sale_items
purchase_orders
customers

Gastronomía
restaurant_orders
restaurant_order_items
tables
kitchen_tickets
recipes
recipe_ingredients

Salud
patients
appointments
clinical_records
consultations
clinical_documents
medical_charges
```

Los nombres definitivos se validarán durante el diseño detallado. Esta lista muestra límites, no un esquema aprobado.

Toda tabla operativa tendrá `organization_id`, incluso cuando la interfaz utilice otro nombre contextual. No se añadirá `branch_id` ni estructura multisucursal en esta etapa.

### 10.11 Pruebas

Las pruebas permanecerán cerca del código cuando sean unitarias o de interfaz:

```text
modules/scheduling/services/appointmentService.ts
modules/scheduling/services/appointmentService.test.ts

modules/clinical-management/components/ConsultationForm.tsx
modules/clinical-management/components/ConsultationForm.test.tsx
```

Las pruebas SQL se organizarán por límite de negocio:

```text
packages/supabase/tests/core/
packages/supabase/tests/commerce/
packages/supabase/tests/gastronomy/
packages/supabase/tests/health/
```

Cada módulo debe probar como mínimo:

1. Reglas de negocio.
2. Permisos por rol.
3. Activación por plan o adicional.
4. Aislamiento entre organizaciones.
5. Operaciones SQL autorizadas y rechazadas.
6. Navegación visible y rutas protegidas.

### 10.12 Dependencias permitidas

```text
app
├── puede usar core, areas, modules y shared

areas
├── puede componer modules, core y shared
└── no contiene reglas de negocio

modules
├── puede usar core y shared
├── puede consumir la interfaz pública de otro módulo cuando sea necesario
└── no puede importar archivos internos de otro módulo

core
├── puede usar shared
└── no depende de un área ni de un módulo operativo

shared
└── no depende de core, areas ni modules
```

Esto impide que términos de Comercio vuelvan a introducirse en el núcleo.

### 10.13 Correspondencia desde la estructura actual

| Estructura actual | Destino propuesto |
|---|---|
| `features/pos` | `modules/sales` |
| `features/inventory` | `modules/catalog-inventory` y `modules/procurement` |
| `features/customers` | `modules/customers` |
| `features/analytics` | `modules/reporting` |
| `features/staff` | `core/users` |
| `features/settings` | `core/configuration` |
| `features/dashboard` | dashboards específicos en `areas` |
| `shared/guards` | `core/access/guards` |

Esta migración será progresiva. No se moverán todos los archivos en una sola operación porque dificultaría revisar errores y conservar el historial.

## 11. Orden conceptual de la futura reestructuración

Este orden todavía no es un plan de ejecución aprobado:

1. Definir vocabulario neutral y contratos de Organización.
2. Separar núcleo, módulos y áreas sin cambiar comportamiento.
3. Migrar la autorización desde familias/categorías hacia área, plan y permisos.
4. Crear dashboards y navegación específicos.
5. Consolidar Comercio usando el código existente.
6. Implementar Gastronomía por módulos.
7. Implementar Salud por módulos.
8. Retirar compatibilidad antigua cuando ya no tenga consumidores.

Cada paso deberá usar TDD, migraciones compatibles, verificación de aislamiento y revisión final antes de integrarse.

## 12. Decisiones confirmadas

1. La plataforma no será un POS exclusivo para tiendas.
2. El nombre definitivo se decidirá después.
3. El núcleo será neutral y compartido.
4. Las áreas iniciales serán Comercio, Gastronomía y Salud.
5. Familias y categorías no dirigirán arquitectura ni permisos.
6. Las especialidades médicas serán metadatos opcionales.
7. Salud se enfocará primero en necesidades médicas comunes.
8. Administración médica será opcional y no usará obligatoriamente Caja de Comercio.
9. No se programará multisucursal por ahora.
10. No se empezará la reestructuración hasta aprobar diseño y plan.

## 13. Pendientes de definición

- Nombre definitivo de la plataforma.
- Contenido exacto de cada plan.
- Posibilidad futura de módulos adicionales, sin implementación prevista ahora.
- Roles predeterminados por área.
- Alcance definitivo de Gestión y Reportes.
- Navegación móvil.
- Orden detallado de migración.
- Estrategia exacta para reemplazar `store` y `store_id`.
- Conservación o eliminación de familias y categorías existentes.
- Nombres definitivos de tablas y rutas.
