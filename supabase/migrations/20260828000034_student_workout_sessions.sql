-- MOVA — Fase 7: app del alumno. Registro de la EJECUCIÓN de una sesión.
--
-- El plan es un ciclo de semanas que se repite dentro del rango de fechas
-- del plan; el alumno rehace la misma sesión (`workouts`) muchas veces y
-- cada intento genera un registro NUEVO (no sobrescribe). Por eso hace
-- falta una fila por intento: `workout_sessions`. `workout_performance`
-- (que ya existe, migración 005) pasa a colgar de la sesión.
--
-- No se toca `workouts.status` desde el alumno (esa policy es solo del
-- profesor y además "completed" no tiene sentido en un ciclo que repite):
-- la sesión terminada se marca con `workout_sessions.completed_at`.

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  student_id uuid not null references public.students (id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  feeling_note text,
  created_at timestamptz not null default now()
);

create index workout_sessions_student_idx on public.workout_sessions (student_id, completed_at desc);
create index workout_sessions_workout_idx on public.workout_sessions (workout_id);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions: el alumno gestiona lo suyo"
  on public.workout_sessions for all
  to authenticated
  using (public.is_own_student(student_id))
  with check (public.is_own_student(student_id));

create policy "workout_sessions: el profesor del alumno lee"
  on public.workout_sessions for select
  to authenticated
  using (public.is_professor_of(student_id));

-- student_id debe ser el dueño del workout (mismo criterio que el trigger
-- de workout_performance).
create or replace function public.enforce_session_student_matches_workout()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_student_id uuid;
begin
  select w.student_id into owner_student_id from public.workouts w where w.id = new.workout_id;
  if owner_student_id is distinct from new.student_id then
    raise exception 'workout_sessions.student_id (%) no coincide con el alumno dueño del workout (%).',
      new.student_id, owner_student_id;
  end if;
  return new;
end;
$$;

create trigger workout_sessions_enforce_student
  before insert or update on public.workout_sessions
  for each row
  execute function public.enforce_session_student_matches_workout();

-- ------------------------------------------------------------
-- workout_performance cuelga de la sesión.
-- ------------------------------------------------------------
alter table public.workout_performance
  add column if not exists session_id uuid references public.workout_sessions (id) on delete cascade;

create index if not exists workout_performance_session_idx
  on public.workout_performance (session_id);

-- Una fila por (sesión, item, serie): corregir un dato dentro del mismo
-- intento sobrescribe; un intento nuevo (sesión nueva) son filas nuevas.
create unique index if not exists workout_performance_session_item_set_key
  on public.workout_performance (session_id, training_item_id, set_number)
  where session_id is not null;
