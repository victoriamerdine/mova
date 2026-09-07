-- MOVA — Fix de la 20260828000021: el INSERT en exercises seguía dando
-- "new row violates row-level security policy". Dos cambios:
--
-- 1) Idempotente: `drop policy if exists` antes de cada `create policy`, así
--    re-correr esto (o la 021) nunca falla por nombre repetido — si la 021
--    quedó a medio aplicar, esto la deja consistente.
--
-- 2) Se inlinea el chequeo en vez de depender de `public.is_professor()`, y
--    `auth.uid()` va envuelto en `(select auth.uid())` — patrón recomendado
--    para RLS (se evalúa una vez, estable, y evita el caso en que una
--    función `security invoker` referenciada desde la policy devuelve un
--    resultado distinto al esperado dentro del contexto de evaluación).

-- is_professor() se deja definida (por si se usa en otro lado), pero las
-- policies ya no dependen de ella.
create or replace function public.is_professor()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (select 1 from public.professors p where p.id = (select auth.uid()));
$$;

-- ============================================================
-- exercises
-- ============================================================
drop policy if exists "exercises: el profesor gestiona (alta directa)" on public.exercises;
create policy "exercises: el profesor gestiona (alta directa)"
  on public.exercises for insert
  to authenticated
  with check (
    exists (select 1 from public.professors p where p.id = (select auth.uid()))
    and status in ('active', 'pending_review')
  );

drop policy if exists "exercises: el profesor edita" on public.exercises;
create policy "exercises: el profesor edita"
  on public.exercises for update
  to authenticated
  using (exists (select 1 from public.professors p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.professors p where p.id = (select auth.uid())));

drop policy if exists "exercises: el profesor borra" on public.exercises;
create policy "exercises: el profesor borra"
  on public.exercises for delete
  to authenticated
  using (exists (select 1 from public.professors p where p.id = (select auth.uid())));

-- ============================================================
-- exercise_media / exercise_aliases
-- ============================================================
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
