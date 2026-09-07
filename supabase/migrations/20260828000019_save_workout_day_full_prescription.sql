-- MOVA — Plan Builder: prescripción completa.
--
-- save_workout_day (20260828000016) solo escribía sets/reps/intensity_rpe/
-- rest_label/notes. El esquema de workout_prescriptions ya tiene load_kg,
-- load_percent, time_sec, distance_m, pace y tempo (Fase 1) — se completan
-- acá para que un plan de fuerza pueda llevar carga y uno de running/
-- ciclismo pueda llevar distancia, tiempo y ritmo.
--
-- Sigue siendo `security invoker`: RLS igual que antes. Solo cambia el
-- cuerpo de la función; la firma (p_workout_id, p_blocks jsonb) no se toca,
-- así que save_week_days no necesita cambios.
--
-- El payload por item ahora trae, además de lo anterior:
--   loadKg, loadPercent, timeSec, distanceM : número | null
--   pace, tempo                             : texto | null
-- El parseo de "5 km" / "3:30" a número vive en la app
-- (lib/prescription-format.ts) — acá solo se castea.

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

      insert into public.workout_prescriptions (
        training_item_id, sets, reps, load_kg, load_percent, intensity_rpe,
        rest_label, time_sec, distance_m, pace, tempo, notes, "order"
      )
      values (
        new_item_id,
        case when block_has_rounds then null else nullif(item->>'sets', '') end,
        nullif(item->>'reps', ''),
        nullif(item->>'loadKg', '')::numeric,
        nullif(item->>'loadPercent', '')::numeric,
        nullif(item->>'intensityRpe', ''),
        nullif(item->>'restLabel', ''),
        nullif(item->>'timeSec', '')::integer,
        nullif(item->>'distanceM', '')::integer,
        nullif(item->>'pace', ''),
        nullif(item->>'tempo', ''),
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
  'Reemplaza TODOS los bloques/items/prescripciones de un workout por los del payload, en una sola transacción. p_blocks tiene el mismo shape que SaveDayBlockPayload[] (app/planes/[planId]/actions.ts) — incluye carga, tiempo, distancia, ritmo y tempo desde 20260828000019.';
