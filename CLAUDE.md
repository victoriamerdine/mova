# MOVA — Contexto Maestro, Arquitectura y Plan de Desarrollo para Claude Code

## 1. VISIÓN DEL PRODUCTO

Estamos construyendo **MOVA**, una plataforma digital para planificación, ejecución y seguimiento de entrenamiento, deporte y vida activa.

El concepto de marca es:

> **MOVA — Tu vida en movimiento.**

MOVA comienza con una herramienta profesional para profesores de educación física, entrenadores y alumnos, pero su arquitectura debe permitir evolucionar hacia un ecosistema más amplio de:

- entrenamiento;
- deportes;
- running;
- fútbol;
- pádel;
- karate;
- ciclismo;
- natación;
- trekking;
- movilidad;
- bienestar;
- nutrición;
- hábitos saludables;
- eventos deportivos;
- comunidad;
- marketplace de productos y servicios.

La plataforma no debe diseñarse como una aplicación de gimnasio con funcionalidades añadidas posteriormente.

Debe diseñarse desde el principio como un **motor genérico de planificación de actividades físicas y deportivas**, capaz de adaptarse a distintas disciplinas.

---

# 2. OBJETIVO DEL MVP

El MVP debe resolver perfectamente este problema:

> Un profesor o entrenador puede crear alumnos, construir planes de entrenamiento adaptados a distintos deportes y objetivos, organizar sesiones por semanas y días, utilizar una biblioteca central de ejercicios con videos, controlar volumen/intensidad/distribución de estímulos y entregar el plan al alumno.

El alumno puede:

- consultar el plan;
- ver qué debe hacer cada día;
- reproducir videos;
- registrar lo realizado;
- registrar carga/repeticiones/RPE;
- completar sesiones;
- consultar su historial.

El profesor mantiene siempre la decisión final.

La IA debe actuar como asistente, no como sustituto del profesional.

---

# 3. PRINCIPIOS FUNDAMENTALES

## 3.1 Arquitectura deportiva genérica

No construir lógica específica para fútbol, running, pádel, karate, etc. cuando esa lógica pueda representarse mediante entidades, capacidades, patrones, actividades, objetivos y reglas configurables.

MOVA debe permitir agregar nuevos deportes sin tener que reescribir el núcleo de la aplicación.

## 3.2 El ejercicio es reutilizable

Un ejercicio existe una sola vez en la biblioteca y puede utilizarse en muchos planes.

No duplicar ejercicios por profesor.

## 3.3 El video pertenece al ejercicio

No duplicar videos dentro de cada plan.

Un ejercicio puede tener uno o varios videos.

## 3.4 Músculos y patrones son dimensiones diferentes

Un ejercicio puede tener:

- uno o varios músculos;
- uno o varios patrones;
- una o varias capacidades físicas;
- uno o varios deportes asociados;
- uno o varios equipamientos.

## 3.5 La planificación debe ser flexible

El sistema debe permitir distintos tipos de sesión:

- fuerza;
- potencia;
- velocidad;
- resistencia;
- técnica;
- táctica;
- movilidad;
- recuperación;
- prevención;
- activación;
- calentamiento;
- circuito;
- combinado;
- trabajo individual.

## 3.6 El profesor tiene el control

La IA puede:

- recomendar;
- analizar;
- proponer;
- detectar inconsistencias;
- generar borradores.

La IA no debe modificar automáticamente un plan profesional sin confirmación.

---

# 4. FUENTES REALES PARA EL PROYECTO

Se proporcionan dos archivos Excel reales.

## Archivo 1

`PLAN MUSCULOS Y PATRONES (Autoguardado) (1).xlsx`

Este archivo representa la metodología de planificación utilizada actualmente por un profesor.

La planilla contiene:

- planes;
- ejercicios;
- músculos;
- patrones;
- series;
- repeticiones;
- intensidad;
- pausas;
- notas;
- análisis de volumen;
- análisis de intensidad;
- diferentes planificaciones reales.

La metodología utiliza principalmente dos enfoques:

### MÚSCULO

Para población general y objetivos como fuerza, hipertrofia o acondicionamiento.

### PATRÓN

Principalmente para deportistas y objetivos de rendimiento.

Existen categorías/patrones como:

- Empuje;
- Tracción;
- Dominancia de Rodillas;
- Dominancia de Caderas;
- A. Empuje;
- A. Tracción;
- A. Rodillas;
- A. Cadera;
- y otras categorías presentes en el archivo.

La planilla también realiza cálculos de volumen e intensidad por grupo.

NO asumir que estas categorías son la única taxonomía posible. Son la metodología inicial de referencia.

---

## Archivo 2

`ejercicios_consolidado_TOTAL.xlsx`

Este archivo contiene la biblioteca inicial de ejercicios.

La biblioteca contiene aproximadamente 1.375 ejercicios.

Una gran cantidad de ejercicios posee enlaces a videos.

Los registros contienen categorías, nombres de ejercicios y referencias a videos, además de información de procedencia/coincidencia.

Este archivo es la fuente inicial para construir la biblioteca de ejercicios de MOVA.

NO inventar ejercicios durante la migración.

NO eliminar información original.

NO perder links existentes.

---

# 5. NORMALIZACIÓN DE LA BIBLIOTECA

La biblioteca puede contener nombres o categorías equivalentes.

Ejemplo conceptual:

- Isquios;
- Isquiotibiales.

O:

- Core;
- Abdominales/Core.

No crear categorías duplicadas innecesariamente.

La arquitectura debe mantener:

- canonical_name;
- display_name;
- original_name;
- aliases.

Ejemplo:

```text
canonical_name:
Back Squat

display_name:
Sentadilla libre

aliases:
Sentadilla con barra
Back Squat
Squat
```

