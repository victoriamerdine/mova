-- MOVA — Módulo de IA (CLAUDE.md §33–34). Paso 1: Buscar.
--
-- Log de cada consulta a la IA para trazabilidad: qué preguntó el
-- profesor, qué tools se llamaron y con qué argumentos, y qué ids de la
-- biblioteca real devolvió. La IA nunca inventa — toda respuesta se
-- apoya en estos registros.

create table public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.professors (id) on delete cascade,
  fn text not null check (fn in ('search', 'recommend', 'analyze', 'draft')),
  prompt text not null,
  model text,
  tool_calls jsonb not null default '[]'::jsonb,
  result_ids jsonb not null default '[]'::jsonb,
  answer text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index ai_interactions_professor_id_idx
  on public.ai_interactions (professor_id, created_at desc);

alter table public.ai_interactions enable row level security;

-- El profesor ve y registra solo lo suyo. Los inserts los hace el route
-- handler con la sesión del profesor (no la service_role).
create policy "ai_interactions: el profesor lee las propias"
  on public.ai_interactions for select
  to authenticated
  using (professor_id = (select auth.uid()));

create policy "ai_interactions: el profesor inserta las propias"
  on public.ai_interactions for insert
  to authenticated
  with check (professor_id = (select auth.uid()));
