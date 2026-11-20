# Fase 3 de Web. Áreas y acceso a módulos

**Base** `2fbc547` · [Diseño de reestructuración](../specs/2026-11-07-general-platform-restructuring-draft.md)

- [x] Probar que SQL entrega el área de la sesión, mantiene los perfiles existentes y rechaza módulos fuera del catálogo de una nueva organización de Salud.
- [x] Añadir una migración aditiva con `organization_access_profiles`, el catálogo por área y `get_organization_area_context()`. Sembrar los perfiles existentes con sus valores de compatibilidad. La entrada de altas actual sigue funcionando mediante un adaptador al guardar la categoría.
- [x] Hacer que la autorización SQL y Web consuman los mismos módulos predeterminados. Conservar la prioridad del plan, los roles, las activaciones guardadas y el ámbito de la sucursal primaria de las excepciones actuales.
- [x] Componer Inicio y navegación para Comercio, Gastronomía, Salud y el contexto de compatibilidad. Mantener enlaces actuales a herramientas disponibles y presentar lo planificado como información.
- [x] Actualizar Equipo, Plan y Módulos de Web con el área de la organización. Verificar el contrato de altas desde Admin.
- [x] Correr la batería completa, las pruebas SQL desechables y la revisión independiente.
- [x] Aplicar la migración a Supabase local y verificar sus tres organizaciones, tres sucursales primarias y tres perfiles de acceso.

Las cuentas existentes conservan sus accesos efectivos de partida, incluido cualquier POS anterior de Salud. Las altas de Salud usan Agenda y Gestión clínica planificadas y carecen de Caja. Los perfiles anteriores de servicios no médicos se muestran en compatibilidad. No se incorporan operaciones de sucursales, compras de adicionales ni módulos todavía planificados.

La clasificación heredada queda reservada a administración. El propietario conserva la edición del nombre. Una reclasificación privilegiada que coincida con una operación que bloquea la organización puede requerir un reintento. En Salud nueva, Web ofrece únicamente los roles existentes que pueden abrir el área. Admin mantiene su vista previa histórica por categoría.

`pnpm check` terminó con salida 0. Pasaron 173 pruebas en 35 archivos, el typecheck, el lint basal y los builds. `pnpm test:db` pasó las regresiones de acceso, concurrencia y migración con PostgreSQL aislado.
