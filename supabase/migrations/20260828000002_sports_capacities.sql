-- MOVA — Fase 1: Deportes y capacidades (docs/auditoria-03-arquitectura-objetivo.md sección D.2)
-- Tablas de referencia: cualquier usuario autenticado puede leerlas; solo service_role escribe
-- (se pueblan por seed/migración, no por la app — ver sección F de la Auditoría 3).

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.sports enable row level security;

create policy "sports: lectura para cualquier usuario autenticado"
  on public.sports for select
  to authenticated
  using (true);

-- Ahora que sports existe, se completa la FK que students dejó pendiente en 20260828000001.
alter table public.students
  add constraint students_primary_sport_id_fkey
  foreign key (primary_sport_id) references public.sports (id);

create table public.sport_profiles (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.sport_profiles enable row level security;

create policy "sport_profiles: lectura para cualquier usuario autenticado"
  on public.sport_profiles for select
  to authenticated
  using (true);

create table public.training_capacities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table public.training_capacities enable row level security;

create policy "training_capacities: lectura para cualquier usuario autenticado"
  on public.training_capacities for select
  to authenticated
  using (true);

create table public.sport_profile_capacities (
  sport_profile_id uuid not null references public.sport_profiles (id) on delete cascade,
  capacity_id uuid not null references public.training_capacities (id) on delete cascade,
  importance smallint check (importance between 1 and 5),
  primary key (sport_profile_id, capacity_id)
);

alter table public.sport_profile_capacities enable row level security;

create policy "sport_profile_capacities: lectura autenticados"
  on public.sport_profile_capacities for select
  to authenticated
  using (true);
