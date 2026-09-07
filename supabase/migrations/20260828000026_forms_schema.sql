-- MOVA — Sistema de formularios de evaluación. PASO 1: esquema + RLS +
-- versionado. Sin RPCs (van en 20260828000027), sin seed de plantillas
-- (20260828000028), sin bucket de archivos (20260828000029).
--
-- Diseño aprobado (ver conversación):
--  * El alumno NO necesita cuenta ni login para responder → un envío
--    (`form_submissions`) puede tener `student_id` null (evaluación de un
--    prospecto) y se accede por `token`. Toda escritura anónima pasará por
--    RPCs `security definer` (paso 2); acá NO se dan grants a `anon`.
--  * Versionado por SNAPSHOT inmutable: el builder edita tablas
--    normalizadas; al publicar, la estructura completa se congela en
--    `form_versions.structure` (jsonb) y cada envío queda atado a una
--    versión. Modificar el borrador después no rompe respuestas viejas.
--  * `form_id` se denormaliza en todas las tablas hijas para que las
--    policies sean un simple `can_manage_form(form_id)` — mismo criterio
--    que workouts.professor_id, plan_weeks, etc.
--
-- Reutiliza: profiles/professors/students, sports, is_professor(),
-- is_professor_of(). No duplica ninguna entidad existente.

-- ============================================================
-- forms — un formulario o una plantilla.
--   is_template=false, professor_id no null  → formulario del profesor
--   is_template=true,  professor_id = <prof> → plantilla privada del profesor
--   is_template=true,  professor_id = null   → plantilla del sistema (seed)
-- ============================================================
create table public.forms (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid references public.professors (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_template boolean not null default false,
  template_source_id uuid references public.forms (id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint forms_owner_or_system_template check (professor_id is not null or is_template)
);

create index forms_professor_id_idx on public.forms (professor_id);
create index forms_is_template_idx on public.forms (is_template) where is_template;

alter table public.forms enable row level security;

create policy "forms: el profesor gestiona los propios"
  on public.forms for all
  to authenticated
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));

create policy "forms: plantillas del sistema visibles para profesores"
  on public.forms for select
  to authenticated
  using (
    is_template and professor_id is null
    and exists (select 1 from public.professors p where p.id = (select auth.uid()))
  );

-- ============================================================
-- Helpers de permiso sobre un formulario (definidos DESPUÉS de `forms`
-- porque `check_function_bodies` valida las referencias de una función SQL
-- al crearla).
-- can_read: el dueño, o cualquier profesor si es plantilla del sistema.
-- can_manage: solo el dueño.
-- security invoker: se evalúa RLS de `forms` en la subconsulta, sin ciclo
-- (las policies de `forms` NO llaman a estos helpers).
-- ============================================================
create or replace function public.can_read_form(p_form_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.forms f
    where f.id = p_form_id
      and (
        f.professor_id = (select auth.uid())
        or (f.is_template and f.professor_id is null)
      )
  );
$$;

create or replace function public.can_manage_form(p_form_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.forms f
    where f.id = p_form_id and f.professor_id = (select auth.uid())
  );
$$;

-- ============================================================
-- form_sports — a qué deportes aplica el formulario (N:N con sports).
-- ============================================================
create table public.form_sports (
  form_id uuid not null references public.forms (id) on delete cascade,
  sport_id uuid not null references public.sports (id) on delete cascade,
  primary key (form_id, sport_id)
);

alter table public.form_sports enable row level security;

create policy "form_sports: lectura según el formulario"
  on public.form_sports for select
  to authenticated
  using (public.can_read_form(form_id));

create policy "form_sports: gestiona el dueño del formulario"
  on public.form_sports for all
  to authenticated
  using (public.can_manage_form(form_id))
  with check (public.can_manage_form(form_id));