Nunca eliminar el nombre original utilizado por la fuente.

---

# 6. MODELO CONCEPTUAL

El modelo general debe ser:

```text
USUARIO
   ↓
PERFIL
   ↓
DEPORTE / ACTIVIDAD
   ↓
OBJETIVO
   ↓
PLAN
   ↓
FASE
   ↓
SEMANA
   ↓
SESIÓN
   ↓
BLOQUE
   ↓
TRAINING ITEM
```

Un Training Item puede ser:

```text
EXERCISE
o
ACTIVITY
```

Esto es importante porque una sentadilla y una sesión de 5 km no son conceptualmente el mismo tipo de objeto.

---

# 7. DEPORTES

Crear una entidad:

```text
sports
```

con:

- id;
- name;
- description;
- icon;
- status.

Ejemplos iniciales:

- General;
- Fútbol;
- Running;
- Pádel;
- Karate;
- Ciclismo;
- Natación;
- Tenis;
- Rugby;
- Básquet;
- Vóley;
- Triatlón.

No desarrollar lógica específica para todos estos deportes en el MVP.

Crear únicamente la estructura que permita incorporarlos.

---

# 8. PERFIL DE DEPORTE

Crear:

```text
sport_profiles
```

y relacionarlo con capacidades/demandas.

Ejemplo conceptual:

### Fútbol

Capacidades/demandas:

- aceleración;
- desaceleración;
- velocidad;
- cambio de dirección;
- potencia;
- resistencia;
- fuerza;
- trabajo unilateral.

### Running

- resistencia aeróbica;
- umbral;
- velocidad;
- economía de carrera;
- fuerza;
- potencia.

### Pádel

- desplazamiento lateral;
- aceleración;
- desaceleración;
- rotación;
- anti-rotación;
- potencia;
- coordinación;
- resistencia intermitente.

### Karate

- velocidad;
- potencia;
- reacción;
- movilidad;
- coordinación;
- estabilidad;
- técnica.

Estos perfiles deben ser configurables, no codificados rígidamente.

---

# 9. CAPACIDADES FÍSICAS

Crear una entidad:

```text
training_capacities
```

Ejemplos:

- fuerza;
- hipertrofia;
- potencia;
- velocidad;
- aceleración;
- desaceleración;
- resistencia aeróbica;
- resistencia anaeróbica;
- movilidad;
- estabilidad;
- coordinación;
- reacción;
- agilidad;
- técnica;
- etc.

Los ejercicios pueden relacionarse con una o varias capacidades.

---

# 10. EJERCICIOS

Crear:

```text
exercises
```

Cada ejercicio debería permitir:

- id;
- canonical_name;
- display_name;
- original_name;
- description;
- difficulty;
- equipment;
- instructions;
- common_errors;
- status.

Relaciones:

```text
exercise_muscles
exercise_patterns
exercise_capacities
exercise_sports
exercise_categories
exercise_equipment
exercise_aliases
exercise_media
```

---

# 11. VIDEOS

Crear:

```text
exercise_media
```

Cada ejercicio puede tener varios recursos.

Campos conceptuales:

- exercise_id;
- type;
- url;
- source;
- title;
- is_primary;
- status.

Tipos posibles:

- video;
- image;
- thumbnail;
- instruction.

No guardar videos pesados directamente en PostgreSQL.

Usar posteriormente un servicio especializado de video/storage.

---

# 12. BIBLIOTECA

La pantalla de biblioteca debe permitir buscar por:

- ejercicio;
- músculo;
- patrón;
- capacidad;
- deporte;
- equipamiento;
- categoría;
- dificultad;
- disponibilidad de video.

Ejemplo:

```text
Buscar ejercicio...

Filtros

[Músculo]
[Patrón]
[Capacidad]
[Deporte]
[Equipamiento]
[Nivel]
[Video disponible]
```

Resultados visuales con:

- nombre;
- thumbnail;
- categorías;
- músculos;
- patrones;
- video.

---

# 13. PLANES

Crear:

```text
plans
```

Cada plan debe poder tener:

- nombre;
- alumno;
- profesor;
- deporte;
- objetivo;
- nivel;
- tipo de planificación;
- fecha inicio;
- fecha fin;
- duración;
- frecuencia;
- estado.

Tipo de planificación:

```text
MUSCLE
PATTERN
MIXED
SPORT_SPECIFIC
CUSTOM
```

No limitar el sistema permanentemente a Músculo y Patrón.

---

# 14. FASES

Crear:

```text
plan_phases
```

Para soportar:

- preparación general;
- preparación específica;
- competencia;
- puesta a punto;
- transición;
- recuperación;
- pretemporada;
- temporada.

No todos los planes tienen que utilizar fases.

---

# 15. SEMANAS

Crear:

```text
plan_weeks
```

Una semana pertenece a un plan.

Puede tener:

- número;
- nombre;
- fecha inicial;
- fecha final;
- objetivo;
- notas.

---

# 16. SESIONES

Crear:

```text
workouts
```

Cada sesión debe tener:

- nombre;
- fecha;
- duración estimada;
- tipo;
- objetivo;
- orden;
- estado.

Ejemplos:

- Fuerza A;
- Velocidad;
- Técnica;
- Recuperación;
- Tirada larga;
- Partido;
- Activación.

---

# 17. BLOQUES

Crear:

```text
workout_blocks
```

Tipos:

```text
INDIVIDUAL
COMBINADO
CIRCUITO
CALENTAMIENTO
ACTIVACION
MOVILIDAD
RECUPERACION
TECNICA
TACTICA
```

## Individual

Ejemplo:

```text
Peso muerto rumano
3 x 8
90 s
```

## Combinado

