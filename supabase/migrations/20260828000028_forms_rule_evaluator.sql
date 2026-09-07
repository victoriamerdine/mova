-- MOVA — Formularios. PASO 4: evaluador de reglas en la base.
--
-- Espejo en plpgsql del evaluador de lib/forms/rules.ts. `complete_submission`
-- lo usa para NO confiar en el cliente: valida los obligatorios REALMENTE
-- visibles (según las respuestas + reglas), no una lista fija.

create or replace function public._safe_numeric(t text)
returns numeric
language plpgsql
immutable
as $$
begin
  return t::numeric;
exception when others then
  return null;
end;
$$;

-- ¿se cumple una condición { questionId, op, value } dado el mapa de respuestas?
create or replace function public.form_condition_met(cond jsonb, answers jsonb)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  a jsonb := answers -> (cond->>'questionId');
  op text := cond->>'op';
  a_texts text[];
  v_texts text[];
  l numeric;
  r numeric;
begin
  if a is null then
    a_texts := array[]::text[];
  elsif jsonb_typeof(a) = 'array' then
    select coalesce(array_agg(x #>> '{}'), array[]::text[]) into a_texts from jsonb_array_elements(a) x;
  else
    a_texts := array[ a #>> '{}' ];
  end if;

  if op = 'answered' then
    return a is not null and a <> 'null'::jsonb and a <> '""'::jsonb
           and not (jsonb_typeof(a) = 'array' and jsonb_array_length(a) = 0);
  elsif op = 'not_answered' then
    return not (a is not null and a <> 'null'::jsonb and a <> '""'::jsonb
                and not (jsonb_typeof(a) = 'array' and jsonb_array_length(a) = 0));
  elsif op = 'eq' then
    return (cond->'value' #>> '{}') = any(a_texts);
  elsif op = 'neq' then
    return not ((cond->'value' #>> '{}') = any(a_texts));
  elsif op = 'in' then
    select coalesce(array_agg(x #>> '{}'), array[]::text[]) into v_texts
    from jsonb_array_elements(coalesce(cond->'value', '[]'::jsonb)) x;
    return a_texts && v_texts;
  elsif op = 'gt' then
    l := public._safe_numeric(a_texts[1]);
    r := public._safe_numeric(cond->'value' #>> '{}');
    return l is not null and r is not null and l > r;
  elsif op = 'lt' then
    l := public._safe_numeric(a_texts[1]);
    r := public._safe_numeric(cond->'value' #>> '{}');
    return l is not null and r is not null and l < r;
  end if;
  return false;
end;
$$;

-- devuelve { hiddenQuestions:[ids], hiddenSections:[ids], requiredQuestions:[ids] }
create or replace function public.evaluate_form_rules(structure jsonb, answers jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  rule jsonb;
  cond jsonb;
  results boolean[];
  fires boolean;
  tgt_kind text;
  tgt_id text;
  hidden_q text[] := array[]::text[];
  hidden_s text[] := array[]::text[];
  req_q text[] := array[]::text[];
  sec jsonb;
  q jsonb;
begin
  for rule in select * from jsonb_array_elements(coalesce(structure->'rules', '[]'::jsonb))
  loop
    results := array[]::boolean[];
    for cond in select * from jsonb_array_elements(coalesce(rule->'when', '[]'::jsonb))
    loop
      results := results || public.form_condition_met(cond, answers);
    end loop;

    if array_length(results, 1) is null then
      fires := false;
    elsif (rule->>'match') = 'any' then
      fires := true = any(results);
    else
      fires := not (false = any(results));
    end if;

    tgt_kind := rule->'target'->>'kind';
    tgt_id := rule->'target'->>'id';

    if (rule->>'action') = 'show' and not fires then
      if tgt_kind = 'section' then hidden_s := hidden_s || tgt_id; else hidden_q := hidden_q || tgt_id; end if;
    elsif (rule->>'action') = 'hide' and fires then
      if tgt_kind = 'section' then hidden_s := hidden_s || tgt_id; else hidden_q := hidden_q || tgt_id; end if;
    elsif (rule->>'action') = 'require' and fires and tgt_kind = 'question' then
      req_q := req_q || tgt_id;
    end if;
  end loop;

  for sec in select * from jsonb_array_elements(coalesce(structure->'sections', '[]'::jsonb))
  loop
    if (sec->>'id') = any(hidden_s) then
      for q in select * from jsonb_array_elements(coalesce(sec->'questions', '[]'::jsonb))
      loop
        hidden_q := hidden_q || (q->>'id');
      end loop;
    end if;
  end loop;

  return jsonb_build_object(
    'hiddenQuestions', to_jsonb(hidden_q),
    'hiddenSections', to_jsonb(hidden_s),
    'requiredQuestions', to_jsonb(req_q)
  );
end;
$$;

-- complete_submission: ahora valida los obligatorios REALMENTE visibles.
create or replace function public.complete_submission(p_token text, p_consent boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.form_submissions;
  v_structure jsonb;
  v_answers jsonb;
  v_eval jsonb;
  v_hidden text[];
  v_req text[];
  v_has_sensitive boolean;
  v_missing text[];
begin
  select * into s from public.form_submissions where token = p_token;
  if not found then raise exception 'Formulario no encontrado.'; end if;
  if s.status = 'expired' then raise exception 'El formulario venció.'; end if;
  if s.status = 'completed' then return; end if;

  select structure into v_structure from public.form_versions where id = s.form_version_id;
  select coalesce(jsonb_object_agg(question_id::text, value), '{}'::jsonb)
    into v_answers from public.form_answers where submission_id = s.id;

  select exists (
    select 1
    from jsonb_array_elements(v_structure->'sections') sec
    where (sec->>'sensitive')::boolean
       or exists (select 1 from jsonb_array_elements(sec->'questions') q where (q->>'sensitive')::boolean)
  ) into v_has_sensitive;

  if v_has_sensitive and not (p_consent or s.consent_accepted_at is not null) then
    raise exception 'Falta aceptar el consentimiento sobre información sensible.';
  end if;

  v_eval := public.evaluate_form_rules(v_structure, v_answers);
  select array(select jsonb_array_elements_text(v_eval->'hiddenQuestions')) into v_hidden;
  select array(select jsonb_array_elements_text(v_eval->'requiredQuestions')) into v_req;

  select array_agg(q->>'label')
  into v_missing
  from jsonb_array_elements(v_structure->'sections') sec,
       lateral jsonb_array_elements(sec->'questions') q
  where not ((q->>'id') = any(v_hidden))
    and ((q->>'required')::boolean or (q->>'id') = any(v_req))
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