-- ============================================================
-- form_sections — grupos de preguntas (necesarios para "mostrar la
-- sección de running" con una sola regla). Todo formulario tiene al menos
-- una sección.
-- ============================================================
create table public.form_sections (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  "order" smallint not null default 0,
  title text,
  description text,
  sensitive boolean not null default false
);

create index form_sections_form_id_idx on public.form_sections (form_id, "order");

alter table public.form_sections enable row level security;

create policy "form_sections: lectura según el formulario"
  on public.form_sections for select
  to authenticated using (public.can_read_form(form_id));
create policy "form_sections: gestiona el dueño"
  on public.form_sections for all
  to authenticated using (public.can_manage_form(form_id)) with check (public.can_manage_form(form_id));

-- ============================================================
-- form_questions — la copia de trabajo (borrador). Al publicar se congela
-- en form_versions.structure con este mismo `id`.
--   type: registry en la app (lib/forms/question-types.ts). Agregar un
--   tipo nuevo NO cambia el esquema — solo se suma al check y al registry.
--   config: parámetros del tipo (escala min/max, unidad, etc.).
-- ============================================================
create table public.form_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  section_id uuid not null references public.form_sections (id) on delete cascade,
  "order" smallint not null default 0,
  type text not null check (
    type in (
      'short_text', 'long_text', 'number', 'date', 'birth_date',
      'single_select', 'multi_select', 'scale', 'yes_no',
      'weight', 'height', 'duration', 'distance', 'pace',
      'file', 'video'
    )
  ),
  label text not null,
  help_text text,
  required boolean not null default false,
  sensitive boolean not null default false,
  config jsonb not null default '{}'::jsonb
);

create index form_questions_form_id_idx on public.form_questions (form_id, section_id, "order");

alter table public.form_questions enable row level security;

create policy "form_questions: lectura según el formulario"
  on public.form_questions for select
  to authenticated using (public.can_read_form(form_id));
create policy "form_questions: gestiona el dueño"
  on public.form_questions for all
  to authenticated using (public.can_manage_form(form_id)) with check (public.can_manage_form(form_id));

-- ============================================================
-- form_question_options — opciones de single_select / multi_select.
-- form_id denormalizado para la policy.
-- ============================================================
create table public.form_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.form_questions (id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  "order" smallint not null default 0,
  value text not null,
  label text not null
);

create index form_question_options_question_id_idx on public.form_question_options (question_id, "order");

alter table public.form_question_options enable row level security;

create policy "form_question_options: lectura según el formulario"
  on public.form_question_options for select
  to authenticated using (public.can_read_form(form_id));
create policy "form_question_options: gestiona el dueño"
  on public.form_question_options for all
  to authenticated using (public.can_manage_form(form_id)) with check (public.can_manage_form(form_id));

-- ============================================================
-- form_rules — lógica condicional como datos.
--   when:  [{ questionId, op, value }]   (op: eq, neq, in, gt, lt, answered, not_answered)
--   match: 'all' | 'any'
--   action:'show' | 'hide' | 'require' | 'skip_to'
--   target:{ kind: 'question'|'section', id }
-- Se evalúa en el cliente (el alumno no ve lo oculto) y se re-valida en
-- complete_submission (paso 2).
-- ============================================================
create table public.form_rules (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  "order" smallint not null default 0,
  "when" jsonb not null default '[]'::jsonb,
  "match" text not null default 'all' check ("match" in ('all', 'any')),
  action text not null check (action in ('show', 'hide', 'require', 'skip_to')),
  target jsonb not null
);

create index form_rules_form_id_idx on public.form_rules (form_id, "order");

alter table public.form_rules enable row level security;

create policy "form_rules: lectura según el formulario"
  on public.form_rules for select
  to authenticated using (public.can_read_form(form_id));
create policy "form_rules: gestiona el dueño"
  on public.form_rules for all
  to authenticated using (public.can_manage_form(form_id)) with check (public.can_manage_form(form_id));

-- ============================================================
-- form_versions — SNAPSHOT inmutable. structure = { sections:[{...,
-- questions:[{ id, type, label, help_text, required, sensitive, config,
-- options:[...] }]}], rules:[...] }. Se genera en publishForm (paso 2).
-- ============================================================
create table public.form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  version smallint not null,
  structure jsonb not null,
  published_by uuid references public.professors (id),
  published_at timestamptz not null default now(),
  unique (form_id, version)
);

create index form_versions_form_id_idx on public.form_versions (form_id, version);

alter table public.form_versions enable row level security;

