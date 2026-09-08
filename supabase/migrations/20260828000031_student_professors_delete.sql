-- MOVA — Fix: "eliminar alumno" no hacía nada.
--
-- `removeStudent` (app/alumnos/actions.ts) borra la fila de
-- `student_professors` (relación profesor↔alumno, no la cuenta). Pero la
-- tabla tenía policies de select / insert / update para el profesor y
-- NINGUNA de delete → el `.delete()` matcheaba 0 filas bajo RLS, sin
-- error, y el alumno seguía apareciendo.

create policy "student_professors: el profesor borra sus relaciones"
  on public.student_professors for delete
  to authenticated
  using (professor_id = (select auth.uid()));
