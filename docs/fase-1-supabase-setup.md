# Fase 1 — Cómo aplicar el esquema en Supabase

Las migraciones viven en [`supabase/migrations/`](../supabase/migrations/) y ya están
**probadas**: se corrieron contra un Postgres 15 local (efímero, descartado después) simulando
`auth.users`/`auth.uid()`, incluyendo pruebas funcionales de RLS (un profesor no puede ver ni
insertar datos de un alumno ajeno) y del trigger que evita que `sets` y `rounds` se contradigan
en un bloque combinado. Ningún dato real fue tocado — todo corrió en una base descartable.

Faltan dos cosas que solo podés hacer vos (necesitan tu cuenta):

## 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo (o hacelo desde el
   Marketplace de Vercel si preferís que quede linkeado automáticamente al proyecto de Vercel).
2. Elegí una región cercana y guardá la contraseña de la base que te pida generar.
3. Copiá de **Project Settings → API**: `Project URL`, `anon public key`, y
   `service_role key` (esta última **nunca** va al cliente, solo a variables de entorno del
   servidor).

## 2. Aplicar las migraciones

**Opción A — SQL Editor (más simple, sin instalar nada):**
Entrá a **SQL Editor** en el dashboard de Supabase y corré, en orden, el contenido de cada
archivo de `supabase/migrations/` (del `01` al `06`).

**Opción B — Supabase CLI (recomendado si vas a seguir agregando migraciones):**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <tu-project-ref>
supabase db push
```

## 3. Variables de entorno

Agregar en Vercel (o en `.env.local` para desarrollo):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo en el servidor, nunca con prefijo NEXT_PUBLIC_
```

## 4. Generar los tipos de TypeScript

Una vez linkeado el proyecto:

```bash
supabase gen types typescript --linked > lib/supabase/database.types.ts
```

Volver a correr este comando cada vez que se agregue una migración — así el cliente de
Supabase queda tipado contra el esquema real, no a mano.

## Qué falta después de esto (no es parte de este documento)

- Instalar `@supabase/supabase-js` y `@supabase/ssr` en el proyecto Next.js.
- Cliente server/browser (`lib/supabase/server.ts`, `lib/supabase/client.ts`).
- Poblar las tablas de referencia (`sports`, `muscles`, `patterns`, `stimulus_types`) con los
  catálogos ya confirmados en `docs/auditoria-02-planificacion-y-biblioteca.md`.
- El script reproducible de importación de la biblioteca de ejercicios (sección F.2 de
  `docs/auditoria-03-arquitectura-objetivo.md`).

Esto es Fase 2 en adelante del roadmap — no se hace en este documento.
