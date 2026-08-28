-- MOVA — Fase 1: Planificación (docs/auditoria-03-arquitectura-objetivo.md sección D.4)
-- Cadena: plans → plan_phases → plan_weeks → workouts → workout_blocks → training_items
--         → workout_prescriptions, más competitions (Auditoría 4, Problema 2).

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  student_id uuid not null references public.students (id) on delete cascade,
  professor_id uuid not null references public.professors (id),
  sport_id uuid references public.sports (id),
  sport_profile_id uuid references public.sport_profiles (id),
  objective text,
  level text,
  plan_type text not null check (plan_type in ('MUSCLE', 'PATTERN', 'MIXED', 'SPORT_SPECIFIC', 'CUSTOM')),
  start_date date,
  end_date date,
  frequency_per_week smallint,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now()
);

create index plans_student_id_idx on public.plans (student_id);
create index plans_professor_id_idx on public.plans (professor_id);

alter table public.plans enable row level security;

create policy "plans: el alumno ve sus propios planes"
  on public.plans for select
  using (public.is_own_student(student_id));

create policy "plans: el profesor del alumno ve y gestiona el plan"
  on public.plans for all
  using (public.is_professor_of(student_id))
  with check (public.is_professor_of(student_id));

create table public.plan_phases (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  name text not null,
  kind text check (
    kind in (
      'preparacion_general', 'preparacion_especifica', 'competencia', 'puesta_a_punto',
      'transicion', 'recuperacion', 'pretemporada', 'temporada', 'custom'
    )
  ),
  start_date date,
  end_date date,
  "order" smallint not null default 0
);

alter table public.plan_phases enable row level security;

create policy "plan_phases: visible/gestionable según el plan"
  on public.plan_phases for all
  using (exists (select 1 from public.plans p where p.id = plan_id and (public.is_own_student(p.student_id) or public.is_professor_of(p.student_id))))
  with check (exists (select 1 from public.plans p where p.id = plan_id and public.is_professor_of(p.student_id)));

create table public.plan_weeks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  phase_id uuid references public.plan_phases (id),
  number smallint not null,
  name text,
  start_date date,
  end_date date,
  objective text,
  notes text
);

create index plan_weeks_plan_id_idx on public.plan_weeks (plan_id);

alter table public.plan_weeks enable row level security;

create policy "plan_weeks: visible si se puede ver el plan"
  on public.plan_weeks for select
  using (exists (select 1 from public.plans p where p.id = plan_id and (public.is_own_student(p.student_id) or public.is_professor_of(p.student_id))));

create policy "plan_weeks: el profesor del plan gestiona"
  on public.plan_weeks for insert
  with check (exists (select 1 from public.plans p where p.id = plan_id and public.is_professor_of(p.student_id)));

create policy "plan_weeks: el profesor del plan actualiza/borra"
  on public.plan_weeks for update
  using (exists (select 1 from public.plans p where p.id = plan_id and public.is_professor_of(p.student_id)))
  with check (exists (select 1 from public.plans p where p.id = plan_id and public.is_professor_of(p.student_id)));

create policy "plan_weeks: el profesor del plan borra"
  on public.plan_weeks for delete
  using (exists (select 1 from public.plans p where p.id = plan_id and public.is_professor_of(p.student_id)));

-- ============================================================
-- competitions — Auditoría 4, Problema 2: fuente de verdad de un evento
-- (partido/carrera/torneo/etc). workouts.competition_id la referencia en
-- vez de duplicar el dato del evento.
-- ============================================================
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students (id) on delete cascade,
  plan_id uuid references public.plans (id),
  sport_id uuid not null references public.sports (id),
  date date not null,
  time time,
  type text not null check (type in ('partido', 'carrera', 'torneo', 'campeonato', 'competencia', 'test', 'evento')),
  importance text,
  location text,
  notes text,
  created_at timestamptz not null default now()
);

create index competitions_student_id_idx on public.competitions (student_id);

alter table public.competitions enable row level security;

create policy "competitions: el alumno ve las suyas"
  on public.competitions for select
  using (student_id is not null and public.is_own_student(student_id));

create policy "competitions: el profesor del alumno ve y gestiona"
  on public.competitions for all
  using (student_id is not null and public.is_professor_of(student_id))
  with check (student_id is not null and public.is_professor_of(student_id));

-- ============================================================
-- workouts — Auditoría 4: student_id denormalizado (Problema 5), sport_id
-- propio nullable que hereda el del plan (Problema 3), competition_id
-- opcional (Problema 2).
-- ============================================================
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.plan_weeks (id) on delete cascade,
  student_id uuid not null references public.students (id), -- denormalizado, ver nota Problema 5
  sport_id uuid references public.sports (id),
  competition_id uuid references public.competitions (id),
  name text not null,
  date date,
  estimated_duration_min smallint,
  type text,
  objective text,
  "order" smallint not null default 0,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'skipped'))
);

create index workouts_week_id_idx on public.workouts (week_id);
create index workouts_student_id_idx on public.workouts (student_id);
create index workouts_date_idx on public.workouts (date);

alter table public.workouts enable row level security;

create policy "workouts: el alumno ve las suyas"
  on public.workouts for select
  using (public.is_own_student(student_id));

create policy "workouts: el profesor del alumno ve y gestiona"
  on public.workouts for all
  using (public.is_professor_of(student_id))
  with check (public.is_professor_of(student_id));

