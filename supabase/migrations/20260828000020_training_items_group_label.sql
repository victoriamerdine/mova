-- MOVA — Plan Builder: patrón/músculo como texto libre.
--
-- El editor mostraba un <select> de patrón/músculo con SOLO las opciones
-- del catálogo, y esa elección ni siquiera se persistía (se usaba solo
-- para el cálculo de volumen en vivo). La profe pidió poder escribir el
-- grupo a mano (o dejarlo vacío).
--
-- Se agrega training_items.group_label: el rótulo del grupo tal como lo
-- ve/escribe el entrenador. Si eligió una opción del catálogo se guarda su
-- nombre canónico ("Empuje"); si escribió libre, ese texto; si lo dejó
-- vacío, null. El volumen por grupo se agrupa por este rótulo normalizado
-- (en la app), así "Empuje" siempre suma junto sin depender de un id.

alter table public.training_items add column if not exists group_label text;

comment on column public.training_items.group_label is
  'Rótulo del grupo (patrón/músculo/zona) tal como lo puso el entrenador — texto libre. El volumen se agrupa por este valor normalizado en la aplicación.';

-- save_workout_day: escribir también group_label. Resto igual que
-- 20260828000019 (prescripción completa).
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

      insert into public.training_items
        (block_id, kind, exercise_id, activity_name, label, group_label, "order")
      values (
        new_block_id,
        case when is_exercise then 'EXERCISE' else 'ACTIVITY' end,
        case when is_exercise then (item->>'exerciseId')::uuid else null end,
        case when is_exercise then null else coalesce(nullif(item->>'activityName', ''), 'Ejercicio sin nombre') end,
        item->>'label',
        nullif(item->>'groupLabel', ''),
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
  'Reemplaza TODOS los bloques/items/prescripciones de un workout por los del payload, en una sola transacción. p_blocks tiene el mismo shape que SaveDayBlockPayload[] (app/planes/[planId]/actions.ts) — incluye carga/tiempo/distancia/ritmo/tempo (20260828000019) y group_label (20260828000020).';
