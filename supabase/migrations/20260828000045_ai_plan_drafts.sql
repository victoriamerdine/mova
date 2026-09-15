-- MOVA — Fase 10 / CLAUDE.md §33.4: "Generar borradores" con IA, tanto para
-- el profesor (borrador para un alumno) como para el individuo
-- autocoacheado (borrador para sí mismo).
--
-- Dos gaps que bloqueaban esto, ambos ya presentes desde antes de esta
-- migración:
--
-- 1) `plan_drafts` (Fase 1, 20260828000006) solo tenía policy para
--    "el profesor del alumno" (is_professor_of). Un individuo no tiene
--    profesor, así que nunca podía leer/escribir sus propios borradores —
--    mismo patrón que 20260828000008 ya resolvió para `plans` y toda su
--    cadena (plan_phases/plan_weeks/...): agregar la policy paralela con
--    is_own_student.
--
-- 2) `ai_interactions.professor_id` (Fase de IA, 20260828000033) tiene FK a
--    `professors(id)` — un individuo no tiene fila en `professors`, así que
--    JAMÁS podía insertar un log de IA (aunque la policy de RLS, que solo
--    compara contra auth.uid(), sí lo hubiera dejado). Se relaja la FK para
--    apuntar a `profiles(id)` — cualquier usuario autenticado tiene fila
--    ahí, profesor o individuo — sin cambiar el nombre de columna ni las
--    policies existentes (siguen siendo válidas: comparan professor_id
--    contra auth.uid(), no contra la tabla professors).

create policy "plan_drafts: el individuo autocoacheado gestiona el suyo"
  on public.plan_drafts for all
  using (public.is_own_student(student_id))
  with check (public.is_own_student(student_id));

alter table public.ai_interactions
  drop constraint ai_interactions_professor_id_fkey;

alter table public.ai_interactions
  add constraint ai_interactions_professor_id_fkey
  foreign key (professor_id) references public.profiles (id) on delete cascade;

comment on column public.ai_interactions.professor_id is
  'Quién hizo la consulta de IA — profesor o individuo autocoacheado (ambos tienen fila en profiles). El nombre de columna quedó de cuando solo lo usaban profesores; no se renombra para no tocar RLS/código por una cuestión de nombre.';
