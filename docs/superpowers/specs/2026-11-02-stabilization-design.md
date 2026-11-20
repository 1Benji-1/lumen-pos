# Base estable de Lumen POS

## Autorización y contexto
El usuario confirmó que todos los datos son de prueba y delegó las decisiones y la ejecución de la estabilización antes de solicitar funcionalidades nuevas. Se trabaja sobre el checkout actual para conservar sus numerosos cambios locales; no se crean commits que mezclen trabajo previo ni se publica nada. Copia inicial: `/tmp/lumen-pos-stabilization/source-before.tar.gz` y diff previo en el mismo directorio.

## Objetivo
Conservar React, Vite, TypeScript y Supabase, cerrar fallos reproducibles de aislamiento y dinero, y dejar comandos y pruebas repetibles. No se rediseña la interfaz ni se reescribe el producto.

## Enfoque elegido
Estabilización incremental por dominios independientes, con pruebas de regresión antes de cada arreglo y revisión de integración al final. Una reescritura general perdería comportamiento existente; una limpieza exclusivamente de lint no protege datos ni dinero. La autorización para decidir y ejecutar permite continuar sin nuevas rondas de aprobación de cada bloque.

## Contratos
- Roles activos y aislamiento por tienda se comprueban en PostgreSQL y en acciones administrativas; un usuario nunca cambia su propia tienda, rol o suscripción para elevar privilegios.
- Las ventas conservan vendedor, costo histórico, descuentos y pagos, validan cantidades/importes/cliente/caja y son atómicas. Reintentar la misma venta offline no crea otra venta ni descuenta stock dos veces.
- Reembolsar dos veces no repone inventario ni retira efectivo dos veces. El arqueo incluye el ingreso original y su devolución una sola vez. La analítica comercial excluye operaciones reembolsadas.
- La cola offline combina y deduplica IndexedDB y localStorage, confirma persistencia antes de vaciar el carrito y usa una caja real. Los errores conservan ventas pendientes y los reintentos se espacian.
- La autenticación y el acceso fallan de forma segura y muestran un resultado recuperable cuando falta el perfil o falla la consulta; MFA no se omite por un error de consulta.
- Los límites y características comerciales sensibles se validan en el servidor donde corresponda.

## Pruebas y entrega
Pruebas TypeScript con Vitest y almacenamiento IndexedDB simulado; pruebas SQL ejecutables sobre PostgreSQL aislado con identidad Auth controlada. Cubrir dos tiendas, roles, inactividad, suscripciones, ventas y pagos, devoluciones, idempotencia y stock. Compilación y typecheck de ambas aplicaciones. CI ejecuta controles repetibles. No se presenta una prueba SQL con helpers Auth controlados como validación completa de la API de Supabase.

## Límites
Se conserva el diseño existente y los archivos ajenos. No se eliminan bases existentes, no se publican cambios y no se añade una PWA completa en esta etapa. Si la auditoría de lint revela deuda amplia, se documenta una línea base explícita que impida nuevos problemas y se corrigen los fallos de comportamiento detectados; no se desactiva globalmente el análisis para simular que todo está limpio.
