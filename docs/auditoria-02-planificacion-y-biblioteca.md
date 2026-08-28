# Auditoría 2 — Planificación Real y Biblioteca de Ejercicios

> Resultado de `AUDITORÍA 2 — PLANIFICACIÓN REAL Y BIBLIOTECA DE EJERCICIOS.md`. Solo análisis
> con Python (pandas/openpyxl) en modo lectura — **ningún archivo Excel fue modificado**, no se
> importó nada, no se borró ni normalizó nada. Fecha: 2026-08-28.
>
> Archivos analizados:
> - **Excel 1**: `data/PLAN-MUSCULOS-Y-PATRONES-Autoguardado-1-40dfc3.xlsx` (51 hojas)
> - **Excel 2**: `data/ejercicios_consolidado_TOTAL.xlsx` (hoja `Consolidado`, 1.375 filas)

---

## A. Mapa de la metodología del profesor

Cada alumno tiene su propia pestaña, con esta estructura repetida por bloques de **14 filas
por día** (confirmado leyendo fórmulas, no solo texto):

```
Fila N     "Día X <objetivo del día>"                 (ej. "Día 1 EMPUJE + DOM RODILLA")
Fila N+1   Patrón/Músculo | Ejercicio | (C,D libres) | Series | Repeticiones | Intensidad | Pausas | Notas
Fila N+2..N+11   hasta 10 filas de ejercicios
Fila N+12..N+13  fila(s) en blanco de separación
```

Columnas reales (difieren del layout A-H documentado para el Sheet en vivo que usa Focus
Entrena — ver nota en sección L): **A**=Patrón/Músculo, **B**=Ejercicio, **E**=Series,
**F**=Repeticiones, **G**=Intensidad, **H**=Pausas, **I**=Notas. No hay columna de video/link en
este archivo local.

**Dos metodologías, confirmadas en el propio archivo:**

| Metodología | Cantidad de hojas de alumno/plantilla | Columna A usa |
|---|---|---|
| **Patrón** (`Rutina por Patrones N`, `ERIC B (PATRONES 5D)`) | 10 | Empuje / Tracción / Dom. Rodilla(s) / Dom. Cadera(s) / A. Empuje / A. Tracción / A. Rodillas / A. Cadera |
| **Músculo** (`Grupos Musculares`, la mayoría de las hojas con nombre de alumno) | 33 | Pecho / Espalda / Hombros / Bíceps / Tríceps / Cuádriceps / Isquios / Glúteos / Pantorrillas / Otros |

No hay una celda única "tipo de plan" (`B4`) activa en esta copia — la metodología está
determinada por **qué plantilla se copió** para crear la hoja, no por un valor de celda (a
diferencia de lo que describe el README de Focus Entrena para el Sheet en vivo).

**Bloques combinados/supersets**: no existen como estructura explícita. El profesor los indica
**coloreando el fondo de la celda A y B** de las filas que van intercaladas — mismo color =
mismo bloque. Confirmado con `PABLO SALAS (3)`: filas 11-13 en rojo (`#FF0000`), filas 19-21 en
amarillo (`#FFFF00`), filas 8-10 en azul claro (`#D9E2F3`). Este es exactamente el mecanismo que
`apps-script/Code.gs` de Focus Entrena ya automatiza para producir el campo `grupo` — confirma
que ese hack no es un capricho del código, es fielmente cómo el profesor ya piensa sus bloques.

**Filas sin patrón/músculo asignado** (columna A vacía) existen y son válidas — típicamente
movilidad/activación al inicio del día (ej. "PSOAS E ISQUIOS", fila 8 de Pablo Salas) — esas
filas quedan **fuera de cualquier cálculo de volumen por patrón/músculo** porque `SUMIF`/`AVERAGEIF`
no las matchea. Esto es intencional en la metodología: el volumen se mide sobre trabajo de
fuerza clasificado, no sobre calentamiento.

## B. Inventario de datos

| | |
|---|---|
| Hojas totales en Excel 1 | 51 |
| — Hojas de rutina (alumno o plantilla) | 43 |
| — Hojas de referencia (`Datos`, `Volumen Meso`) | 2 (casi vacías, ver abajo) |
| — Hoja histórica de ejercicios (`Ejercicios`) | 1 (764 filas) |
| — Hojas vacías/scratch (`Hoja1`…`Hoja6`) | 6 |
| Filas de ejercicio totales en hojas de rutina (con repetición entre versiones) | 1.728 |
| Nombres de ejercicio **únicos** usados en rutinas (normalizado) | 681 |
| Filas en Excel 2 (`Consolidado`) | 1.375 |
| Ejercicios únicos ya en `lib/data/library.ts` (MOVA) | 1.372 |

