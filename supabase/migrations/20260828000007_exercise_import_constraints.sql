-- MOVA — Fase 2: constraints UNIQUE que faltaban para que la importación
-- reproducible (scripts/import_exercise_library.py) pueda hacer upsert de
-- verdad, tal como pide docs/auditoria-03-arquitectura-objetivo.md
-- sección F.2 ("re-ejecutable... hace upsert, no un INSERT ciego").
--
-- Sin esto, `on_conflict=canonical_name` en PostgREST no tiene ningún
-- índice único contra el cual resolver el conflicto y falla.

drop index if exists public.exercises_canonical_name_idx;

alter table public.exercises
  add constraint exercises_canonical_name_key unique (canonical_name);

alter table public.exercise_aliases
  add constraint exercise_aliases_exercise_id_alias_key unique (exercise_id, alias);

alter table public.exercise_media
  add constraint exercise_media_exercise_id_url_key unique (exercise_id, url);

-- No usada todavía por el importador, pero misma razón que exercises: sin
-- esto, `activities` tampoco podría poblarse de forma reproducible después.
alter table public.activities
  add constraint activities_canonical_name_key unique (canonical_name);
