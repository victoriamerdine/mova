# Referencia — openGym (estructura de ejercicios y motor de estadísticas)

> Análisis de [opengym.duarte-santos.ch](https://opengym.duarte-santos.ch/) y su
> código fuente ([DuarteSantos8/openGym](https://github.com/DuarteSantos8/openGym) —
> el repo pedido, `arvids-unavailable/openGym`, es un fork/mirror que el propio
> README señala como tal). App AGPL-3.0, self-hosted, sin cuenta obligatoria,
> ~1.324 ejercicios. No es parte del código de MOVA — es referencia para (a)
> comparar el modelo de datos de la biblioteca de ejercicios y (b) guardar cómo
> resuelve "estadísticas" para retomarlo cuando se aborde la Fase 8 (Analytics).
>
> **Licencia:** AGPL-3.0 — no copiar código literal sin cumplir la licencia
> (copyleft fuerte). Las fórmulas de abajo (Epley, Brzycki, Lombardi) son
> matemática pública, no del proyecto; lo que sí es de ellos es cómo las
> combinan con reglas de negocio (REP_CAP, umbrales, etc.) — eso se puede
> reimplementar de forma independiente, no copiar.

---

## 1. Modelo de ejercicio — comparación con MOVA

Cada ejercicio de openGym (`frontend/src/lib/exercises-data.js`, ~1.324 filas)
es un objeto con claves cortas (probablemente derivado del dataset público
"free-exercise-db"/ExerciseDB, muy usado en apps de este tipo):

```json
{
  "id": "0001",
  "n": "3/4 sit-up",
  "bp": "waist",
  "eq": "body weight",
  "tg": "abs",
  "mg": "hip flexors",
  "sm": ["hip flexors", "lower back"],
  "st": ["Lie flat on your back...", "Place your hands...", "..."],
  "img": "0001-2gPfomN.jpg",
  "gif": "0001-2gPfomN.gif"
}
```

| Campo | Qué es | Equivalente en MOVA |
|---|---|---|
| `id` | id corto | `exercises.id` (uuid) |
| `n` | nombre | `canonical_name`/`display_name` |
| `bp` | body part — región amplia (`waist`, `upper legs`, `chest`, `back`, `cardio`, …) | más parecido a `muscles` (agrupación gruesa) que a `patterns` |
| `tg` | target — músculo primario, más granular que `bp` | **no existe hoy**: MOVA tiene `muscle_id` único, no separa "región" de "músculo específico" |
| `mg` | un músculo secundario "principal" (uso no del todo claro, redundante con `sm[0]` en varios casos) | — |
| `sm` | **array** de músculos secundarios | **no existe**: MOVA no modela músculos secundarios, solo `muscle_id` único |
| `eq` | equipamiento (valor único, ej. `"body weight"`, `"barbell"`, `"cable"`) | mencionado en CLAUDE.md §10 pero **no implementado** — sigue pendiente en la Fase 3 ("Filtros por capacidad y equipamiento") |
| `st` | instrucciones como **array de pasos**, no un solo texto | `exercises.instructions` es un único campo de texto libre |
| `img`/`gif` | thumbnail + demo animada (gif) por ejercicio | MOVA solo tiene video (YouTube) vía `exercise_media` |

**Ideas reutilizables para MOVA (sin copiar código):**

- **Equipamiento como campo filtrable de verdad.** openGym arma la lista de
  chips de equipamiento dinámicamente a partir de la lista ya filtrada
  (`equipmentOf()`), ordenada por frecuencia — así el filtro nunca muestra una
  combinación body-part × equipamiento sin resultados. MOVA tiene el campo en
  el roadmap (§10) pero no la tabla/relación real todavía.
- **Músculo secundario como relación N:1→N, no un solo campo.** Ya existe el
  patrón exacto en MOVA para esto: `exercise_capacities`/`exercise_sports`
  (N:N ya con RLS de escritura desde la Fase 4). Se podría migrar `muscle_id`
  único a una tabla `exercise_muscles` con un `is_primary` boolean, igual de
  invasivo que lo que ya se hizo con capacidades — no es prioridad ahora, pero
  es el camino si en algún momento se pide.
- **Alias de nombres de músculo, no solo de ejercicios.** openGym normaliza
  ~40 variantes de texto libre ("delts"/"deltoids"/"shoulders") a 18 músculos
  dibujables vía una tabla `ALIAS` — el mismo principio que MOVA ya aplica a
  `exercise_aliases`, pero aplicado al vocabulario de músculos en vez de al
  nombre del ejercicio.
- **Instrucciones como pasos, no un bloque de texto** — mejor para mostrar en
  el detalle del ejercicio como lista numerada.

---

## 2. Estadísticas — guardado para la Fase 8 (Analytics)

openGym llama "Stats" a una de sus 5 pantallas principales (Home, Workout,
Stats, Plan, Library). Se arma sobre tres piezas: **mapa muscular** (con 3
lecturas), **1RM estimado**, y **esfuerzo (RIR/RPE)** — más un heatmap anual y
progresión automática. Todo vive en `frontend/src/lib/` como funciones puras
sobre el historial (`S.workouts`), no como componentes — la misma separación
"cálculo puro y testeado, aparte de la UI" que pide CLAUDE.md §25.

### 2.1 Mapa muscular — Balance / Fatiga / Fuerza (`lib/muscles.js`)

Un mismo diagrama corporal (18 músculos dibujables, en orden cabeza→pies) se
lee de tres formas distintas sobre la misma función base:

```js
// Qué músculos entrena un ejercicio y cuánto (0..1), a partir de tg/sm:
musclesOf(ex)  →  { chest: 1, triceps: 0.4, deltoids: 0.4 }
//   primario (tg) pesa 1.0, cada secundario (sm) pesa 0.4 (SECONDARY),
//   toma el máximo por músculo si se solapan (no suma).
//   Fallback por body part si el ejercicio no tiene tg/sm reconocible
//   (ejercicios custom): ej. "upper legs" → quads 0.4 + hamstring 0.35 + glute 0.25
//   (pesos por grupo suman 1 — "no contar triple" por repartir en 3 músculos).

// Carga por músculo, en "sets efectivos" — DELIBERADAMENTE no en kg:
loadOf(items)  // items = [{id, sets}]
//   "100 kg de prensa vs 12 kg de elevación lateral no dice cuál músculo
//    trabajó más" — la unidad es el set, ponderado por musclesOf().

// Balance:   loadOfWorkouts(workouts)               → todo lo completado
// Fatiga:    loadOfWorkouts(workouts, s => s.rir<=3) → solo los sets "duros"
// Fuerza:    tiempo desde el último set + 1RM estimado por ejercicio (ver 2.2)

// Sombreado relativo (0-4), no absoluto — compara contra el músculo más
// trabajado de la MISMA ventana de tiempo, porque la pregunta es "¿está
// balanceado mi entrenamiento?", que solo tiene sentido como comparación:
levelsOf(load)
```

**Relación directa con MOVA:** esto es literalmente `calculateMuscleVolume()`
+ `calculatePatternVolume()` de CLAUDE.md §25/§26, con una decisión de diseño
explícita y documentada que vale la pena discutir cuando se implemente Fase 8:
**volumen en sets, no en kg**, y **solo sets marcados como completados** (no
lo planificado) para "realizado" vs. lo prescrito para "programado" (§24).

### 2.2 1RM estimado (`lib/onerm.js`)

```js
FORMULAS = {
  epley:    (w, r) => w * (1 + r / 30),        // Epley 1985 — la que usan por default
  brzycki:  (w, r) => w * 36 / (37 - r),        // Brzycki 1993
  lombardi: (w, r) => w * Math.pow(r, 0.1),     // Lombardi 1989
}
REP_CAP = 12   // por encima de esto NO estima — "una fantasía" en vez de un número
```

- 1 repetición no es una "estimación", es la medición directa (se devuelve tal
  cual, no se aplica fórmula).
- Guarda **qué set produjo la estimación** (peso × reps), no solo el número —
  "142.5 kg est. de 100×10" es una afirmación distinta a "de 140×1".
- Detecta PR comparando el mejor 1RM estimado de la sesión contra el histórico
  previo a esa sesión (nunca incluye la sesión actual en su propia comparación).

CLAUDE.md no tiene todavía una sección de 1RM, pero si se agrega en Fase 8
(útil para "Fuerza" del mapa muscular, o para el objetivo de carga por
patrón que ya existe en `student_load_targets`), estas tres fórmulas +
el tope de reps son el punto de partida razonable — son de dominio público.

### 2.3 Esfuerzo — RIR y RPE unificados (`lib/effort.js`)

- Un set guarda **uno de los dos** (`rir` o `rpe`), nunca ambos, y nunca se
  reescribe — cambiar la preferencia solo afecta a los sets nuevos.
- Para agregar/graficar, todo se convierte a **RIR** como unidad interna
  (`rir = rpe != null ? 10 - rpe : rir`) porque RIR tiene un cero real (fallo),
  mientras que el piso de RPE (6) es solo una convención de qué vale la pena
  puntuar. Se muestra en la escala que el usuario prefiera, convirtiendo de
  vuelta solo para el display.
- `HARD_RIR = 3`: un set a RIR≤3 cuenta como "set duro" (el que dispara
  adaptación) — usado para la lectura de "Fatiga" del mapa muscular.
- `MIN_RATED = 5`: con menos de 5 sets puntuados en la ventana, no se muestra
  promedio (evita que "RIR 1.0" de un solo dato lea como un hallazgo).

MOVA ya guarda RPE por registro histórico (`workout_performance.rpe`, ver
CLAUDE.md §23/Fase 7) pero no lo usa activamente todavía. Esta unificación
RIR/RPE es directamente aplicable si en algún momento se vuelve a pedir RPE
en el registro del alumno.

### 2.4 Progresión automática (`lib/progression.js`)

Cuatro políticas nombradas, elegibles por rutina y sobreescribibles por
ejercicio: **lineal** (todo hecho → sube de peso; fallos repetidos →
deload), **Greyskull LP** (última serie al fallo, un solo fallo resetea
10%), **doble progresión** (sube reps dentro de un rango antes de subir
peso), **agregar tiempo** (para ejercicios isométricos).

**Diferencia filosófica clave con MOVA, importante si esto se retoma:**
openGym decide automáticamente el peso de la próxima sesión — es una app
auto-dirigida (el propio atleta configura su progresión). MOVA es
profesor-dirigido: CLAUDE.md §3.6/§34 es explícito en que **la IA no debe
modificar un plan sin confirmación**. Si se retoma esta idea para Fase 8/10,
el lugar natural no es "autoajustar la carga", sino que el motor de IA
**sugiera** un ajuste (§33.3 Analizar / futura §33.4 variante de ajuste) que
el profesor aprueba — mismo patrón que ya usa `AiAnalyzeWeek` hoy.

Reglas de "sesión honesta" que sí son reutilizables tal cual (son solo
lógica, no una decisión de producto): un set marcado con **menos** reps que
el objetivo cuenta como fallo aunque esté tildado; un set **nunca tildado**
cuenta como fallo; **menos sets** que los prescritos cuenta como fallo. Es
decir, nunca se lee como éxito una sesión que no se hizo completa.

### 2.5 Heatmap anual y rachas

"Cada sesión como un cuadrado en un heatmap, sombreado por cuánto duró la
sesión. Rachas contadas, semanas flojas imposibles de no ver" (copy de la
landing). No se llegó a leer `body-paths.js` (las regiones SVG del diagrama)
ni el detalle completo de `history.js` — quedan ahí si hace falta más detalle
cuando se implemente esta parte.

### 2.6 Modos de registro de un set (`lib/history.js`)

Tres formas de loguear una serie, explícitas por ejercicio (`cfg.mode`):

- `reps` — peso × reps (`{w, r}`)
- `time` — duración sostenida, con timer propio distinto al de descanso
  (`{sec, w}`, `w=0` si es bodyweight) — planchas, dead hangs, carries.
- `cardio` — duración + velocidad (`{min, speed}`)

Más dos flags ortogonales a cualquier modo: **bodyweight** (el peso logueado
es *agregado*, no el total) y **unilateral/"per side"** (se loguea el total
de ambos lados, nunca un número ambiguo que a veces es un lado y a veces los
dos). `workout_prescriptions` de MOVA ya tiene casi todos los campos para
esto (`time_sec`, `distance_m`, `pace`, `load_kg`) — lo que no tiene es el
flag explícito de "unilateral" ni la distinción bodyweight vs. peso agregado.

---

## 3. Qué NO se investigó (para no perder tiempo si se retoma)

No se llegó a mirar: `lib/body-paths.js` (paths SVG del diagrama corporal),
`lib/import-csv.js`/`import-effort.js` (import desde FitNotes/Strong/Hevy),
`lib/progression.test.js` y los demás `*.test.js` (casos de test como
documentación de edge cases), la app de AI coach (mencionada en la landing,
código no explorado), ni `data/db.json` real (el que está en el repo es solo
el store de una instancia self-hosted de ejemplo — usuario/credenciales
WebAuthn, no la biblioteca de ejercicios).