create table public.workout_blocks (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  kind text not null check (
    kind in (
      'INDIVIDUAL', 'COMBINADO', 'CIRCUITO', 'CALENTAMIENTO', 'ACTIVACION',
      'MOVILIDAD', 'RECUPERACION', 'TECNICA', 'TACTICA'
    )
  ),
  rounds smallint,
  rest_between_rounds_sec integer,
  "order" smallint not null default 0
);

create index workout_blocks_workout_id_idx on public.workout_blocks (workout_id);

alter table public.workout_blocks enable row level security;

create policy "workout_blocks: visible si se puede ver la sesión"
  on public.workout_blocks for select
  using (exists (select 1 from public.workouts w where w.id = workout_id and (public.is_own_student(w.student_id) or public.is_professor_of(w.student_id))));

create policy "workout_blocks: el profesor de la sesión gestiona"
  on public.workout_blocks for all
  using (exists (select 1 from public.workouts w where w.id = workout_id and public.is_professor_of(w.student_id)))
  with check (exists (select 1 from public.workouts w where w.id = workout_id and public.is_professor_of(w.student_id)));

create table public.training_items (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.workout_blocks (id) on delete cascade,
  kind text not null check (kind in ('EXERCISE', 'ACTIVITY')),
  exercise_id uuid references public.exercises (id),
  activity_id uuid references public.activities (id),
  activity_name text,
  label text, -- A1/A2… para bloques COMBINADO/CIRCUITO
  "order" smallint not null default 0,
  constraint training_items_kind_shape check (
    (kind = 'EXERCISE' and exercise_id is not null and activity_id is null and activity_name is null)
    or
    (kind = 'ACTIVITY' and exercise_id is null and (activity_id is not null or activity_name is not null))
  )
);

create index training_items_block_id_idx on public.training_items (block_id);
create index training_items_exercise_id_idx on public.training_items (exercise_id);

alter table public.training_items enable row level security;

create policy "training_items: visible si se puede ver el bloque"
  on public.training_items for select
  using (exists (
    select 1 from public.workout_blocks b
    join public.workouts w on w.id = b.workout_id
    where b.id = block_id and (public.is_own_student(w.student_id) or public.is_professor_of(w.student_id))
  ));

create policy "training_items: el profesor de la sesión gestiona"
  on public.training_items for all
  using (exists (
    select 1 from public.workout_blocks b
    join public.workouts w on w.id = b.workout_id
    where b.id = block_id and public.is_professor_of(w.student_id)
  ))
  with check (exists (
    select 1 from public.workout_blocks b
    join public.workouts w on w.id = b.workout_id
    where b.id = block_id and public.is_professor_of(w.student_id)
  ));

create table public.workout_prescriptions (
  id uuid primary key default gen_random_uuid(),
  training_item_id uuid not null unique references public.training_items (id) on delete cascade,
  sets numeric,           -- Auditoría 2: puede ser decimal (ej. 4.0). NULL si el bloque ya tiene rounds.
  reps text,              -- texto libre: se vieron esquemas reales como "8-6-4-4"
  load_kg numeric,
  load_percent numeric,
  intensity_rpe numeric,
  rest_label text,        -- texto libre: "3min", "2 min"
  time_sec integer,
  distance_m numeric,
  pace text,
  tempo text,
  notes text,
  "order" smallint not null default 0
);

alter table public.workout_prescriptions enable row level security;

create policy "workout_prescriptions: visible si se puede ver el training item"
  on public.workout_prescriptions for select
  using (exists (
    select 1 from public.training_items ti
    join public.workout_blocks b on b.id = ti.block_id
    join public.workouts w on w.id = b.workout_id
    where ti.id = training_item_id and (public.is_own_student(w.student_id) or public.is_professor_of(w.student_id))
  ));

create policy "workout_prescriptions: el profesor gestiona"
  on public.workout_prescriptions for all
  using (exists (
    select 1 from public.training_items ti
    join public.workout_blocks b on b.id = ti.block_id
    join public.workouts w on w.id = b.workout_id
    where ti.id = training_item_id and public.is_professor_of(w.student_id)
  ))
  with check (exists (
    select 1 from public.training_items ti
    join public.workout_blocks b on b.id = ti.block_id
    join public.workouts w on w.id = b.workout_id
    where ti.id = training_item_id and public.is_professor_of(w.student_id)
  ));

-- ============================================================
-- Auditoría 4, Problema 9: sets debe quedar NULL cuando el bloque ya
-- define rounds (COMBINADO/CIRCUITO) — evita que ambos campos se
-- contradigan, igual que las grafías inconsistentes rompían los SUMIF
-- reales (ver docs/auditoria-02-planificacion-y-biblioteca.md sección C).
-- No es un CHECK simple porque cruza tablas: se resuelve con un trigger.
-- ============================================================
create or replace function public.enforce_sets_null_when_block_has_rounds()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  block_kind text;
begin
  select b.kind into block_kind
  from public.training_items ti
  join public.workout_blocks b on b.id = ti.block_id
  where ti.id = new.training_item_id;

  if block_kind in ('COMBINADO', 'CIRCUITO') and new.sets is not null then
    raise exception 'workout_prescriptions.sets debe ser NULL cuando el bloque es COMBINADO o CIRCUITO — la cantidad de vueltas se define en workout_blocks.rounds (ver Auditoría 4, Problema 9).';
  end if;

  return new;
end;
$$;

create trigger workout_prescriptions_enforce_sets_rule
  before insert or update on public.workout_prescriptions
  for each row
  execute function public.enforce_sets_null_when_block_has_rounds();
