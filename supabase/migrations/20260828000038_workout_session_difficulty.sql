-- MOVA — Fase 7: valoración cualitativa de la sesión por el alumno.
--
-- Reemplaza el RPE por serie (1-10) por una única valoración del día:
-- qué tan exigente sintió el alumno la sesión. El RPE por serie deja de
-- pedirse desde la app; la columna workout_performance.rpe se conserva
-- para los registros históricos.

alter table public.workout_sessions
  add column if not exists difficulty text
  check (difficulty is null or difficulty in ('facil', 'moderado', 'dificil'));
