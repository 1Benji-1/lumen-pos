# Persistencia de sucursales y módulos — diseño de fase 2

## Intención

Convertir la resolución modular de la fase 1 en datos persistidos por cliente y sucursal, sin alterar el comportamiento del POS minorista existente. Esta fase establece la identidad de la sucursal principal, registra excepciones de activación y hace que la aplicación las lea. Es la base para habilitar después configuración por el propietario y operación en varias sucursales.

## Diseño heredado y situación actual

Se aplica el [diseño modular aprobado](2026-11-03-lumen-modular-platform-design.md): familia y categoría ofrecen valores iniciales, el plan concede funciones y límites, la activación controla lo contratado y los permisos controlan al empleado. La fase 1 ya implementó el registro de módulos y `resolveModuleAccess`.

Actualmente `public.stores` representa simultáneamente al cliente y a su única tienda. Suscripción, propietario, perfiles y todas las operaciones usan `store_id`; RLS también lo usa como límite entre clientes. Sustituir ese significado en una sola migración afectaría ventas, inventario, caja, funciones SQL y políticas de seguridad.

## Enfoques considerados

1. **Reemplazar `stores` por `organizations` y crear sucursales inmediatamente.** Deja nombres conceptuales claros, pero exige cambiar todos los `store_id`, relaciones y funciones antes de poder verificar una unidad pequeña. Riesgo alto de mezclar datos o detener el POS.
2. **Guardar sucursales y activaciones en JSON dentro de `stores`.** Es rápido, pero no da claves foráneas por sucursal, complica RLS y auditoría, y dificulta futuras consultas operativas.
3. **Conservar `stores` como tenant y añadir tablas normalizadas debajo.** Permite migrar cada cliente a una sucursal principal sin reescribir sus ventas. La terminología física `stores` seguirá siendo temporalmente distinta de la terminología del producto.

**Decisión:** enfoque 3. Es compatible con el esquema actual y permite verificar seguridad y backfill antes de abrir la operación multisucursal.

## Modelo de datos

- `stores.id` conserva el papel de organización/tenant y mantiene el plan. No se crea todavía una tabla `organizations` paralela.
- `branches` pertenece a un `store_id`. Tiene identificador, nombre, `category_id`, `is_primary` y fechas. Una clave única parcial permite una sola sucursal principal por store. La familia se deriva del registro de categorías, evitando almacenar una pareja familia/categoría contradictoria.
- Una migración crea una sucursal principal por cada store existente. El `category_id` se calcula con el mismo mapeo de compatibilidad que la fase 1: `tienda_articulos` con subrubro válido, `supermercado` a `minimarket_abarrotes`, `restaurante` a `restaurante_tradicional`, y desconocidos a `comercio_general`. Un trigger crea la principal para stores nuevos y sincroniza su categoría/nombre cuando el administrador cambia los campos heredados de `stores`. Durante esta fase esos campos siguen siendo la fuente de edición; la escritura independiente de la categoría de una sucursal llega con la interfaz administrativa. No se modifica el historial operativo.
- `module_catalog` representa en SQL el identificador, ámbito, estado de implementación y función de plan requerida de cada módulo. Se mantiene sincronizado con `MODULE_REGISTRY` mediante una prueba; el catálogo SQL valida los datos persistidos y futuras mutaciones, mientras el registro TypeScript sigue describiendo navegación y pantallas.
- `module_activations` guarda excepciones explícitas, no una copia de todos los valores predeterminados. Una fila con `branch_id` nulo corresponde a un módulo de organización; una fila con `branch_id` presente corresponde a un módulo de sucursal. Su clave y trigger comprueban que sucursal y store coincidan, que el ámbito corresponda al catálogo y que el módulo esté implementado. `enabled=true` no puede conceder una función ausente del plan.
- `module_activation_audit` registra alta, cambio y baja con valor anterior/nuevo, fecha y actor cuando existe identidad. El historial no se borra al desactivar un módulo.

## Acceso y seguridad

- Usuarios activos leen solamente sucursales y activaciones de su `store_id`. El superadministrador conserva la posibilidad de inspección con las reglas existentes. Ni el cliente ni el propietario obtienen escritura directa en estas tablas durante esta fase.
- Las escrituras de configuración quedan reservadas al backend con rol de servicio y validadas por constraints/triggers. El futuro flujo del propietario usará una operación autorizada que también aplicará el plan, los permisos y la auditoría.
- La aplicación lee la sucursal principal y las activaciones correspondientes, y pasa categoría y mapa de activación a `resolveModuleAccess`. Ausencia de excepciones significa valores predeterminados de la categoría. Un error al consultar sucursal o activaciones bloquea la navegación y las rutas modulares en lugar de asumir acceso.
- La precedencia de la fase 1 permanece: módulo implementado, función del plan, activación, categoría y permiso. Una activación positiva no supera el límite del plan.

## Límite deliberado de esta fase

Se persiste y lee la configuración de la sucursal principal. Todavía no se ofrecen un selector de sucursales ni controles para activar/desactivar módulos. Las ventas, existencias, cajas, turnos y perfiles siguen vinculados a `store_id`; por ello, crear una segunda sucursal operativa requiere una migración separada de esas tablas y sus RLS. Exponer cambios al propietario antes de que las operaciones del servidor respeten las desactivaciones daría una protección incompleta.

Las tareas siguientes son: alcance operativo de `branch_id` y límites de sucursales; aplicación de permisos de módulo en operaciones SQL/servidor; interfaz de activación para el propietario; y habilitación de operaciones multisucursal. Cada una tendrá pruebas de aislamiento y compatibilidad antes de activarse.

## Verificación y migración

- La migración es aditiva: no renombra ni borra tablas/columnas actuales y no cambia el significado de `store_id`.
- Pruebas PostgreSQL comprobarán backfill, trigger para stores nuevos y cambios heredados, aislamiento entre tenants, ausencia de escrituras directas, integridad de ámbito y plan, y auditoría.
- Pruebas TypeScript comprobarán lectura de sucursal principal, unión de activaciones por ámbito, valores predeterminados, error seguro y compatibilidad de navegación minorista.
- `pnpm check` y `pnpm test:db` deberán pasar con el esquema y la aplicación integrados. Los datos históricos quedarán bajo la sucursal principal de manera implícita hasta la migración operativa siguiente.
