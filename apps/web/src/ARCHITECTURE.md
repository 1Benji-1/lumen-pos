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

Web obtiene el área y el catálogo inicial de la organización mediante `get_organization_area_context()`. Supabase usa el mismo catálogo para evaluar el acceso. Las activaciones históricas conservan su ámbito actual y se consultan desde `core/access/legacy`. Los perfiles anteriores con un catálogo distinto conservan ese catálogo durante la transición.

`app/router/OrganizationHome.tsx` selecciona Inicio de Comercio, Gastronomía, Salud o compatibilidad. El panel completo de Comercio sigue reutilizando el dashboard existente. Los preajustes de subrubro siguen en `features/retail`.
