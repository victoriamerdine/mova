-- MOVA — Fase 1: Ejecución (docs/auditoria-03-arquitectura-objetivo.md sección D.5)
-- Lo que el alumno realmente hizo, comparable contra workout_prescriptions (PROGRAMADO vs REALIZADO).

create table public.workout_performance (
  id uuid primary key default gen_random_uuid(),
  training_item_id uuid not null references public.training_items (id) on delete cascade,
  student_id uuid not null references public.students (id), -- denormalizado (Auditoría 4, Problema 5)
  set_number smallint not null,
  actual_load_kg numeric,
  actual_reps text,
  actual_duration_sec integer,
  actual_distance_m numeric,
  actual_pace text,
  rpe numeric,
  completed_at timestamptz not null default now(),
  comments text
);

create index workout_performance_training_item_id_idx on public.workout_performance (training_item_id);
create index workout_performance_student_id_idx on public.workout_performance (student_id);

alter table public.workout_performance enable row level security;

create policy "workout_performance: el alumno ve lo suyo"
  on public.workout_performance for select
  using (public.is_own_student(student_id));

create policy "workout_performance: el alumno registra lo suyo"
  on public.workout_performance for insert
  with check (public.is_own_student(student_id));

create policy "workout_performance: el alumno corrige lo suyo"
  on public.workout_performance for update
  using (public.is_own_student(student_id))
  with check (public.is_own_student(student_id));

create policy "workout_performance: el alumno borra lo suyo"
  on public.workout_performance for delete
  using (public.is_own_student(student_id));

create policy "workout_performance: el profesor del alumno solo lee"
  on public.workout_performance for select
  using (public.is_professor_of(student_id));

-- Integridad: student_id debe corresponder al alumno dueño del training_item
-- referenciado (evita que, aunque las policies de RLS ya lo impidan indirectamente,
-- quede una fila con datos incoherentes entre sí).
create or replace function public.enforce_performance_student_matches_workout()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_student_id uuid;
begin
  select w.student_id into owner_student_id
  from public.training_items ti
  join public.workout_blocks b on b.id = ti.block_id
  join public.workouts w on w.id = b.workout_id
  where ti.id = new.training_item_id;

  if owner_student_id is distinct from new.student_id then
    raise exception 'workout_performance.student_id (%) no coincide con el alumno dueño del training_item (%).', new.student_id, owner_student_id;
  end if;

  return new;
end;
$$;

create trigger workout_performance_enforce_student_match
  before insert or update on public.workout_performance
  for each row
  execute function public.enforce_performance_student_matches_workout();
