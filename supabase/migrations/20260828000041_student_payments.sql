-- MOVA — el profesor registra cuándo y cuánto le pagó un alumno.
--
-- Solo lectura/escritura del profesor (nadie pidió que el alumno vea sus
-- propios pagos) — mismo criterio que "Objetivos de carga"
-- (student_load_targets): un registro interno del profesor sobre el
-- alumno, no algo que el alumno gestiona o necesita ver en su app.

create table public.student_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  professor_id uuid not null references public.professors (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  paid_at date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index student_payments_student_id_idx on public.student_payments (student_id);
create index student_payments_professor_id_idx on public.student_payments (professor_id);

alter table public.student_payments enable row level security;

create policy "student_payments: el profesor gestiona sus registros"
  on public.student_payments for all
  to authenticated
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));