-- Lectura para el dueño (o cualquier profesor si es plantilla del sistema).
-- La escritura la hace el RPC publishForm (paso 2), no la app directo.
create policy "form_versions: lectura según el formulario"
  on public.form_versions for select
  to authenticated using (public.can_read_form(form_id));
create policy "form_versions: inserta el dueño (vía publish)"
  on public.form_versions for insert
  to authenticated with check (public.can_manage_form(form_id));

-- ============================================================
-- form_submissions — un envío del formulario a un alumno o prospecto.
--   student_id null           → prospecto (invitee_name / invitee_contact)
--   token                     → única credencial del alumno anónimo
--   form_version_id           → versión congelada que responde ese alumno
--   professor_id denormalizado → policy simple, sin join
--   progress jsonb            → estado del wizard para "guardar y seguir"
-- ============================================================
create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  form_version_id uuid not null references public.form_versions (id),
  professor_id uuid not null references public.professors (id) on delete cascade,
  student_id uuid references public.students (id) on delete set null,
  invitee_name text,
  invitee_contact text,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'started', 'completed', 'expired')),
  progress jsonb not null default '{}'::jsonb,
  consent_accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index form_submissions_form_id_idx on public.form_submissions (form_id);
create index form_submissions_professor_id_idx on public.form_submissions (professor_id);
create index form_submissions_student_id_idx on public.form_submissions (student_id);

alter table public.form_submissions enable row level security;

create policy "form_submissions: el profesor ve/gestiona las suyas"
  on public.form_submissions for all
  to authenticated
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));

create policy "form_submissions: el alumno logueado ve las propias"
  on public.form_submissions for select
  to authenticated
  using (student_id is not null and student_id = (select auth.uid()));

-- ============================================================
-- form_answers — una respuesta por pregunta. question_id refiere al id de
-- la pregunta EN EL SNAPSHOT (no FK: la pregunta del borrador puede
-- borrarse). question_type denormalizado → la respuesta se entiende sola.
-- ============================================================
create table public.form_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions (id) on delete cascade,
  question_id uuid not null,
  question_type text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  unique (submission_id, question_id)
);

create index form_answers_submission_id_idx on public.form_answers (submission_id);

alter table public.form_answers enable row level security;

create policy "form_answers: el profesor de la submission"
  on public.form_answers for all
  to authenticated
  using (
    exists (
      select 1 from public.form_submissions s
      where s.id = submission_id and s.professor_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.form_submissions s
      where s.id = submission_id and s.professor_id = (select auth.uid())
    )
  );

create policy "form_answers: el alumno logueado lee las propias"
  on public.form_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.form_submissions s
      where s.id = submission_id and s.student_id = (select auth.uid())
    )
  );

-- ============================================================
-- form_answer_files — archivos subidos como respuesta (tipo 'file').
-- El bucket y el upload firmado por token van en 20260828000029.
-- ============================================================
create table public.form_answer_files (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.form_answers (id) on delete cascade,
  storage_path text not null,
  filename text,
  mime text,
  size_bytes bigint
);

alter table public.form_answer_files enable row level security;

create policy "form_answer_files: el profesor de la submission"
  on public.form_answer_files for all
  to authenticated
  using (
    exists (
      select 1 from public.form_answers a
      join public.form_submissions s on s.id = a.submission_id
      where a.id = answer_id and s.professor_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.form_answers a
      join public.form_submissions s on s.id = a.submission_id
      where a.id = answer_id and s.professor_id = (select auth.uid())
    )
  );

-- ============================================================
-- form_submission_summaries — FUTURA IA. Mismo patrón que plan_drafts:
-- un resumen propuesto que el profesor aprueba/rechaza. Se crea la tabla
-- ahora para que el esquema sea estable; queda vacía.
-- ============================================================
create table public.form_submission_summaries (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions (id) on delete cascade,
  summary jsonb not null,
  model text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.professors (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.form_submission_summaries enable row level security;

create policy "form_submission_summaries: el profesor de la submission"
  on public.form_submission_summaries for all
  to authenticated
  using (
    exists (
      select 1 from public.form_submissions s
      where s.id = submission_id and s.professor_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.form_submissions s
      where s.id = submission_id and s.professor_id = (select auth.uid())
    )
  );