```text
A1 Sentadilla
A2 Remo

3 vueltas
```

## Circuito

```text
A1
A2
A3
A4

4 vueltas
```

---

# 18. TRAINING ITEM

Crear una entidad genérica para representar lo que se realiza durante una sesión.

Puede ser:

```text
EXERCISE
ACTIVITY
```

Esto permite representar:

### Gimnasio

Sentadilla 4 x 8.

### Running

5 km a ritmo determinado.

### Running

8 x 400 m.

### Fútbol

Juego reducido 4v4.

### Pádel

Trabajo técnico de bandeja.

### Karate

5 x 3 min de kumite.

### Ciclismo

60 minutos zona 2.

---

# 19. PRESCRIPCIÓN

Crear:

```text
workout_prescriptions
```

Una prescripción puede contener:

- series;
- repeticiones;
- carga;
- porcentaje;
- intensidad;
- RPE objetivo;
- descanso;
- tiempo;
- distancia;
- ritmo;
- velocidad;
- tempo;
- duración;
- notas;
- orden.

No todos los campos deben ser obligatorios.

Deben adaptarse al tipo de Training Item.

---

# 20. ALUMNOS

Crear:

```text
students
```

Datos básicos:

- profesor;
- nombre;
- apellido;
- nivel;
- objetivo;
- deporte;
- disponibilidad;
- equipamiento;
- notas;
- estado.

No almacenar información médica sensible salvo que el diseño posterior y las obligaciones legales se hayan definido específicamente.

---

# 21. PROFESORES

Crear:

```text
professors
```

Un profesor puede tener muchos alumnos.

Un alumno puede tener uno o más profesores dependiendo de las reglas futuras del producto, pero el MVP puede comenzar con un profesor principal.

---

# 22. EJECUCIÓN REAL

Crear:

```text
workout_performance
```

Esto representa lo que el alumno realmente hizo.

Ejemplos:

- carga real;
- repeticiones reales;
- series completadas;
- duración real;
- distancia real;
- ritmo real;
- RPE;
- comentarios.

Esto permitirá comparar:

```text
PROGRAMADO
vs
REALIZADO
```

---

# 23. RPE

Incluir RPE como componente opcional.

Ejemplo:

```text
Objetivo:
RPE 8

Realizado:
RPE 9
```

Esto posteriormente permitirá análisis longitudinal.

---

# 24. ANALÍTICA

La plataforma debe calcular inicialmente:

### Por músculo

- volumen;
- frecuencia;
- intensidad promedio.

### Por patrón

- volumen;
- frecuencia;
- intensidad promedio.

### Por capacidad

- distribución;
- frecuencia.

### Por semana

- volumen;
- intensidad;
- sesiones;
- horas.

### Programado vs realizado

Comparar lo planificado con la ejecución real.

---

# 25. MOTOR DE CARGA

La planilla original del profesor utiliza cálculos de volumen e intensidad.

MOVA debe convertir esa lógica en funciones de backend reproducibles y testeables.

Nunca esconder la lógica en componentes visuales.

Por ejemplo:

```text
calculateMuscleVolume()
calculatePatternVolume()
calculateAverageIntensity()
calculateWeeklyLoad()
compareWeeks()
```

Cada función debe tener tests.

La fórmula exacta utilizada por el profesor debe documentarse cuando pueda inferirse de forma inequívoca de la planilla.

No inventar fórmulas cuando no estén claras.

---

# 26. ALERTAS

Una vez que existan los cálculos, crear alertas.

Ejemplos:

> Incremento importante de volumen respecto de la semana anterior.

> Alta frecuencia de Dominancia de Rodilla.

> Intensidad elevada en sesiones consecutivas.

> Volumen concentrado excesivamente en una capacidad.

Estas alertas deben ser informativas.

No deben afirmar que el entrenamiento sea incorrecto.

---

# 27. CALENDARIO DEPORTIVO

Crear:

```text
competitions
events
```

Una competencia puede tener:

- deporte;
- fecha;
- hora;
- tipo;
- importancia;
- ubicación;
- notas.

Ejemplos:

- partido;
- carrera;
- torneo;
- campeonato;
- competencia.

El calendario debe poder incluir:

- entrenamiento;
- descanso;
- recuperación;
- competencia;
- test;
- evento.

---

# 28. EJEMPLO DE FÚTBOL

El sistema debería poder representar:

```text
Deporte:
Fútbol

Objetivo:
Rendimiento

Semana:

Lunes
Recuperación

Martes
Fuerza

Miércoles
Velocidad + cambio de dirección

Jueves
Potencia

Viernes
Activación

Domingo
Partido
```

No crear código exclusivo para fútbol.

Esto debe ser una combinación de sesiones, capacidades y actividades.

---

# 29. EJEMPLO DE RUNNING

```text
Deporte:
Running

Objetivo:
10K

Lunes
Fuerza

Martes
Rodaje

Miércoles
Descanso

Jueves
Intervalos

Viernes
Movilidad

Sábado
Tirada larga
```

---

# 30. EJEMPLO DE PÁDEL

```text
Deporte:
Pádel

Martes
Fuerza unilateral

Miércoles
Técnica

Jueves
Potencia + desplazamientos

Sábado
Partido

Domingo
Recuperación
```

---

# 31. EXPERIENCIA DEL PROFESOR

Dashboard:

```text
Alumnos
Planes
Calendario
Biblioteca
Analítica
```

Debe ser rápido crear:

```text
Alumno
→ Plan
→ Semana
→ Sesión
→ Bloque
→ Ejercicio/Actividad
```

La experiencia del profesor debe priorizar productividad.

---

# 32. EXPERIENCIA DEL ALUMNO

