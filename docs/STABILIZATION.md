# Base de desarrollo y validación

La estabilización conserva el producto y su diseño. Los cambios se describen en `superpowers/specs/2026-11-02-stabilization-design.md` y su ejecución en `superpowers/stabilization-ledger.md`.

## Entorno

Node 22.13 o superior, pnpm 12.4.1 y Docker para Supabase y las pruebas SQL. Ejecutar `pnpm install --frozen-lockfile`. Las plantillas públicas de entorno están en `apps/web/.env.example` y `apps/admin/.env.example`; copiar a `.env.local` y completar con las claves públicas de Supabase local. Nunca exponer la clave de servicio en el navegador.

`pnpm dev` inicia web en 5173 y admin en 5174. Los puertos son explícitos y no se desplazan silenciosamente. Para túneles de Vite autorizar el hostname con `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`; no se aceptan todos los hosts por defecto.

## Comprobaciones

| Comando | Alcance |
| --- | --- |
| `pnpm typecheck` | Código y configuración de ambas aplicaciones, handlers Edge y sus pruebas |
| `pnpm test` | Regresiones TypeScript, hooks de autenticación, handlers Edge y cola offline |
| `pnpm test:db` | PostgreSQL 17 temporal, todas las migraciones, regresiones SQL y concurrencia |
| `pnpm test:api` | Consultas de relaciones PostgREST sobre la instancia local configurada, sin modificar datos |
| `pnpm test:api:auth /ruta/privada/status.json` | Alta, venta, devolución, caja y aislamiento con GoTrue/PostgREST locales y datos temporales |
| `pnpm lint` | Impide aumentar la deuda heredada por archivo/regla/severidad |
| `pnpm lint:strict` | ESLint completo; muestra y falla por toda la deuda pendiente |
| `pnpm build` | Compilaciones de producción web/admin |
| `pnpm check` | Typecheck, tests TS, control de lint y build |

`pnpm check` no incluye Docker: ejecutar también `pnpm test:db`. GitHub Actions separa los dos trabajos. Las compilaciones en CI usan una URL y una clave pública ficticias; no necesitan secretos de producción.

La prueba autenticada es opcional y solo admite `http://127.0.0.1:54321`. Obtener el archivo de estado con `pnpm exec supabase status --workdir packages -o json` redirigiendo su salida a un archivo privado fuera del repositorio (contiene claves de servicio). El script no imprime claves, crea identidades/tiendas temporales y retira sus datos en orden de dependencias. Por defecto ejecuta el handler real de alta con el SDK y los servicios locales. Para comprobar también el despliegue Deno local, iniciar `pnpm exec supabase functions serve --workdir packages --no-verify-jwt` y añadir `--edge` al comando autenticado; los handlers comprueban identidad y permisos internamente.

## Pruebas de base de datos

`scripts/test-db.sh` crea un contenedor `lumen-db-test-*` sin red, aplica las migraciones a una base vacía y lo elimina al terminar. No usa ni resetea la instancia local de Supabase. Requiere Docker accesible. Los helpers `auth.uid()` y `auth.jwt()` son identidades controladas de prueba; estos tests prueban PostgreSQL/RLS y funciones reales, no sustituyen una validación completa del servidor Auth de Supabase.

Para reproducir fallos anteriores a la corrección: `DB_MIGRATION_CUTOFF=20261010040000_subscription_payments_and_grace_period.sql pnpm test:db`. Se espera que falle.

## Deuda de lint

La medición inicial fue 126 errores/4 advertencias en web y 38/1 en admin. Tras corregir 32 errores, quedan 94/4 en web y 38/1 en admin. `scripts/eslint-baseline.json` conserva únicamente los límites restantes para impedir que vuelvan los corregidos. No se desactivan las reglas ni se consideran resueltos esos errores por tener un control incremental. Los nuevos archivos y las reglas que no tenían deuda deben estar limpios. No ampliar ni regenerar la línea base para aceptar nuevos diagnósticos; reducirla conforme se corrijan los archivos.

## Migraciones y recuperación

