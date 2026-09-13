-- MOVA — el profesor puede cortarle el acceso al plan a un alumno (por
-- falta de pago) sin borrar nada: el alumno sigue entrando a la
-- plataforma con su usuario/contraseña, solo deja de ver sus planes con
-- ESE profesor.
--
-- Deliberadamente NO se reusa student_professors.status
-- ('active'/'invited'/'ended'): is_professor_of() (20260828000001) exige
-- status='active' y sostiene la RLS de plans/workouts/training_items/
-- workout_sessions/etc — ponerle 'suspended' ahí le cortaría el acceso al
-- PROFESOR sobre el alumno, justo lo contrario de lo que se pide. Por eso
-- es una columna nueva e independiente.

alter table public.student_professors add column suspended_at timestamptz;

comment on column public.student_professors.suspended_at is
  'Si no es null, este profesor le cortó el acceso al plan a este alumno (típicamente por falta de pago). No toca student_professors.status ni borra nada — el alumno sigue entrando, solo deja de ver sus planes con este profesor (filtrado en getStudentActivePlans, no en RLS: is_own_student no consulta esta tabla).';
