-- MOVA — Requerimiento nuevo de la usuaria: flujo de aprobación para
-- elementos nuevos de la biblioteca (exercises y activities). Cualquier
-- profesor puede proponer un elemento nuevo; queda en 'pending_review'
-- hasta que un profesor con rol de "aprobador" lo aprueba (pasa a
-- 'active') o lo rechaza (pasa a 'archived').
--
-- Resuelve de forma reutilizable, no puntual, la decisión pendiente de
-- Auditoría 2-L sobre los ~108 nombres "genuinamente ausentes": en vez
-- de decidir una vez a mano qué hacer con esa lista, se cargan (si se
-- quiere) como propuestas en 'pending_review' y se aprueban desde el
-- propio producto, cuando la usuaria quiera, no como parte de esta
-- migración.
--
-- `exercises.status` ya tenía 'pending_review' desde la Fase 1 (existía
-- el valor, no el flujo alrededor). `activities` no tenía columna
-- `status` — se agrega acá porque hasta ahora nadie podía insertar una
-- activity vía RLS (solo el import por service_role), así que no hacía
-- falta.

-- ============================================================
-- 1) Quién puede aprobar
-- ============================================================
alter table public.professors add column is_approver boolean not null default false;

comment on column public.professors.is_approver is
  'Profesor con permiso para aprobar/rechazar elementos de la biblioteca propuestos por cualquier profesor. No hay UI para asignarlo todavía — se setea a mano (SQL Editor) hasta que el producto lo necesite.';

create or replace function public.is_approver()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.professors p
    where p.id = auth.uid() and p.is_approver = true
  );
$$;

comment on function public.is_approver is
  'true si el usuario autenticado es un profesor con is_approver=true.';

-- ============================================================
-- 2) activities: mismo campo status que exercises, más el rastro de
--    quién propuso y quién revisó.
-- ============================================================
alter table public.activities
  add column status text not null default 'active' check (status in ('active', 'pending_review', 'archived')),
  add column proposed_by uuid references public.professors (id),
  add column reviewed_by uuid references public.professors (id),
  add column reviewed_at timestamptz;

create index activities_status_idx on public.activities (status);

alter table public.exercises
  add column proposed_by uuid references public.professors (id),
  add column reviewed_by uuid references public.professors (id),
  add column reviewed_at timestamptz;

comment on column public.exercises.status is
  '''active'' = visible y utilizable en planes. ''pending_review'' = propuesto por un profesor, todavía sin aprobar. ''archived'' = rechazado o dado de baja.';

-- ============================================================
-- 3) RLS: cualquier profesor propone (siempre en pending_review, nunca
--    se autoaprueba); solo un aprobador puede pasar de pending_review a
--    active/archived. La biblioteca importada (source='base_original')
--    queda fuera de este flujo — ya nace 'active' vía service_role.
-- ============================================================
create policy "exercises: cualquier profesor propone"
  on public.exercises for insert
  to authenticated
  with check (
    exists (select 1 from public.professors p where p.id = auth.uid())
    and status = 'pending_review'
    and proposed_by = auth.uid()
    and reviewed_by is null
    and reviewed_at is null
  );

create policy "exercises: un aprobador resuelve lo pendiente"
  on public.exercises for update
  using (status = 'pending_review' and public.is_approver())
  with check (public.is_approver());

create policy "activities: cualquier profesor propone"
  on public.activities for insert
  to authenticated
  with check (
    exists (select 1 from public.professors p where p.id = auth.uid())
    and status = 'pending_review'
    and proposed_by = auth.uid()
    and reviewed_by is null
    and reviewed_at is null
  );

create policy "activities: un aprobador resuelve lo pendiente"
  on public.activities for update
  using (status = 'pending_review' and public.is_approver())
  with check (public.is_approver());

-- ============================================================
-- 4) Trigger: reviewed_by/reviewed_at los completa el sistema en el
--    momento real de la aprobación/rechazo, no la aplicación — mismo
--    criterio que ya se usó para plan_drafts y para workouts.professor_id
--    (no confiar en que el cliente mande el dato correcto).
-- ============================================================
create or replace function public.stamp_library_review()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status = 'pending_review' and new.status in ('active', 'archived') then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

create trigger exercises_stamp_review
  before update on public.exercises
  for each row
  execute function public.stamp_library_review();

create trigger activities_stamp_review
  before update on public.activities
  for each row
  execute function public.stamp_library_review();