**`Volumen Meso` está prácticamente vacía** (solo un título, sin fórmulas ni datos) — el
cálculo de volumen real vive **dentro de cada hoja de alumno** (panel M:X o M:AA), no en una
hoja centralizada como sugeriría su nombre.

**Muchas hojas son versiones duplicadas del mismo alumno** (`ROCIO R` a `ROCIO R (5)`, `sole,clau,olga`
a `(5)`, `PABLO SALAS` a `(3)`, `GONZA`/`GONZA (2)`, `PREP FISICA ALBERTO` a `(3)`, etc.) — es
historial de mesociclos sucesivos, no error, pero significa que **una migración por nombre de
hoja debe decidir qué versión es la vigente** por alumno (probablemente la de fecha/sufijo más
alto, a confirmar con la usuaria — ver sección L).

## C. Catálogo de patrones

De la hoja `Datos` (lista oficial) + verificado contra las fórmulas reales de volumen:

| Patrón | Significado | Aparece en |
|---|---|---|
| Empuje | Empuje bilateral (press) | Hojas "Patrones", panel de volumen |
| Tracción | Tracción bilateral (remo/dominada) | ídem |
| Dom. Rodillas | Dominante de rodilla (sentadilla, prensa) | ídem |
| Dom. Caderas | Dominante de cadera (peso muerto, hip thrust) | ídem |
| A. Empuje | Asistencia de empuje (aislamiento hombro/tríceps) | ídem |
| A. Tracción | Asistencia de tracción (bíceps, dorsal aislado) | ídem |
| A. Rodillas | Asistencia dominante de rodilla | ídem |
| A. Cadera | Asistencia dominante de cadera | ídem |

**Inconsistencia real de escritura** (no cosmética — afecta el resultado del cálculo): la
propia hoja `Datos` dice **"Dom. Rodillas" / "Dom. Caderas"** (plural), las fórmulas `SUMIF` de
`Rutina por Patrones 4` usan indistintamente **"Dom. Rodillas"/"Dom. Caderas"** en unos bloques
de día y sus propias etiquetas de resumen dicen **"Dom. Rodilla"/"Dom.Cadera"** (singular, sin
espacio) en otros. Si el profesor tipea en columna A un valor que no coincide carácter por
carácter con el string hardcodeado en el `SUMIF` de ese día, **esa fila se cae silenciosamente
del cálculo de volumen sin ningún aviso**. Esto no es una hipótesis: son 3 grafías distintas
conviviendo en la misma hoja.

## D. Catálogo de músculos

De la hoja `Datos` + hojas `Grupos Musculares`:

Pecho, Espalda, Hombros, Bíceps, Tríceps, Cuádriceps, Isquios, Glúteos, Pantorrillas, **otros**
(minúscula), **Otros** (mayúscula, entrada separada), **DLO** (sin significado claro — posible
error de tipeo o abreviatura interna sin documentar, requiere confirmación).

Mismo problema de variantes que en patrones: "otros" y "Otros" son dos valores de lista
técnicamente distintos para el validador de datos de Sheets, aunque semánticamente el mismo
concepto.

## E. Catálogo de categorías (Excel 2 — biblioteca)

16 categorías reales (recuento exacto, sin la fila basura):

| Categoría | Filas |
|---|---|
| Dom. Rodilla | 216 |
| Empuje | 139 |
| Pliometría | 124 |
| Dom. Cadera | 116 |
| A. Empuje | 113 |
| Fuerza | 110 |
| Tracción | 107 |
| Movilidad | 92 |
| A. Tracción | 87 |
| A. Cadera | 85 |
| A. Rodilla | 81 |
| Activación - Cadera/Core (Estabilidad) | 33 |
| Activación - Muñeca/Antebrazo | 24 |
| Activación - Calentamiento General | 17 |
| Cardio | 15 |
| Activación - Hombro/Manguito Rotador | 14 |

**Hallazgo importante**: los 8 "Patrones" de Excel 1 son literalmente un subconjunto de estas
16 "Categorías" de Excel 2 (con la grafía singular: "Dom. Rodilla", "Dom. Cadera", etc. — la que
Excel 1 usa de forma inconsistente). Las 8 categorías restantes (Fuerza, Movilidad, Pliometría,
Cardio, y las 4 de Activación) son las que cubren ejercicios que **no** se contabilizan en el
panel de volumen por patrón de Excel 1 — coherente con el hallazgo de la sección A sobre filas
de movilidad/activación sin patrón asignado.