La interfaz del alumno debe ser mobile-first.

Inicio:

```text
Hola Juan 👋

Entrenamiento de hoy

FUERZA A

45 min
8 ejercicios

[COMENZAR]
```

Cada ejercicio:

```text
Sentadilla

3 x 10

[VIDEO]

Carga
[40 kg]

Repeticiones
[10]

RPE
[8]

[COMPLETAR]
```

Al finalizar:

```text
Entrenamiento completado
```

El alumno no debe ver la complejidad interna del sistema.

---

# 33. IA

No implementar IA avanzada antes de tener:

- base de datos;
- biblioteca;
- planes;
- sesiones;
- ejercicios;
- capacidades;
- deportes;
- ejecución;
- analytics.

La IA inicialmente tendrá cuatro funciones.

## 33.1 Buscar

Ejemplo:

> ¿Qué ejercicios tengo para trabajar anti-rotación?

Debe consultar la biblioteca real.

## 33.2 Recomendar

Ejemplo:

> Recomiéndame ejercicios de potencia para una jugadora de pádel.

Debe utilizar ejercicios existentes.

## 33.3 Analizar

Ejemplo:

> Analizá la distribución de esta semana.

## 33.4 Generar borradores

Ejemplo:

> Creame un borrador de 4 semanas para un corredor de 10K, 3 sesiones por semana.

La propuesta debe quedar pendiente de aprobación del profesor.

---

# 34. REGLA IMPORTANTE DE IA

No inventar ejercicios cuando se solicite seleccionar ejercicios existentes.

No inventar videos.

No inventar métricas de carga.

No asumir que una metodología profesional es universalmente correcta.

Toda recomendación debe poder trazarse hasta los datos utilizados.

---

# 35. MARKETPLACE

NO incluir en el MVP inicial.

Será una etapa posterior.

La arquitectura futura debe permitir vendedores.

Roles:

```text
SELLER
BRAND
ADMIN
```

Categorías potenciales:

- ropa;
- equipamiento;
- running;
- fútbol;
- pádel;
- karate;
- trekking;
- accesorios;
- servicios;
- nutrición;
- eventos.

Modelo comercial futuro:

- publicaciones;
- destacados;
- publicidad;
- afiliados;
- comisiones;
- suscripciones.

---

# 36. NUTRICIÓN, TREKKING, EVENTOS Y COMUNIDAD

No desarrollar inicialmente.

Pero la arquitectura debe permitir añadir módulos posteriormente.

El núcleo actual debe ser:

```text
personas
actividades
planes
sesiones
contenido
deportes
```

Sobre ese núcleo podrán construirse:

```text
nutrición
trekking
eventos
comunidad
marketplace
```

---

# 37. STACK TECNOLÓGICO PROPUESTO

Preferencia inicial:

Frontend:

```text
Next.js
React
TypeScript
```

Backend/Database:

```text
Supabase
PostgreSQL
```

Authentication:

```text
Supabase Auth
```

Storage:

```text
Supabase Storage
o servicio especializado de video
```

Deployment:

```text
Vercel
```

La elección puede modificarse si el repositorio existente utiliza otro stack.

No reemplazar un stack existente sin justificarlo.

---

# 38. RESPONSIVE

Profesor:

Desktop-first y responsive.

Alumno:

Mobile-first.

Debe funcionar correctamente:

- desktop;
- tablet;
- móvil.

---

# 39. SEGURIDAD

Reglas:

- un alumno no puede acceder a datos de otro alumno;
- un profesor no puede acceder a datos de otro profesor;
- secretos solamente en backend/environment variables;
- nunca exponer claves privadas;
- aplicar políticas de acceso a base de datos;
- validar inputs.

---

# 40. GIT

Nunca trabajar directamente sobre `main`.

Cada funcionalidad debe tener una branch.

Ejemplos:

```text
feature/exercise-library
feature/sports
feature/plan-builder
feature/student-app
feature/analytics
feature/ai
```

Proceso:

```text
analizar
↓
planificar
↓
implementar
↓
testear
↓
revisar
↓
commit
↓
Pull Request
```

Los commits deben ser pequeños y descriptivos.

No mezclar funcionalidades no relacionadas en un mismo commit.

---

# 41. CLAUDE CODE

Antes de modificar código:

1. analizar el repositorio;
2. entender el stack;
3. verificar qué ya existe;
4. identificar riesgos;
5. proponer plan;
6. esperar aprobación cuando el cambio sea estructural.

No destruir ni reemplazar código existente sin justificación.

No crear duplicados de componentes.

No instalar dependencias innecesarias.

---

# 42. TESTING

Todas las funciones críticas deben tener tests.

Especialmente:

- cálculos de volumen;
- intensidad;
- relaciones ejercicio-patrón;
- relaciones ejercicio-músculo;
- creación de planes;
- creación de bloques combinados;
- permisos;
- registro de ejecución.

---

# 43. DOCUMENTACIÓN

Mantener:

```text
README.md
CLAUDE.md
docs/
```

Documentar:

- arquitectura;
- modelo de datos;
- decisiones importantes;
- reglas del sistema;
- migración de datos;
- fórmulas de carga.

---

# 44. ROADMAP DE IMPLEMENTACIÓN

## FASE 0 — Auditoría

Claude debe:

- analizar repositorio;
- analizar stack;
- analizar arquitectura;
- analizar Supabase;
- analizar frontend;
- analizar tests;
- identificar qué existe;
- preparar propuesta.

NO modificar todavía.

---

## FASE 1 — Modelo de datos

Crear:

- users/profiles;
- professors;
- students;
- sports;
- sport_profiles;
- training_capacities;
- muscles;
- patterns;
- categories;
- equipment;
- exercises;
- relations;
- media;
- plans;
- phases;
- weeks;
- workouts;
- blocks;
- training items;
- prescriptions;
- performance.

