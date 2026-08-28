# Auditoría 1 — Repositorio y Arquitectura Actual

> Resultado de la Fase 0 (CLAUDE.md §44) / AUDITORÍA 1.md. Solo análisis — no se modificó, instaló, ni commiteó nada.
> Fecha: 2026-08-28. Estado del repo auditado: `main` @ `5f7a271`, working tree limpio.

---

## PARTE 1 — ANÁLISIS

### 1. Stack

| Capa | Tecnología | Detalle |
|---|---|---|
| Framework | Next.js **16.3.0**, App Router | `next.config.mjs`: `typescript.ignoreBuildErrors: true`, `images.unoptimized: true` |
| Lenguaje | TypeScript **5.7.3**, `strict: true` | [tsconfig.json](../tsconfig.json) |
| UI | React **19** | — |
| Estilos | Tailwind CSS **v4.3.3** + shadcn/ui estilo `base-nova` | primitivas de **`@base-ui/react`** (no Radix); paleta zinc/slate + acento emerald en [app/globals.css](../app/globals.css) |
| Iconos | lucide-react | — |
| Utilidades UI | class-variance-authority, tailwind-merge, clsx | [lib/utils.ts](../lib/utils.ts) |
| Analytics | `@vercel/analytics` | activo solo en `NODE_ENV=production`, [app/layout.tsx](../app/layout.tsx) |
| Backend | **No existe** | sin `app/api/*`, sin server actions, sin servicios |
| Base de datos | **No existe** | sin ORM, sin Supabase, sin schema, sin migraciones |
| Auth | **No existe** | usuario "Victoria" hardcodeado en el header, sin sesión real |
| Testing | **No existe** | sin Jest/Vitest/Playwright en `package.json`, cero archivos `*.test.*` |
| Deployment | Implícito Vercel | `@vercel/analytics` + `generator: 'v0.app'` en metadata confirman que el proyecto se generó con **v0.app** (herramienta de Vercel); no hay `vercel.json` ni CI/CD (`.github/workflows` no existe) |
| Paquetes | pnpm (`pnpm-lock.yaml`, lockfile v9) | Node local: v22.13.0, pnpm local: 10.30.3 — no fijados en `engines` |

**Hallazgo:** `package.json` declara la dependencia `xlsx` (SheetJS) pero **no se usa en ningún `.ts`/`.tsx` del código** — es peso muerto. El `README.md` describe un script Python (openpyxl) para regenerar `lib/data/library.ts` desde el Excel, pero **ese script no existe en el repo** (no hay carpeta `scripts/`). Es decir: el pipeline Excel → biblioteca no es reproducible hoy, fue un proceso manual de una sola vez.

### 2. Estructura de carpetas

```
app/
  page.tsx                    → Dashboard del profesor ("/")
  constructor/page.tsx        → Plan Builder ("/constructor")
  biblioteca/page.tsx         → Biblioteca de ejercicios ("/biblioteca")
  alumno/page.tsx             → Ejecución de entrenamiento del alumno ("/alumno")
  layout.tsx, globals.css
components/
  professor/  (11 archivos)   → sidebar, header, dashboard, constructor, análisis de carga
  library/    (5 archivos)    → biblioteca: filtros, card, modal detalle, thumbnail
  student/    (2 archivos)    → selector RPE, pantalla de ejecución
  ui/         (11 archivos)   → primitivas shadcn/ui
lib/
  data/       (5 archivos .ts)→ TODOS los datos de la app: arrays TypeScript en memoria
  utils.ts
data/
  ejercicios_consolidado_TOTAL.xlsx          → fuente real de la biblioteca (1.375 filas orig.)
  PLAN-MUSCULOS-Y-PATRONES-...xlsx           → planilla de metodología del profesor (sin analizar aún)
previews/     (2 archivos .jsx) → prototipos standalone, históricos, no se usan en runtime
public/       → íconos e imágenes placeholder
```

No hay `app/api/`, no hay `hooks/` (pese a que `components.json` define el alias `hooks`), no hay `services/`, no hay `models/`/`schemas/`, no hay `docs/` (se crea recién con este archivo), no hay `middleware.ts`.

### 3. Base de datos

No existe ninguna. Toda la "persistencia" es estado de React en memoria (`useState`) inicializado desde arrays exportados en `lib/data/*.ts`:

- [lib/data/professor.ts](../lib/data/professor.ts) — alumnos, alertas, métricas, volumen semanal (dashboard)
- [lib/data/builder.ts](../lib/data/builder.ts) — bloques del Constructor (Series/Reps/Carga/Pausa) + una biblioteca de ejercicios *stub* de 14 ítems
- [lib/data/library.ts](../lib/data/library.ts) — biblioteca real: **1.372 ejercicios** (`grep -c` confirma el número exacto del README), generados desde el Excel
- [lib/data/load-analysis.ts](../lib/data/load-analysis.ts) — 4 semanas de ejemplo para el panel de análisis de carga
- [lib/data/student.ts](../lib/data/student.ts) — sesión de ejemplo del alumno con 4 ejercicios reales (videoId tomados de library.ts)

