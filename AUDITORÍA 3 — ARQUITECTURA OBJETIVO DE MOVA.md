# AUDITORÍA 3 — ARQUITECTURA OBJETIVO DE MOVA

Ahora que ya analizaste:

1. el repositorio actual;
2. la arquitectura existente;
3. la planificación real del profesor;
4. la biblioteca de ejercicios;
5. el CLAUDE.md de MOVA;

quiero que diseñes la arquitectura objetivo de MOVA.

IMPORTANTE:

NO implementes todavía.

No modifiques archivos.

No crees migraciones.

No instales dependencias.

No hagas commits.

Quiero solamente diseño y planificación.

# OBJETIVO

MOVA debe ser una plataforma de planificación, ejecución y seguimiento de entrenamiento y actividades deportivas.

No debe estar limitada a gimnasio.

Debe poder soportar:

- entrenamiento general;
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
- trekking;
- otros deportes futuros.

# PRINCIPIO DE ARQUITECTURA

No crear módulos completamente diferentes para cada deporte.

El núcleo debe ser genérico.

La estructura conceptual debe ser:

USUARIO
→ DEPORTE/ACTIVIDAD
→ OBJETIVO
→ PLAN
→ FASE
→ SEMANA
→ SESIÓN
→ BLOQUE
→ TRAINING ITEM
→ PRESCRIPCIÓN
→ EJECUCIÓN
→ ANÁLISIS

# MODELO DE DOMINIO

Proponer las entidades necesarias para:

- usuarios;
- perfiles;
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
- actividades;
- videos;
- planes;
- fases;
- semanas;
- sesiones;
- bloques;
- prescripciones;
- ejecución;
- competencias;
- calendario.

# PLANIFICACIÓN

La arquitectura debe poder representar:

## Individual

Ejercicio independiente.

## Combinado

Dos o más ejercicios alternados.

## Circuito

Tres o más ejercicios repetidos por vueltas.

## Actividad deportiva

Ejemplo:

5 km.

8 × 400 m.

Sesión de pádel.

Juego reducido de fútbol.

Kumite.

Partido.

# EJERCICIOS

Un ejercicio puede relacionarse con:

- músculos;
- patrones;
- capacidades;
- deportes;
- equipamiento;
- categorías;
- videos.

# PLANIFICACIÓN POR MÚSCULO Y PATRÓN

La arquitectura debe soportar:

MUSCLE

PATTERN

MIXED

SPORT_SPECIFIC

CUSTOM

sin duplicar la biblioteca de ejercicios.

# ANALYTICS

Diseñar cómo calcular:

- volumen por músculo;
- volumen por patrón;
- intensidad;
- volumen semanal;
- frecuencia;
- volumen por capacidad;
- programado vs realizado.

# IA

Diseñar dónde debe ubicarse la IA.

La IA debe:

- buscar;
- recomendar;
- analizar;
- generar borradores.

La IA no debe alterar un plan sin aprobación del profesor.

# EXPERIENCIA

Diseñar conceptualmente:

## Profesor

Dashboard
Alumnos
Biblioteca
Planes
Calendario
Analytics

## Alumno

Hoy
Plan
Entrenamiento
Video
Registro
Historial

# BASE DE DATOS

Proponer esquema completo.

Para cada tabla indicar:

- propósito;
- campos principales;
- relaciones;
- índices importantes;
- restricciones;
- RLS/permisos cuando correspondan.

# MIGRACIÓN

Proponer estrategia para convertir los dos Excel en datos de MOVA sin perder información.

# ROADMAP

Crear roadmap técnico dividido en fases.

Cada fase debe producir una funcionalidad usable.

# RESULTADO FINAL

Entregame:

A. arquitectura objetivo;

B. diagrama de arquitectura;

C. modelo de dominio;

D. modelo de base de datos;

E. relaciones;

F. estrategia de migración;

G. estrategia de testing;

H. estrategia de seguridad;

I. estrategia de IA;

J. roadmap;

K. riesgos;

L. decisiones que requieren aprobación humana.

No implementes todavía.