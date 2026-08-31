# Auditoría 3 — Arquitectura Objetivo de MOVA

> Diseño y planificación únicamente. **No se implementó nada, no se instaló nada, no se creó
> ninguna migración, no hay commits.** Construido sobre CLAUDE.md + Auditoría 1 (estado real del
> repo, `docs/auditoria-01-repositorio-y-arquitectura.md`) + Auditoría 2 (datos reales de los dos
> Excel, `docs/auditoria-02-planificacion-y-biblioteca.md`) + la referencia de Focus Entrena
> (`docs/referencia-focus-entrena-actual.md`), el sistema real ya en producción.
> Fecha: 2026-08-28.
>
> **Actualizado tras Auditoría 4** (`docs/auditoria-04-revision-critica.md`): esta es ya la
> versión corregida — 9 ajustes aplicados directamente acá, marcados como
> **[Auditoría 4 — Problema N]** en el lugar donde se corrigieron.

---

## A. Arquitectura objetivo — resumen

MOVA pasa de ser un prototipo visual sin datos (Auditoría 1) a una aplicación con:

- **Frontend**: Next.js App Router (se conserva — Auditoría 1 lo calificó de alta
  compatibilidad), ahora leyendo/escribiendo contra una base real en vez de `lib/data/*.ts`.
- **Backend**: Server Actions / Route Handlers de Next.js sobre el cliente de Supabase (sin
  Express/NestJS separado — no hace falta otra capa de servidor).
- **Base de datos**: Postgres vía Supabase, con Row Level Security (RLS) como mecanismo
  principal de aislamiento profesor/alumno (CLAUDE.md §39).
- **Auth**: Supabase Auth (email/password para MVP; el modelo de roles vive en `profiles`, no en
  Auth directamente).
- **Storage**: no se suben videos — se conservan como links de YouTube en `exercise_media`, tal
  como ya están en la biblioteca real (Auditoría 2, sección G: 100% YouTube).
- **Motor de cálculo**: funciones puras en `lib/analytics/*.ts`, testeadas, que implementan
  **exactamente** las fórmulas ya confirmadas en Auditoría 2 (SUMIF/AVERAGEIF por bloque de
  día) — no una reinterpretación.

Principio rector (ya en CLAUDE.md §57, confirmado por los datos reales de Auditoría 2): el
núcleo es un modelo **genérico** de Training Item (Exercise | Activity) + Prescripción — no
"Series/Reps/Carga" de gimnasio como hoy tiene `lib/data/builder.ts`. La necesidad de esa
genericidad no es teórica: la sección I de Auditoría 2 encontró actividades reales (carrera,
trineo, esquí) en las rutinas de la usuaria que **no** son ejercicios de biblioteca.

