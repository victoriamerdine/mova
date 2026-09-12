-- MOVA — el admin ve y gestiona las cuentas y los planes de los alumnos
-- independientes (profiles.role = 'individual', ver 20260828000008).
--
-- El admin ya tenía SELECT en plans y student_professors (20260828000035),
-- y nada en students / plan_phases / plan_weeks / workouts /
-- workout_blocks / training_items / workout_prescriptions. Se le da acceso
-- total (is_admin() sin restricciones adicionales) a estas tablas — mismo
-- criterio de superusuario que ya tiene sobre profiles/professors, no se
-- restringe a "solo si el plan es de un individual" para no agregar lógica
-- condicional frágil: el admin ya podía leer cualquier plan.

drop policy if exists "students: el admin gestiona" on public.students;
create policy "students: el admin gestiona"
  on public.students for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "plans: el admin gestiona" on public.plans;
create policy "plans: el admin gestiona"
  on public.plans for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "plan_phases: el admin gestiona" on public.plan_phases;
create policy "plan_phases: el admin gestiona"
  on public.plan_phases for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "plan_weeks: el admin gestiona" on public.plan_weeks;
create policy "plan_weeks: el admin gestiona"
  on public.plan_weeks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "workouts: el admin gestiona" on public.workouts;
create policy "workouts: el admin gestiona"
  on public.workouts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "workout_blocks: el admin gestiona" on public.workout_blocks;
create policy "workout_blocks: el admin gestiona"
  on public.workout_blocks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "training_items: el admin gestiona" on public.training_items;
create policy "training_items: el admin gestiona"
  on public.training_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "workout_prescriptions: el admin gestiona" on public.workout_prescriptions;
create policy "workout_prescriptions: el admin gestiona"
  on public.workout_prescriptions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
