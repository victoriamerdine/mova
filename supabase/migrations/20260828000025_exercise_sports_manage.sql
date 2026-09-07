-- MOVA — Biblioteca: taggear ejercicios por deporte.
--
-- `sports` (catálogo, ya sembrado) y `exercise_sports` (puente N:N) existen
-- desde la Fase 1. exercise_sports solo tenía lectura — se agrega escritura
-- para el profesor, y el RPC de aprobación de cambios pasa a aplicar
-- también los deportes propuestos.

drop policy if exists "exercise_sports: el profesor gestiona" on public.exercise_sports;
create policy "exercise_sports: el profesor gestiona"
  on public.exercise_sports for all
  to authenticated
  using (exists (select 1 from public.professors p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.professors p where p.id = (select auth.uid())));

-- apply_exercise_change_request: además de nombre/patrón/músculo/video, aplica
-- el set de deportes propuesto (proposed->'sportIds' = array de uuid).
create or replace function public.apply_exercise_change_request(p_request_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.exercise_change_requests;
  d jsonb;
  sport_id text;
begin
  select * into r from public.exercise_change_requests where id = p_request_id;
  if not found or r.status <> 'pending' then
    raise exception 'La solicitud no existe o ya fue resuelta.';
  end if;
  if not exists (
    select 1 from public.exercises e where e.id = r.exercise_id and e.owner_id = (select auth.uid())
  ) then
    raise exception 'Solo el dueño del ejercicio puede aprobar el cambio.';
  end if;

  d := r.proposed;

  update public.exercises set
    canonical_name = coalesce(nullif(btrim(d->>'name'), ''), canonical_name),
    display_name   = coalesce(nullif(btrim(d->>'name'), ''), display_name),
    description     = nullif(btrim(d->>'description'), ''),
    instructions    = nullif(btrim(d->>'instructions'), ''),
    difficulty      = nullif(d->>'difficulty', ''),
    pattern_id      = nullif(d->>'patternId', '')::uuid,
    muscle_id       = nullif(d->>'muscleId', '')::uuid
  where id = r.exercise_id;

  delete from public.exercise_media where exercise_id = r.exercise_id and type = 'video';
  if coalesce(btrim(d->>'videoUrl'), '') <> '' then
    insert into public.exercise_media (exercise_id, type, url, source, is_primary)
    values (r.exercise_id, 'video', btrim(d->>'videoUrl'), 'youtube', true);
  end if;

  -- deportes: si el payload trae la clave sportIds (aunque sea []), se
  -- reemplaza el set completo.
  if d ? 'sportIds' then
    delete from public.exercise_sports where exercise_id = r.exercise_id;
    for sport_id in select jsonb_array_elements_text(d->'sportIds')
    loop
      insert into public.exercise_sports (exercise_id, sport_id)
      values (r.exercise_id, sport_id::uuid)
      on conflict do nothing;
    end loop;
  end if;

  update public.exercise_change_requests
    set status = 'approved', reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = p_request_id;
end;
$$;
