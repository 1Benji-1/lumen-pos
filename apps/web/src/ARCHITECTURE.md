# Límites de carpetas de Web

La aplicación de clientes se organiza progresivamente en cinco zonas:

- `app`: arranque, rutas y shell visual.
- `core`: identidad, organización, acceso y configuración comunes.
- `areas`: composición y dashboard de Comercio, Gastronomía y Salud.
- `modules`: capacidades de negocio con una entrada pública (`index.ts`).
- `shared`: componentes y utilidades sin reglas de negocio propias.

## Dirección de dependencias

```text
app → areas, core, modules, shared
areas → modules, core, shared
modules → core, shared; otros módulos solo por index.ts
core → shared
shared → utilidades externas y tipos
```

El núcleo de Web agrupa sesión, usuarios y roles, organización, suscripción, configuración y acceso. `useOrganizationId` identifica la organización de la cuenta autenticada. Los hooks de suscripción y el repositorio de configuración traducen desde las tablas actuales de Supabase. Los identificadores y filtros SQL conservan el formato usado por los datos existentes.

El acceso de Web todavía resuelve el perfil de negocio y las activaciones con la sucursal primaria. Las lecturas correspondientes están en `core/access/legacy`. La transición hacia acceso por áreas pertenece a la fase 3.

`areas/legacy` conserva el dashboard de varias familias y sus dependencias de ventas e inventario. Los preajustes de subrubro siguen en `features/retail`.
