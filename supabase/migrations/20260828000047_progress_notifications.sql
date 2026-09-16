-- MOVA — campanita de notificaciones: avisar al profesor cuándo un alumno
-- tiene "novedades" (una sesión completada nueva) desde la última vez que
-- abrió su ficha. Se guarda un timestamp por relación profesor-alumno
-- (no por sesión individual) — alcanza para "¿hay algo nuevo desde la
-- última vez?" sin una tabla de notificaciones aparte.

alter table public.student_professors
  add column last_progress_viewed_at timestamptz;

comment on column public.student_professors.last_progress_viewed_at is
  'Última vez que este profesor abrió la ficha de este alumno. Si la sesión completada más reciente del alumno es posterior, la campanita lo marca como "tiene novedades". Null = nunca la abrió.';