Recargar la página resetea cualquier cambio. No hay ningún ID persistente entre sesiones.

### 4. Usuarios, roles y permisos

No implementados. El header del profesor ([dashboard-header.tsx](../components/professor/dashboard-header.tsx)) muestra "Victoria Lastra / Profesora" hardcodeado. No hay concepto de sesión, de alumno autenticado, ni separación de datos entre profesores/alumnos — todo el mundo ve el mismo dataset estático.

### 5. Frontend

- Navegación: sidebar fija (`AppSidebar`) con `next/link`, 3 de 6 ítems apuntan a rutas reales (`/`, `/biblioteca`, `/constructor`); "Alumnos", "Analítica" y "Configuración" son `href="#"` (sin pantalla).
- Layout: desktop-first para Profesor (sidebar + main), mobile-first para Alumno (`/alumno`, marco de iPhone `max-w-md`).
- Sistema visual: consistente, tokens en `globals.css` (light/dark ya definidos), componentes shadcn reutilizados en todas las pantallas.
- Formularios: inputs numéricos controlados (`MetricField`, inputs de carga/reps en `/alumno`); sin validación de rangos ni mensajes de error.
- Modales/paneles: implementados a mano (no Dialog/Sheet de shadcn) — `ExerciseDetailDialog` y `LoadAnalysisPanel` son `<div role="dialog">` con overlay propio, sin focus trap ni cierre con Escape.
- Estado global: ninguno (no Context, no Zustand/Redux) — cada pantalla es dueña de su propio `useState`.

### 6. Backend

No existe. Cero API routes, cero validación server-side, cero lógica de negocio fuera de los componentes cliente (los cálculos de `LoadAnalysisPanel`, por ejemplo, corren client-side sobre datos hardcodeados, no sobre una función testeable como pide CLAUDE.md §25).

### 7. Testing

Cero. Sin framework instalado, sin un solo archivo de test, sin cobertura.

### 8. Deployment

Local: `pnpm install && pnpm dev` (documentado en README). No hay variables de entorno (`.gitignore` sólo excluye `.env*.local`, pero no existe ningún `.env.example`). No hay pipeline de build/deploy documentado ni configurado (sin `vercel.json`, sin GitHub Actions). El proyecto fue scaffoldeado con v0.app de Vercel (metadata `generator: 'v0.app'` en `app/layout.tsx`).

---

## PARTE 2 — RESULTADO

### A. Arquitectura actual

Es una **SPA de datos estáticos** sobre Next.js App Router: 4 rutas, cada una un árbol de componentes cliente que lee un array TypeScript hardcodeado y lo mantiene en `useState` local. No hay ninguna capa de red, servidor de aplicación, ni base de datos — es, en esencia, un prototipo interactivo de alta fidelidad (probablemente el resultado directo de sesiones en v0.app) que demuestra la experiencia visual del Profesor y, ahora, del Alumno, pero sin ningún dato real detrás salvo la biblioteca de 1.372 ejercicios.

### B. Diagrama conceptual

```
Browser
  │
  ▼
Next.js App Router (RSC shell + islas 'use client')
  │
  ├── "/"            Dashboard Profesor  ┐
  ├── "/constructor" Plan Builder (gym)  ├─ cada uno importa
  ├── "/biblioteca"  Biblioteca          │  su propio array desde
  └── "/alumno"      Ejecución Alumno    ┘  lib/data/*.ts
  │
  ▼
lib/data/*.ts  (arrays TS en memoria, sin fetch)
  │
  ▼
∅  ← no hay API, no hay ORM, no hay base de datos, no hay auth
```

Comparado con la cadena objetivo de CLAUDE.md (`PERSONA → DEPORTE → OBJETIVO → PLAN → FASE → SEMANA → SESIÓN → BLOQUE → TRAINING ITEM → PRESCRIPCIÓN → EJECUCIÓN → ANÁLISIS → IA`), hoy sólo existen versiones *ad-hoc* y desconectadas de `SESIÓN` (`workouts` del dashboard), `BLOQUE` (individual/superserie en el Constructor) y `EJECUCIÓN` (form de la vista Alumno) — sin `Plan`, `Fase`, `Semana`, `Deporte`, `Training Item` genérico, ni `Prescripción` como entidades reales.

### C. Componentes reutilizables para MOVA

