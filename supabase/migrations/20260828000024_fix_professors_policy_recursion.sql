-- MOVA — Fix de la 20260828000023: la política "professors: un profesor ve
-- a los demás" hacía `exists (select 1 from public.professors ...)` en su
-- propio USING → al evaluar RLS de professors se re-evaluaba esa misma
-- política → "infinite recursion detected in policy for relation
-- professors". Rompía /biblioteca entero (getLibraryItems no podía leer).
--
-- professors solo tiene id/bio/created_at (nada sensible), así que la
-- lectura entre profesores se abre a cualquier usuario autenticado, sin
-- subconsulta.
--
-- profiles: se deja gateado a "el que consulta es profesor", pero como
-- professors ya no recursa, la subconsulta a professors ahí es segura.

drop policy if exists "professors: un profesor ve a los demás" on public.professors;
create policy "professors: lectura entre autenticados"
  on public.professors for select
  to authenticated
  using (true);

drop policy if exists "profiles: un profesor ve perfiles de profesores" on public.profiles;
create policy "profiles: un profesor ve perfiles de profesores"
  on public.profiles for select
  to authenticated
  using (
    role = 'professor'
    and exists (select 1 from public.professors p where p.id = (select auth.uid()))
  );
