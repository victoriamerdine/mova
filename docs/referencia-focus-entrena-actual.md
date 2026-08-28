# Referencia — Focus Entrena (lo que se usa hoy, en producción)

> Análisis de `/Users/vicky/Sites/focusentrena`, un proyecto real y ya desplegado
> (Firebase Hosting, `focusentrena.web.app`) que los alumnos de la usuaria usan hoy
> para ver su rutina. Es la referencia de "algo simplista que ya funciona en
> producción" — no es parte del código de MOVA, pero informa decisiones de MOVA,
> en especial la Auditoría 2 (parsing del Excel/Sheet real) y la vista del Alumno.

---

## 1. Qué es

**Focus Entrena** es un gimnasio real (marca en Instagram: `@focus.entrena`). Este
proyecto es la web app que sus alumnos usan hoy para ver su rutina desde el
celular: cada alumno recibe un link privado (`focusentrena.web.app/r/<slug>`) y
ve sus días, ejercicios, series/reps/intensidad/pausas/notas y video, con diseño
mobile-first (paleta oscura, acento naranja `#f97316`, inspirado en Trainerize /
TrueCoach). 13 commits, con iteración real (cache para latencia, rediseño de
tarjetas, fix de labels) — señal de que está en uso activo, no es solo una demo.

## 2. Arquitectura tal como está construida (no la planeada)

El propio repo tiene un documento funcional (`Documento_Funcional_Focus_Entrena_Completo.pdf`)
que planteaba una arquitectura más ambiciosa por fases: `Google Sheets → Apps Script
sincronizador → Firestore → Firebase Functions → Next.js → Firebase Hosting`, con
Fase 2 (login Firebase Auth, check de ejercicios) y Fase 3 (dashboard del
entrenador, adherencia). **Nada de eso se construyó.** Lo que existe es todavía
más simple que el propio plan original:

```
Google Sheet "PLAN MUSCULOS Y PATRONES"
  │  (una pestaña por alumno, duplicada de "Template Rutina")
  ▼
Google Apps Script publicado como Web App  ──  doGet(id) → JSON
  │  (Code.gs: SPREADSHEET_ID fijo, cache de 90s por rutina +
  │   cache de 5min del índice id→hoja vía CacheService)
  ▼
Next.js 15 exportado 100% estático (`output: export`, sin servidor propio)
  │  fetch client-side a la URL del Apps Script + cache en localStorage
  │  (stale-while-revalidate: muestra lo cacheado al instante, revalida atrás)
  ▼
Firebase Hosting (gratis) sirviendo /r/<id> vía rewrite
```

No hay Firestore, no hay Firebase Functions, no hay Auth, no hay base de datos
propia de ningún tipo. La única "base de datos" es el Google Sheet mismo, leído
en vivo en cada visita.

## 3. Cómo lee la planilla (reglas de parsing reales)

- `B2` = nombre del alumno (solo display). `B4` = tipo de plan, `"Musculo"` o
  `"Patrones"`. `E2` = id/slug único (autogenerado por `crearNuevaRutina()` a
  partir del nombre, ej. "Pablo Salas" → `pablo-salas`, con desambiguación si se
  repite).
- Los días se detectan por regex `^d[ií]a\s*\d+` sobre columna A o B de cada fila
  — no hay un rango fijo, permite cualquier cantidad de días.
- Columnas de cada ejercicio: `A` Patrón/Músculo, `B` Ejercicio, `C` Series, `D`
  Repeticiones, `E` Intensidad, `F` Pausas, `G` Notas, `H` Video (fórmula
  `=HYPERLINK(...)`, rich text, o URL plana — se prueban las tres formas).
- **Detalle clave para el modelo de datos de MOVA:** los bloques combinados
  (superseries) no son una estructura explícita en la planilla — el profesor los
  indica **coloreando el fondo de la celda de columna A** con el mismo color
  para las filas que van intercaladas. `Code.gs` lee ese color de fondo y lo manda
  como campo `grupo`; el frontend (`group-exercises.ts`) agrupa filas consecutivas
  del mismo color y las etiqueta "Serie A", "Serie B", etc. Es un hack, pero es
  literalmente cómo el profesor ya piensa y arma sus bloques combinados hoy.
