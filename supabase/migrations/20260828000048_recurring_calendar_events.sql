-- MOVA — Fase 9 / CLAUDE.md §9/§27: eventos recurrentes del calendario
-- ("partido todos los domingos"), con la posibilidad de cancelar una
-- fecha puntual sin borrar la serie entera.
--
-- Decisión de diseño: NO se materializan filas por cada ocurrencia futura
-- (evita un job periódico y una tabla que crece sin límite). Se guarda la
-- REGLA (día de la semana + rango de vigencia) y, aparte, las
-- EXCEPCIONES puntuales (fechas canceladas). Las ocurrencias concretas se
-- calculan en el momento de leer el calendario (`lib/calendar-recurrence.ts`),
-- igual que ya se hace con la grilla del mes (`lib/calendar-grid.ts`).

create table public.competition_recurrences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  sport_id uuid references public.sports (id),
  type text not null check (type in (
    'partido', 'carrera', 'torneo', 'campeonato', 'competencia', 'test', 'evento',
    'descanso', 'recuperacion'
  )),
  -- 0 = domingo .. 6 = sábado, mismo criterio que Date#getUTCDay() en JS
  -- (así lib/calendar-recurrence.ts no tiene que traducir convenciones).
  weekday smallint not null check (weekday between 0 and 6),
  location text,
  notes text,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  constraint competition_recurrences_end_after_start check (end_date is null or end_date >= start_date)
);

create index competition_recurrences_student_id_idx on public.competition_recurrences (student_id);

alter table public.competition_recurrences enable row level security;

create policy "competition_recurrences: el alumno ve las suyas"
  on public.competition_recurrences for select
  using (public.is_own_student(student_id));

create policy "competition_recurrences: el profesor del alumno gestiona"
  on public.competition_recurrences for all
  using (public.is_professor_of(student_id))
  with check (public.is_professor_of(student_id));

comment on table public.competition_recurrences is
  'Serie recurrente semanal ("partido todos los domingos"). Las ocurrencias concretas se calculan al leer, no se guardan — ver lib/calendar-recurrence.ts. Cancelar una fecha puntual es una fila en competition_recurrence_exceptions, no borra la serie.';

create table public.competition_recurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  recurrence_id uuid not null references public.competition_recurrences (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (recurrence_id, date)
);

alter table public.competition_recurrence_exceptions enable row level security;

create policy "competition_recurrence_exceptions: el alumno ve las suyas"
  on public.competition_recurrence_exceptions for select
  using (exists (
    select 1 from public.competition_recurrences r
    where r.id = recurrence_id and public.is_own_student(r.student_id)
  ));

create policy "competition_recurrence_exceptions: el profesor gestiona"
  on public.competition_recurrence_exceptions for all
  using (exists (
    select 1 from public.competition_recurrences r
    where r.id = recurrence_id and public.is_professor_of(r.student_id)
  ))
  with check (exists (
    select 1 from public.competition_recurrences r
    where r.id = recurrence_id and public.is_professor_of(r.student_id)
  ));

comment on table public.competition_recurrence_exceptions is
  'Una fecha puntual cancelada de una serie recurrente — "el día que no juega". La serie sigue existiendo para las demás fechas.';
