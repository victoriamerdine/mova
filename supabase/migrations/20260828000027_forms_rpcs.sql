-- MOVA — Formularios. PASO 2: RPCs.
--
--  * publish_form            — congela el borrador en form_versions.structure
--  * create_form_from_template / duplicate_form / save_form_as_template
--                            — deep-copy con remapeo de ids (incluye reglas)
--  * get_submission / start_submission / save_submission_answers /
--    complete_submission     — acceso del alumno anónimo POR TOKEN
--                             (security definer; anon no tiene grants a las
--                             tablas)
--
-- Los deep-copy y publish son `security invoker`: RLS sigue aplicando
-- (can_read_form / can_manage_form). Los de token son `security definer`
-- porque el alumno no está autenticado; cada uno acota TODO a la única
-- submission cuyo token coincide.

-- ============================================================
-- publish_form — serializa secciones/preguntas/opciones/reglas del
-- borrador en un snapshot inmutable y marca el formulario como publicado.
-- ============================================================
create or replace function public.publish_form(p_form_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_next smallint;
  v_structure jsonb;
  v_version_id uuid;
begin
  if not exists (
    select 1 from public.forms f where f.id = p_form_id and f.professor_id = (select auth.uid())
  ) then
    raise exception 'No podés publicar este formulario.';
  end if;

  select coalesce(max(version), 0) + 1 into v_next
  from public.form_versions where form_id = p_form_id;

  select jsonb_build_object(
    'sections', coalesce((
      select jsonb_agg(sec order by ord)
      from (
        select s."order" as ord, jsonb_build_object(
          'id', s.id, 'order', s."order", 'title', s.title,
          'description', s.description, 'sensitive', s.sensitive,
          'questions', coalesce((
            select jsonb_agg(q order by ord)
            from (
              select qq."order" as ord, jsonb_build_object(
                'id', qq.id, 'order', qq."order", 'type', qq.type, 'label', qq.label,
                'helpText', qq.help_text, 'required', qq.required, 'sensitive', qq.sensitive,
                'config', qq.config,
                'options', coalesce((
                  select jsonb_agg(jsonb_build_object(
                    'id', o.id, 'order', o."order", 'value', o.value, 'label', o.label
                  ) order by o."order")
                  from public.form_question_options o where o.question_id = qq.id
                ), '[]'::jsonb)
              ) as q
              from public.form_questions qq where qq.section_id = s.id
            ) qs
          ), '[]'::jsonb)
        ) as sec
        from public.form_sections s where s.form_id = p_form_id
      ) ss
    ), '[]'::jsonb),
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'order', r."order", 'when', r."when",
        'match', r."match", 'action', r.action, 'target', r.target
      ) order by r."order")
      from public.form_rules r where r.form_id = p_form_id
    ), '[]'::jsonb)
  ) into v_structure;

  insert into public.form_versions (form_id, version, structure, published_by)
  values (p_form_id, v_next, v_structure, (select auth.uid()))
  returning id into v_version_id;

  update public.forms set status = 'published' where id = p_form_id;
  return v_version_id;
end;
$$;

