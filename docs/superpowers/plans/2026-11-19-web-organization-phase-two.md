# Fase 2 de Web. Núcleo de Organización

**Base** `ed92805` · [Diseño de reestructuración](../specs/2026-11-07-general-platform-restructuring-draft.md)

El código Web usa Organización para la identidad del cliente, su configuración y su suscripción. Se reutilizan las consultas y reglas existentes de Supabase. El contrato de persistencia sigue usando las tablas y columnas actuales para conservar los datos y la compatibilidad con Admin.

- [x] Cubrir un perfil activo sin organización, una prueba vencida y la lectura de un plan guardado. Confirmar el fallo inicial de las tres pruebas antes de actualizar los contratos de Web.
- [x] Mover autenticación y roles a `core/auth` y `core/users`. Exponer `useOrganizationId` con `organizationId`, carga, error y reintento. Conservar la protección frente a respuestas tardías de otra sesión.
- [x] Mover la lectura del plan y las funciones incluidas a `core/subscriptions`, la configuración a `core/configuration` y el cálculo de acceso a `core/access`. Mantener las consultas, claves de caché, filtros y reglas vigentes. La categoría y la sucursal primaria siguen detrás del acceso heredado, pendiente de la fase 3.
- [x] Conectar el router, el shell y las funciones existentes. Usar «organización» en los mensajes comunes. Los nombres de base de datos y de las operaciones comerciales se conservan donde forman parte de su contrato.
- [x] Atender la revisión independiente. Completar la terminología del shell, probar el adaptador de suscripción desde el router, eliminar la derivación duplicada del perfil y dejar las pruebas de providers y preajustes en sus carpetas.
- [x] Verificar 21 pruebas enfocadas después de la revisión.
- [x] Verificar `pnpm check` y el diff final antes de integrar.

`pnpm check` terminó con salida 0. Pasaron el typecheck, 166 pruebas en 33 archivos, el lint basal y los builds. Para el build se usaron valores ficticios de Supabase en el entorno del proceso. Las advertencias existentes por tamaño del bundle siguen presentes.
