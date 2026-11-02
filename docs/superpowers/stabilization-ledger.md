# Estabilización de Lumen POS — 2026-11-02

- Autorización: ejecución autónoma; todos los datos son de prueba.
- Decisión: usar checkout actual y copia inicial en `/tmp/lumen-pos-stabilization`; conservar cambios anteriores sin commits automáticos.
- Línea base anterior: typecheck y build correctos; sin tests propios; lint web 126 errores/4 advertencias, admin 38/1; falta turbo.json.
- Docker: consulta autorizada fuera del sandbox funciona; no había contenedores en ejecución. Pruebas en contenedor aislado, sin resetear bases existentes.
- Plan: `plans/2026-11-02-stabilization.md`; diseño: `specs/2026-11-02-stabilization-design.md`.

## Resultado de esta etapa

Se conservaron el checkout y los cambios previos. Se añadieron dos migraciones correctivas, pruebas y controles de desarrollo. No hubo commits, publicación, despliegue de producción ni reset de la base local existente. Supabase local se inició recuperando su estado anterior; los scripts SQL solo eliminaron sus propios contenedores temporales. Los datos creados por las pruebas autenticadas se retiraron por sus IDs exclusivos.

### Correcciones comprobadas

- Ventas: vendedor y tienda de pagos obligatorios, costo histórico, descuentos, importes/cantidades, caja propia, stock bajo bloqueo e idempotencia por tienda. Los reintentos de una venta no duplican stock ni ingresos. La fecha original se conserva en replay offline autorizado.
- Devoluciones y caja: un único reembolso, reposición y egreso; los reportes incluyen el ingreso original y el egreso una sola vez. Analítica SQL y fallback frontend excluyen ventas reembolsadas y usan pagos reales/costo histórico.
- Aislamiento y permisos: roles activos, bloqueo de autoascenso y cambios comerciales, comprobación de tenant en referencias, RPC administrativos protegidos, límites de usuarios/cajas serializados y características comerciales comprobadas en servidor. Superadmin con factor verificado requiere AAL2 también en SQL.
- Inventario: alta de producto, variante y auditoría de stock inicial mediante RPC atómico. Pedidos recibidos/cancelados no pueden reabrirse ni modificar sus líneas; bloqueo del padre impide carreras con recepción y eliminación por cascada como atajo.
- Offline: persistencia antes de completar, unión/deduplicación de IndexedDB/localStorage, clave estable ante respuesta perdida, protección contra doble clic, backoff y bloqueos de pestaña cuando están disponibles. Los rechazos persistidos prevalecen y la lectura de autoridad incompleta detiene el replay.
- Identidad: pertenencia y autorización antes de borrar Auth, eliminación de fallback directo de staff, compensación de altas fallidas y vencimiento activo calculado en servidor. MFA falla cerrado; callbacks no se bloquean; consultas de perfil y caché no se mezclan entre cuentas.
- Herramientas: comandos raíz/Turbo, instalación reproducible, puertos Vite explícitos, hosts restringidos, plantillas de entorno, Vitest, comprobación de tipos de handlers Edge y GitHub Actions con trabajos frontend/SQL separados.

### Revisión independiente

La revisión desde la copia inicial encontró cinco problemas materiales: relaciones FK ambiguas en PostgREST, alta activa sin vencimiento, auditoría inicial de stock incompatible con los permisos nuevos, posible resurrección de una cola rechazada al perder acceso al almacén autoritativo y edición del detalle de pedidos terminales. Los cinco se corrigieron y recibieron revisión focalizada final sin Critical/Important confirmados en esas correcciones. Esto no equivale a certificar todo el producto ni sustituye pruebas en el hardware del comercio.

La migración principal se aplicó y congeló antes del último hallazgo. Su arreglo quedó en una segunda migración, sin alterar SQL ya aplicado:

| Archivo | SHA256 aplicado localmente |
| --- | --- |
| `20261102010000_stabilization.sql` | `4ee1d3f475ea41040eff44bd066134b3a9425bfb7c448f638a1cf67605d2588d` |
| `20261102020000_purchase_order_items_guard.sql` | `dfbf2e9981d85bf6d280048c1279e006808c5f8700208a05d609c2db13fa4354` |

### Evidencia final local

| Comprobación | Resultado |
| --- | --- |
| Instalación frozen/offline | Correcta, sin modificar dependencias durante la verificación |
| `pnpm check` | Typecheck, 14 archivos/70 tests, control incremental de lint y compilaciones web/admin correctos |
| Tipos tras última migración | Regenerados desde Supabase local mediante archivo temporal; typecheck posterior correcto |
| `pnpm test:db` | 117 assertions correctas: comportamiento SQL, relaciones, eliminación y concurrencia en PostgreSQL 17 aislado |
| `pnpm test:api` | 6 consultas de relaciones PostgREST con HTTP 200 después de ambas migraciones |
| `pnpm test:api:auth … --edge` | 9 comprobaciones correctas con Deno Edge Runtime, GoTrue y PostgREST locales; alta activa, inventario, venta mixta, retry, devolución, caja, analítica y aislamiento |
| Lint | 94 errores/4 advertencias web y 38/1 admin; 32 errores corregidos respecto al inicio. Límites reducidos para impedir que vuelvan |

Las regresiones SQL se ejecutaron primero contra el estado anterior y reprodujeron fallos reales; la última corrección reprodujo ocho mutaciones indebidas y un bloqueo ausente antes de pasar. Las pruebas POS finales incluyen 27 casos y las pruebas de handlers Edge 23. CI está configurado en el repositorio; no se afirma una ejecución remota en GitHub Actions.

Logs de esta sesión en `/tmp/lumen-pos-stabilization`: `check-verified.log`, `db-verified-final.log`, `api-schema-final.log`, `authenticated-edge-final.log`, `typecheck-schema-final.log`, `supabase-apply-final.log`, `supabase-apply-orders-final.log` e `install-frozen.log`. Son evidencia temporal y no son necesarios para reproducir los comandos. El archivo privado de estado local contiene credenciales y permanece fuera del repositorio.

### Deuda y siguiente trabajo

`pnpm lint:strict` sigue fallando por 132 errores heredados y cinco advertencias; no se desactivaron reglas. La base incremental impide aceptar diagnósticos adicionales por archivo/regla/severidad. Quedan avisos de bundles grandes y los límites offline, datos históricos y hardware descritos en [STABILIZATION.md](../STABILIZATION.md). No hay PWA completa ni garantía de impresión física. La próxima modificación debe tener alcance concreto y sus pruebas, conservando estos controles.
