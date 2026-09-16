-- MOVA — Fase 9 (CLAUDE.md §27): el calendario debe poder incluir además de
-- competencias (partido/carrera/torneo/campeonato/competencia/test/evento,
-- ya soportados desde la Fase 1) los días de descanso y recuperación.
--
-- Decisión de diseño: NO se crea una tabla `events` separada. `competitions`
-- ya tiene exactamente la forma que hace falta (alumno, fecha, tipo, lugar,
-- notas) — se relaja `sport_id` a opcional (un día de descanso no tiene
-- deporte asociado) y se agregan los dos tipos nuevos al check. Evita
-- duplicar tabla + RLS + queries por una diferencia de dos valores de tipo.

alter table public.competitions alter column sport_id drop not null;

alter table public.competitions drop constraint competitions_type_check;
alter table public.competitions add constraint competitions_type_check
  check (type in (
    'partido', 'carrera', 'torneo', 'campeonato', 'competencia', 'test', 'evento',
    'descanso', 'recuperacion'
  ));

comment on column public.competitions.sport_id is
  'Opcional desde la Fase 9: un día de descanso/recuperación no tiene deporte asociado.';