18 músculos reales en Excel 2 (Cuádriceps 254, Hombros 130, Espalda 114, Glúteos 113, Pecho 108,
Isquiotibiales 93, Abdominales/Core 92, Bíceps 79, Tríceps 75, Piernas (Potencia/Pliometría) 68,
Pantorrillas/Tobillo 58, Movilidad General 44, Cuerpo Completo 36, Antebrazo/Muñeca 30, Flexores
de Cadera 25, Aductores 23, Cardio 23, Espalda Baja/Lumbar 8) — coinciden exactamente con las
`MUSCLES` ya cargadas en `lib/data/library.ts`.

## F. Análisis de la biblioteca (Excel 2)

- **1.375 filas, 11 columnas**: `#`, Categoría, Músculo, Ejercicio, Link 1-5, Origen, Estado de
  Coincidencia.
- **Origen**: 848 filas "Base Original" (sin flag de revisión — ya validadas) + 527 "Nuevo
  (Profe)" (agregadas después, cada una con un `Estado de Coincidencia` obligatorio).
- **Estado de Coincidencia** (solo aplica a las 527 "Nuevo (Profe)", reconcilia exacto):
  Aproximado (revisar) 227 · Coincidencia probable 115 · Sin video encontrado 84 · Ambiguo
  (varias opciones posibles) 78 · Coincidencia exacta 23.
- **2 filas basura**: Categoría/Músculo = "Otros / No es ejercicio" (son en realidad artículos
  ["Importancia del entrenamiento de fuerza…"] y ["Terapia Física Reimaginada"] — contenido
  editorial, no ejercicios).

## G. Análisis de videos

- **1.291 de 1.375 filas (94%) tienen al menos un video** (Link 1); 84 no tienen ninguno (y
  coinciden exactamente con las 84 marcadas "Sin video encontrado" — consistencia perfecta).
- **100% de los links son de YouTube** (`youtube.com`, formato Shorts).
- **106 ejercicios tienen más de un video** (76 con 2, 18 con 3, 8 con 4, 4 con los 5 posibles)
  — confirma que el modelo `exercise_media` de CLAUDE.md (varios recursos por ejercicio) ya es
  necesario desde el día uno, no es una optimización futura.
- No se detectaron filas con `Link 1` vacío pero `Link 2+` presente (los links siempre se
  completan en orden).

## H. Análisis de duplicados

- **1 duplicado exacto** en Excel 2: "Sentadilla goblet con disco" aparece dos veces con la
  misma Categoría y Músculo (filas 720 y 1186 de la hoja). Sumado a las 2 filas basura, esto
  reconcilia exactamente el recuento: 1.375 − 2 (basura) − 1 (duplicado exacto) = **1.372**,
  el número que ya tiene `lib/data/library.ts`. Esto no estaba documentado explícitamente en el
  README del repo (que solo menciona la exclusión de las filas "Otros/No es ejercicio").
- **11 pares adicionales (22 filas) son duplicados por variante de mayúsculas/espacios**, no
  deduplicados todavía en ningún lado: `Burpees`/`burpees`, `Peso Muerto Con Barra`/`Peso muerto
  con barra`, `PLANCHA lateral`/`Plancha lateral`, `Press arnold`/`Press Arnold`, `PRESS
  MILITAR`/`Press Militar`, `REMO AGARRE AMPLIO`/`Remo Agarre Amplio`, `Sentadilla con
  salto`/`SENTADILLA CON SALTO` (x2 variantes más), `Sentadilla Sumo`/`Sentadilla sumo`,
  `Vuelos laterales + frontales`/`Vuelos laterales + Frontales`. **No se tocaron** — quedan
  para decisión humana (sección L).
- No se corrió una detección exhaustiva de duplicados *semánticos* (mismo ejercicio con nombre
  realmente distinto, ej. "Sentadilla libre" vs "Back Squat") — eso requiere revisión humana o
  un modelo de lenguaje, está fuera del alcance de un análisis determinístico.

## I. Mapa de coincidencias entre planificación y biblioteca

Comparando los **681 nombres únicos** usados en las 43 hojas de rutina contra los **1.364**
nombres únicos de la biblioteca (normalizado: minúsculas, espacios colapsados):

