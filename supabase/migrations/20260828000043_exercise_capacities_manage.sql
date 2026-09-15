-- MOVA — Fase 4: capacidades físicas utilizables desde la biblioteca.
--
-- `training_capacities` y `exercise_capacities` (puente N:N) existen desde la
-- Fase 1 (20260828000002/20260828000003) pero solo tenían lectura — nadie las
-- usaba. Se agrega escritura para el profesor, mismo patrón que
-- 20260828000025_exercise_sports_manage.sql hizo para exercise_sports, y el
-- RPC de aprobación de cambios pasa a aplicar también las capacidades
-- propuestas.

drop policy if exists "exercise_capacities: el profesor gestiona" on public.exercise_capacities;
create policy "exercise_capacities: el profesor gestiona"
  on public.exercise_capacities for all
  to authenticated
  using (exists (select 1 from public.professors p where p.id = (select auth.uid())))
  with check (exists (select 1 from public.professors p where p.id = (select auth.uid())));

-- apply_exercise_change_request: además de nombre/patrón/músculo/video/deportes,
-- ahora también aplica el set de capacidades propuesto (proposed->'capacityIds').
create or replace function public.apply_exercise_change_request(p_request_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.exercise_change_requests;
  d jsonb;
  ref_id text;
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

  if d ? 'sportIds' then
    delete from public.exercise_sports where exercise_id = r.exercise_id;
    for ref_id in select jsonb_array_elements_text(d->'sportIds')
    loop
      insert into public.exercise_sports (exercise_id, sport_id)
      values (r.exercise_id, ref_id::uuid)
      on conflict do nothing;
    end loop;
  end if;

  if d ? 'capacityIds' then
    delete from public.exercise_capacities where exercise_id = r.exercise_id;
    for ref_id in select jsonb_array_elements_text(d->'capacityIds')
    loop
      insert into public.exercise_capacities (exercise_id, capacity_id)
      values (r.exercise_id, ref_id::uuid)
      on conflict do nothing;
    end loop;
  end if;

  update public.exercise_change_requests
    set status = 'approved', reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = p_request_id;
end;
$$;
