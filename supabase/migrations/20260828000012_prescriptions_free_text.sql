-- MOVA — Panel del profesor (spec basada en Focus Entrena real, con
-- mejoras): "todo campo numérico visible al usuario (series, repeticiones,
-- intensidad, pausas) debe tratarse como texto libre en el modelo de
-- datos — el trainer no siempre escribe números limpios."
--
-- `reps` y `rest_label` ya eran texto libre desde la Fase 1 (Auditoría 2
-- ya había encontrado "8-6-4-4" real en la planilla). `sets` e
-- `intensity_rpe` seguían siendo `numeric` — se relajan acá para que
-- "3-4" o "al fallo" no rompan nada. El cálculo de volumen/intensidad se
-- hace en la aplicación (no en SQL) con parseo numérico tolerante, tal
-- como especifica la spec — así no hace falta que la base sepa qué es
-- "número válido".

alter table public.workout_prescriptions
  alter column sets type text using sets::text;

alter table public.workout_prescriptions
  alter column intensity_rpe type text using intensity_rpe::text;

comment on column public.workout_prescriptions.sets is
  'Texto libre — puede ser "4", "3-4" o vacío. El volumen se calcula en la aplicación con parseo numérico tolerante, no en SQL.';

comment on column public.workout_prescriptions.intensity_rpe is
  'Texto libre — puede ser "8", "8-9" o una palabra ("al fallo"). Igual que sets: el cálculo tolerante vive en la aplicación.';

-- El trigger de Auditoría 4 (Problema 9) comparaba `new.sets is not null`
-- para bloquear sets en bloques COMBINADO/CIRCUITO — con sets como texto
-- sigue funcionando igual (NULL sigue siendo NULL), pero se agrega el caso
-- de string vacío para que sea equivalente en la práctica a "no cargado".
create or replace function public.enforce_sets_null_when_block_has_rounds()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  block_kind text;
begin
  select b.kind into block_kind
  from public.training_items ti
  join public.workout_blocks b on b.id = ti.block_id
  where ti.id = new.training_item_id;

  if block_kind in ('COMBINADO', 'CIRCUITO') and new.sets is not null and btrim(new.sets) <> '' then
    raise exception 'workout_prescriptions.sets debe estar vacío cuando el bloque es COMBINADO o CIRCUITO — la cantidad de vueltas se define en workout_blocks.rounds (ver Auditoría 4, Problema 9).';
  end if;

  return new;
end;
$$;