- **Todo el sistema visual**: tokens de `globals.css` (light/dark, acento emerald), primitivas shadcn (`Button`, `Card`, `Badge`, `Table`, `Input`, `Progress`, etc.) — no depende de la falta de backend, se puede conservar tal cual.
- **La biblioteca de ejercicios real**: 1.372 registros con `videoId`, `category`, `muscle`, más el flag `approxMatch` — el activo de datos más valioso del repo. Ya sigue parcialmente el principio de CLAUDE.md §5 (marca lo dudoso en vez de inventar).
- **Patrones de UI de analítica**: `LoadAnalysisPanel` y `VolumePanel` ya visualizan volumen por patrón/músculo con semáforo por umbral — es el punto de partida correcto para la Fase 8 (Analytics), solo falta que los números vengan de datos reales en vez de `load-analysis.ts`.
- **La vista de ejecución del Alumno** (`/alumno`): el flujo serie → ejercicio → sesión completada, con video, carga/reps/RPE, ya resuelve la UX que pide CLAUDE.md §32/§51 — falta conectarlo a un plan real.
- **El patrón `canonical/display/original + approxMatch`** de la biblioteca es compatible con el esquema de normalización que pide CLAUDE.md §5, aunque hoy no persiste `aliases` como campo propio.

### D. Problemas técnicos / deuda

1. **Dos "bibliotecas de ejercicios" incompatibles y con el mismo nombre de tipo.** [lib/data/library.ts](../lib/data/library.ts) exporta `type LibraryExercise = { id, name, category, muscle, videoId, approxMatch }` (los 1.372 reales). [lib/data/builder.ts](../lib/data/builder.ts) exporta **otro** `type LibraryExercise = { id, name, muscles[] }` (14 ítems inventados de ejemplo). El panel "Biblioteca rápida" del Constructor ([exercise-library.tsx](../components/professor/exercise-library.tsx)) usa la segunda, no la real — hoy el Plan Builder **no busca en la biblioteca real de 1.372 ejercicios**.
2. **El modelo de bloques del Constructor es específico de gimnasio**, no genérico: `IndividualBlock`/`SupersetBlock` tienen `sets/reps/load/rest` fijos (ver `lib/data/builder.ts`), no el par genérico Training Item (Exercise|Activity) + Prescripción que pide CLAUDE.md §18-19. Migrar esto no es un parche, es un rediseño del estado del Constructor.
3. **Pipeline Excel → biblioteca no reproducible**: el script de regeneración que describe el README no está en el repo. Si el Excel fuente cambia, hoy no hay forma automatizada de regenerar `library.ts` — contradice el requisito explícito de CLAUDE.md §48 ("proceso reproducible de importación, no una carga manual única").
4. **`typescript.ignoreBuildErrors: true`** en `next.config.mjs` — los errores de tipo no bloquean el build, lo cual es común en proyectos scaffoldeados por v0 pero es riesgoso mantenerlo a medida que crece la base de código.
5. **Dependencia muerta**: `xlsx` en `package.json`, no importada en ningún archivo.
6. **Restos de branding "Nucleo"** (el nombre anterior del producto): título en el sidebar ([app-sidebar.tsx:34](../components/professor/app-sidebar.tsx)), el MIME type interno `application/x-nucleo-exercise` ([exercise-library.tsx:11](../components/professor/exercise-library.tsx)), el título del `README.md`, y `"name": "my-project"` en `package.json`. Ninguno rompe nada, pero conviene barrerlos antes de seguir construyendo bajo el nombre MOVA.
7. **Modales hechos a mano** (`role="dialog"` custom) en vez de los primitivos `Dialog`/`Sheet` de shadcn — funcionan, pero no tienen focus trap ni cierre con Escape.
8. **Datos de usuario hardcodeados** en varios lugares ("Victoria Lastra", "24 alumnos", contadores del sidebar) que no derivan de ningún dato real, ni siquiera del array `students` en algunos casos (el sidebar dice "24" fijo, no `students.length`).

### E. Riesgos

| Riesgo | Impacto | Por qué importa ahora |
|---|---|---|
| Confundir la biblioteca *stub* de `builder.ts` con la real al construir el Plan Builder de verdad | Alto | Si no se resuelve antes de la Fase 6, se puede terminar construyendo el picker de ejercicios sobre datos falsos otra vez |
| Migrar el modelo Series/Reps/Carga del Constructor al modelo genérico Training Item/Prescription | Alto, esfuerzo grande | Es el rediseño más costoso del roadmap; cuanto más se construya sobre el modelo actual, más caro será migrarlo |
| Falta total de backend/auth | Alto pero esperado | Es trabajo desde cero, no incremental — hay que decidir Supabase (como propone CLAUDE.md §37) antes de tocar Fase 1 |
| Pipeline de importación no reproducible | Medio | Si el Excel fuente se actualiza (más ejercicios, videos corregidos), hoy no hay forma de reflejarlo sin trabajo manual repetido |
| `ignoreBuildErrors: true` | Medio, crece con el tiempo | Cuanto más código se agregue con esta bandera activa, más errores de tipo silenciosos se acumulan |
| Dos commits ya en `main` (`Primer commit`, `adding nav`) | Bajo | Anteriores a la regla de CLAUDE.md §40 de nunca commitear directo a main — no repetir el patrón de acá en más |