---

## FASE 2 — Importación de biblioteca

Importar:

`ejercicios_consolidado_TOTAL.xlsx`

Objetivos:

- conservar datos;
- detectar duplicados;
- normalizar;
- conservar aliases;
- conservar videos;
- relacionar categorías;
- generar reportes de calidad.

No borrar información dudosa automáticamente.

---

## FASE 3 — Biblioteca visual

Crear:

- buscador;
- filtros;
- tarjetas;
- detalle;
- video;
- categorías;
- músculos;
- patrones;
- capacidades;
- deportes.

### ESTADO — en producción

Hecho:

- `/biblioteca` con datos reales de Supabase (~1.362 ejercicios): buscador,
  filtros por categoría/patrón y por músculo, tarjetas con thumbnail de
  video, diálogo de detalle con video embebido + dificultad +
  descripción/instrucciones, paginación ("mostrar más").
- Selección de un ejercicio para usarlo dentro de un plan — desde el editor
  de plan (panel lateral de biblioteca + búsqueda por fila con texto
  libre). Ver Fase 6.
- Gestión de la biblioteca por el profesor (amplía el alcance original de
  la fase):
  - alta / edición / borrado de ejercicios y su video. "Borrar" archiva el
    ejercicio si algún plan lo usa (los planes siguen funcionando), lo
    elimina de verdad si no lo usa nadie;
  - detección de duplicados al agregar (match exacto normalizado o
    similitud de tokens): vista con el/los ejercicios parecidos que ya
    están en el sistema; el profesor elige por cada uno reemplazar
    (mismo id, cambian los demás valores), reemplazar solo el video, o
    guardar igual como nuevo;
  - dueño por ejercicio: al crear, el profesor elige asociarlo a su nombre
    (`owner_id`) o dejarlo público (`owner_id` null). Un ejercicio con
    dueño solo lo edita/borra el dueño directo; otro profesor genera una
    solicitud de cambio (`exercise_change_requests`) que el dueño aprueba
    (aplica los valores propuestos al mismo id) o rechaza — bandeja
    "Aprobaciones pendientes". Al editar un ejercicio de otro, la UI avisa
    que el cambio va a revisión y el botón pasa a "Enviar a revisión";
  - importación por CSV: pegar o subir un archivo (delimitador `,`/`;`
    autodetectado, encabezados por alias), vista de revisión fila por fila
    con estado (nuevo / "ya existe: X") y decisión por fila (reemplazar
    «ejercicio existente» / crear nuevo / omitir); las filas que caen sobre
    un ejercicio de otro dueño se marcan "a revisión" y entran como
    solicitud;
  - tagueo por deporte: `sports` (catálogo, 12 deportes) + `exercise_sports`
    (N:N). Chips multi-select en el formulario del ejercicio; filtro
    "Deporte" en la biblioteca; badges de deporte en tarjeta y detalle;
    columna `deportes` en el CSV (nombres separados por coma). Los deportes
    también entran en el `proposed` de una solicitud de cambio y el RPC de
    aprobación los aplica;
  - plantilla Excel: `GET /biblioteca/plantilla` genera un `.xlsx`
    (`exceljs`, server) con los encabezados que espera el import y
    validación de datos (listas desplegables) en patrón, músculo,
    dificultad y deporte, tomadas del catálogo real, más una hoja "Listas".
    Link "Descargar plantilla Excel" en la ventana de importación — el
    profesor la completa, la guarda como CSV y la sube.
- El thumbnail de las tarjetas del listado es apaisado (16:9) para reducir
  el scroll; el detalle muestra el video vertical.
- Migraciones: `20260828000021` (gestión directa por el profesor),
  `20260828000023` (dueño + solicitudes de cambio + RPC
  `apply_exercise_change_request`), `20260828000024` (fix de recursión en
  la policy de `professors`), `20260828000025` (escritura de
  `exercise_sports` + el RPC aplica los deportes propuestos).

Pendiente:

- Filtros por capacidad y equipamiento, y "video disponible" (hoy: buscador
  + categoría/patrón + músculo + deporte).
- Videos alternativos por ejercicio (hoy solo el principal).
- Nivel/dificultad como filtro (se muestra en el detalle, no filtra).
- Que el import acepte `.xlsx` directo (hoy: el profesor guarda la plantilla
  como CSV antes de subirla).

---

## FASE 4 — Deportes y actividades

Crear:

- deportes;
- perfiles deportivos;
- capacidades;
- actividades;
- tipos de sesión;
- competencias.

No crear todavía interfaces específicas por deporte.

---

## FASE 5 — Profesores y alumnos

Crear:

- dashboard;
- alumnos;
- perfiles;
- permisos;
- invitaciones.

---

## FASE 6 — Plan Builder

Construir:

```text
Plan
→ Semana
→ Sesión
→ Bloque
→ Exercise/Activity
→ Prescripción
```

Soportar:

- individual;
- combinado;
- circuito;
- activación;
- movilidad;
- recuperación;
- técnica;
- táctica.

---

## FASE 7 — App del alumno

Construir:

- entrenamiento del día;
- videos;
- ejecución;
- registro de carga;
- repeticiones;
- duración;
- RPE;
- finalización.

---

## FASE 8 — Analytics

Construir:

- volumen;
- intensidad;
- músculos;
- patrones;
- capacidades;
- deportes;
- semanas;
- programado vs realizado.

---

## FASE 9 — Calendario y competencias

Construir:

- calendario;
- entrenamientos;
- partidos;
- carreras;
- competencias;
- eventos;
- descanso.

---

## FASE 10 — IA

