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

Durante la migración, `areas/legacy` conserva el dashboard actual, que atiende varias familias, y sus importaciones hacia `features/pos` y `features/inventory`. `core/access` utiliza hooks existentes en `shared` que todavía dependen de `features`. Estos enlaces son deuda de transición, no el patrón para código nuevo. Los dashboards específicos y la neutralización de los hooks se harán en fases posteriores.

Las rutas públicas y los contratos SQL no se renombran en la fase 1. `apps/admin` queda fuera de la reestructuración.