| | Cantidad | % |
|---|---|---|
| Coincidencia exacta | 529 | 77.7% de lo usado en rutinas |
| Sin coincidencia exacta | 152 | 22.3% |
| — de esos, con un candidato muy cercano en biblioteca (variante de tipeo) | 44 | |
| — de esos, sin ningún candidato cercano (probablemente ausentes de verdad) | 108 | |
| Ejercicios de la biblioteca que nunca aparecen en las rutinas analizadas | 835 de 1.364 | 61.2% |

El 61.2% "nunca usado" es esperable: la biblioteca es un catálogo universal amplio, cualquier
profesor real solo explota una porción en sus rutinas efectivas — no es una señal de error.

Los 108 "genuinamente ausentes" no son mayormente ejercicios de gimnasio faltantes en la
biblioteca — son en su mayoría de dos tipos, y ambos son hallazgos importantes para el modelo
de datos de MOVA:

1. **Actividades, no ejercicios** (`1 km-800mts run`, `1km de ski`, `800 mts run`, `800mts
   farmer carry`, `empuje de trineo`…) — confirman en datos reales, no en teoría, que MOVA
   necesita la distinción **Training Item: EXERCISE | ACTIVITY** que ya define CLAUDE.md §18:
   estas filas nunca van a "encajar" en una biblioteca de ejercicios de gimnasio por más
   completa que sea.
2. **Celdas de texto libre que describen 2+ ejercicios juntos** (`bicep +press`, `abs oblicuos +
   flexiones`, `crunch + empuje`, `circunduccion h +crunch`…) — el profesor a veces escribe un
   combo en una sola celda en vez de dos filas separadas. Es un problema de captura de datos,
   no de biblioteca incompleta.
3. Resto: etiquetas genéricas sin ejercicio específico (`abs`, `aductores`, `cadera`, `dorsal`)
   — probablemente notas abreviadas para el propio profesor, no ejercicios prescriptos
   formalmente.

## J. Propuesta de normalización — NO destructiva

Ninguna acción acá se ejecutó; es la propuesta para cuando se apruebe la migración (Fase 2).

1. **Unificar grafía de patrones/músculos** a una sola forma canónica por concepto (ej. `Dom.
   Rodilla` singular, ya que es la forma que usa Excel 2). Mantener en el modelo de datos un
   campo `original_name`/`aliases` con **todas** las variantes vistas (`Dom. Rodillas`, `Dom.
   Rodilla`), tal como pide CLAUDE.md §5 — nunca reemplazar, solo mapear.
2. **Eliminar la fila duplicada exacta** ("Sentadilla goblet con disco") y las **2 filas
   basura** ("Otros / No es ejercicio") al momento de poblar `exercises` — no del Excel fuente.
3. **Fusionar los 11 pares de variantes de mayúsculas/espacio** en un solo `exercise` con
   `aliases` para ambas grafías, en vez de crear dos ejercicios distintos.
