-- MOVA — Formularios paso 6: el profesor puede aplicar respuestas del
-- formulario al perfil del alumno.
--
-- students.RLS solo tenía "el alumno edita su propia fila" (identidad) y
-- "el profesor ve la fila de sus alumnos" (015). Se agrega UPDATE para el
-- profesor sobre los alumnos que gestiona — mismos campos "de negocio"
-- (level, availability, equipment_access, notes, primary_sport_id,
-- status). La app siempre pide confirmación explícita antes de escribir
-- (CLAUDE.md §"NO modificar automáticamente el perfil del alumno").

drop policy if exists "students: el profesor del alumno actualiza el perfil" on public.students;
create policy "students: el profesor del alumno actualiza el perfil"
  on public.students for update
  to authenticated
  using (public.is_professor_of(id))
  with check (public.is_professor_of(id));
