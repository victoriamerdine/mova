-- MOVA — Fase 1: Borradores pendientes de aprobación (docs/auditoria-03-arquitectura-objetivo.md sección D.6)
-- Auditoría 4, Problema 6: un solo mecanismo para los 3 orígenes posibles — IA (Fase 10),
-- importación del Excel (sección F.2) e importación desde Focus Entrena (sección F.4).
-- Ninguno de los tres escribe directo en plans/workouts/workout_blocks/training_items:
-- el profesor revisa el payload propuesto y recién ahí se materializa como plan real
-- (CLAUDE.md §33.4/§34, aplicado también a las migraciones de datos, no solo a la IA).

create table public.plan_drafts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  payload jsonb not null,
  source text not null check (source in ('ai', 'import_excel', 'import_focus_entrena')),
  prompt text,   -- solo tiene sentido cuando source = 'ai'
  model text,    -- ídem
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.professors (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint plan_drafts_ai_fields_only_for_ai check (
    source = 'ai' or (prompt is null and model is null)
  )
);

create index plan_drafts_student_id_idx on public.plan_drafts (student_id);
create index plan_drafts_status_idx on public.plan_drafts (status);

alter table public.plan_drafts enable row level security;

create policy "plan_drafts: el profesor del alumno ve y gestiona"
  on public.plan_drafts for all
  using (public.is_professor_of(student_id))
  with check (public.is_professor_of(student_id));

-- Nota deliberada: el alumno NO tiene policy de lectura sobre plan_drafts — son
-- propuestas internas del profesor (o del importador) hasta que se aprueban y
-- se materializan como plan real; recién ahí el alumno las ve a través de `plans`.
