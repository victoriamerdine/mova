-- MOVA — Wiring real de Supabase: la biblioteca de ejercicios (y el resto
-- de las tablas de referencia/catálogo) se vuelven legibles también para
-- `anon`, no solo `authenticated`.
--
-- Por qué: todavía no existe Fase 5 (Auth real) — no hay login en la app.
-- El roadmap de docs/auditoria-03-arquitectura-objetivo.md (sección J) ya
-- secuenciaba "reconectar /biblioteca a datos reales" (Fase 3) ANTES de
-- "Auth real" (Fase 5) — esta migración es lo que hace esa secuencia
-- posible: sin esto, /biblioteca no podría leer ni una fila hasta que
-- existiera un login funcionando.
--
-- Alcance deliberadamente acotado: SOLO tablas de referencia/catálogo, sin
-- datos personales ni de negocio (nadie es dueño de un ejercicio o un
-- deporte). Las tablas de identidad, planificación y ejecución (profiles,
-- students, plans, workouts, workout_performance, etc.) NO se tocan acá —
-- siguen exigiendo `authenticated` como siempre.
--
-- No cambia NADA del filtrado por status/contenido — sigue siendo el mismo
-- `using (true)` de antes, ahora accesible también sin sesión. Si en el
-- futuro se decide que `pending_review` no debería ser público (ver
-- Auditoría 3 sección N, decisión 12, todavía abierta), se resuelve con
-- otra migración que agregue el filtro de status, no con esta.

alter policy "sports: lectura para cualquier usuario autenticado"
  on public.sports to anon, authenticated;

alter policy "sport_profiles: lectura para cualquier usuario autenticado"
  on public.sport_profiles to anon, authenticated;

alter policy "training_capacities: lectura para cualquier usuario autenticado"
  on public.training_capacities to anon, authenticated;

alter policy "sport_profile_capacities: lectura autenticados"
  on public.sport_profile_capacities to anon, authenticated;

alter policy "muscles: lectura para cualquier usuario autenticado"
  on public.muscles to anon, authenticated;

alter policy "patterns: lectura para cualquier usuario autenticado"
  on public.patterns to anon, authenticated;

alter policy "stimulus_types: lectura para cualquier usuario autenticado"
  on public.stimulus_types to anon, authenticated;

alter policy "equipment: lectura para cualquier usuario autenticado"
  on public.equipment to anon, authenticated;

alter policy "exercises: lectura para cualquier usuario autenticado"
  on public.exercises to anon, authenticated;

alter policy "exercise_aliases: lectura para cualquier usuario autenticado"
  on public.exercise_aliases to anon, authenticated;

alter policy "exercise_stimulus_types: lectura autenticados"
  on public.exercise_stimulus_types to anon, authenticated;

alter policy "exercise_capacities: lectura autenticados"
  on public.exercise_capacities to anon, authenticated;

alter policy "exercise_sports: lectura autenticados"
  on public.exercise_sports to anon, authenticated;

alter policy "exercise_equipment: lectura autenticados"
  on public.exercise_equipment to anon, authenticated;

alter policy "activities: lectura para cualquier usuario autenticado"
  on public.activities to anon, authenticated;

alter policy "exercise_media: lectura para cualquier usuario autenticado"
  on public.exercise_media to anon, authenticated;
