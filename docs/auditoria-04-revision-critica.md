# Auditoría 4 — Revisión Crítica de la Arquitectura Objetivo

> Revisión crítica de `docs/auditoria-03-arquitectura-objetivo.md` (ya con las dos correcciones
> de la usuaria: sin `color_tag`, Focus Entrena se apaga con corte único). **No se programó
> nada.** Los hallazgos que se aceptan quedan aplicados directamente en el documento de
> Auditoría 3, que queda como "versión corregida" — no se duplica el esquema completo acá.
> Fecha: 2026-08-28.

Repaso las 20 preguntas de `AUDITORÍA 4 — REVISIÓN CRÍTICA ANTES DE DESARROLLAR.md`. Donde no
encontré un problema real, lo digo explícitamente en vez de inventar uno para llenar la lista.

---

## Repaso pregunta por pregunta

**1. ¿Soporta múltiples deportes de verdad?** Mayormente sí, pero `plans.sport_id` es único —
un plan no puede representar una semana que mezcla fútbol y trabajo de running (atleta
multideporte). → **Problema 3**.

**2. ¿Representa bien Músculo y Patrón?** Sí, sin objeción. `plan_type` es una etiqueta que el
profesor fija (igual que `B4` en la planilla real), no una restricción dura sobre qué campos se
usan — coherente con cómo funciona hoy en la realidad.

**3. ¿Representa running sin forzarlo dentro de un modelo de gimnasio?** Estructuralmente sí
(Training Item ACTIVITY + Prescripción genérica cubre "8x400m" con `sets=8, distance_m=400`).
Pero hay una asimetría real: una ACTIVITY no tiene catálogo, video ni reutilización — cada
"8x400m" se retipea de cero. → **Problema 1** (el más importante de esta revisión).

**4. ¿Representa fútbol y partidos?** Sí, pero con una ambigüedad real: un partido, ¿es un
`workout` o una `competition`? Hoy son dos tablas separadas sin relación. → **Problema 2**.

**5. ¿Representa pádel/trabajo técnico?** Sin objeción — mismo mecanismo ACTIVITY que fútbol.

**6. ¿Representa karate?** Sin objeción — "5 x 3 min de kumite" ya encaja con
`sets=5, time_sec=180, activity_name="Kumite"`.

**7. ¿La estructura Exercise vs Activity es correcta?** La dicotomía en sí es correcta y ya está
validada con datos reales (Auditoría 2-I). El problema no es la dicotomía, es que **Activity es
ciudadano de segunda** frente a Exercise (sin catálogo) — mismo hallazgo que la pregunta 3.

**8. ¿Se pueden agregar deportes sin tocar el núcleo?** Sí — insertar filas en `sports` y
etiquetar `exercise_sports`, sin cambio de esquema. Sin objeción.

**9. ¿La base está demasiado o muy poco normalizada?** **Demasiado normalizada en un punto
concreto y evidenciable con datos reales**: `exercise_muscles`/`exercise_patterns` como tablas
de join N:N cuando Auditoría 2 encontró que en la práctica **nunca** hay más de un músculo o un
patrón por fila real. → **Problema 4**. El resto (capacidades/deportes/equipamiento sí
genuinamente N:N, y la prescripción ancha con muchos campos nullable) está bien — es fidelidad a
que "no todos los campos son obligatorios" (CLAUDE.md §19), no un error de diseño.

**10. ¿Problemas de performance?** La cadena `plans → phases → weeks → workouts → blocks →
training_items → prescriptions` (6 niveles) obliga a un join profundo para renderizar una sola
semana del Plan Builder, y las políticas RLS tendrían que recorrer la misma cadena en cada fila
para verificar pertenencia. → **Problema 5**.

**11. ¿Problemas de seguridad?** Dos, ninguno grave si se corrige ahora: (a) `ai_drafts` no
tenía política de RLS explícita — corregido al fusionarlo en `plan_drafts` con RLS igual al
resto (ver Problema 6). (b) `student_professors` no distingue *nivel* de permiso entre
profesores (un co-entrenador o especialista tendría el mismo acceso total que el profesor
principal) — no es un problema para el MVP (un solo profesor), pero conviene reservar la
columna ahora. → **Problema 7** (menor, forward-looking).

**12. ¿Qué complicaría la IA después?** Nada nuevo respecto a lo ya aceptado en Auditoría 3-I
(texto libre en `reps`/`notas`/`activity_name` es más difícil de indexar semánticamente, pero es
una decisión ya tomada conscientemente por fidelidad a los datos reales). Achatar
músculo/patrón a columnas (Problema 4) no perjudica a la IA — sigue siendo consultable igual.

