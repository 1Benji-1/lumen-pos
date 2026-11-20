# Lumen POS

SaaS multi-tenant de punto de venta, inventario y clientes para tiendas de cualquier rubro.

**Stack:** React + TypeScript + Tailwind (web/admin) · Flutter (mobile, pendiente) · Supabase (backend/DB, local para desarrollo)

---

## Requisitos previos

Antes de clonar el repo, instala esto en tu computadora (Linux/Ubuntu-based):

### 1. Node.js y pnpm

```bash
# Verifica si ya tienes Node instalado
node --version   # requiere v22.13 o superior

# Instalar pnpm si no lo tienes
npm install -g pnpm@12.4.1
```

### 2. Docker Engine

Necesario para correr Supabase de forma local.

```bash
# Quitar paquetes viejos en conflicto (si existen)
sudo apt remove -y docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc

sudo apt update
sudo apt install -y ca-certificates curl

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Permite usar docker sin sudo
sudo usermod -aG docker $USER
```

**Reinicia la sesión o la computadora** después del último comando para que el cambio de grupo tome efecto. Luego confirma:

```bash
docker run hello-world
```

---

## Clonar y configurar el proyecto

### 1. Clona el repositorio

```bash
git clone https://github.com/TU-USUARIO/lumen-pos.git
cd lumen-pos
```

### 2. Instala las dependencias del monorepo

```bash
pnpm install --frozen-lockfile
```

### 3. Levanta Supabase local

```bash
pnpm exec supabase start --workdir packages
```

La primera vez descarga varias imágenes de Docker, puede tardar unos minutos.

Al terminar, te mostrará URLs y claves (Publishable Key, etc.) — las vas a necesitar en el siguiente paso.

### 4. Aplica todas las migraciones

Aplica las pendientes conservando los datos existentes:

```bash
pnpm exec supabase migration up --local --workdir packages
```

### 5. Regenera los tipos de TypeScript

```bash
pnpm exec supabase gen types typescript --local --workdir packages > /tmp/lumen-database.types.ts && cp /tmp/lumen-database.types.ts packages/types/src/database.types.ts
```

### 6. Configura las variables de entorno

Estos archivos **no se suben a GitHub** (están en `.gitignore` por seguridad), así que hay que recrearlos en cada máquina nueva.

Crea `apps/web/.env.local`:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<tu Publishable Key del paso 3>
```

Crea `apps/admin/.env.local` (mismo contenido):
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<tu Publishable Key del paso 3>
```

Si en algún momento pierdes esas claves, recupéralas con:
```bash
pnpm exec supabase status --workdir packages
```

### 7. Crea tu usuario de super admin

1. Abre Supabase Studio: `http://127.0.0.1:54323`
2. Ve a **Authentication → Users → Add user**, crea tu cuenta con correo y contraseña.
3. Ve a **SQL Editor** y corre (reemplaza el correo):

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"is_super_admin": true}'::jsonb
where email = 'tu-correo@ejemplo.com';
```

---

## Correr el proyecto en desarrollo

Necesitas 2-3 terminales abiertas al mismo tiempo:

**Terminal 1 — app de tienda (web):**
```bash
pnpm --filter web dev
```
→ `http://localhost:5173`

**Terminal 2 — panel admin:**
```bash
pnpm --filter admin dev
```
→ `http://localhost:5174` (o el puerto que asigne Vite)

**Terminal 3 — para crear tiendas y gestionar colaboradores:**
```bash
pnpm exec supabase functions serve --workdir packages --no-verify-jwt
```
Las funciones verifican la identidad y los permisos internamente. No pongas claves de servicio en variables `VITE_*`.

---

## Comandos útiles del día a día

| Acción | Comando |
|---|---|
| Crear una migración nueva | `pnpm exec supabase migration new nombre_de_la_migracion --workdir packages` |
| Aplicar migraciones nuevas SIN perder datos | `pnpm exec supabase migration up --local --workdir packages` |
| Reiniciar la base desde cero (borra todo) | `pnpm exec supabase db reset --workdir packages` |
| Ver estado/claves de Supabase local | `pnpm exec supabase status --workdir packages` |
| Regenerar tipos de TypeScript | Usar el archivo temporal del paso 5; sustituir el origen solo si el comando termina correctamente |
| Verificar TypeScript de ambas aplicaciones | `pnpm typecheck` |
| Comprobar la base de desarrollo | `pnpm check` y `pnpm test:db`; ver [alcance y límites](docs/STABILIZATION.md) |
| Ver correos de prueba (invitaciones, reset de clave) | Abrir `http://127.0.0.1:54324` (Mailpit) |
| Apagar Supabase local | `pnpm exec supabase stop --workdir packages` |

---

## Estructura del proyecto

```
lumen-pos/
├── apps/
│   ├── web/       # App de la tienda: POS, inventario, clientes (React + Vite)
│   ├── admin/     # Panel de super admin: crear/gestionar tiendas (React + Vite)
│   └── mobile/    # App Flutter (pendiente de construir)
├── packages/
│   ├── supabase/  # Migraciones SQL, RLS, Edge Functions
│   ├── types/     # Tipos TypeScript compartidos, generados desde la base
│   └── ui-config/ # Configuración compartida de Tailwind (pendiente de completar)
```

## Estado del proyecto (fases completadas)

- ✅ Fase 0 — Monorepo y Supabase
- ✅ Fase 1 — Autenticación y multi-tenancy
- ✅ Fase 2 — Inventario
- ✅ Fase 3 — POS (caja, carrito, escáner, ticket)
- ✅ Fase 4 — Clientes (sin sistema de crédito/fiado)
- ✅ Fase 5 — Planes, control de acceso y bloqueo por trial vencido
- ⏳ Fase 6 en adelante — pendientes

**Notas importantes de diseño:**
- El alta de tiendas es 100% manual desde el panel admin (no hay registro público de autoservicio).
- No existe sistema de crédito/fiado.
- Los cobros de planes son manuales (fuera del sistema); no hay integración con Stripe.
- El control de acceso por plan usa `plans.features` (jsonb) + `stores.feature_overrides` (excepciones por tienda) — agregar una función nueva a un plan no requiere tocar código, solo actualizar esos campos en la base.