-- ============================================================
-- _clone_form_contents — copia secciones→preguntas→opciones→reglas de un
-- formulario a otro, remapeando ids (las reglas referencian ids de
-- pregunta/sección en `when` y `target`).
-- ============================================================
create or replace function public._clone_form_contents(p_src uuid, p_dst uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  sec record;
  q record;
  new_sec_id uuid;
  new_q_id uuid;
  id_map jsonb := '{}'::jsonb;
  r record;
  new_when jsonb;
  new_target jsonb;
begin
  for sec in select * from public.form_sections where form_id = p_src order by "order" loop
    insert into public.form_sections (form_id, "order", title, description, sensitive)
    values (p_dst, sec."order", sec.title, sec.description, sec.sensitive)
    returning id into new_sec_id;
    id_map := id_map || jsonb_build_object(sec.id::text, new_sec_id::text);

    for q in select * from public.form_questions where section_id = sec.id order by "order" loop
      insert into public.form_questions
        (form_id, section_id, "order", type, label, help_text, required, sensitive, config)
      values
        (p_dst, new_sec_id, q."order", q.type, q.label, q.help_text, q.required, q.sensitive, q.config)
      returning id into new_q_id;
      id_map := id_map || jsonb_build_object(q.id::text, new_q_id::text);

      insert into public.form_question_options (question_id, form_id, "order", value, label)
      select new_q_id, p_dst, o."order", o.value, o.label
      from public.form_question_options o where o.question_id = q.id;
    end loop;
  end loop;

  for r in select * from public.form_rules where form_id = p_src order by "order" loop
    select coalesce(jsonb_agg(
      case
        when cond ? 'questionId' and id_map ? (cond->>'questionId')
          then jsonb_set(cond, '{questionId}', to_jsonb(id_map->>(cond->>'questionId')))
        else cond
      end
    ), '[]'::jsonb)
    into new_when
    from jsonb_array_elements(r."when") cond;

    new_target := r.target;
    if new_target ? 'id' and id_map ? (new_target->>'id') then
      new_target := jsonb_set(new_target, '{id}', to_jsonb(id_map->>(new_target->>'id')));
    end if;

    insert into public.form_rules (form_id, "order", "when", "match", action, target)
    values (p_dst, r."order", new_when, r."match", r.action, new_target);
  end loop;
end;
$$;

create or replace function public.create_form_from_template(p_template_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_new uuid;
begin
  if not exists (
    select 1 from public.forms f
    where f.id = p_template_id and f.is_template
      and (f.professor_id is null or f.professor_id = (select auth.uid()))
  ) then
    raise exception 'Plantilla no encontrada.';
  end if;

  insert into public.forms (professor_id, name, description, status, is_template, template_source_id)
  select (select auth.uid()), f.name, f.description, 'draft', false, f.id
  from public.forms f where f.id = p_template_id
  returning id into v_new;

  perform public._clone_form_contents(p_template_id, v_new);
  return v_new;
end;
$$;

create or replace function public.duplicate_form(p_form_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_new uuid;
begin
  if not exists (
    select 1 from public.forms f where f.id = p_form_id and f.professor_id = (select auth.uid())
  ) then
    raise exception 'Formulario no encontrado.';
  end if;

  insert into public.forms (professor_id, name, description, status, is_template)
  select (select auth.uid()), f.name || ' (copia)', f.description, 'draft', f.is_template
  from public.forms f where f.id = p_form_id
  returning id into v_new;

  perform public._clone_form_contents(p_form_id, v_new);
  return v_new;
end;
$$;

create or replace function public.save_form_as_template(p_form_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_new uuid;
begin
  if not exists (
    select 1 from public.forms f where f.id = p_form_id and f.professor_id = (select auth.uid())
  ) then
    raise exception 'Formulario no encontrado.';
  end if;

  insert into public.forms (professor_id, name, description, status, is_template, template_source_id)
  select (select auth.uid()), f.name || ' (plantilla)', f.description, 'draft', true, f.id
  from public.forms f where f.id = p_form_id
  returning id into v_new;

  perform public._clone_form_contents(p_form_id, v_new);
  return v_new;
end;
$$;

-- ============================================================
-- Acceso del alumno anónimo — POR TOKEN. security definer.
-- ============================================================
create or replace function public.get_submission(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.form_submissions;
  v_structure jsonb;
  v_answers jsonb;
  v_form_name text;
begin
  select * into s from public.form_submissions where token = p_token;
  if not found then raise exception 'Formulario no encontrado.'; end if;

  if s.expires_at is not null and s.expires_at < now() and s.status <> 'completed' then
    update public.form_submissions set status = 'expired' where id = s.id;
    s.status := 'expired';
  end if;

  select structure into v_structure from public.form_versions where id = s.form_version_id;
  select name into v_form_name from public.forms where id = s.form_id;
  select coalesce(jsonb_object_agg(question_id::text, value), '{}'::jsonb)
    into v_answers from public.form_answers where submission_id = s.id;

  return jsonb_build_object(
    'formName', v_form_name,
    'status', s.status,
    'structure', v_structure,
    'progress', s.progress,
    'answers', v_answers,
    'consentAccepted', s.consent_accepted_at is not null,
    'completedAt', s.completed_at
  );
end;
$$;

create or replace function public.start_submission(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.form_submissions
  set status = 'started', started_at = coalesce(started_at, now())
  where token = p_token and status in ('pending', 'started');
  if not found then raise exception 'Formulario no disponible.'; end if;
end;
$$;

create or replace function public.save_submission_answers(
  p_token text,
  p_answers jsonb,
  p_progress jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.form_submissions;
  v_types jsonb;
  k text;
  v jsonb;
begin
  select * into s from public.form_submissions where token = p_token;
  if not found then raise exception 'Formulario no encontrado.'; end if;
  if s.status in ('completed', 'expired') then
    raise exception 'Este formulario ya no admite cambios.';
  end if;

  select coalesce(jsonb_object_agg(q->>'id', q->>'type'), '{}'::jsonb)
  into v_types
  from public.form_versions ver,
       lateral jsonb_array_elements(ver.structure->'sections') sec,
       lateral jsonb_array_elements(sec->'questions') q
  where ver.id = s.form_version_id;

  for k, v in select * from jsonb_each(coalesce(p_answers, '{}'::jsonb)) loop
    if v_types ? k then
      insert into public.form_answers (submission_id, question_id, question_type, value, updated_at)
      values (s.id, k::uuid, v_types->>k, v, now())
      on conflict (submission_id, question_id)
      do update set value = excluded.value, updated_at = now();
    end if;
  end loop;

  update public.form_submissions
  set progress = coalesce(p_progress, progress),
      status = case when status = 'pending' then 'started' else status end,
      started_at = coalesce(started_at, now())
  where id = s.id;
end;
$$;

create or replace function public.complete_submission(p_token text, p_consent boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.form_submissions;
  v_has_sensitive boolean;
  v_missing text[];
begin
  select * into s from public.form_submissions where token = p_token;
  if not found then raise exception 'Formulario no encontrado.'; end if;
  if s.status = 'expired' then raise exception 'El formulario venció.'; end if;
  if s.status = 'completed' then return; end if;

  -- ¿el formulario tiene preguntas/secciones sensibles? entonces exige consentimiento.
  select exists (
    select 1
    from public.form_versions ver,
         lateral jsonb_array_elements(ver.structure->'sections') sec
    where ver.id = s.form_version_id
      and ((sec->>'sensitive')::boolean
           or exists (select 1 from jsonb_array_elements(sec->'questions') q where (q->>'sensitive')::boolean))
  ) into v_has_sensitive;

  if v_has_sensitive and not (p_consent or s.consent_accepted_at is not null) then
    raise exception 'Falta aceptar el consentimiento sobre información sensible.';
  end if;

  -- required NO condicionales sin responder (los condicionales se validan
  -- completo en el paso 4, junto con el evaluador de reglas).
  select array_agg(q->>'label')
  into v_missing
  from public.form_versions ver,
       lateral jsonb_array_elements(ver.structure->'sections') sec,
       lateral jsonb_array_elements(sec->'questions') q
  where ver.id = s.form_version_id
    and (q->>'required')::boolean
    and not exists (
      select 1 from jsonb_array_elements(ver.structure->'rules') r
      where r->>'action' in ('show', 'hide', 'require')
        and r->'target'->>'id' = q->>'id'
    )
    and not exists (
      select 1 from public.form_answers a
      where a.submission_id = s.id and a.question_id = (q->>'id')::uuid
        and a.value is not null and a.value <> 'null'::jsonb and a.value <> '""'::jsonb
    );

  if array_length(v_missing, 1) > 0 then
    raise exception 'Faltan preguntas obligatorias: %', array_to_string(v_missing, ', ');
  end if;

  update public.form_submissions
  set status = 'completed',
      completed_at = now(),
      consent_accepted_at = case
        when p_consent and consent_accepted_at is null then now() else consent_accepted_at end
  where id = s.id;
end;
$$;