Las migraciones de estabilización `20261102010000_stabilization.sql` y `20261102020000_purchase_order_items_guard.sql` son aditivas y dejan intactas las históricas. Ambas se aplicaron a Supabase local sin reset. Aplicar migraciones pendientes a otra base de desarrollo mediante `pnpm exec supabase migration up --local --workdir packages`. Un `db reset` borra datos y solo corresponde a una base desechable elegida explícitamente. Para regenerar tipos usar el comando del README hacia un archivo temporal, comprobar éxito y después sustituir `database.types.ts`, para no truncarlo si falla el generador.

Las ventas usan clave de idempotencia por tienda y conservan costo histórico, vendedor y pagos. Las devoluciones registran un único egreso y los reportes de caja conservan el ingreso original. Las consultas comerciales excluyen ventas reembolsadas. La cola offline persiste antes de completar la venta y conserva el intento ante una respuesta de red incierta.

## Límites de esta etapa

La cola offline protege operaciones durante interrupciones, pero no se añadió un service worker/PWA para arrancar en frío sin conexión. Si no se puede consultar el almacenamiento que contiene los rechazos, la sincronización se detiene para evitar reenviar una compra descartada. Si ambos almacenes impiden escribir y borrar, el bloqueo solo puede mantenerse en la ventana abierta. Sin IndexedDB ni navigator.locks, localStorage no ofrece escritura atómica entre pestañas. Las ventas legacy con cajas provisionales requieren intervención.

La impresión sigue usando el navegador. Las pruebas no reemplazan probar una impresora, un lector físico y recorridos manuales en el hardware del comercio. Auth y SQL no comparten transacción: si falla la compensación de un alta, se devuelve error y requiere revisión administrativa. Los FK compuestos validan escrituras nuevas; las filas históricas incompatibles no se eliminan ni reparan silenciosamente. Persisten avisos de tamaño de bundles. El despliegue de los cambios de base de datos y Edge Functions debe realizarse junto al frontend actualizado; no se realizó despliegue de producción.

## Gates para producción

El baseline de desarrollo se cerró en la rama `codex/stabilization-baseline`. Estos gates distinguen evidencia reproducible de operaciones que necesitan infraestructura real:

| Gate | Estado del baseline | Condición para cerrarlo |
| --- | --- | --- |
| Navegador | Smoke local correcto: web y admin renderizan login, las rutas protegidas redirigen y no hay errores de consola | Añadir recorridos E2E autenticados para los flujos que se modifiquen |
| Backup/restore | Restauración local correcta en una base temporal; coincidieron migraciones, tiendas, ventas y variantes | Automatizar respaldo periódico y probar restauración en staging con la política de retención elegida |
| Vault | Excluido deliberadamente del dump de aplicación | Respaldar/recuperar secretos mediante el procedimiento separado del proveedor; nunca copiarlos al repositorio |
| Rendimiento | Builds correctos; Vite advierte bundles de 654 kB (admin) y 1.20 MB (web) antes de gzip | Medir en staging con datos y red representativos; fijar presupuestos antes de optimizar |
| Monitoreo | No existe destino productivo configurado | Elegir servicio, política de datos y alertas; validar captura de error sin exponer PII o credenciales |
| Impresora/lector/gaveta | Pendiente | Conectar modelos reales y comprobar ticket, corte, escaneo, reconexión y fallback del navegador |
| Despliegue | No realizado | Proveer staging/producción y credenciales; aplicar SQL, Edge y frontend juntos y ejecutar smoke posterior |

### Ejercicio local de recuperación

El 2026-11-02 se generó un dump PostgreSQL custom privado fuera del repositorio. Se excluyeron el esquema y la extensión `vault`; el primer intento demostró que Vault bloquea la copia directa de `vault.secrets`, como corresponde. El segundo restore creó una base temporal, restauró el resto del clúster, comparó la firma `30 migraciones : 7 tiendas : 8 ventas : 113 variantes` con el origen y eliminó esa base temporal. El archivo local `/tmp/lumen-pos-baseline-20261102.dump` tiene permisos `600`; es evidencia desechable, no un sistema de backups de producción.
