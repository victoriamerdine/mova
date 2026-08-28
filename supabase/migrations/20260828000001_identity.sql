-- MOVA — Fase 1: Identidad (profiles, professors, students, student_professors)
-- Ver docs/auditoria-03-arquitectura-objetivo.md sección D.1 (ya corregida por Auditoría 4).

-- ============================================================
-- profiles — 1 fila por usuario de Supabase Auth
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('professor', 'student', 'admin')),
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Identidad base de cada usuario. El rol determina si además tiene fila en professors o students.';

alter table public.profiles enable row level security;

create policy "profiles: cada usuario ve y edita su propio perfil"
  on public.profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- professors
-- ============================================================
create table public.professors (
  id uuid primary key references public.profiles (id) on delete cascade,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.professors enable row level security;

create policy "professors: cada profesor ve y edita su propia fila"
  on public.professors for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- students
-- ============================================================
create table public.students (
  id uuid primary key references public.profiles (id) on delete cascade,
  level text,
  primary_sport_id uuid, -- FK a sports, se agrega en 20260828000002 (evita orden circular)
  availability text,
  equipment_access text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;

create policy "students: el alumno ve y edita su propia fila"
  on public.students for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- student_professors — relación N:N, multi-profesor por alumno desde el día 1
-- (decisión confirmada por la usuaria — no restringir a un solo profesor)
-- ============================================================
create table public.student_professors (
  student_id uuid not null references public.students (id) on delete cascade,
  professor_id uuid not null references public.professors (id) on delete cascade,
  is_primary boolean not null default true,
  status text not null default 'active' check (status in ('active', 'invited', 'ended')),
  -- Auditoría 4 — Problema 7: reservado para cuando exista un co-profesor con acceso
  -- limitado. Sin UI en el MVP, pero ya modelado para no migrar el esquema después.
  permission_level text not null default 'full' check (permission_level in ('full', 'view_only')),
  created_at timestamptz not null default now(),
  primary key (student_id, professor_id)
);

comment on table public.student_professors is 'Multi-profesor por alumno confirmado desde el MVP (decisión de la usuaria, ver docs/auditoria-03).';

-- A lo sumo un profesor "is_primary=true" activo por alumno.
create unique index student_professors_one_primary_active
  on public.student_professors (student_id)
  where is_primary and status = 'active';

alter table public.student_professors enable row level security;

create policy "student_professors: el alumno ve sus propias relaciones"
  on public.student_professors for select
  using (student_id = auth.uid());

create policy "student_professors: el profesor ve sus propias relaciones"
  on public.student_professors for select
  using (professor_id = auth.uid());

create policy "student_professors: el profesor gestiona sus propias relaciones"
  on public.student_professors for insert
  with check (professor_id = auth.uid());

create policy "student_professors: el profesor actualiza sus relaciones"
  on public.student_professors for update
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

-- ============================================================
-- Funciones helper de RLS — reutilizadas por el resto de las migraciones.
-- STABLE (no SECURITY DEFINER): evalúan bajo los mismos permisos que el
-- llamador, apoyándose en las policies de student_professors de arriba.
-- ============================================================
create or replace function public.is_professor_of(target_student_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.student_professors sp
    where sp.student_id = target_student_id
      and sp.professor_id = auth.uid()
      and sp.status = 'active'
  );
$$;

comment on function public.is_professor_of is 'true si el usuario autenticado es un profesor activo (cualquier permission_level) de ese alumno.';

create or replace function public.is_own_student(target_student_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select target_student_id = auth.uid();
$$;

comment on function public.is_own_student is 'true si el usuario autenticado ES ese alumno. Nombrada aparte de un simple = para que las políticas de las próximas migraciones sean legibles y consistentes.';