- Performance: en vez de leer celda por celda, `construirRutina()` trae valores,
  fórmulas, rich-text y colores en **4 llamadas en bloque**, no ~100.

## 4. Lo bueno / a rescatar

- **Resuelve el problema real con cero infraestructura propia**: el profesor
  sigue trabajando 100% en la planilla que ya conocía (con sus desplegables y
  autocompletado de video, automatizados por el propio `Code.gs`); nada cambia
  de su lado.
- **UX ya validada con alumnos reales**: tabs por día + vista "semana completa",
  preview de video con thumbnail de YouTube + modal, agrupación visual de
  superseries. Es un buen benchmark para la vista `/alumno` de MOVA, que hoy es
  un mock con datos estáticos.
- **Cache en capas bien pensado** para un proyecto "simplista": 90s en el
  backend (Apps Script), 5min para el índice alumno→hoja, y localStorage en el
  cliente con patrón *stale-while-revalidate*. Nada de esto es trivial y está
  bien resuelto pese a la simpleza general.
- **Usa la misma planilla fuente** que CLAUDE.md señala como "Excel 1" (`PLAN
  MUSCULOS Y PATRONES`). El parsing que ya implementó (detección de días por
  regex, Patrón vs Músculo en B4, superseries por color) es señal real y
  probada de la estructura de esa planilla — insumo directo para la Auditoría 2
  pendiente.

## 5. Limitaciones (declaradas y no declaradas)

**Declaradas explícitamente como "Fase 2/3, no ahora"** en el propio brief:
login, base de datos propia, seguimiento/historial, dashboard del entrenador,
check de ejercicios completados. Es decir, es de **solo lectura**: el alumno ve
la rutina pero no registra nada (ni carga, ni reps, ni RPE) — a diferencia de la
vista `/alumno` que ya existe en MOVA, que sí captura ejecución.

**No declaradas, pero reales:**

- El Google Sheet como "base de datos" de producción no escala: cada alumno
  nuevo es una pestaña nueva, gestionada a mano desde la UI de Sheets. Sirve
  para la cantidad de alumnos actual, no para crecer mucho más.
- Sin RLS ni seguridad real: cualquiera con el link `/r/<id>` ve esa rutina. El
  propio README lo justifica ("no hay datos sensibles más allá de la rutina de
  gimnasio") — supuesto razonable para un solo profesor con alumnos que confían
  en él, pero que **no aplica** en un producto multi-tenant como MOVA con
  múltiples profesores.
- El acoplamiento de "superserie = mismo color de fondo" es ingenioso pero
  frágil: depende de un detalle visual de Sheets, no de un dato estructurado.
- Divergencia menor de stack frente a MOVA: Tailwind v3 (MOVA usa v4) y Radix UI
  directo para los tabs (MOVA usa `@base-ui/react`) — no es un problema, pero si
  algún día se quisiera compartir componentes entre ambos repos habría fricción.

## 6. Por qué importa para MOVA

1. Es el **sistema real que hoy reemplaza parte de lo que `/alumno` en MOVA
   quiere ser** — mientras MOVA no lo sustituya, este sigue siendo el sistema en
   producción para alumnos reales. Vale la pena tenerlo presente para no
   duplicar esfuerzo ni confundir a los alumnos con dos links distintos cuando
   llegue el momento de migrar.
2. Valida con uso real qué información necesita ver un alumno (día, ejercicio,
   series/reps/intensidad/pausa/notas, video, agrupación de superseries) y qué
   se puede posponer sin fricción (login, historial, dashboard).
3. El manejo de superseries por color de celda es un dato concreto de cómo el
   profesor ya modela bloques combinados en la planilla — insumo directo para
   diseñar `workout_blocks`/`training_items` en el modelo de datos real de MOVA.
4. Su parsing de la planilla "PLAN MUSCULOS Y PATRONES" (ya probado en
   producción) es un insumo que conviene cruzar con la Auditoría 2 pendiente
   sobre ese mismo Excel.

---

**No se modificó nada de `/Users/vicky/Sites/focusentrena`** — este documento es
solo el resultado del análisis, guardado en MOVA porque es lo que lo va a usar.