Construir:

- búsqueda inteligente;
- recomendaciones;
- análisis;
- generación de borradores;
- asistente profesional.

---

## FASE 11 — Ecosistema

Posteriormente:

- nutrición;
- trekking;
- eventos;
- comunidad;
- marketplace;
- publicidad;
- afiliados.

---

## SISTEMA DE FORMULARIOS DE EVALUACIÓN — ESTADO

### En producción

Feature transversal (no es una Fase del roadmap original). El profesor
arma formularios de evaluación, se los manda al alumno y usa las
respuestas para planificar. El alumno **NO necesita cuenta ni login**:
responde por un link con token.

**Modelo de datos** (migración `20260828000026`):

- `forms` — un formulario o una plantilla. `is_template=false` + `professor_id`
  → formulario del profesor; `is_template=true` + `professor_id` → plantilla
  privada del profesor; `is_template=true` + `professor_id` null → plantilla
  del sistema (seed). Estados `draft` / `published` / `archived`.
- `form_sections` → `form_questions` → `form_question_options`. `form_id`
  denormalizado en todas las hijas para que las policies sean un simple
  `can_manage_form(form_id)`.
- `form_questions.type`: 16 valores en el CHECK. El registry vive en la app
  (`lib/forms/question-types.ts`) — agregar un tipo = una entrada ahí + el
  CHECK + el input del alumno, sin cambiar el resto del esquema. Hoy
  disponibles 15; `video` diferido.
- `form_rules` — lógica condicional **como datos**:
  `{ when: [{ questionId, op, value }], match: all|any, action:
  show|hide|require|skip_to, target: { kind: question|section, id } }`.
- `form_versions` — **snapshot inmutable**. Al publicar, toda la estructura
  (secciones/preguntas/opciones/reglas) se congela en `structure` (jsonb) y
  cada envío queda atado a una versión → editar el borrador después NO
  rompe respuestas viejas.
- `form_submissions` — un envío. `student_id` null = prospecto sin cuenta
  (`invitee_name` / `invitee_contact`); `token` es la única credencial del
  alumno anónimo; `progress` (jsonb) guarda el estado del wizard para
  "pausar y seguir". Estados `pending` / `started` / `completed` / `expired`.
- `form_answers` — una respuesta por pregunta. `question_id` **sin FK**
  (apunta al id del snapshot, que puede haberse borrado del borrador);
  `question_type` denormalizado; `value` jsonb.
- `form_answer_files` — creada, **sin usar en v1** (el valor del archivo va
  en `form_answers.value` como `{ path, filename, size, mime }`).
- `form_submission_summaries` — futura IA, vacía. Mismo patrón que
  `plan_drafts`: un resumen propuesto que el profesor aprueba/rechaza.

**RPCs** (migración `20260828000027`):

- `publish_form` — arma el snapshot y marca `published` (`security invoker`).
- `create_form_from_template` / `duplicate_form` / `save_form_as_template`
  — deep-copy vía `_clone_form_contents`, que **remapea los ids** de
  pregunta/sección dentro de `when[].questionId` y `target.id` de las reglas.
- Acceso anónimo POR TOKEN (`security definer`, sin grants a las tablas):
  `get_submission`, `start_submission`, `save_submission_answers`,
  `complete_submission`.
- `evaluate_form_rules` + `complete_submission` reescrito (migración
  `20260828000028`): al completar se re-validan en el servidor las
  obligatorias **visibles** (no confía en el cliente).

**Lógica condicional** — evaluador puro compartido `lib/forms/rules.ts`
(`evaluateRules`, `missingRequired`) + espejo en plpgsql. Regla: una
pregunta/sección **se ve salvo que** una regla `show` la apunte y su
condición no se cumpla, o una `hide` la apunte y sí se cumpla; `require`
la vuelve obligatoria si la condición se cumple. Sección oculta arrastra
sus preguntas. `skip_to` está en el esquema pero el evaluador todavía no
lo implementa.

**Builder del profesor** (`/formularios`, `/formularios/[id]`,
desktop-first):

- CRUD de secciones/preguntas/opciones/reglas, reordenar (↑▼), marcar
  sensible/obligatoria, asociar deportes.
- Publicar / "Publicar cambios", enviar a un alumno (existente o prospecto
  → link mágico + copiar + WhatsApp), duplicar, guardar como plantilla,
  archivar/reactivar.