### F. Recomendaciones

**Conservar:**
- El sistema de diseño completo (`globals.css`, componentes `ui/`, paleta y tipografía).
- El dataset de 1.372 ejercicios de `lib/data/library.ts` tal cual, como fuente para poblar la tabla `exercises` real.
- Los patrones de interacción ya resueltos: filtros de biblioteca, drag & drop al Constructor, flujo de ejecución del Alumno (serie → ejercicio → sesión), panel de análisis de carga con semáforo.

**Cambiar:**
- Unificar/eliminar la colisión de `LibraryExercise` entre `library.ts` y `builder.ts`: la "Biblioteca rápida" del Constructor debería consultar la biblioteca real, no el stub de 14 ítems.
- Reemplazar el modelo `IndividualBlock`/`SupersetBlock` (gym-específico) por el modelo genérico Training Item + Prescripción antes de construir el Plan Builder completo (Fase 6) — si no, el trabajo de esta fase habría que rehacerlo.
- Formalizar el pipeline de importación del Excel como script versionado (Python u otro), no un proceso manual perdido.
- Decidir y documentar el stack de backend (Supabase, como sugiere CLAUDE.md, u otra alternativa) antes de escribir el modelo de datos de la Fase 1.
- Barrer los restos de branding "Nucleo" cuando se toque cada archivo (no hace falta un commit dedicado solo para esto).

### G. Compatibilidad con MOVA

**Capa visual/UX: alta compatibilidad.** El sistema de diseño, los componentes shadcn y los patrones de interacción ya resueltos (biblioteca, ejecución del alumno, análisis de carga) son directamente aprovechables y no requieren rehacerse por el pivot a multi-deporte.

**Capa de dominio/datos: compatibilidad baja, prácticamente desde cero.** No existe ninguna de las entidades que pide CLAUDE.md (`sports`, `sport_profiles`, `training_capacities`, `plans`, `phases`, `weeks`, `training_items`, `prescriptions`, `workout_performance`, etc.). Lo que sí existe (bloques del Constructor) está modelado específicamente para gimnasio y tendrá que generalizarse, no solo extenderse.

**Backend/seguridad: 0%.** Sin base de datos, sin auth, sin RLS — es trabajo enteramente nuevo, no una migración.

**En síntesis:** este repo es un prototipo visual sólido de la experiencia Profesor/Alumno para *un* deporte (gimnasio/fuerza), construido antes de que existiera la definición de "motor genérico multi-deporte". Es un buen punto de partida para la interfaz, pero la Fase 1 (modelo de datos) hay que construirla sin poder apoyarse en nada de lo existente a nivel de esquema.

### H. Información faltante (antes de implementar Fase 1)

1. **Backend definitivo**: ¿confirmamos Supabase/Postgres tal como propone CLAUDE.md §37, o se evalúa otra opción? Esto condiciona todo lo que sigue.
2. Si es Supabase: crear el proyecto y decidir dónde van las env vars (no hay `.env.example` hoy).
3. Alcance real de autenticación para el primer corte: ¿multi-profesor desde el día uno, o transición con un profesor fijo mientras se construye el resto?
4. La **Auditoría 2** (análisis profundo de los dos Excel, especialmente `PLAN-MUSCULOS-Y-PATRONES-...xlsx`, que todavía no se analizó en detalle) — es un prerrequisito real para diseñar bien las tablas de músculos/patrones/volumen, y ya existe como documento preparado (`AUDITORÍA 2 — PLANIFICACIÓN REAL Y BIBLIOTECA DE EJERCICIOS.md`).
5. Qué hacer con el stub `exerciseLibrary` de `lib/data/builder.ts`: ¿se descarta directamente o hay algo en esos 14 ítems que se quiera conservar?
6. Si se fijan versiones de Node/pnpm en `engines`/CI (hoy corren local v22.13.0 / pnpm 10.30.3 sin pin).
7. Si se formaliza la carpeta `docs/` (recién creada con este archivo) como ubicación estándar para esta y las próximas auditorías, o se prefiere mantener el patrón actual de archivos sueltos en la raíz (`AUDITORÍA N — ....md`).

---

**Próximo paso sugerido:** Auditoría 2 (los dos Excel) ya está preparada como prompt en la raíz del repo — es el insumo que falta para diseñar el modelo de datos real de músculos/patrones/volumen antes de pasar a la Auditoría 3 (arquitectura objetivo).
