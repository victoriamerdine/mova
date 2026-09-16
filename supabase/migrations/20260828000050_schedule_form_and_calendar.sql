-- MOVA — CLAUDE.md §3.5/§27, Fase 9 + Sistema de formularios: el alumno
-- declara, desde un formulario, los días (y horas) que entrena otras
-- disciplinas y los días que prefiere entrenar acá. Esos días se reflejan
-- como series recurrentes del calendario (misma infra de
-- `competition_recurrences` que ya soporta "partido todos los domingos",
-- ver migración 20260828000048) y el alumno puede editarlos después
-- directamente desde su calendario — una excepción deliberada al
-- principio "el profesor carga el calendario": acá el alumno es la
-- autoridad sobre su propia disponibilidad, el profesor solo se entera
-- (campanita).

-- 1) Nuevo tipo de pregunta en el registry de formularios
--    (lib/forms/question-types.ts): grilla de día de la semana + hora
--    opcional. Un tipo genérico, reutilizable dos veces por formulario
--    (una para "otra disciplina", otra para "entreno preferido") — el
--    profesor elige el destino vía config.calendarPurpose.
alter table public.form_questions drop constraint form_questions_type_check;
alter table public.form_questions add constraint form_questions_type_check
  check (
    type in (
      'short_text', 'long_text', 'number', 'date', 'birth_date',
      'single_select', 'multi_select', 'scale', 'yes_no',
      'weight', 'height', 'duration', 'distance', 'pace',
      'file', 'video', 'weekly_schedule'
    )
  );

-- 2) Dos tipos nuevos de ítem de calendario: entreno preferido (plan MOVA)
--    y entreno de otra disciplina/deporte.
alter table public.competitions drop constraint competitions_type_check;
alter table public.competitions add constraint competitions_type_check
  check (type in (
    'partido', 'carrera', 'torneo', 'campeonato', 'competencia', 'test', 'evento',
    'descanso', 'recuperacion', 'entreno_preferido', 'otra_disciplina'
  ));

alter table public.competition_recurrences drop constraint competition_recurrences_type_check;
alter table public.competition_recurrences add constraint competition_recurrences_type_check
  check (type in (
    'partido', 'carrera', 'torneo', 'campeonato', 'competencia', 'test', 'evento',
    'descanso', 'recuperacion', 'entreno_preferido', 'otra_disciplina'
  ));

-- 3) `competition_recurrences` no tenía hora (a diferencia de `competitions`,
--    que sí) — hace falta para "las horas que entrena en esos días".
alter table public.competition_recurrences add column time time;

-- 4) El alumno puede escribir sus PROPIAS series recurrentes, pero SOLO de
--    los dos tipos nuevos (entreno_preferido/otra_disciplina) — el resto
--    del calendario lo sigue cargando el profesor. Coexiste con la policy
--    existente del profesor (permissive, se combinan con OR).
create policy "competition_recurrences: el alumno gestiona su disponibilidad"
  on public.competition_recurrences for all
  using (
    public.is_own_student(student_id)
    and type in ('entreno_preferido', 'otra_disciplina')
  )
  with check (
    public.is_own_student(student_id)
    and type in ('entreno_preferido', 'otra_disciplina')
  );

-- 5) Señal para la campanita del profesor: "este alumno cambió sus días".
--    Mismo patrón que `student_professors.last_progress_viewed_at`
--    (migración 20260828000047) pero para una señal distinta — comparar
--    ambas contra la misma columna mezclaría "hay sesión nueva" con "hay
--    cambio de horario".
alter table public.students add column schedule_updated_at timestamptz;
alter table public.student_professors add column last_schedule_viewed_at timestamptz;

comment on column public.students.schedule_updated_at is
  'Se actualiza cuando el alumno edita sus días de entreno_preferido/otra_disciplina — alimenta la campanita del profesor (junto con last_schedule_viewed_at).';