- **Vista previa en vivo**: renderiza el borrador como lo ve el alumno, con
  la lógica condicional aplicándose al responder ("N de M visibles · X
  ocultas por reglas"). Sin persistencia.
- Selector "+ Pregunta…" agrupado por categoría (Texto / Elección / Número
  / Fecha / Medidas / Archivo).

**Formulario del alumno** (`/f/[token]`, público, mobile-first,
`components/forms/form-runner.tsx`):

- Wizard pregunta por pregunta, barra de progreso, indicador de
  autoguardado ("Guardando…" / "Guardado", se desvanece), retomable con el
  mismo link.
- Pantalla de consentimiento antes de la primera pregunta marcada
  sensible; pantalla de revisión final.
- Tipo `file`: sube por `POST /f/[token]/upload` (route handler,
  service_role, valida token + pregunta + tamaño/`accept`); el valor queda
  como `{ path, filename, size, mime }` y lo persiste el autosave.

**Respuestas del profesor** (`/formularios/[id]/respuestas`,
`.../[submissionId]`):

- Lista de envíos (respondente, estado, `N/total` respondidas, fecha).
- Detalle: **Resumen** de campos clave (por palabra clave), respuestas
  completas por sección, archivos como link de descarga
  (`GET .../archivo` — verifica dueño por RLS, firma URL de 120 s con
  service_role).
- **"Aplicar al perfil del alumno"** (nivel / disponibilidad /
  equipamiento / notas / deporte principal) — SIEMPRE con confirmación
  explícita, **nada automático** (migración `20260828000029`: policy
  UPDATE en `students` para el profesor).
- Prospecto sin cuenta → "Asociar a un alumno".
- Los formularios respondidos del alumno también se muestran en el detalle
  del alumno y en el editor de plan (`<StudentFormsCard>`), "si es que
  corresponde".

**Plantillas** (migración `20260828000030`): 8 del sistema — Evaluación
inicial general, Fuerza / Gimnasio, Hipertrofia, Running, Fútbol, Pádel,
Karate, Preparación física. Cada una con una sección de lesiones sensible
+ una regla condicional. Más las propias del profesor. Todas se copian a
un formulario nuevo suyo (`create_form_from_template`).

**Archivos** (migración `20260828000032`): bucket privado `form-uploads`,
15 MB. Ni el alumno anónimo ni el profesor tocan Storage directo — todo
pasa por route handlers con la service_role key.

**RLS**: un profesor no ve formularios/envíos/respuestas de otro profesor;
un alumno logueado solo ve los suyos; las plantillas del sistema las lee
cualquier profesor.

**Tests**: `pnpm test` (vitest) — 76 tests de lógica pura, incluye
`lib/forms/rules` (evaluación, obligatoria oculta no se exige, formulario
modificado) y `lib/forms/question-types` (invariantes del registry).

### Pendiente

- Tipo de pregunta `video`.
- Poblar `form_answer_files` (hoy el archivo vive solo en
  `form_answers.value`); limpiar objetos huérfanos de Storage al borrar un
  envío.
- Acción `skip_to` de las reglas (definida en el esquema, sin implementar).
- `form_submission_summaries` + IA: resumen automático de una respuesta que
  el profesor aprueba/rechaza (§33).
- Tests de RLS y de las funciones plpgsql (hoy se verifican a mano contra
  el proyecto real).

---

# 45. ORDEN EXACTO DE DESARROLLO DEL MVP

No desarrollar todo simultáneamente.

El orden recomendado es:

```text
1. Auditoría
2. Arquitectura
3. Base de datos
4. Importación Excel
5. Biblioteca
6. Deportes/capacidades
7. Profesores
8. Alumnos
9. Plan Builder
10. Ejecución del alumno
11. Analytics
12. Calendario
13. IA
14. Marketplace
```

---

# 46. PRIMER PROMPT PARA CLAUDE

Usar este prompt antes de modificar código:

"Analiza el repositorio actual y este CLAUDE.md.

También analiza los dos archivos Excel proporcionados:

- PLAN MUSCULOS Y PATRONES (Autoguardado) (1).xlsx
- ejercicios_consolidado_TOTAL.xlsx

No modifiques todavía ningún archivo.

Quiero una auditoría completa que incluya:

1. stack actual;
2. arquitectura;
3. estructura de carpetas;
4. frontend;
5. backend;
6. base de datos;
7. autenticación;
8. testing;
9. deployment;
10. dependencias;
11. estado actual de la aplicación;
12. estrategia de migración del Excel;
13. modelo de datos recomendado;
14. riesgos;
15. roadmap de implementación.

Analiza especialmente cómo transformar la metodología real de la planilla en un sistema de software.

La solución debe ser genérica para distintos deportes.

No quiero desarrollar una aplicación exclusiva para gimnasio.

La arquitectura debe soportar fútbol, running, pádel, karate, ciclismo, natación, tenis, rugby y futuros deportes.

No hagas cambios todavía.

Al final, entregame una propuesta de arquitectura y una lista ordenada de tareas para la Fase 1.

Espera mi aprobación antes de modificar código."

---

# 47. SEGUNDO PROMPT — MODELO DE DATOS

"Implementa la Fase 1 aprobada.

Crea el modelo de datos necesario para:

- usuarios;
- profesores;
- alumnos;
- deportes;
- perfiles deportivos;
- capacidades;
- músculos;
- patrones;
- categorías;
- equipamiento;
- ejercicios;
- aliases;
- relaciones;
- videos;
- planes;
- fases;
- semanas;
- sesiones;
- bloques;
- training items;
- prescripciones;
- performance;
- competencias.

Antes de migrar datos, muestra claramente el esquema final.

No implementes todavía el marketplace ni IA avanzada.

Crea tests para las relaciones y restricciones críticas.

Trabaja en una branch feature/core-data-model."

---

# 48. TERCER PROMPT — IMPORTACIÓN

"Implementa la migración de los dos Excel proporcionados.

Archivos:

PLAN MUSCULOS Y PATRONES (Autoguardado) (1).xlsx

ejercicios_consolidado_TOTAL.xlsx

Objetivos:

1. analizar todas las hojas;
2. identificar tablas relevantes;
3. detectar duplicados;
4. normalizar nombres;
5. conservar nombres originales;
6. conservar aliases;
7. conservar categorías;
8. conservar músculos;
9. conservar patrones;
10. conservar links de videos;
11. crear relaciones;
12. generar reporte de errores/ambigüedades;
13. no borrar datos dudosos automáticamente.

Quiero un proceso reproducible de importación, no una carga manual única.

Al finalizar mostrar:

- cantidad de ejercicios;
- cantidad de músculos;
- cantidad de patrones;
- cantidad de categorías;
- cantidad de videos;
- cantidad de duplicados detectados;
- cantidad de registros ambiguos.

Trabaja en feature/exercise-data-import."

---

# 49. CUARTO PROMPT — BIBLIOTECA

"Construye la biblioteca visual de ejercicios.

Debe incluir:

- buscador;
- filtros;
- listado;
- detalle;
- video principal;
- videos alternativos;
- músculos;
- patrones;
- capacidades;
- deportes;
- equipamiento;
- dificultad.

Debe ser responsive.

El profesor debe poder seleccionar un ejercicio y utilizarlo posteriormente dentro de un plan.

No implementar todavía generación automática de planes con IA.

Branch:

feature/exercise-library."

---

# 50. QUINTO PROMPT — PLAN BUILDER

"Construye el Plan Builder.

La estructura debe ser:

Plan
→ Fase
→ Semana
→ Sesión
→ Bloque
→ Training Item
→ Prescripción

Debe soportar:

- ejercicio individual;
- combinado;
- circuito;
- movilidad;
- activación;
- calentamiento;
- recuperación;
- técnica;
- táctica.

Cada Training Item puede ser Exercise o Activity.

Las prescripciones deben soportar según corresponda:

- series;
- repeticiones;
- carga;
- intensidad;
- RPE;
- descanso;
- tiempo;
- distancia;
- ritmo;
- notas.

El profesor debe poder duplicar:

- ejercicios;
- bloques;
- sesiones;
- semanas.

Trabajar en:

feature/plan-builder."

---

# 51. SEXTO PROMPT — ALUMNO

"Construye la experiencia del alumno.

Debe mostrar:

- entrenamiento del día;
- bloques;
- ejercicios;
- videos;
- prescripción;
- carga;
- repeticiones;
- RPE;
- completar serie;
- completar ejercicio;
- finalizar sesión;
- historial.

La interfaz debe ser mobile-first y extremadamente simple.

El alumno solamente puede acceder a sus propios datos.

Branch:

feature/student-experience."

---

# 52. SÉPTIMO PROMPT — ANALYTICS

"Implementa analytics del entrenamiento.

Calcular:

- volumen por músculo;
- volumen por patrón;
- intensidad promedio;
- volumen por capacidad;
- frecuencia;
- volumen semanal;
- comparación de semanas;
- programado vs realizado.

Crear dashboard para profesor.

Agregar tests para todas las fórmulas.

No inventar fórmulas: utilizar la lógica identificada de la planilla fuente y documentarla.

Branch:

feature/training-analytics."

---

# 53. OCTAVO PROMPT — IA

"Ahora implementa el módulo inicial de IA.

Funciones:

1. buscar ejercicios de la biblioteca;
2. recomendar ejercicios existentes;
3. analizar un plan;
4. detectar posibles desequilibrios;
5. generar borradores de planes;
6. explicar la lógica de una recomendación.

La IA debe utilizar los datos internos de MOVA.

Nunca inventar ejercicios ni videos existentes.

Nunca modificar automáticamente un plan sin confirmación del profesor.

Toda recomendación debe poder explicarse.

Branch:

feature/ai-assistant."

---

# 54. NOVENO PROMPT — DEPORTES

"Amplía la experiencia de planificación para deportes.

Agregar soporte estructural para:

- fútbol;
- running;
- pádel;
- karate;
- ciclismo;
- natación;
- tenis;
- rugby;
- básquet;
- vóley;
- triatlón.

No desarrollar todavía una aplicación separada para cada deporte.

Utilizar:

- sports;
- sport profiles;
- demands;
- capacities;
- activities;
- sessions;
- competitions.

Crear ejemplos de planes para comprobar que la arquitectura puede representar distintos deportes sin modificar el núcleo.

Branch:

feature/multi-sport."

---

# 55. DÉCIMO PROMPT — CALENDARIO

"Implementa calendario deportivo.

Debe permitir registrar:

- sesiones;
- descansos;
- recuperación;
- partidos;
- carreras;
- torneos;
- competencias;
- eventos;
- tests.

El calendario debe poder asociarse a planes y deportes.

Debe permitir considerar competencias futuras dentro de la planificación.

Branch:

feature/sports-calendar."

---

# 56. DEFINICIÓN DE ÉXITO DEL MVP

El MVP será considerado exitoso cuando un profesor pueda:

1. crear una cuenta;
2. crear un alumno;
3. seleccionar un deporte;
4. seleccionar un objetivo;
5. crear un plan;
6. crear semanas;
7. crear sesiones;
8. crear bloques individuales y combinados;
9. buscar un ejercicio de la biblioteca;
10. ver su video;
11. agregarlo al plan;
12. definir series/repeticiones/carga/intensidad;
13. asignar el plan;
14. el alumno pueda abrirlo;
15. ver el video;
16. ejecutar el entrenamiento;
17. registrar lo realizado;
18. completar la sesión;
19. el profesor pueda ver el resultado;
20. visualizar volumen/intensidad y evolución.

Además, el mismo sistema debe poder representar, sin código específico adicional:

- un plan general de gimnasio;
- un plan de fútbol;
- un plan de running;
- un plan de pádel;
- un plan de karate.

---

# 57. PRINCIPIO FINAL

MOVA no debe convertirse en una colección de módulos aislados.

El núcleo debe ser:

```text
PERSONA
   ↓
DEPORTE / ACTIVIDAD
   ↓
OBJETIVO
   ↓
PLAN
   ↓
FASE
   ↓
SEMANA
   ↓
SESIÓN
   ↓
BLOQUE
   ↓
TRAINING ITEM
   ↓
PRESCRIPCIÓN
   ↓
EJECUCIÓN REAL
   ↓
ANÁLISIS
   ↓
IA
```

Sobre ese núcleo se construirán posteriormente:

```text
Nutrición
Trekking
Eventos
Comunidad
Marketplace
Publicidad
Afiliados
```

La prioridad absoluta es construir primero un excelente motor de planificación y ejecución deportiva.

No intentar construir todo MOVA en la primera versión.