-- MOVA — Objetivos de carga por alumno.
--
-- El profesor define, por alumno, el volumen (series/semana) y la
-- intensidad (RPE promedio) objetivo por patrón (o músculo). El editor de
-- plan muestra volumen/intensidad por patrón — semanal y por día — y marca
-- cuando se pasa del objetivo. Si un patrón no tiene objetivo cargado, se
-- muestra el valor sin límite.
--
-- group_id apunta a patterns.id o muscles.id según group_type. Sin FK
-- porque son dos tablas distintas y ambas son catálogo estático (8 y 18
-- filas, no se borran) — misma decisión que en otras partes del esquema de
-- no forzar polimorfismo con FK.

create table public.student_load_targets (
  student_id uuid not null references public.students (id) on delete cascade,
  group_type text not null check (group_type in ('pattern', 'muscle')),
  group_id uuid not null,
  target_weekly_series smallint,
  target_intensity numeric,
  updated_at timestamptz not null default now(),
  primary key (student_id, group_type, group_id)
);

comment on table public.student_load_targets is
  'Volumen (series/semana) e intensidad (RPE) objetivo por patrón/músculo, por alumno. Lo define el profesor. group_id = patterns.id o muscles.id según group_type.';

alter table public.student_load_targets enable row level security;

create policy "load_targets: el profesor del alumno gestiona"
  on public.student_load_targets for all
  using (public.is_professor_of(student_id))
  with check (public.is_professor_of(student_id));

create policy "load_targets: el alumno ve los suyos"
  on public.student_load_targets for select
  using (public.is_own_student(student_id));
