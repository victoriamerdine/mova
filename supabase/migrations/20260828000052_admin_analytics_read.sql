-- MOVA — Panel de Analítica del admin: métricas agregadas (profesores,
-- alumnos, planes, deportes, horas de mayor tráfico, formularios) para
-- entender el uso del producto y armar el discurso comercial.
--
-- El admin ya podía leer profiles/professors/student_professors/plans
-- (migración 35) y students/plans/... (migración 40, "for all"). Para las
-- métricas de tráfico y formularios hace falta, además, LECTURA (no
-- escritura — el admin no opera estos datos, solo los mira agregados) de
-- workout_sessions, forms y form_submissions.

create policy "workout_sessions: el admin lee (analítica)"
  on public.workout_sessions for select
  to authenticated
  using (public.is_admin());

create policy "forms: el admin lee (analítica)"
  on public.forms for select
  to authenticated
  using (public.is_admin());

create policy "form_submissions: el admin lee (analítica)"
  on public.form_submissions for select
  to authenticated
  using (public.is_admin());
