-- MOVA — Plan Builder: guardar todos los días de la semana de una vez.
--
-- El Constructor ahora mantiene en memoria lo que se va cargando en cada
-- día (navegar entre días no pierde nada) y guarda todo junto con
-- "Guardar plan". Esta función recibe el array de días
-- ({workoutId, blocks}) y llama a save_workout_day
-- (20260828000016_atomic_day_and_duplication.sql) por cada uno — todo
-- dentro de UNA transacción de Postgres: o se guarda el plan entero o no
-- se guarda nada.
--
-- security invoker: RLS se sigue evaluando igual que save_workout_day,
-- no cambia el modelo de permisos.

create or replace function public.save_week_days(p_days jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  d jsonb;
begin
  for d in select * from jsonb_array_elements(p_days)
  loop
    perform public.save_workout_day((d ->> 'workoutId')::uuid, d -> 'blocks');
  end loop;
end;
$$;

comment on function public.save_week_days is
  'Guarda varios días de una semana en una sola transacción. p_days = [{workoutId, blocks:[...]}], mismo shape de blocks que save_workout_day / SaveDayBlockPayload[].';
