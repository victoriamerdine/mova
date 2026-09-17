-- MOVA — Fase 7 / Sistema de formularios: `/alumno/formularios` (el alumno
-- ve las respuestas de los formularios que completó) necesita leer, para
-- SU PROPIA submission, el nombre del formulario (`forms.name`) y la
-- estructura congelada (`form_versions.structure`) — hasta ahora esas dos
-- tablas solo eran legibles por el profesor dueño (o plantillas del
-- sistema). Este gap era invisible porque `getStudentSubmissions`/
-- `getSubmissionDetail` solo se habían llamado desde el contexto del
-- profesor; `/alumno/formularios` es el primer caller que corre bajo la
-- sesión del alumno, y el join anidado (`forms(name)`, `form_versions
-- (structure)`) volvía null en silencio por RLS — no un error, un dato
-- vacío ("Formulario", "0 preguntas").

create policy "forms: el alumno ve el formulario de su propia submission"
  on public.forms for select
  to authenticated
  using (
    exists (
      select 1 from public.form_submissions s
      where s.form_id = forms.id and s.student_id = (select auth.uid())
    )
  );

create policy "form_versions: el alumno ve la version de su propia submission"
  on public.form_versions for select
  to authenticated
  using (
    exists (
      select 1 from public.form_submissions s
      where s.form_version_id = form_versions.id and s.student_id = (select auth.uid())
    )
  );
