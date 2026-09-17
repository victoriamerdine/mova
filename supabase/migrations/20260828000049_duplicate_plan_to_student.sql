-- MOVA — Plan Builder: duplicar un plan ya armado y asignárselo a OTRO
-- alumno (ej. una plantilla de fuerza general que ya usó con un alumno,
-- reutilizada para uno nuevo). Nunca copia ejecución real: workout_sessions
-- / workout_performance quedan atados al workout_id original, que no se
-- toca — los workouts de la copia son filas nuevas sin ningún registro.
--
-- Reutiliza duplicate_workout (20260828000016) para bloques/items/
-- prescripciones de cada día — misma lógica que ya usan "duplicar semana"
-- y "duplicar día", solo que ahora el plan_weeks destino pertenece a un
-- plan (y por lo tanto a un alumno) distinto del original.
--
-- security invoker a propósito: RLS hace las dos verificaciones que
-- importan sin lógica extra acá —
--   1) el `select ... where id = p_source_plan_id` de abajo solo trae
--      filas si is_professor_of(alumno origen) es cierto;
--   2) el insert en plans exige is_professor_of(p_target_student_id).
-- Si el profesor no es dueño de alguno de los dos alumnos, la función
-- falla sola (new_plan_id queda null, o el insert es rechazado).

create or replace function public.duplicate_plan_to_student(
  p_source_plan_id uuid,
  p_target_student_id uuid,
  p_new_name text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_plan_id uuid;
  ph record;
  new_phase_id uuid;
  phase_map jsonb := '{}'::jsonb;
  w record;
  new_week_id uuid;
  wo record;
  w_order smallint;
begin
  insert into public.plans (
    student_id, professor_id, sport_id, sport_profile_id, name, objective,
    level, plan_type, start_date, status
  )
  select p_target_student_id, auth.uid(), sport_id, sport_profile_id,
         p_new_name, objective, level, plan_type, current_date, 'active'
  from public.plans
  where id = p_source_plan_id
  returning id into new_plan_id;

  if new_plan_id is null then
    raise exception 'Plan de origen no encontrado (o sin permiso).';
  end if;

  for ph in select * from public.plan_phases where plan_id = p_source_plan_id order by "order"
  loop
    insert into public.plan_phases (plan_id, name, kind, "order")
    values (new_plan_id, ph.name, ph.kind, ph."order")
    returning id into new_phase_id;
    phase_map := phase_map || jsonb_build_object(ph.id::text, new_phase_id::text);
  end loop;

  for w in select * from public.plan_weeks where plan_id = p_source_plan_id order by number
  loop
    insert into public.plan_weeks (plan_id, phase_id, number, name)
    values (
      new_plan_id,
      case when w.phase_id is not null then (phase_map ->> w.phase_id::text)::uuid else null end,
      w.number,
      w.name
    )
    returning id into new_week_id;

    w_order := 0;
    for wo in select * from public.workouts where week_id = w.id order by "order"
    loop
      perform public.duplicate_workout(wo.id, new_week_id, wo.name, w_order, false);
      w_order := w_order + 1;
    end loop;
  end loop;

  return new_plan_id;
end;
$$;

comment on function public.duplicate_plan_to_student is
  'Duplica un plan entero (fases/semanas/días/bloques/items/prescripciones) hacia OTRO alumno. Nunca copia workout_sessions/workout_performance del alumno original — quedan atados a los workout_id viejos, que no se tocan. professor_id de la copia es quien llama (auth.uid()), no el dueño del plan original.';
