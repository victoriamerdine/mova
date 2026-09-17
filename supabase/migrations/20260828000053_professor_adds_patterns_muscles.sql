-- MOVA — Biblioteca (CLAUDE.md §12, Fase 3): el profesor puede agregar
-- patrones y músculos nuevos, no solo ejercicios. `patterns`/`muscles`
-- eran catálogos de solo lectura (sembrados una vez) — hasta ahora sin
-- ninguna policy de escritura. Se agrega:
--   1) un `sport_id` opcional (nullable = universal, igual criterio que
--      `activities.sport_id`/`plans.sport_id` — un patrón o músculo puede
--      ser específico de un deporte, no varios a la vez, así que no hace
--      falta una tabla puente N:N como `exercise_sports`);
--   2) policy de INSERT para cualquier profesor (catálogo compartido,
--      sin dueño — igual criterio que `sports`; no se agrega UPDATE ni
--      DELETE: otros profesores ya pueden estar usando estas filas en sus
--      planes).

alter table public.patterns add column sport_id uuid references public.sports (id);
alter table public.muscles add column sport_id uuid references public.sports (id);

create policy "patterns: el profesor agrega"
  on public.patterns for insert
  to authenticated
  with check (exists (select 1 from public.professors p where p.id = (select auth.uid())));

create policy "muscles: el profesor agrega"
  on public.muscles for insert
  to authenticated
  with check (exists (select 1 from public.professors p where p.id = (select auth.uid())));