**13. ¿La migración preservará suficiente información?** El diseño de "borrador por alumno para
revisión" es correcto en principio, pero con 43 hojas de rutina reales (Auditoría 2-B) revisar
una por una sin ayuda es un cuello de botella que nadie va a completar en la práctica. →
**Problema 8**.

**14. ¿Riesgo de perder información al normalizar nombres?** No, ya cubierto por
`exercise_aliases` (Auditoría 3-D.3) — sin objeción nueva.

**15. ¿Hay entidades duplicadas o innecesarias?** Sí, la misma que la pregunta 4:
`workouts` (tipo "competencia"/"partido") vs. `competitions` se solapan sin relación explícita.
También: un `workout_block` de tipo COMBINADO/CIRCUITO ya define `rounds`, pero cada
`training_item` dentro tiene su propia `prescription.sets` — dos campos pudiendo decir cosas
distintas para el mismo concepto ("¿cuántas veces se repite esto?"). → **Problema 9**.

**16/17. ¿Separar o unificar conceptos?** Unificar `workouts`↔`competitions` (Problema 2).
Separar Activity de un catálogo propio en vez de dejarlo 100% texto libre (Problema 1).

**18. ¿Qué decisiones son difíciles de cambiar después?** Exactamente el Problema 4
(join N:N vs. columna nullable para músculo/patrón) — mejor decidirlo bien ahora que ya hay
evidencia real, migrar de un modelo a otro con datos de producción cargados es mucho más caro
que corregirlo en el papel. También: el discriminador `training_items.kind` (EXERCISE|ACTIVITY)
es una decisión fundacional — si más adelante hiciera falta un tercer tipo (ej. "DRILL" con
catálogo liviano, ver Problema 1), es mucho más barato ampliarlo ahora, antes de que la Fase 6
construya el Plan Builder contra solo dos tipos.

**19. ¿Qué se está construyendo demasiado pronto?** Nada del esquema en sí (todo lo de la Fase
10/11 es solo estructura, no implementación, tal como pide CLAUDE.md). Sí encontré una
inconsistencia: `ai_drafts` (Auditoría 3-D.6) y el "borrador de importación" de la sección F
(migración de Excel y de Focus Entrena) se describieron como "el mismo mecanismo" pero con
esquemas distintos (uno tiene `prompt`, el otro no tiene sentido que lo tenga). →
**Problema 6**.

**20. ¿Cuál es el MVP mínimo correcto?** Con las correcciones de esta auditoría: schema de
identidad + biblioteca de ejercicios (achatada, Problema 4) + `plans→…→prescriptions` +
`workout_performance`, **sin** `sport_profile_capacities` con peso, **sin** `ai_drafts`/`activities`
más allá de la estructura mínima, **sin** `calendar_entries` como vista hasta que haga falta.
Ver tabla trimeada en el documento de Auditoría 3 actualizado.

---

## Problemas encontrados — detalle, impacto y solución

### Problema 1 (el más importante) — Activity es ciudadano de segunda frente a Exercise

**Problema**: `exercises` tiene catálogo completo (nombre canónico, alias, video, músculo,
patrón). `training_items.kind='ACTIVITY'` solo tiene `activity_name` en texto libre — sin
video, sin reutilización, sin catálogo. Para un profesor que trabaja mucho con deportes de
equipo (exactamente el diferencial que CLAUDE.md pide para MOVA — fútbol, pádel, karate), cada
actividad recurrente ("Juego reducido 4v4", "Trabajo técnico de bandeja") se re-tipea de cero
cada vez que se usa, y nunca tiene video asociado aunque el profesor sí tenga uno.

