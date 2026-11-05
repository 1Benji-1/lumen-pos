# Autorización modular en SQL y servidor — diseño propuesto de fase 3

**Estado:** pendiente de aprobación. **Base:** `80f63d8` en `codex/stabilization-baseline`.

## Intención y alcance

Hacer que la decisión modular persistida en la fase 2 se aplique donde se ejecutan las operaciones, aunque alguien llame directamente a PostgREST, a una RPC o a una Edge Function. Se conserva `stores.id` como límite del cliente y la sucursal principal como único contexto operativo. No se construyen la interfaz de activación ni la operación multisucursal.

La fase termina cuando desactivar un módulo o perder una función del plan impide nuevas operaciones correspondientes, sin borrar datos ni impedir la consulta autorizada de ventas, cobros, cajas y movimientos históricos. El POS minorista actual debe seguir funcionando con los valores predeterminados existentes.

## Enfoques considerados

1. **Comprobar módulos sólo en la aplicación y en las Edge Functions.** Cambio pequeño, pero una llamada directa a tablas o RPC elude la regla. Descartado.
2. **Duplicar toda la resolución modular en cada política RLS, trigger y función.** Cubre las entradas, pero la categoría, plan, activaciones y roles divergirían. Descartado.
3. **Resolver la decisión en SQL una vez y usarla en cada frontera de operación.** La aplicación mantiene el registro de presentación; SQL evalúa el mismo catálogo, los valores predeterminados de categoría, el plan, la activación y el rol. Se comprueba la paridad en las pruebas. **Recomendado**, sujeto a aprobación.

## Contrato de autorización

Una operación declara `módulo`, `acción` (`read_history`, `read_current`, `write`, `closeout`) y permiso/roles. Para una escritura ordinaria, la comprobación sigue este orden: identidad activa y tenant; sucursal principal válida y perteneciente al tenant; módulo implementado; función del plan; activación explícita o valor predeterminado de la categoría; permiso del rol; suscripción vigente. La ausencia o inconsistencia de cualquiera de esos datos bloquea la escritura con `42501`. Los IDs de tienda o sucursal enviados por el cliente nunca sustituyen la identidad verificada.

Una nueva tabla SQL de valores predeterminados por categoría y módulo, o una representación equivalente normalizada, se poblará desde la matriz vigente. La prueba de paridad comparará sus filas con `CATEGORY_MODULE_DEFAULTS` y `module_catalog`, incluyendo ámbito, estado y función requerida. Una activación positiva sólo vence el valor predeterminado de la categoría; no vence el plan, el estado de implementación ni el rol. Las funciones internas reciben el tenant derivado de `auth.uid()` y no exponen consultas arbitrarias de otros clientes. Las funciones `SECURITY DEFINER` mantienen `search_path` fijo y privilegios `EXECUTE` mínimos.

El rol conserva el catálogo de permisos existente. La verificación SQL tendrá una tabla o función de matriz de roles cuya paridad con `ROLE_DEFINITIONS` se probará. No se crea todavía un editor de permisos. `service_role` no constituye por sí solo permiso del usuario: las Edge Functions verifican el token del solicitante y consultan la autorización usando ese contexto antes de efectuar cambios privilegiados. Las operaciones administrativas de Lumen, como crear tiendas y la intervención explícita del superadministrador con MFA, conservan su ruta administrativa separada y auditada.

## Fronteras de operación

| Área | Entradas y decisión propuesta |
| --- | --- |
| POS | `create_sale` exige `pos:access` y módulo `pos` activo. La devolución `refund_sale` es una nueva operación financiera y exige `pos` activo y rol autorizado. Una repetición idempotente de una venta ya confirmada puede devolver su ID después de verificar identidad activa, tenant y autor original, sin crear otra venta; se permite incluso tras desactivación o vencimiento de suscripción. Una venta pendiente nueva se rechaza aunque declare fecha anterior. |
| Caja | Apertura y nuevos `cash_movements` exigen `pos` activo y `pos:manage_cash`. Cerrar una caja ya abierta se permite como `closeout` restringido, aun tras desactivar POS o vencer la suscripción, para no dejar un turno atrapado; exige identidad activa, tenant, `pos:manage_cash`, caja propia o rol supervisor, y sólo cambia los campos de cierre. No permite nuevos cobros ni movimientos. `admin_force_close_cash_register` sigue siendo intervención de Lumen con MFA. El módulo `cash` continúa marcado como futuro. |
| Inventario | Escrituras directas en categorías, productos, variantes y proveedores, `create_product_with_variant` y `adjust_variant_stock` exigen `inventory` activo y `inventory:manage`; se conservan las funciones de plan más finas (`physical_count`, `batch_expiry_control`). Una venta POS autorizada puede descontar existencias de forma interna y atómica aunque la administración de inventario esté desactivada. No abre una vía de ajuste directo. |
| Compras | Órdenes, ítems y `receive_purchase_order` exigen `inventory` activo, permiso de gestión y la función existente `purchase_orders`. El módulo `purchases` sigue marcado como futuro; esta relación transitoria queda documentada y probada. |
| Clientes | Altas, cambios, bajas y la búsqueda operativa de duplicados exigen `customers` activo y el permiso correspondiente. La lectura de clientes vinculados a operaciones históricas se conserva para roles autorizados. |
| Personal | Escritura directa de perfiles y todas las acciones de `manage-staff` exigen `staff` activo y `staff:manage`, además de las reglas actuales de propietario, administrador, límite de usuarios y protección del rol. El superadministrador conserva sólo la vía administrativa explícita. |
| Ajustes | Cambios comerciales de `stores` y `store_settings` exigen `settings` activo y `settings:manage`. Cambios de plan/suscripción hechos por Lumen y triggers internos de aprovisionamiento no dependen de que el cliente active Ajustes. |
| Reportes | `get_store_analytics` exige `analytics:view`, plan `advanced_analytics` y módulo `analytics` activo. Los registros financieros históricos continúan consultables mediante sus tablas para roles autorizados. |

