-- MOVA — Biblioteca: el profesor la gestiona directo (alta / edición /
-- borrado de ejercicios y su video). CLAUDE.md §12 y §49.
--
-- Hasta ahora la biblioteca era de solo lectura para la app: el único
-- INSERT permitido era el flujo de aprobación (20260828000009), que fuerza
-- pending_review y asume varios profesores + un aprobador. Para el MVP de
-- un profesor eso sobra: se agregan políticas para que un profesor cree,
-- edite y borre ejercicios (status 'active') y su media/aliases sin pasar
-- por aprobación. El flujo de aprobación queda intacto y sigue disponible.
--
-- "Borrar" un ejercicio en uso NO se hace acá (lo maneja la app: archiva
-- si algún training_items lo referencia, borra si no) — pero la política
-- de DELETE tiene que existir igual para el caso "no está en uso".

-- ============================================================
-- Helper legible (las políticas de la 009 lo inlinean).
-- ============================================================
create or replace function public.is_professor()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (select 1 from public.professors p where p.id = auth.uid());
$$;

comment on function public.is_professor is 'true si el usuario autenticado es un profesor.';

-- ============================================================
-- exercises: el profesor gestiona su biblioteca (directo, sin aprobación).
-- ============================================================
create policy "exercises: el profesor gestiona (alta directa)"
  on public.exercises for insert
  to authenticated
  with check (public.is_professor() and status in ('active', 'pending_review'));

create policy "exercises: el profesor edita"
  on public.exercises for update
  to authenticated
  using (public.is_professor())
  with check (public.is_professor());

create policy "exercises: el profesor borra"
  on public.exercises for delete
  to authenticated
  using (public.is_professor());

-- ============================================================
-- exercise_media / exercise_aliases: idem, para poder cargar/reemplazar el
-- video y conservar el nombre viejo como alias al renombrar.
-- ============================================================
create policy "exercise_media: el profesor gestiona"
  on public.exercise_media for all
  to authenticated
  using (public.is_professor())
  with check (public.is_professor());

create policy "exercise_aliases: el profesor gestiona"
  on public.exercise_aliases for all
  to authenticated
  using (public.is_professor())
  with check (public.is_professor());
