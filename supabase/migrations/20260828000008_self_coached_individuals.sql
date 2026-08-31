-- MOVA — Requerimiento nuevo de la usuaria (post Auditoría 4): un individuo
-- SIN profesor también puede crearse un plan, pero únicamente para sí mismo
-- (nunca para otra persona). A estos individuos se los factura por el uso
-- de la plataforma; a los profesores no.
--
-- Esto amplía el alcance de CLAUDE.md §2 (que solo describía "profesor crea
-- alumnos"), así que queda documentado acá y en
-- docs/auditoria-03-arquitectura-objetivo.md en vez de asumirse en silencio.
--
-- Decisión de diseño: NO se crea una tabla nueva. `plans.professor_id` pasa
-- a ser nullable — un plan sin profesor es, por definición, autocoacheado.
-- La regla "solo para sí mismo" la impone RLS: la única política que
-- permite escribir un plan con professor_id NULL exige
-- is_own_student(student_id), es decir, que el creador y el alumno del plan
-- sean la misma persona. No hace falta ninguna tabla ni columna nueva para
-- representar "individuo" — ya existe `students`, que hoy modela a
-- cualquier persona que ejecuta un plan, tenga o no profesor.
--
-- Facturación: se modela solo el HECHO ya confirmado (role='individual' es
-- quien se factura, role='professor'/'student' no) — no se inventa un
-- proveedor de pago, ni estados de suscripción, ni precios: eso sigue
-- siendo una decisión pendiente de la usuaria (ver docs/auditoria-03...
-- sección L).

-- ============================================================
-- 1) Nuevo rol
-- ============================================================
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('professor', 'student', 'individual', 'admin'));

comment on column public.profiles.role is
  'profesor y alumno tal como ya existían. "individual" = persona sin profesor que arma sus propios planes — es la única condición que se factura (ver comentario de plans.professor_id). Un "individual" tiene fila en students, nunca en professors.';

-- ============================================================
-- 2) plans.professor_id pasa a ser opcional
-- ============================================================
alter table public.plans alter column professor_id drop not null;

comment on column public.plans.professor_id is
  'NULL = plan autocoacheado (el propio alumno lo arma para sí mismo — requerimiento nuevo de la usuaria, no estaba en el CLAUDE.md original). RLS exige is_own_student(student_id) para cualquier escritura con professor_id NULL, así que un individuo nunca puede crear este tipo de plan para otra persona.';

create policy "plans: el individuo autocoacheado gestiona su propio plan"
  on public.plans for all
  using (professor_id is null and public.is_own_student(student_id))
  with check (professor_id is null and public.is_own_student(student_id));

create policy "plan_phases: el individuo autocoacheado gestiona"
  on public.plan_phases for all
  using (exists (
    select 1 from public.plans p
    where p.id = plan_id and p.professor_id is null and public.is_own_student(p.student_id)
  ))
  with check (exists (
    select 1 from public.plans p
    where p.id = plan_id and p.professor_id is null and public.is_own_student(p.student_id)
  ));

create policy "plan_weeks: el individuo autocoacheado inserta"
  on public.plan_weeks for insert
  with check (exists (
    select 1 from public.plans p
    where p.id = plan_id and p.professor_id is null and public.is_own_student(p.student_id)
  ));

create policy "plan_weeks: el individuo autocoacheado actualiza"
  on public.plan_weeks for update
  using (exists (
    select 1 from public.plans p
    where p.id = plan_id and p.professor_id is null and public.is_own_student(p.student_id)
  ))
  with check (exists (
    select 1 from public.plans p
    where p.id = plan_id and p.professor_id is null and public.is_own_student(p.student_id)
  ));

create policy "plan_weeks: el individuo autocoacheado borra"
  on public.plan_weeks for delete
  using (exists (
    select 1 from public.plans p
    where p.id = plan_id and p.professor_id is null and public.is_own_student(p.student_id)
  ));

-- ============================================================
-- 3) workouts: se denormaliza professor_id igual que student_id
--    (mismo criterio que Auditoría 4, Problema 5 — evita que la política
--    de acá abajo tenga que subir por week → plan en cada fila).
-- ============================================================
alter table public.workouts add column professor_id uuid references public.professors (id);
create index workouts_professor_id_idx on public.workouts (professor_id);

comment on column public.workouts.professor_id is
  'Denormalizado desde plans.professor_id, igual que student_id (Auditoría 4, Problema 5). NULL si el plan es autocoacheado. Lo mantiene el trigger de abajo, no la aplicación.';

create policy "workouts: el individuo autocoacheado gestiona"
  on public.workouts for all
  using (professor_id is null and public.is_own_student(student_id))
  with check (professor_id is null and public.is_own_student(student_id));

create policy "workout_blocks: el individuo autocoacheado gestiona"
  on public.workout_blocks for all
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.professor_id is null and public.is_own_student(w.student_id)
  ))
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.professor_id is null and public.is_own_student(w.student_id)
  ));

create policy "training_items: el individuo autocoacheado gestiona"
  on public.training_items for all
  using (exists (
    select 1 from public.workout_blocks b
    join public.workouts w on w.id = b.workout_id
    where b.id = block_id and w.professor_id is null and public.is_own_student(w.student_id)
  ))
  with check (exists (
    select 1 from public.workout_blocks b
    join public.workouts w on w.id = b.workout_id
    where b.id = block_id and w.professor_id is null and public.is_own_student(w.student_id)
  ));

create policy "workout_prescriptions: el individuo autocoacheado gestiona"
  on public.workout_prescriptions for all
  using (exists (
    select 1 from public.training_items ti
    join public.workout_blocks b on b.id = ti.block_id
    join public.workouts w on w.id = b.workout_id
    where ti.id = training_item_id and w.professor_id is null and public.is_own_student(w.student_id)
  ))
  with check (exists (
    select 1 from public.training_items ti
    join public.workout_blocks b on b.id = ti.block_id
    join public.workouts w on w.id = b.workout_id
    where ti.id = training_item_id and w.professor_id is null and public.is_own_student(w.student_id)
  ));

-- ============================================================
-- 4) Trigger: workouts.student_id / professor_id siempre reflejan al
--    plan real, la aplicación no los setea a mano. Corrige de paso un
--    hueco que ya existía desde la Fase 1: student_id era denormalizado
--    pero nada garantizaba que coincidiera con el plan — ahora tampoco
--    hace falta que la aplicación lo calcule, se autocompleta.
-- ============================================================
create or replace function public.sync_workout_denormalized_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  plan_row record;
begin
  select p.student_id, p.professor_id into plan_row
  from public.plan_weeks pw
  join public.plans p on p.id = pw.plan_id
  where pw.id = new.week_id;

  if plan_row is null then
    raise exception 'workouts.week_id (%) no corresponde a ningún plan_weeks válido.', new.week_id;
  end if;

  new.student_id := plan_row.student_id;
  new.professor_id := plan_row.professor_id;

  return new;
end;
$$;

create trigger workouts_sync_denormalized_fields
  before insert or update of week_id on public.workouts
  for each row
  execute function public.sync_workout_denormalized_fields();
