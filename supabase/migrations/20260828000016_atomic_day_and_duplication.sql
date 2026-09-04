-- MOVA — Plan Builder: guardado y duplicación atómicos.
--
-- saveDay/duplicateWeek/duplicateDay (app/planes/[planId]/actions.ts) hacían
-- varios insert/delete/update seguidos vía PostgREST, que no expone
-- transacciones multi-statement — si algo fallaba a mitad de camino, el
-- día/semana podía quedar parcialmente guardado. Documentado como límite
-- conocido desde el primer commit del editor. Se resuelve moviendo cada
-- operación a UNA función de Postgres: un RPC = una transacción, atómico
-- por definición.
--
-- `security invoker` en las tres — a propósito, no `security definer`: RLS
-- se sigue evaluando fila por fila con las policies que ya existen
-- (is_professor_of vía workouts/workout_blocks), así que un profesor sin
-- permiso sobre ese workout/semana sigue sin poder escribir ahí, exactamente
-- igual que con los inserts sueltos que reemplazan. No cambia el modelo de
-- permisos, solo la atomicidad.

-- ============================================================
-- save_workout_day — reemplaza el body de saveDay().
-- ============================================================
create or replace function public.save_workout_day(p_workout_id uuid, p_blocks jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  block jsonb;
  item jsonb;
  block_kind text;
  block_has_rounds boolean;
  new_block_id uuid;
  new_item_id uuid;
  block_index smallint := 0;
  item_index smallint;
  is_exercise boolean;
begin
  delete from public.workout_blocks where workout_id = p_workout_id;

  for block in select * from jsonb_array_elements(p_blocks)
  loop
    if coalesce(jsonb_array_length(block->'items'), 0) = 0 then
      block_index := block_index + 1;
      continue;
    end if;

    block_kind := block->>'kind';
    block_has_rounds := block_kind in ('COMBINADO', 'CIRCUITO');

    insert into public.workout_blocks (workout_id, kind, rounds, "order")
    values (
      p_workout_id,
      block_kind,
      case when block_has_rounds then (block->>'rounds')::smallint else null end,
      block_index
    )
    returning id into new_block_id;

    item_index := 0;
    for item in select * from jsonb_array_elements(block->'items')
    loop
      is_exercise := (item->>'exerciseId') is not null;

      insert into public.training_items (block_id, kind, exercise_id, activity_name, label, "order")
      values (
        new_block_id,
        case when is_exercise then 'EXERCISE' else 'ACTIVITY' end,
        case when is_exercise then (item->>'exerciseId')::uuid else null end,
        case when is_exercise then null else coalesce(nullif(item->>'activityName', ''), 'Ejercicio sin nombre') end,
        item->>'label',
        item_index
      )
      returning id into new_item_id;

      insert into public.workout_prescriptions (training_item_id, sets, reps, intensity_rpe, rest_label, notes, "order")
      values (
        new_item_id,
        case when block_has_rounds then null else nullif(item->>'sets', '') end,
        nullif(item->>'reps', ''),
        nullif(item->>'intensityRpe', ''),
        nullif(item->>'restLabel', ''),
        nullif(item->>'notes', ''),
        item_index
      );

      item_index := item_index + 1;
    end loop;

    block_index := block_index + 1;
  end loop;
end;
$$;

comment on function public.save_workout_day is
  'Reemplaza TODOS los bloques/items/prescripciones de un workout por los del payload, en una sola transacción. p_blocks tiene el mismo shape que SaveDayBlockPayload[] (app/planes/[planId]/actions.ts).';

-- ============================================================
-- duplicate_workout — copia un día completo a otra semana (o a la misma,
-- para "duplicar día"). Reemplaza copyWorkoutContents() + el insert del
-- workout + el shift de hermanos que hacía duplicateDay en un loop de JS.
-- ============================================================
create or replace function public.duplicate_workout(
  p_source_workout_id uuid,
  p_target_week_id uuid,
  p_name text,
  p_order smallint,
  p_shift_siblings boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_workout_id uuid;
  b record;
  new_block_id uuid;
  i record;
  new_item_id uuid;
begin
  if p_shift_siblings then
    update public.workouts
    set "order" = "order" + 1
    where week_id = p_target_week_id and "order" >= p_order;
  end if;

  insert into public.workouts (week_id, name, "order", type, objective, estimated_duration_min)
  select p_target_week_id, p_name, p_order, type, objective, estimated_duration_min
  from public.workouts
  where id = p_source_workout_id
  returning id into new_workout_id;

  for b in select * from public.workout_blocks where workout_id = p_source_workout_id order by "order"
  loop
    insert into public.workout_blocks (workout_id, kind, rounds, rest_between_rounds_sec, "order")
    values (new_workout_id, b.kind, b.rounds, b.rest_between_rounds_sec, b."order")
    returning id into new_block_id;

    for i in select * from public.training_items where block_id = b.id order by "order"
    loop
      insert into public.training_items (block_id, kind, exercise_id, activity_id, activity_name, label, "order")
      values (new_block_id, i.kind, i.exercise_id, i.activity_id, i.activity_name, i.label, i."order")
      returning id into new_item_id;

      insert into public.workout_prescriptions (
        training_item_id, sets, reps, load_kg, load_percent, intensity_rpe,
        rest_label, time_sec, distance_m, pace, tempo, notes, "order"
      )
      select new_item_id, sets, reps, load_kg, load_percent, intensity_rpe,
             rest_label, time_sec, distance_m, pace, tempo, notes, "order"
      from public.workout_prescriptions
      where training_item_id = i.id;
    end loop;
  end loop;

  return new_workout_id;
end;
$$;

comment on function public.duplicate_workout is
  'Copia un workout (bloques/items/prescripciones) a p_target_week_id con nombre/orden nuevos. p_shift_siblings=true corre el "hacer lugar" que antes hacía duplicateDay en JS — usarlo al duplicar dentro de la misma semana, false al duplicar hacia una semana recién creada (duplicate_plan_week).';

-- ============================================================
-- duplicate_plan_week — reemplaza el loop de duplicateWeek().
-- ============================================================
create or replace function public.duplicate_plan_week(
  p_source_week_id uuid,
  p_new_number smallint,
  p_new_name text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_week_id uuid;
  w record;
  w_order smallint := 0;
begin
  insert into public.plan_weeks (plan_id, number, name)
  select plan_id, p_new_number, p_new_name
  from public.plan_weeks
  where id = p_source_week_id
  returning id into new_week_id;

  for w in select * from public.workouts where week_id = p_source_week_id order by "order"
  loop
    perform public.duplicate_workout(w.id, new_week_id, w.name, w_order, false);
    w_order := w_order + 1;
  end loop;

  return new_week_id;
end;
$$;

comment on function public.duplicate_plan_week is
  'Duplica una semana completa (todos sus días con sus bloques/items/prescripciones) en una sola transacción. Devuelve el id de la semana nueva.';