Las tablas de ventas, pagos, ítems y movimientos que hoy sólo admiten escritura transaccional mantendrán ese cierre. El guard de escritura directa aplicará el módulo antes de mutar; las RPC `SECURITY DEFINER` lo comprobarán explícitamente antes de operar, porque su propietario puede saltar RLS y el guard invocador actual. Se revisarán todas las firmas y sobrecargas públicas para que no quede una ruta antigua sin comprobación. Las políticas RLS de lectura conservarán aislamiento por tenant, añadirán el permiso de rol apropiado a los datos sensibles y distinguirán consultas históricas de operaciones nuevas. Al sustituirlas se eliminarán las políticas permisivas anteriores que podrían conceder acceso por `OR`; agregar otra política no bastaría. No se impondrá una política de sólo lectura que oculte el historial al desactivar un módulo; las lecturas de catálogo compartido necesarias para un POS activo seguirán disponibles.

La política de lectura histórica no depende de que el módulo permanezca activo ni de que la suscripción esté vigente; sí exige identidad activa, mismo tenant y permiso de rol. La inspección explícita del superadministrador con MFA conserva la excepción entre tenants ya existente. Se aplicará esta matriz a usuarios del comercio, sin ampliar el acceso del cajero a las cajas de otros salvo la información mínima que el flujo de una caja única necesita:

| Datos de lectura | Permiso requerido |
| --- | --- |
| `sales`, `sale_items`, `sale_payments` | `pos:access` o `analytics:view`; siempre del mismo tenant. |
| `cash_registers`, `cash_movements` | `pos:audit_cash` para todas las cajas del tenant; `pos:manage_cash` sólo para la caja propia. El aviso de una caja única abierta por otra persona usará una proyección limitada de ID y nombre, no acceso a todos los importes ni perfiles. |
| `customers`, `customer_metrics` | `customers:view`; la vista seguirá siendo `security_invoker`, sin permiso de `anon`, y heredará RLS de clientes y ventas. Los roles actuales con `customers:view` también poseen el permiso necesario sobre ventas. |
| `products`, `product_variants`, `categories` | `inventory:view`, o `pos:access` cuando POS esté activo para consultar el catálogo vendible. |
| `stock_movements`, `suppliers`, `purchase_orders`, `purchase_order_items` | `inventory:view` para movimientos; `inventory:manage` para proveedores y compras históricas. |
| `users` | Perfil propio; lista de personal con `staff:view`. Las referencias de caja a otros cajeros usan la proyección limitada anterior. |

Los datos operativos no listados, como ajustes y sucursales, conservarán su aislamiento por tenant y las reglas vigentes hasta que un caso de uso del módulo exija una política más específica. La implementación inventariará todas las vistas y políticas existentes antes de cambiarlas.

## Concurrencia y compatibilidad

Las operaciones de escritura comprobarán la activación dentro de su transacción, con bloqueo compatible con el cambio de activación, para que una desactivación concurrente tenga un punto de corte definido: operaciones confirmadas antes permanecen; las iniciadas después se rechazan. Se mantendrán el bloqueo de variantes, las claves de idempotencia, los límites y las validaciones de tenant de la estabilización. No se reescribirán migraciones anteriores; la fase se aplicará con migraciones correctivas nuevas. El esquema seguirá permitiendo sólo la sucursal principal como ámbito de operaciones, sin aceptar `branch_id` externo en las RPC existentes.

## TDD y aceptación

1. Primero, pruebas PostgreSQL fallidas para cada frontera: llamada directa/RPC/Edge Function, rol, plan, categoría, activación explícita, usuario suspendido, suscripción y tenant ajeno. Verificar que un `enabled=true` no supera un plan denegado y que una categoría sin módulo permanece cerrada sin excepción.
2. Añadir pruebas de historia, devolución, cierre de caja, repetición idempotente, inventario descontado por venta, firma RPC antigua y desactivación concurrente. Ejecutar cada caso en rojo antes del cambio mínimo y en verde después.
3. Probar paridad de matrices TypeScript/SQL y el comportamiento minorista sin excepciones. Ejecutar `pnpm test:db` y `pnpm check` con resultados frescos. La prueba autenticada real requiere Supabase local y un archivo privado de estado fuera del repositorio: `pnpm test:api:auth -- /ruta/privada/status.json`; ejecutarla cuando estén disponibles y declarar explícitamente si no lo están. No imprimir ni versionar ese archivo.
4. Revisar el diff y las pruebas con **Antigravity** al final, resolver hallazgos y repetir las comprobaciones afectadas antes de integrar. Si Antigravity no estuviera disponible en el entorno, detener la integración y comunicarlo.

## Exclusiones y riesgos a vigilar

Quedan fuera los controles de activación del propietario, el selector y la operación multisucursal, módulos aún no implementados, permisos personalizables y cambios visuales. El riesgo principal es cerrar una ruta legítima del POS por la dependencia transitoria de caja, compras o catálogo; por eso sus casos se fijan antes del cambio. Otro riesgo es creer que `service_role` conserva el contexto de usuario: la verificación de Edge Functions debe probar expresamente que un token válido de otro tenant o sin permiso no llega a la mutación.
