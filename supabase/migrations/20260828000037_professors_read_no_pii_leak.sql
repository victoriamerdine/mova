-- MOVA — Fix de privacidad tras la migración 035.
--
-- La migración 024 dejó la lectura de `professors` abierta a cualquier
-- usuario autenticado ("professors: lectura entre autenticados",
-- using (true)) con el argumento de que la tabla "solo tiene id/bio/
-- created_at (nada sensible)".
--
-- La 035 le agregó document_id, phone, address y status → ahora ESA
-- policy filtra datos personales de todos los profesores a cualquier
-- alumno/profesor logueado. Se restringe a: la propia fila o un admin.
--
-- Nada en la app lee filas de OTROS profesores desde `professors` (los
-- nombres se resuelven vía `profiles`), así que acotarlo no rompe nada.

drop policy if exists "professors: lectura entre autenticados" on public.professors;

create policy "professors: cada uno ve su fila (o el admin, todo)"
  on public.professors for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin());