## B. Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App Router (Vercel)                                    │
│                                                                   │
│  /             Dashboard Profesor        ┐                      │
│  /alumnos      CRUD alumnos               │                      │
│  /biblioteca   Biblioteca de ejercicios   │  Server Components   │
│  /constructor  Plan Builder               │  + Server Actions    │
│  /calendario   Calendario deportivo       │                      │
│  /analitica    Dashboards de volumen      │                      │
│  /alumno/*     App del alumno (mobile)    ┘                      │
│         │                                                         │
│         ▼                                                         │
│  lib/analytics/*.ts  (funciones puras, testeadas)                │
│  lib/supabase/*.ts   (cliente server + browser, tipado desde DB) │
└───────────────────────┬───────────────────────────────────────────┘
                         │  (service role solo en server actions;
                         │   anon key + RLS en cliente)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase                                                        │
│  ├─ Auth            → profiles (role: professor|student|individual|admin) │
│  ├─ Postgres + RLS  → sports, exercises, plans, workouts, …     │
│  └─ (sin Storage propio: los videos siguen siendo links YouTube)│
└─────────────────────────────────────────────────────────────────┘
                         ▲
                         │  script de importación reproducible (Fase 2)
                         │
        data/ejercicios_consolidado_TOTAL.xlsx  (fuente real, 1.372 ejercicios)
        data/PLAN-MUSCULOS-Y-PATRONES-...xlsx    (fuente real, metodología + histórico)
```

## C. Modelo de dominio

Cadena conceptual (CLAUDE.md §6, sin cambios):

```
PERSONA (profile) → PERFIL (professor|student) → DEPORTE/ACTIVIDAD (sport, sport_profile)
  → OBJETIVO → PLAN → FASE → SEMANA → SESIÓN (workout) → BLOQUE (workout_block)
  → TRAINING ITEM (exercise|activity) → PRESCRIPCIÓN → EJECUCIÓN (performance)
  → ANÁLISIS → IA
```

**Una desviación deliberada respecto al listado literal de CLAUDE.md §10**, justificada por
Auditoría 2 sección J.5: la columna "Categoría" de la biblioteca real mezcla dos dimensiones
distintas (patrón de movimiento vs. tipo de estímulo). Se separan en dos tablas —
`patterns` y `stimulus_types` — en vez de una tabla `exercise_categories` genérica. Esto es
más fiel a cómo el profesor ya piensa (confirmado con los 8 patrones + 5 tipos de estímulo
reales de Auditoría 2 secciones C y E) y evita que "Fuerza" y "Empuje" convivan como si fueran
el mismo tipo de etiqueta.

## D. Modelo de base de datos

### D.1 Identidad y personas

| Tabla | Propósito | Campos principales | Relaciones |
|---|---|---|---|
| `profiles` | 1 fila por usuario de Supabase Auth | `id` (=`auth.users.id`), `role` (`professor`\|`student`\|`individual`\|`admin` — **`individual` agregado en la sección M**), `full_name`, `avatar_url`, `created_at` | — |
| `professors` | Datos propios del rol profesor | `id` (FK `profiles.id`), `bio`, `created_at` | 1:1 con `profiles` |
| `students` | Datos propios del rol alumno | `id` (FK `profiles.id`), `level`, `primary_sport_id` (FK `sports`, nullable), `availability`, `equipment_access`, `notes`, `status` | 1:1 con `profiles` |
| `student_professors` | Relación alumno↔profesor, **many-to-many desde el día 1** aunque el MVP solo use un profesor activo por alumno | `student_id`, `professor_id`, `is_primary` (bool), `status` (`active`\|`invited`\|`ended`), `permission_level` (`full`\|`view_only`, default `full` — **[Auditoría 4 — Problema 7]** reservado desde ahora para cuando exista un co-profesor con acceso más limitado, sin UI en el MVP), `created_at` | PK compuesta `(student_id, professor_id)` |

*Por qué `student_professors` como join desde ya y no `professor_id` directo en `students`*:
CLAUDE.md §21 deja explícitamente abierta la posibilidad de múltiples profesores por alumno —
diseñar el join ahora evita una migración de esquema dolorosa después; el MVP simplemente
restringe en la capa de aplicación a 1 `is_primary=true` activo por alumno.

### D.2 Deportes y capacidades

| Tabla | Propósito | Campos principales |
|---|---|---|
| `sports` | Catálogo de deportes | `id`, `name`, `slug`, `description`, `icon`, `status` |
| `sport_profiles` | Variante de un deporte por objetivo (ej. "Fútbol — Rendimiento") | `id`, `sport_id` (FK), `name`, `description` |
| `training_capacities` | Capacidades físicas (fuerza, potencia, velocidad, resistencia aeróbica…) | `id`, `name`, `slug`, `description` |
| `sport_profile_capacities` | Demandas de cada perfil deportivo | `sport_profile_id`, `capacity_id`, `importance` (1-5, opcional) |

### D.3 Biblioteca de ejercicios (núcleo — validado contra datos reales)

| Tabla | Propósito | Campos principales |
|---|---|---|
| `muscles` | 18 músculos reales (Auditoría 2 sección D) | `id`, `canonical_name`, `display_name`, `sort_order` |
| `patterns` | 8 patrones reales (Auditoría 2 sección C) | `id`, `canonical_name`, `display_name`, `sort_order` |
| `stimulus_types` | Fuerza / Movilidad / Pliometría / Cardio / Activación-\* (Auditoría 2 sección E) | `id`, `canonical_name`, `display_name` |
| `equipment` | Equipamiento | `id`, `name` |
| `exercises` | Ejercicio único, reutilizable (CLAUDE.md §3.2) | `id`, `canonical_name`, `display_name`, `original_name`, `description`, `instructions` (nullable — Auditoría 1 confirmó que hoy no existe, no inventar), `common_errors` (nullable, ídem), `difficulty` (nullable), `muscle_id` (FK `muscles`, **nullable, columna directa**), `pattern_id` (FK `patterns`, **nullable, columna directa**), `source` (`base_original`\|`nuevo_profe`, de Auditoría 2 sección F), `match_status` (nullable, refleja "Estado de Coincidencia" original), `status` (`active`\|`pending_review`\|`archived`) |
| `exercise_aliases` | Nombres alternativos vistos en la fuente — **nunca se pierde el original** (CLAUDE.md §5) | `id`, `exercise_id`, `alias`, `note` |
| `exercise_stimulus_types` | join, 0..n (sí genuinamente multivaluado) | `exercise_id`, `stimulus_type_id` |
| `exercise_capacities` | join, 0..n (sí genuinamente multivaluado) | `exercise_id`, `capacity_id` |
| `exercise_sports` | join, 0..n (sí genuinamente multivaluado) | `exercise_id`, `sport_id` |
| `exercise_equipment` | join, 0..n (sí genuinamente multivaluado) | `exercise_id`, `equipment_id` |
| `exercise_media` | 0..n videos por ejercicio — Auditoría 2 sección G confirmó hasta 5 reales; también sirve a `activities` (ver abajo) vía `owner_type`/`owner_id` | `id`, `owner_type` (`exercise`\|`activity`), `owner_id`, `type` (`video`\|`image`\|`thumbnail`\|`instruction`), `url`, `source` (`youtube`), `title`, `is_primary`, `sort_order`, `status` |
| `activities` | **[Auditoría 4 — Problema 1]** Catálogo liviano y opcional para actividades deportivas recurrentes (ej. "Juego reducido 4v4", "Rodaje 5 km") — mismo rol que `exercises` pero sin taxonomía de músculo/patrón | `id`, `canonical_name`, `display_name`, `sport_id` (FK nullable), `description` |

**`muscle_id`/`pattern_id` como columnas directas, no tablas de join** —
**[Auditoría 4 — Problema 4]**: la versión anterior de este documento modelaba
`exercise_muscles`/`exercise_patterns` como N:N siguiendo el listado literal de CLAUDE.md §10.
Auditoría 2 (secciones A y K) confirmó con 1.375 filas de biblioteca y 1.728 filas de rutinas
reales que **nunca** se vio un ejercicio con más de un músculo o un patrón a la vez — siempre
0 o 1. Modelarlo como join N:N es sobre-normalización sin beneficio real hoy, y es cara de
revertir una vez cargados datos de producción. Si en el futuro aparece un caso real
multivaluado, se agrega la tabla de join en ese momento (cambio aditivo, no destructivo).

**Índices importantes**: `exercises(canonical_name)` (búsqueda), `exercises(status)`,
`exercises(muscle_id)`, `exercises(pattern_id)`, `exercise_media(owner_type, owner_id,
is_primary)`, `exercise_aliases(alias)` (para matchear texto libre de rutinas reales contra la
biblioteca, tal como se hizo manualmente en Auditoría 2-I).

### D.4 Planificación

| Tabla | Propósito | Campos principales |
|---|---|---|
| `plans` | CLAUDE.md §13 | `id`, `name`, `student_id`, `professor_id` (**nullable desde la sección M** — NULL = plan autocoacheado), `sport_id`, `sport_profile_id` (nullable), `objective`, `level`, `plan_type` (`MUSCLE`\|`PATTERN`\|`MIXED`\|`SPORT_SPECIFIC`\|`CUSTOM`), `start_date`, `end_date`, `frequency_per_week`, `status` (`draft`\|`active`\|`completed`\|`archived`) |
| `plan_phases` | CLAUDE.md §14, opcional | `id`, `plan_id`, `name`, `kind`, `start_date`, `end_date`, `order` |
| `plan_weeks` | CLAUDE.md §15 | `id`, `plan_id`, `phase_id` (nullable), `number`, `name`, `start_date`, `end_date`, `objective`, `notes` |
| `workouts` | Sesión (CLAUDE.md §16) | `id`, `week_id`, `student_id` (**[Auditoría 4 — Problema 5]** denormalizado desde `plans.student_id`, ver nota abajo), `sport_id` (FK nullable, **[Auditoría 4 — Problema 3]** hereda el de `plans` si no se especifica — permite planes multideporte a nivel de sesión), `competition_id` (FK nullable a `competitions`, **[Auditoría 4 — Problema 2]** — ver nota abajo), `name`, `date`, `estimated_duration_min`, `type`, `objective`, `order`, `status` (`scheduled`\|`completed`\|`skipped`) |
| `workout_blocks` | CLAUDE.md §17 | `id`, `workout_id`, `kind` (`INDIVIDUAL`\|`COMBINADO`\|`CIRCUITO`\|`CALENTAMIENTO`\|`ACTIVACION`\|`MOVILIDAD`\|`RECUPERACION`\|`TECNICA`\|`TACTICA`), `rounds` (nullable), `rest_between_rounds_sec` (nullable), `order` |
| `training_items` | CLAUDE.md §18, la pieza más importante del modelo genérico | `id`, `block_id`, `kind` (`EXERCISE`\|`ACTIVITY`), `exercise_id` (FK nullable, **requerido si kind=EXERCISE**), `activity_id` (FK nullable a `activities`, **[Auditoría 4 — Problema 1]** opcional incluso si kind=ACTIVITY), `activity_name` (text nullable, **requerido si kind=ACTIVITY y no hay `activity_id`** — ej. "5 km", "Juego reducido 4v4", validado con casos reales de Auditoría 2-I), `label` (A1/A2… para combinado/circuito), `order` |

**`workouts.competition_id`** — **[Auditoría 4 — Problema 2]**: la versión anterior tenía
`workouts` y `competitions` sin relación, con riesgo real de duplicar un mismo evento (un
partido cargado como sesión de la semana Y por separado en el calendario). Ahora `competitions`
es siempre la fuente de verdad del evento; si el profesor quiere que cuente como sesión del
plan, el `workout` correspondiente referencia esa competencia en vez de duplicar sus datos.

**`workouts.student_id` denormalizado** — **[Auditoría 4 — Problema 5]**: además del camino
completo `workout → week → plan → student`, se guarda `student_id` directo en `workouts` (y en
`workout_performance`, ver D.5) para que las políticas RLS y las queries de alto tráfico (Plan
Builder, "hoy" del alumno) no tengan que atravesar 6 niveles de join en cada fila. Es
redundancia de escritura deliberada a cambio de lecturas simples.

**Decisión de la usuaria (corrige la versión anterior de este documento): el agrupador de
series combinadas en MOVA NO es un color.** El color de celda es la convención de la planilla
de Excel/Sheets — "una idea", no el estándar a copiar. En MOVA el agrupador es **estructural**:
un `workout_block` con `kind='COMBINADO'` (o `'CIRCUITO'`) *es* el grupo — todos los
`training_items` con ese `block_id` pertenecen al mismo bloque combinado, ordenados y
etiquetados por `label` (A1/A2…). No hace falta ningún campo de color en el esquema. Esto
además es coherente con lo que ya construyó el Constructor actual del repo (Auditoría 1):
`addSupersetBlock()` ya arma el grupo explícitamente vía la estructura de datos
(`SupersetBlock.exercises[]`), nunca por color — el diseño anterior de este documento se
apartaba innecesariamente de eso. El color solo va a existir como una señal de *lectura* en el
script de migración desde Focus Entrena (sección F), para reconstruir qué filas de la planilla
real formaban un bloque — nunca se persiste en el esquema de MOVA.
| `workout_prescriptions` | CLAUDE.md §19 | `id`, `training_item_id`, `sets` (numeric, nullable — Auditoría 2 confirmó decimales tipo `4.0`), `reps` (**text**, nullable — Auditoría 2 confirmó esquemas como `"8-6-4-4"`, no es un entero), `load_kg` (numeric, nullable), `load_percent` (numeric, nullable), `intensity_rpe` (numeric, nullable), `rest_label` (**text**, nullable — Auditoría 2 confirmó `"3min"`/`"2 min"` como texto, no segundos puros; se puede derivar un `rest_sec` calculado aparte si hace falta para analytics), `time_sec` (nullable), `distance_m` (nullable), `pace` (text, nullable), `tempo` (text, nullable), `notes` (text), `order` |

*Por qué `reps` y `rest` son texto y no numéricos estrictos*: no es una concesión de diseño
débil, es **fidelidad a los datos reales** — Auditoría 2 encontró literalmente `"8.6.4.4"` en
una celda de Repeticiones real. Forzar un entero ahí perdería información el primer día de uso.

**`sets` debe ser `NULL` cuando el bloque ya tiene `rounds`** — **[Auditoría 4 — Problema 9]**:
en un bloque `COMBINADO`/`CIRCUITO`, la cantidad de veces que se repite el bloque es
`workout_blocks.rounds`. Si además cada `training_item` adentro tuviera su propio `sets`,
podrían contradecirse (ej. `rounds=3` pero un item con `sets=4`) — el mismo tipo de
inconsistencia silenciosa que ya rompía los `SUMIF` en la planilla real (Auditoría 2-C). Regla:
cuando `block.kind` es `COMBINADO` o `CIRCUITO`, la cantidad se lee **solo** de `block.rounds`
y `prescription.sets` de sus items debe quedar `NULL`.

### D.5 Ejecución y seguimiento

| Tabla | Propósito | Campos principales |
|---|---|---|
| `workout_performance` | CLAUDE.md §22 — lo que el alumno realmente hizo | `id`, `training_item_id`, `student_id` (**[Auditoría 4 — Problema 5]** denormalizado, mismo motivo que en `workouts`), `set_number`, `actual_load_kg` (nullable), `actual_reps` (text, nullable), `actual_duration_sec` (nullable), `actual_distance_m` (nullable), `actual_pace` (text, nullable), `rpe` (nullable), `completed_at`, `comments` (text) |
| `competitions` | CLAUDE.md §27 | `id`, `student_id` (nullable si es de plan/equipo), `plan_id` (nullable), `sport_id`, `date`, `time`, `type` (`partido`\|`carrera`\|`torneo`\|`campeonato`\|`competencia`\|`test`\|`evento`), `importance`, `location`, `notes` |
| `calendar_entries` | Vista/tabla auxiliar que unifica `workouts` + `competitions` + descansos para el calendario (CLAUDE.md §27) | puede implementarse como **vista SQL**, no tabla nueva, para no duplicar datos |

### D.6 Borradores pendientes de aprobación (IA + importación — Fase 10 e importadores de la sección F)

**[Auditoría 4 — Problema 6]**: la versión anterior tenía `ai_drafts` (solo IA) y describía el
borrador de importación de Excel/Focus Entrena (sección F) como "el mismo mecanismo" — pero con
campos que no le correspondían (`prompt` no tiene sentido para un parsing determinístico). Se
generaliza a una sola tabla con el origen como dato:

| Tabla | Propósito |
|---|---|
| `plan_drafts` | Borradores pendientes de aprobación, de cualquier origen: `id`, `student_id`, `payload` (jsonb, el plan propuesto completo), `source` (`ai`\|`import_excel`\|`import_focus_entrena`), `prompt` (nullable, **solo si `source='ai'`**), `model` (nullable, ídem), `status` (`pending`\|`approved`\|`rejected`), `reviewed_by`, `reviewed_at` — **nunca escribe directo en `plans`**; el profesor aprueba y ahí recién se materializa como plan real (CLAUDE.md §33.4/§34, y por extensión al resto de la sección F de este documento) |

## E. Relaciones (resumen de cardinalidad)

```
profiles 1—1 professors | 1—1 students
students N—N professors  (vía student_professors)
sports 1—N sport_profiles 1—N sport_profile_capacities N—1 training_capacities
exercises N—1 muscles, patterns (columnas directas nullable) · N—N stimulus_types, capacities, sports, equipment
exercises 1—N exercise_media (vía owner_type/owner_id), exercise_aliases
activities N—1 sports (nullable) · 1—N exercise_media (vía owner_type/owner_id)
plans 1—N plan_phases 1—N plan_weeks 1—N workouts 1—N workout_blocks 1—N training_items 1—1 workout_prescriptions
training_items 1—N workout_performance (una fila por serie realizada)
training_items N—1 exercises (solo si kind=EXERCISE)
```

**Restricciones a nivel de base**: `CHECK` en `training_items` (si `kind='EXERCISE'` entonces
`exercise_id IS NOT NULL AND activity_name IS NULL`, y viceversa); `CHECK` en `student_professors`
para que como máximo un `is_primary=true` esté `status='active'` por alumno (vía índice único
parcial); `FOREIGN KEY ... ON DELETE RESTRICT` en `exercises` referenciado desde
`training_items` (nunca borrar un ejercicio usado en un plan real, solo `archived`).

## F. Estrategia de migración

**Regla rectora de toda esta sección: nada se migra automáticamente sin aprobación humana
explícita — es la misma regla que CLAUDE.md exige para la IA (§34), aplicada también a la
migración de datos.**

1. **Semillas de referencia** (Fase 1): `sports`, `training_capacities`, `muscles`, `patterns`,
   `stimulus_types` se cargan a mano desde los catálogos ya confirmados en Auditoría 2
   (secciones C, D, E) — son ~50 filas totales, no ameritan un script.
2. **Importación de la biblioteca de ejercicios** (Fase 2) — **reproducible**, corrigiendo el
   hallazgo de Auditoría 1 (el pipeline actual no lo es: no existe el script que el README
   describe):
   - Script versionado (Python, `openpyxl`/`pandas`) que lee `ejercicios_consolidado_TOTAL.xlsx`
     directamente, no el `library.ts` ya generado.
   - Aplica las reglas ya decididas y no destructivas de Auditoría 2-J: excluye las 2 filas
     "Otros / No es ejercicio", fusiona el 1 duplicado exacto y los 11 pares de variantes de
     mayúsculas/espacio (guardando ambas grafías en `exercise_aliases`).
   - Vuelca a `exercises` (con `muscle_id`/`pattern_id` directos, usando la unificación patrón
     vs. categoría de D.3) + `exercise_media`.
   - Genera un **reporte de importación** (cantidad de ejercicios, músculos, patrones, videos,
     duplicados fusionados, filas excluidas) — el mismo formato que ya pide CLAUDE.md §48.
   - Re-ejecutable: si el Excel fuente cambia, se vuelve a correr y hace *upsert* por
     `canonical_name` normalizado, no un `INSERT` ciego.
3. **NO se migra automáticamente** el archivo de planificación (`PLAN-MUSCULOS-Y-PATRONES-...xlsx`)
   a `plans`/`workouts` reales. Motivos concretos de Auditoría 2-L: hay múltiples versiones por
   alumno sin fecha explícita (`ROCIO R` … `(5)`), el archivo local está desactualizado respecto
   al Sheet en vivo, y los ~108 nombres "genuinamente ausentes" (Auditoría 2-I) necesitan
   decidirse uno por uno entre "es una Activity nueva" / "es ruido de notas". En su lugar: una
   herramienta de importación asistida que arma un **borrador** de plan por alumno en
   `plan_drafts` (`source='import_excel'`, sección D.6) para que el profesor lo revise y
   apruebe antes de que exista como plan real. **[Auditoría 4 — Problema 8]**: con 43 hojas
   reales (Auditoría 2-B), pedir que se revisen una por una a mano no es practicable — el
   importador propone automáticamente cuál hoja es la "vigente" por alumno (heurística: sufijo
   de versión más alto, o fecha de última edición) y el profesor solo **confirma o corrige** esa
   elección; la revisión humana en detalle se concentra en los casos realmente ambiguos (los
   ~108 nombres "genuinamente ausentes" de Auditoría 2-I), no en las 43 hojas completas.
4. **Decisión de la usuaria: Focus Entrena se deja de usar en cuanto MOVA esté lista** — no
   convive indefinidamente. Lo único que hace falta es **un script de migración** que mueva los
   datos reales una vez, no una sincronización continua entre los dos sistemas. Ese script:
   - Lee la fuente real en producción — el Google Sheet en vivo, vía la misma API que ya expone
     `apps-script/Code.gs` (`GET {WEB_APP_URL}?id=<slug>`) o directamente con la API de Google
     Sheets — **no** el Excel local desactualizado de Auditoría 2-L.
   - Recorre las pestañas de alumno (o llama `doGet` por cada `id` del índice), reconstruye
     cada rutina real: día → bloque → training item → prescripción.
   - Usa el color de fondo de la celda (el mismo mecanismo que ya lee `Code.gs`) **solo como
     señal de parsing** para decidir qué filas van en el mismo `workout_block` — el resultado
     que escribe en MOVA es estructural (sección D.4), sin guardar el color en ningún lado.
   - Igual que la biblioteca (punto 2): genera un borrador por alumno en `plan_drafts`
     (`source='import_focus_entrena'`) para revisión antes de confirmarlo como plan real, no
     escribe directo — son datos de alumnos reales, con el mismo cuidado que el resto de esta
     sección.
   - Corre **una vez** (o unas pocas veces durante el desarrollo de MOVA, no en producción
     continua) — el objetivo es el corte definitivo, no una integración permanente.

## G. Estrategia de testing

Directo de CLAUDE.md §42, con las fórmulas ya documentadas en Auditoría 2-K como caso de
verdad para los tests (no hay que inventarlas, hay que replicarlas):

- `calculatePatternVolume(patternId, dayExercises)` → replica `SUMIF` exacto de Auditoría 2-A.
- `calculateAverageIntensity(patternId, dayExercises)` → replica `AVERAGEIF` **simple, no
  ponderado** — un test explícito debe verificar que NO pondera por series, justamente porque
  es tentador "mejorarlo" sin darse cuenta de que cambia el resultado que el profesor espera.
- `calculateWeeklyLoad(patternId, weekWorkouts)` → suma de los días, igual que `SUM(N7,N12,…)`.
- `compareWeeks(weekA, weekB)` → nueva, no existía en la planilla como tal (la planilla no
  compara semanas automáticamente); documentar que es una función *nueva* de MOVA, no una
  réplica.
- Relaciones ejercicio-patrón / ejercicio-músculo: constraints + queries.
- Creación de planes / bloques combinados / duplicar semana-sesión-bloque-ejercicio (CLAUDE.md
  §50).
- **RLS/permisos**: profesor A no puede leer alumnos de profesor B; alumno no puede leer otro
  alumno; casos borde de `student_professors` (alumno con profesor `status='ended'` no debe
  seguir viendo datos nuevos, pero sí su propio historial — a confirmar, ver sección L).
- Registro de ejecución (`workout_performance`): no permite crear una fila para un
  `training_item` que no pertenece al alumno autenticado.

## H. Estrategia de seguridad

- **RLS en cada tabla**, sin excepción — CLAUDE.md §39 lo exige explícitamente y Auditoría 1
  confirmó que hoy es 0%.
- Patrón de política: `professors` solo ven filas de `students` donde existe un
  `student_professors` con `status='active'`; `students` solo ven sus propias filas
  (`auth.uid() = students.id`) y las de sus `plans`/`workouts` asociados vía join.
- **Diferencia deliberada respecto a Focus Entrena**: Focus Entrena confía en "el link es
  secreto" (sin login) porque es un solo profesor con alumnos de confianza — ese supuesto
  explícitamente **no aplica** a MOVA multi-profesor (Auditoría 2 referencia a Focus Entrena, y
  CLAUDE.md §39 lo prohíbe). MOVA requiere sesión autenticada real desde la Fase 5.
- `service_role` key de Supabase **solo** en Server Actions / Route Handlers, nunca en el
  bundle de cliente — el cliente usa `anon` key + RLS.
- Validación de inputs con un schema (ej. `zod`) en cada Server Action antes de tocar la DB —
  hoy (Auditoría 1) no hay ninguna validación server-side porque no hay server.
- Ningún secreto en el repo — hoy no hay ninguno porque no hay backend; al agregar Supabase, las
  keys van a variables de entorno de Vercel, nunca a `.env` commiteado (ya cubierto por
  `.gitignore` actual).

## I. Estrategia de IA (estructura, no implementación — Fase 10)

Las 4 funciones de CLAUDE.md §33, ubicadas así:

1. **Buscar**: función server-side que traduce lenguaje natural a filtros sobre `exercises` +
   sus joins (patrón, músculo, capacidad, deporte) — nunca genera resultados fuera de la tabla.
2. **Recomendar**: mismo principio — selecciona de `exercises` existentes según capacidad/deporte
   pedido, nunca inventa uno nuevo (CLAUDE.md §34).
3. **Analizar**: consume las mismas funciones de `lib/analytics/*.ts` de la sección G — la IA no
   tiene su propia lógica de cálculo paralela, usa la ya testeada.
4. **Generar borradores**: escribe a `plan_drafts` con `source='ai'` (sección D.6), nunca
   directo a `plans`. El profesor aprueba → recién ahí se copian los datos a las tablas reales,
   con `reviewed_by`/`reviewed_at` como registro de auditoría.

Ningún llamado de IA debe poder ejecutar un `INSERT`/`UPDATE` en `plans`, `workouts`,
`workout_blocks` o `training_items` directamente — solo en `plan_drafts`. Esto hace la regla de
CLAUDE.md §34 ("la IA no debe modificar automáticamente un plan sin confirmación") una
restricción de permisos de base de datos, no solo una convención de código.

## J. Roadmap

Retoma el roadmap de CLAUDE.md §44-45, ya con Fase 0 y las auditorías de datos hechas:

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Auditoría del repo | ✅ hecho (Auditoría 1) |
| 0.5 | Análisis de los 2 Excel + referencia Focus Entrena | ✅ hecho (Auditoría 2 + referencia) |
| 0.75 | Arquitectura objetivo + revisión crítica | ✅ este documento, ya corregido con Auditoría 4 (`docs/auditoria-04-revision-critica.md`) |
| 1 | Proyecto Supabase + schema completo (secciones D-E) + RLS (sección H) | ✅ Supabase confirmado, arranca ahora |
| 2 | Script de importación reproducible de la biblioteca (sección F.2) | pendiente |
| 3 | Reconectar `/biblioteca` a datos reales; **arreglar el bug de Auditoría 1** (dos `LibraryExercise` distintos, el Constructor busca en el stub de 14 en vez de la biblioteca real) | pendiente |
| 4 | Seed de deportes/capacidades (sección F.1) | pendiente |
| 5 | Auth real + `professors`/`students`/`student_professors` + RLS en producción | pendiente |
| 6 | Plan Builder **rediseñado** sobre Training Item + Prescripción genérico (reemplaza `IndividualBlock`/`SupersetBlock` de `lib/data/builder.ts`, ver Auditoría 1-D) | pendiente |
| 7 | `/alumno` conectado a datos reales + `workout_performance` real (hoy es un mock local, Auditoría 1) | pendiente |
| 7.5 | **Script de migración desde Focus Entrena** (sección F.4) + corte: se deja de usar Focus Entrena | pendiente |
| 8 | Analytics con funciones testeadas (sección G) | pendiente |
| 9 | Calendario/competencias | pendiente |
| 10 | IA (sección I) | pendiente |
| 11 | Ecosistema (nutrición, trekking, eventos, comunidad, marketplace) | fuera de alcance del MVP |

## K. Riesgos

| Riesgo | Impacto | Mitigación propuesta |
|---|---|---|
| Sobre-normalizar (demasiadas tablas de join) hace lento el Plan Builder en uso diario | Medio | **Ya corregido (Auditoría 4 — Problema 4)**: músculo/patrón pasaron a columnas directas en `exercises`; para el resto, vistas o `SELECT` con joins ya optimizados en las pantallas de alto tráfico |
| Join profundo de 6 niveles (`plans`→…→`prescriptions`) pesa en RLS y en las pantallas de más uso | Medio, crece con el volumen | **Ya corregido (Auditoría 4 — Problema 5)**: `student_id` denormalizado en `workouts` y `workout_performance` |
| RLS mal escrito bloquea al profesor legítimo o, peor, expone datos de otro | Alto | Tests de RLS explícitos (sección G) antes de dar por cerrada cualquier tabla nueva |
| Migrar `IndividualBlock`/`SupersetBlock` del Constructor actual al modelo genérico es un rediseño grande (ya señalado en Auditoría 1) | Alto, ya conocido | Hacerlo en Fase 6 de una sola vez, no parchear el modelo viejo mientras tanto |
| Pérdida/distorsión de datos en el corte único desde Focus Entrena (no hay segunda oportunidad si el script tiene un bug y ya se apagó el Sheet) | Alto | Borrador por alumno para revisión humana antes de confirmar (sección F.4), y no apagar Focus Entrena hasta confirmar cada alumno migrado |
| Campos de texto libre (`reps`, `rest_label`) dificultan analytics agregados en el futuro (ej. "reps promedio") | Bajo-medio, aceptado a propósito | Si hace falta, agregar un campo numérico derivado opcional en paralelo, nunca reemplazar el texto libre |
| IA con acceso de escritura mal configurado podría saltarse `plan_drafts` | Alto si ocurre, baja probabilidad si se sigue sección I | Permisos de base de datos, no solo convención de código |

## L. Decisiones que requieren aprobación humana

1. ~~¿Se confirma Supabase/Postgres?~~ **Resuelto: sí, Supabase/Postgres confirmado** como
   backend (Auth + Postgres + RLS), tal como proponía CLAUDE.md §37. Arranca la Fase 1.
2. ~~¿Qué pasa con Focus Entrena durante la transición?~~ **Resuelto**: se deja de usar en
   cuanto MOVA esté lista; un único script de migración mueve los datos (sección F.4). Queda
   abierto solo el detalle operativo de **cuándo exactamente** se considera "MOVA lista" para
   el corte — probablemente al cerrar la Fase 7 (ejecución del alumno funcionando de punta a
   punta), a confirmar cuando se llegue ahí.
3. ~~¿Multi-profesor por alumno desde el día uno o se restringe en la UI?~~ **Resuelto: sí,
   multi-profesor desde el día uno**, tanto en el modelo (ya lo soportaba) como en la UI del
   MVP — no restringir a uno solo. Esto hace más relevante el `permission_level` reservado en
   `student_professors` (Auditoría 4 — Problema 7): con multi-profesor real desde el MVP,
   conviene decidir pronto (no necesariamente ahora) si todo profesor asociado tiene acceso
   `full` por defecto o si el MVP ya debería distinguir un profesor principal con más permisos
   que uno secundario/invitado.
4. **Qué pasa con el historial de `workout_performance` de un alumno si cambia de profesor**
   (¿el nuevo profesor lo ve? ¿se conserva pero oculto?) — no está definido en CLAUDE.md.
5. Las **5 decisiones puntuales de datos** que ya quedaron abiertas en Auditoría 2-L (versión
   vigente por alumno, significado de "DLO", fusión de "otros"/"Otros", qué hacer con los ~108
   nombres sin match, confirmar la fusión de los 11 pares de mayúsculas/espacio) — siguen
   pendientes y son prerrequisito de la Fase 2, no de esta arquitectura.
6. **¿La tabla `calendar_entries` de D.5 es una vista SQL o conviene materializarla** por
   performance una vez que haya datos reales de volumen? — decisión técnica que se puede
   posponer hasta tener datos de carga real.
7. **[Auditoría 4]** ¿Vale la pena catalogar `activities` desde la Fase 6, o se difiere y se
   arranca 100% en texto libre (como hoy) hasta que la falta de reutilización moleste en la
   práctica? El esquema ya lo soporta como opcional (Problema 1), la pregunta es de secuencia
   de trabajo, no de diseño.

---

## M. Ampliación post-aprobación — individuos autocoacheados y facturación

Requerimiento nuevo de la usuaria, agregado después de que la Fase 1 ya estaba implementada y
verificada en producción. Amplía CLAUDE.md §2, que solo describía "un profesor puede crear
alumnos" — no contemplaba una persona armando su propio plan sin profesor. Documentado acá en
vez de asumirse en silencio, siguiendo la misma disciplina que el resto de este documento.
Implementado en `supabase/migrations/20260828000008_self_coached_individuals.sql`.

**Requerimiento tal como lo planteó la usuaria**: "Un individuo, que no tiene profesor, también
podría crearse un plan, pero para este caso, solo podría crearse planes para él mismo, no para
otro. Y a estas personas se les cobrará por el uso de la plataforma, no como al profesor, que no
se le cobrará por el uso."

**Decisión de diseño — no se creó ninguna tabla nueva.** `students` ya modela a cualquier persona
que ejecuta un plan, tenga o no profesor; lo único que hacía falta era dejar de exigir un
profesor:

- `profiles.role` suma un tercer valor: **`individual`** (antes solo `professor`\|`student`\|`admin`).
  Un `individual` tiene fila en `students`, **nunca** en `professors`.
- `plans.professor_id` pasa a ser **nullable**. `NULL` = plan autocoacheado.
- La regla "solo para sí mismo" la impone **RLS, no una tabla nueva ni un CHECK**: la única
  política que permite escribir un plan con `professor_id NULL` exige
  `is_own_student(student_id)` — es decir, que quien crea el plan y el alumno del plan sean la
  misma persona. Ese mismo patrón se repite en toda la cadena (`plan_phases`, `plan_weeks`,
  `workouts`, `workout_blocks`, `training_items`, `workout_prescriptions`) como políticas
  **agregadas**, no modificadas — el flujo normal de profesor queda intacto (verificado por
  regresión, ver abajo).
- `workouts.professor_id` se denormaliza igual que `workouts.student_id` (mismo criterio que
  Auditoría 4, Problema 5), y un trigger nuevo (`sync_workout_denormalized_fields`) lo mantiene
  sincronizado con el plan real automáticamente — la aplicación ya no necesita calcularlo. De
  paso cierra un hueco que ya existía desde la Fase 1: `student_id` era denormalizado pero nada
  garantizaba que coincidiera con el plan; ahora ninguno de los dos depende de que la app lo
  setee bien.

**Facturación — se modeló solo el hecho ya confirmado, nada más.** El esquema documenta que
`role = 'individual'` es la condición que se factura y `professor`/`student` no — eso es todo lo
que se implementó. **No se inventó** proveedor de pago, esquema de precios, período de prueba, ni
estados de suscripción (activo/vencido/cancelado): son decisiones reales de producto que le
corresponden a la usuaria, no algo que se pueda inferir. Ver preguntas nuevas en la sección L.

**Probado funcionalmente** (Postgres 15 efímero local, descartado después): un individuo arma
plan → semana → sesión para sí mismo (OK); el mismo individuo intenta crear un plan para otra
persona (bloqueado por RLS); el flujo normal de profesor no cambió (regresión); un tercero sin
ninguna relación no ve nada de ningún caso.

**Nuevas decisiones que requieren aprobación humana** (se suman a la sección L):

8. **Proveedor de pago** (Stripe, Mercado Pago, otro) — no elegido todavía, condiciona qué
   columnas/tablas hacen falta para trackear suscripciones reales.
9. **Precio y modelo de cobro** para los `individual` (mensual, anual, por plan, freemium con
   límite) — ninguno definido.
10. **¿Puede un `individual` invitar a un profesor después** y convertirse en `student` normal
    (dejando de facturarse)? El modelo ya lo permitiría técnicamente (crear la fila en
    `student_professors` y a partir de ahí usar el flujo con profesor), pero no está decidido
    si el producto debe ofrecer esa transición ni qué pasa con los planes ya creados como
    autocoacheados.
11. **¿Un profesor puede además ser `individual`** (autocoacheado para sí mismo) con la cuenta
    que ya tiene, o son roles mutuamente excluyentes en la práctica? El esquema no lo impide a
    propósito (no se agregó ningún constraint cruzado) — es una decisión de producto, no técnica.

---

**Próximo paso sugerido**: con Auditoría 1-4 completas, el siguiente paso natural es cerrar las
decisiones abiertas de esta sección L (empezando por Supabase sí/no) y arrancar la Fase 1
(schema real en Supabase + RLS).