4. **No fusionar automáticamente** ningún par que no sea variante exacta de mayúsculas/espacio
   — los 108 "genuinamente ausentes" y cualquier posible sinónimo semántico (ej. "Sentadilla
   libre" / "Back Squat") quedan pendientes de revisión humana, tal como exige la propia
   AUDITORÍA 2.
5. **Separar categorías por dimensión real**: lo que hoy es una sola columna "Categoría" en
   Excel 2 mezcla dos conceptos distintos — patrón de movimiento (Empuje, Tracción, Dom.
   Rodilla, Dom. Cadera + sus 4 variantes "A.") y tipo de estímulo (Fuerza, Movilidad,
   Pliometría, Cardio, Activación). Conviene modelarlos como dos campos/tablas separadas en
   MOVA (`patterns` vs. algo como `stimulus_type`/`training_capacities`), no una sola tabla
   "categorías" plana.

## K. Propuesta inicial de modelo de datos (a partir de lo observado)

Confirma y afina lo que ya define CLAUDE.md, con los campos que los datos reales exigen:

- `exercises`: `canonical_name`, `display_name`, `original_name` (texto tal cual se vio, puede
  haber varios por ejercicio), `aliases[]`.
- `exercise_patterns` (0..1 por ejercicio en la práctica — nunca se vio más de un patrón por
  fila): Empuje / Tracción / Dom. Rodilla / Dom. Cadera / A. Empuje / A. Tracción / A. Rodilla /
  A. Cadera.
- `exercise_muscles` (0..1 por ejercicio en la práctica, aunque el modelo debería permitir
  varios a futuro): los 18 músculos ya catalogados.
- `exercise_stimulus_type` o similar: Fuerza / Movilidad / Pliometría / Cardio / Activación
  (-Cadera/Core, -Muñeca/Antebrazo, -Calentamiento General, -Hombro/Manguito Rotador) — separado
  de patrón, como se explica en J.5.
- `exercise_media`: hasta 5 videos por ejercicio ya observado en datos reales (no asumir 1).
- `training_items`: **EXERCISE | ACTIVITY** — confirmado con datos reales (carreras, trineo,
  esquí no encajan como "exercise").
- `workout_blocks.kind`: **INDIVIDUAL** (fila sin color) vs **COMBINADO** (filas consecutivas
  con el mismo color de fondo) — el color de celda es la señal real que ya usa el profesor, y
  Focus Entrena ya la lee en producción.
- `workout_prescriptions`: `series` (puede ser decimal, ej. `4.0`), `repeticiones` (**texto
  libre**, no entero — se vieron esquemas como `8.6.4.4` = "8-6-4-4"), `intensidad` (numérico,
  tipo RPE), `pausas` (texto libre, `"3min"`, `"2 min"`), `notas` (texto libre).
- Fórmulas de volumen/intensidad para `calculateMuscleVolume()` / `calculatePatternVolume()` /
  `calculateAverageIntensity()` de CLAUDE.md §25, **documentadas exactas** desde las fórmulas
  reales de la hoja:
  - `volumen(patrón, día) = SUMA(series de las filas de ese día donde patrón coincide exacto)`
  - `intensidad_promedio(patrón, día) = PROMEDIO(intensidad de esas mismas filas)` — **no
    ponderado por series**, es un promedio simple de RPE, tal como está en la planilla. No
    inventar una versión ponderada sin confirmarlo con la usuaria.
  - `volumen_semanal(patrón) = SUMA(volumen(patrón, día) para día en 1..5)`

## L. Datos ambiguos que requieren decisión humana

1. **El Excel 1 local está desactualizado respecto al Sheet en vivo** que usa Focus Entrena hoy:
   no tiene columna de video (`H`=Pausas acá, no Referencia), no tiene las hojas `Template
   Rutina`, `EjerciciosConsolidado` ni `Dashboard` que sí existen en el Sheet en producción (ver
   `docs/referencia-focus-entrena-actual.md`), y `B4` no está en uso como selector de tipo de
   plan en esta copia. **Recomendación**: para la migración real de MOVA conviene pedir un
   export fresco del Google Sheet en vivo (el mismo que lee Focus Entrena), no depender solo de
   este archivo local para la estructura exacta de columnas — aunque este archivo sigue siendo
   valioso para metodología, fórmulas de volumen, y el catálogo de patrones/músculos.
2. **Qué hoja es la "vigente" por alumno** cuando hay varias versiones (`ROCIO R` … `ROCIO R
   (5)`, `sole,clau,olga` … `(5)`, etc.) — sin fecha explícita en la hoja, no se puede
   determinar automáticamente sin preguntar.
3. **Significado de "DLO"** en la lista de músculos de `Datos` — no es identificable
   automáticamente, requiere confirmación de la usuaria.
4. **Fusionar "otros"/"Otros"** como un único valor — casi seguro que sí, pero es una decisión
   de normalización, no una inferencia 100% segura.
5. **Qué hacer con los 108 nombres "genuinamente ausentes"** de la sección I: ¿se cargan como
   `activities` nuevas (running, trineo, etc.), se descartan por ser notas abreviadas, o se
   revisan uno por uno? Requiere una pasada humana, no debe decidirse automáticamente (regla
   explícita de CLAUDE.md §34: no inventar ejercicios).
6. **Los 11 pares de variantes de mayúsculas/espacio** (sección H) — se proponen como fusión
   segura, pero conviene una confirmación rápida antes de aplicarla en la migración real.

---

**Listas completas** (los 152 nombres sin match exacto y los 108 "genuinamente ausentes") quedan
en `/private/tmp/claude-501/.../scratchpad/solo_en_planes.txt` y `truly_missing.txt` de esta
sesión — si se quieren conservar en el repo para la Fase 2, avisar y se agregan a `docs/`.

**Próximo paso sugerido**: Auditoría 3 (arquitectura objetivo de MOVA), ya preparada como prompt
en la raíz del repo, ahora con este análisis real como insumo en vez de solo la descripción
conceptual de CLAUDE.md.
