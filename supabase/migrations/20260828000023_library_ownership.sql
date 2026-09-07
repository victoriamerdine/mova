-- MOVA — Biblioteca: dueño del ejercicio y aprobación de cambios.
--
-- Requerimiento de la usuaria:
--  * Todo ejercicio guarda quién lo agregó (added_by, informativo).
--  * El profesor elige al crearlo: asociarlo a su nombre (owner_id = él) o
--    dejarlo público (owner_id = null).
--  * Un ejercicio público lo puede editar/borrar cualquier profesor directo.
--  * Un ejercicio CON dueño solo lo edita/borra el dueño directo. Otro
--    profesor puede proponer un cambio → queda pendiente de aprobación del
--    dueño (exercise_change_requests).
--
-- Esta migración es idempotente para las políticas de escritura de
-- exercises/exercise_media/exercise_aliases — reemplaza y deja consistentes
-- las de 20260828000021 / 20260828000022.

-- ============================================================
-- 1) Columnas de autoría / propiedad
-- ============================================================
alter table public.exercises add column if not exists added_by uuid references public.professors (id);
alter table public.exercises add column if not exists owner_id uuid references public.professors (id);

comment on column public.exercises.added_by is
  'Profesor que agregó el ejercicio. Informativo, no cambia. Null en los ~1362 importados (base_original).';
comment on column public.exercises.owner_id is
  'Dueño del ejercicio a efectos de aprobación. Null = público (cualquier profesor lo edita directo). Con valor = solo el dueño edita directo; otro profesor propone y el dueño aprueba.';

create index if not exists exercises_owner_id_idx on public.exercises (owner_id);

-- Para poder mostrar "dueño: {nombre}" de un ejercicio de otro profesor, un
-- profesor necesita leer la fila professors y el nombre (profiles) de los
-- demás profesores. Nada sensible: professors solo tiene id/bio.
drop policy if exists "professors: un profesor ve a los demás" on public.professors;
create policy "professors: un profesor ve a los demás"
  on public.professors for select
  to authenticated
  using (exists (select 1 from public.professors p where p.id = (select auth.uid())));

drop policy if exists "profiles: un profesor ve perfiles de profesores" on public.profiles;
create policy "profiles: un profesor ve perfiles de profesores"
  on public.profiles for select
  to authenticated
  using (
    role = 'professor'
    and exists (select 1 from public.professors p where p.id = (select auth.uid()))
  );

-- ============================================================
-- 2) Solicitudes de cambio sobre ejercicios de otro dueño
-- ============================================================
create table if not exists public.exercise_change_requests (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  requested_by uuid not null references public.professors (id),
  -- Shape = ExerciseFormInput (lib/library.ts): name, patternId, muscleId,
  -- difficulty, description, instructions, videoUrl.
  proposed jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.professors (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ecr_exercise_id_idx on public.exercise_change_requests (exercise_id);
create index if not exists ecr_requested_by_idx on public.exercise_change_requests (requested_by);
create index if not exists ecr_status_idx on public.exercise_change_requests (status);

alter table public.exercise_change_requests enable row level security;

drop policy if exists "ecr: el solicitante crea" on public.exercise_change_requests;
create policy "ecr: el solicitante crea"
  on public.exercise_change_requests for insert
  to authenticated
  with check (requested_by = (select auth.uid()) and status = 'pending');

drop policy if exists "ecr: el solicitante y el dueño ven" on public.exercise_change_requests;
create policy "ecr: el solicitante y el dueño ven"
  on public.exercise_change_requests for select
  to authenticated
  using (
    requested_by = (select auth.uid())
    or exists (
      select 1 from public.exercises e
      where e.id = exercise_id and e.owner_id = (select auth.uid())
    )
  );

drop policy if exists "ecr: el dueño resuelve" on public.exercise_change_requests;
create policy "ecr: el dueño resuelve"
  on public.exercise_change_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id and e.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id and e.owner_id = (select auth.uid())
    )
  );