**Impacto**: Medio-alto. No rompe nada del MVP de gimnasio, pero traiciona el principio
fundacional de MOVA (§1: "no debe diseñarse como una app de gimnasio con funcionalidades
añadidas") — hoy el gimnasio tiene reutilización de primera clase y el deporte no.

**Solución**: agregar una tabla liviana `activities` (id, `canonical_name`, `display_name`,
`sport_id` nullable, `description`, `exercise_media` reutilizada vía `owner_type`/`owner_id`
polimórfico o una segunda FK nullable en `exercise_media`). `training_items.activity_id` pasa a
ser nullable y **opcional**: si el profesor no la catalogó todavía, sigue funcionando con
`activity_name` en texto libre (exactamente como hoy); si ya existe en el catálogo, se
referencia. Es la misma progresión que ya tuvo la biblioteca de ejercicios real (empezó com
texto libre en la planilla, se catalogó después) — no bloquea a nadie, solo habilita reuso.

### Problema 2 — `workouts` y `competitions` se solapan sin relación

**Problema**: Un partido/carrera puede vivir como una fila de `workouts` (con algún `type`
ad-hoc) o como una fila de `competitions` — nada en el esquema los distingue ni los conecta.
Riesgo real de que el mismo evento termine duplicado (uno para "verlo en el plan de la semana",
otro para "verlo en el calendario").

**Impacto**: Medio. Afecta directamente al calendario (Fase 9) y a cualquier métrica de
"sesiones de la semana" que no sepa si debe contar la competencia o no.

**Solución**: `workouts.competition_id` (FK nullable a `competitions`). Una competencia es
siempre una fila de `competitions` (fuente de verdad del evento); si el profesor quiere que
cuente como sesión de la semana dentro del plan, crea (o el sistema genera) un `workout` que
apunta a esa competencia — nunca se duplica el dato del evento en sí.

### Problema 3 — un plan no puede mezclar deportes

**Problema**: `plans.sport_id` es único. Un atleta multideporte (ej. triatlón, o un juvenil que
combina preparación física general + fútbol) no puede representarse con un solo plan si sus
sesiones pertenecen a deportes distintos.

**Impacto**: Bajo-medio para el MVP (la mayoría de los planes reales de la usuaria, según
Auditoría 2, son de un solo enfoque), pero CLAUDE.md lista Triatlón explícitamente como deporte
objetivo — vale la pena no bloquearlo de entrada.

**Solución**: mover `sport_id` también a `workouts` (nullable, hereda el de `plans` si no se
especifica). `plans.sport_id` pasa a ser el deporte *principal/por defecto*, no el único.

### Problema 4 — músculo y patrón como join N:N cuando los datos reales son 0..1

**Problema**: `exercise_muscles` y `exercise_patterns` están diseñadas como tablas N:N,
replicando el listado literal de CLAUDE.md §10. Pero Auditoría 2 (secciones A y K) confirmó con
datos reales de 1.375 filas de biblioteca y 1.728 filas de rutinas reales que **nunca** se vio
un ejercicio con más de un músculo o más de un patrón simultáneo — es siempre 0 o 1.

**Impacto**: Alto y creciente con el tiempo. Cada consulta de biblioteca, cada cálculo de
volumen, cada fila de RLS necesita un `JOIN` extra que en el 100% de los casos reales devuelve
como mucho una fila — costo real sin beneficio real hoy. Y es una decisión cara de revertir una
vez que haya datos de producción cargados (Q18).

**Solución**: `exercises.muscle_id` y `exercises.pattern_id` como columnas nullable directas
(no tablas de join). Mantener `exercise_stimulus_types`, `exercise_capacities`,
`exercise_sports`, `exercise_equipment` como join N:N — esos sí son genuinamente
multivaluados (un ejercicio sí entrena varias capacidades, sí sirve para varios deportes, sí
puede necesitar varios equipos). Si en el futuro aparece un caso real de ejercicio con 2
músculos a la vez, se agrega la tabla de join en ese momento — es un cambio aditivo barato, al
revés de lo que sería sacar una tabla de join que ya tiene datos.

### Problema 5 — cadena de 6 niveles pesa en performance y en RLS

**Problema**: `plans→phases→weeks→workouts→blocks→training_items→prescriptions` obliga a
recorrer 6 tablas para renderizar una semana o para que una política RLS confirme "¿esta fila le
pertenece a este alumno/profesor?".

**Impacto**: Medio, crece con el volumen de datos. El Plan Builder (pantalla de más uso del
profesor, según CLAUDE.md §31) y el registro de ejecución del alumno (pantalla de más uso del
alumno) son justo las dos pantallas donde esto más pesa.

**Solución**: denormalizar `student_id` (y opcionalmente `plan_id`) como columna redundante
directa en `workouts` y en `workout_performance` — no reemplaza las FK de la cadena completa,
las complementa para que las políticas RLS y las queries de la pantalla de "hoy" del alumno
puedan filtrar con un solo `WHERE student_id = auth.uid()` sin atravesar 6 tablas. Es un
trade-off consciente (algo de redundancia de escritura) a cambio de lecturas simples — correcto
para tablas que se leen muchas más veces de las que se escriben, como es este caso.

### Problema 6 — `ai_drafts` y el "borrador de importación" son el mismo concepto con dos nombres

**Problema**: La sección F de Auditoría 3 describe el borrador de importación (Excel y Focus
Entrena) como "mismo mecanismo que `ai_drafts`", pero `ai_drafts` (sección D.6) tiene campos
específicos de IA (`prompt`, `created_by_ai_at`) que no tienen sentido para una importación
determinística.

**Impacto**: Bajo, pero es una inconsistencia real del documento que conviene, no solo del
texto — si se implementara tal cual, se estaría forzando datos de IA en algo que no lo es.

**Solución**: generalizar a `plan_drafts` con `source` (`ai`\|`import_excel`\|
`import_focus_entrena`), `payload` (jsonb con el plan propuesto), y campos de IA
(`prompt`, `model`) **nullable**, solo poblados cuando `source='ai'`. Mismo `status`/
`reviewed_by`/`reviewed_at` para los tres orígenes.

### Problema 7 — sin distinción de nivel de permiso entre co-profesores (menor, a futuro)

**Problema**: `student_professors` no tiene ningún campo que distinga "profesor principal, edita
todo" de "profesor invitado, solo ve". CLAUDE.md §21 deja la puerta abierta a reglas futuras acá.

**Impacto**: Bajo para el MVP (un profesor por alumno). Si se agrega un segundo profesor más
adelante sin este campo, cualquier cambio de permisos exige una migración de esquema.

**Solución**: reservar `student_professors.permission_level` (`full`\|`view_only`, default
`full`) desde ahora, sin construir ninguna UI que lo use todavía — el costo de tenerlo es casi
cero, el costo de no tenerlo y necesitarlo después no lo es.

### Problema 8 — revisar 43 hojas una por una no es practicable

**Problema**: La estrategia de migración (Auditoría 3-F.3/F.4) pide un borrador por alumno para
revisión humana antes de confirmar — correcto en principio, pero con 43 hojas reales
(Auditoría 2-B, muchas versiones duplicadas del mismo alumno) revisar todo a mano sin ayuda es
un cuello de botella real que probablemente no se complete.

**Impacto**: Medio — no es un riesgo de seguridad ni de pérdida de datos (el borrador sigue sin
auto-confirmarse), es un riesgo de que la migración simplemente no se termine nunca.

**Solución**: el importador propone automáticamente cuál hoja es la "vigente" por alumno usando
una heurística simple (sufijo de versión más alto, o fecha de última edición del archivo) y solo
pide **confirmar o corregir** esa elección — no pide leer las 43 hojas una por una. La revisión
humana se concentra en los casos ambiguos reales (los ~108 nombres "genuinamente ausentes" de
Auditoría 2-I), no en todo el archivo.

### Problema 9 — `rounds` del bloque vs. `sets` de la prescripción pueden contradecirse

**Problema**: En un bloque COMBINADO/CIRCUITO, `workout_blocks.rounds` ya dice cuántas vueltas
se hacen. Pero cada `training_item` adentro tiene su propia `workout_prescriptions.sets`, que
podría cargarse con un valor distinto — dos campos respondiendo la misma pregunta.

**Impacto**: Bajo pero real — es exactamente el tipo de inconsistencia silenciosa que ya se vio
en los datos reales de Auditoría 2 (grafías de patrón que no coinciden y rompen el `SUMIF`).

**Solución**: `CHECK` a nivel de aplicación (o constraint de base si se prefiere) — cuando el
`workout_block.kind` es `COMBINADO` o `CIRCUITO`, `workout_prescriptions.sets` del training item
debe ser `NULL` (la cantidad de veces se lee de `block.rounds`, no del item). Documentarlo así
en el modelo, no dejarlo implícito.

---

## Problemas que se buscaron y NO se encontraron

Para que quede explícito y no parezca que se salteó el análisis: la dicotomía Exercise/Activity
en sí (pregunta 7), la cobertura de fútbol/pádel/karate (preguntas 4-6, salvo el punto de
`competitions` ya cubierto), el riesgo de pérdida de información al normalizar nombres
(pregunta 14, ya resuelto con `exercise_aliases`), y la posibilidad de agregar deportes sin
tocar el núcleo (pregunta 8) — se revisaron y no se encontró un problema real en ninguno.

---

Los 9 problemas fueron aplicados directamente sobre `docs/auditoria-03-arquitectura-objetivo.md`,
que queda como la versión corregida de la arquitectura. Nada de esto se implementó todavía.
