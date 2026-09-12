-- MOVA — el admin gestiona la biblioteca con las MISMAS reglas que un
-- profesor: edita directo lo público y lo suyo propio; si el ejercicio
-- tiene otro dueño, pasa por el flujo de solicitud de cambio existente
-- (apply_exercise_change_request, sin tocar acá) — no hay bypass total.
--
-- Las policies de escritura de exercises/exercise_media/exercise_aliases/
-- exercise_sports (20260828000021, 20260828000023, 20260828000025) exigen
-- literalmente `exists (select 1 from public.professors p where p.id =
-- auth.uid())`. Un admin no tiene fila en professors (20260828000008: "un
-- individual tiene fila en students, nunca en professors" — un admin
-- tampoco la tiene), así que queda bloqueado por RLS aunque la app se lo
-- permitiera. Se agrega `or public.is_admin()` a cada una, sin tocar la
-- lógica de ownership (owner_id null/propio) que ya tienen.

drop policy if exists "exercises: alta" on public.exercises;
create policy "exercises: alta"
  on public.exercises for insert
  to authenticated
  with check (
    (exists (select 1 from public.professors p where p.id = (select auth.uid())) or public.is_admin())
    and status in ('active', 'pending_review')
    and (owner_id is null or owner_id = (select auth.uid()))
  );

drop policy if exists "exercises: edita lo propio o lo público" on public.exercises;
create policy "exercises: edita lo propio o lo público"
  on public.exercises for update
  to authenticated
  using (
    (exists (select 1 from public.professors p where p.id = (select auth.uid())) or public.is_admin())
    and (owner_id is null or owner_id = (select auth.uid()))
  )
  with check (
    (exists (select 1 from public.professors p where p.id = (select auth.uid())) or public.is_admin())
    and (owner_id is null or owner_id = (select auth.uid()))
  );

drop policy if exists "exercises: borra lo propio o lo público" on public.exercises;
create policy "exercises: borra lo propio o lo público"
  on public.exercises for delete
  to authenticated
  using (
    (exists (select 1 from public.professors p where p.id = (select auth.uid())) or public.is_admin())
    and (owner_id is null or owner_id = (select auth.uid()))
  );

drop policy if exists "exercise_media: el profesor gestiona" on public.exercise_media;
create policy "exercise_media: el profesor gestiona"
  on public.exercise_media for all
  to authenticated
  using (exists (select 1 from public.professors p where p.id = (select auth.uid())) or public.is_admin())
  with check (exists (select 1 from public.professors p where p.id = (select auth.uid())) or public.is_admin());

drop policy if exists "exercise_aliases: el profesor gestiona" on public.exercise_aliases;
create policy "exercise_aliases: el profesor gestiona"
  on public.exercise_aliases for all
  to authenticated
  using (exists (select 1 from public.professors p where p.id = (select auth.uid())) or public.is_admin())
  with check (exists (select 1 from public.professors p where p.id = (select auth.uid())) or public.is_admin());

drop policy if exists "exercise_sports: el profesor gestiona" on public.exercise_sports;
create policy "exercise_sports: el profesor gestiona"
  on public.exercise_sports for all
  to authenticated
  using (exists (select 1 from public.professors p where p.id = (select auth.uid())) or public.is_admin())
  with check (exists (select 1 from public.professors p where p.id = (select auth.uid())) or public.is_admin());

-- ============================================================
-- FKs a professors(id) que un admin no puede satisfacer (no tiene fila en
-- professors — igual que un "individual", ver comentario de
-- profiles.role en 20260828000008). Se ensanchan a profiles(id): todo
-- professors.id ya es un profiles.id válido, así que no rompe filas
-- existentes, y ahora admite también un admin como dueño/solicitante/
-- revisor de un ejercicio o de una solicitud de cambio.
-- ============================================================
alter table public.exercises drop constraint if exists exercises_added_by_fkey;
alter table public.exercises
  add constraint exercises_added_by_fkey foreign key (added_by) references public.profiles (id);

alter table public.exercises drop constraint if exists exercises_owner_id_fkey;
alter table public.exercises
  add constraint exercises_owner_id_fkey foreign key (owner_id) references public.profiles (id);

alter table public.exercise_change_requests drop constraint if exists exercise_change_requests_requested_by_fkey;
alter table public.exercise_change_requests
  add constraint exercise_change_requests_requested_by_fkey
  foreign key (requested_by) references public.profiles (id);

alter table public.exercise_change_requests drop constraint if exists exercise_change_requests_reviewed_by_fkey;
alter table public.exercise_change_requests
  add constraint exercise_change_requests_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles (id);
