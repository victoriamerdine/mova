-- MOVA — Fase 1: Biblioteca de ejercicios (docs/auditoria-03-arquitectura-objetivo.md sección D.3)
-- Núcleo validado contra datos reales (docs/auditoria-02-planificacion-y-biblioteca.md).
-- Tablas de referencia y biblioteca: lectura para cualquier autenticado, escritura solo
-- service_role (se puebla por el script reproducible de la sección F.2, no por la app).

create table public.muscles (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  display_name text not null,
  sort_order smallint,
  created_at timestamptz not null default now()
);

alter table public.muscles enable row level security;

create policy "muscles: lectura para cualquier usuario autenticado"
  on public.muscles for select to authenticated using (true);

create table public.patterns (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  display_name text not null,
  sort_order smallint,
  created_at timestamptz not null default now()
);

alter table public.patterns enable row level security;

create policy "patterns: lectura para cualquier usuario autenticado"
  on public.patterns for select to authenticated using (true);

create table public.stimulus_types (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.stimulus_types enable row level security;

create policy "stimulus_types: lectura para cualquier usuario autenticado"
  on public.stimulus_types for select to authenticated using (true);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.equipment enable row level security;

create policy "equipment: lectura para cualquier usuario autenticado"
  on public.equipment for select to authenticated using (true);

-- ============================================================
-- exercises — Auditoría 4, Problema 4: muscle_id/pattern_id son columnas
-- directas nullable, NO tablas de join. Los datos reales (1.375 filas de
-- biblioteca + 1.728 filas de rutinas) nunca mostraron más de un
-- músculo/patrón por ejercicio. Ver docs/auditoria-04-revision-critica.md.
-- ============================================================
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  display_name text not null,
  original_name text not null,
  description text,
  instructions text,       -- nullable a propósito: la fuente real no lo trae (Auditoría 1)
  common_errors text,      -- ídem
  difficulty text check (difficulty in ('principiante', 'intermedio', 'avanzado')),
  muscle_id uuid references public.muscles (id),
  pattern_id uuid references public.patterns (id),
  source text not null default 'nuevo_profe' check (source in ('base_original', 'nuevo_profe')),
  match_status text check (
    match_status in (
      'coincidencia_exacta', 'coincidencia_probable', 'aproximado_revisar',
      'ambiguo', 'sin_video_encontrado'
    )
  ),
  status text not null default 'active' check (status in ('active', 'pending_review', 'archived')),
  created_at timestamptz not null default now()
);

create index exercises_canonical_name_idx on public.exercises (canonical_name);
create index exercises_status_idx on public.exercises (status);
create index exercises_muscle_id_idx on public.exercises (muscle_id);
create index exercises_pattern_id_idx on public.exercises (pattern_id);

alter table public.exercises enable row level security;

create policy "exercises: lectura para cualquier usuario autenticado"
  on public.exercises for select to authenticated using (true);

create table public.exercise_aliases (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  alias text not null,
  note text
);

create index exercise_aliases_alias_idx on public.exercise_aliases (alias);
create index exercise_aliases_exercise_id_idx on public.exercise_aliases (exercise_id);

alter table public.exercise_aliases enable row level security;

create policy "exercise_aliases: lectura para cualquier usuario autenticado"
  on public.exercise_aliases for select to authenticated using (true);

-- Joins genuinamente N:N (a diferencia de músculo/patrón, ver nota arriba).
create table public.exercise_stimulus_types (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  stimulus_type_id uuid not null references public.stimulus_types (id) on delete cascade,
  primary key (exercise_id, stimulus_type_id)
);
alter table public.exercise_stimulus_types enable row level security;
create policy "exercise_stimulus_types: lectura autenticados"
  on public.exercise_stimulus_types for select to authenticated using (true);

create table public.exercise_capacities (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  capacity_id uuid not null references public.training_capacities (id) on delete cascade,
  primary key (exercise_id, capacity_id)
);
alter table public.exercise_capacities enable row level security;
create policy "exercise_capacities: lectura autenticados"
  on public.exercise_capacities for select to authenticated using (true);

create table public.exercise_sports (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  sport_id uuid not null references public.sports (id) on delete cascade,
  primary key (exercise_id, sport_id)
);
alter table public.exercise_sports enable row level security;
create policy "exercise_sports: lectura autenticados"
  on public.exercise_sports for select to authenticated using (true);

create table public.exercise_equipment (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  primary key (exercise_id, equipment_id)
);
alter table public.exercise_equipment enable row level security;
create policy "exercise_equipment: lectura autenticados"
  on public.exercise_equipment for select to authenticated using (true);

-- ============================================================
-- activities — Auditoría 4, Problema 1: catálogo liviano y OPCIONAL para
-- que fútbol/pádel/karate/running tengan reutilización de nombre y video,
-- igual que exercises. training_items puede seguir usando texto libre
-- (activity_name) si la actividad todavía no está catalogada.
-- ============================================================
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  display_name text not null,
  sport_id uuid references public.sports (id),
  description text,
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;

create policy "activities: lectura para cualquier usuario autenticado"
  on public.activities for select to authenticated using (true);

-- ============================================================
-- exercise_media — 0..n videos por exercise O por activity (nunca ambos).
-- Auditoría 2 sección G confirmó hasta 5 videos reales por ejercicio.
-- Se usan dos FK nullable en vez de un owner_type/owner_id de texto para
-- conservar integridad referencial real (mejora de implementación sobre
-- el "owner_type/owner_id" descrito en la Auditoría 3 — mismo concepto).
-- ============================================================
create table public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid references public.exercises (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete cascade,
  type text not null check (type in ('video', 'image', 'thumbnail', 'instruction')),
  url text not null,
  source text not null default 'youtube',
  title text,
  is_primary boolean not null default false,
  sort_order smallint not null default 0,
  status text not null default 'active' check (status in ('active', 'archived')),
  constraint exercise_media_exactly_one_owner check (
    (exercise_id is not null)::int + (activity_id is not null)::int = 1
  )
);

create index exercise_media_exercise_id_idx on public.exercise_media (exercise_id, is_primary);
create index exercise_media_activity_id_idx on public.exercise_media (activity_id, is_primary);

alter table public.exercise_media enable row level security;

create policy "exercise_media: lectura para cualquier usuario autenticado"
  on public.exercise_media for select to authenticated using (true);