-- ============================================================
-- 3) Políticas de escritura de exercises — propio o público
--    (idempotente; reemplaza las de 021/022)
-- ============================================================
drop policy if exists "exercises: el profesor gestiona (alta directa)" on public.exercises;
create policy "exercises: alta"
  on public.exercises for insert
  to authenticated
  with check (
    exists (select 1 from public.professors p where p.id = (select auth.uid()))
    and status in ('active', 'pending_review')
    and (owner_id is null or owner_id = (select auth.uid()))
  );

drop policy if exists "exercises: el profesor edita" on public.exercises;
create policy "exercises: edita lo propio o lo público"
  on public.exercises for update
  to authenticated
  using (
    exists (select 1 from public.professors p where p.id = (select auth.uid()))
    and (owner_id is null or owner_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.professors p where p.id = (select auth.uid()))
    and (owner_id is null or owner_id = (select auth.uid()))
  );

drop policy if exists "exercises: el profesor borra" on public.exercises;
create policy "exercises: borra lo propio o lo público"
  on public.exercises for delete
  to authenticated
  using (
    exists (select 1 from public.professors p where p.id = (select auth.uid()))
    and (owner_id is null or owner_id = (select auth.uid()))
  );

-- media / aliases: cualquier profesor (el gate por dueño se hace sobre el
-- ejercicio, en la app / RPC).
drop policy if exists "exercise_media: el profesor gestiona" on public.exercise_media;
create policy "exercise_media: el profesor gestiona"
  on public.exercise_media for all
  to authenticated
  using (exists (select 1 from public.professors p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.professors p where p.id = (select auth.uid())));

drop policy if exists "exercise_aliases: el profesor gestiona" on public.exercise_aliases;
create policy "exercise_aliases: el profesor gestiona"
  on public.exercise_aliases for all
  to authenticated
  using (exists (select 1 from public.professors p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.professors p where p.id = (select auth.uid())));

-- ============================================================
-- 4) Aplicar una solicitud aprobada, atómico. El dueño la corre; RLS de
--    exercises (edita lo propio) deja pasar el UPDATE porque owner_id = él.
-- ============================================================
create or replace function public.apply_exercise_change_request(p_request_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.exercise_change_requests;
  d jsonb;
begin
  select * into r from public.exercise_change_requests where id = p_request_id;
  if not found or r.status <> 'pending' then
    raise exception 'La solicitud no existe o ya fue resuelta.';
  end if;
  if not exists (
    select 1 from public.exercises e where e.id = r.exercise_id and e.owner_id = (select auth.uid())
  ) then
    raise exception 'Solo el dueño del ejercicio puede aprobar el cambio.';
  end if;

  d := r.proposed;

  update public.exercises set
    canonical_name = coalesce(nullif(btrim(d->>'name'), ''), canonical_name),
    display_name   = coalesce(nullif(btrim(d->>'name'), ''), display_name),
    description     = nullif(btrim(d->>'description'), ''),
    instructions    = nullif(btrim(d->>'instructions'), ''),
    difficulty      = nullif(d->>'difficulty', ''),
    pattern_id      = nullif(d->>'patternId', '')::uuid,
    muscle_id       = nullif(d->>'muscleId', '')::uuid
  where id = r.exercise_id;

  delete from public.exercise_media where exercise_id = r.exercise_id and type = 'video';
  if coalesce(btrim(d->>'videoUrl'), '') <> '' then
    insert into public.exercise_media (exercise_id, type, url, source, is_primary)
    values (r.exercise_id, 'video', btrim(d->>'videoUrl'), 'youtube', true);
  end if;

  update public.exercise_change_requests
    set status = 'approved', reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = p_request_id;
end;
$$;

comment on function public.apply_exercise_change_request is
  'El dueño aprueba una solicitud de cambio: aplica los valores propuestos al ejercicio (mismo id) y marca la solicitud como approved. Una sola transacción.';
