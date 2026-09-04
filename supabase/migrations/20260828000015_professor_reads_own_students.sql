-- MOVA — Fix: el profesor no podía ver a sus propios alumnos.
--
-- Encontrado probando de verdad en el navegador (no en teoría): al crear un
-- alumno (por email o por usuario/contraseña, da igual) la fila de
-- `student_professors` se crea bien, pero "Mis alumnos"
-- (lib/supabase/queries/students.ts getMyStudentsWithPlans) hace un select
-- con join a `students(profiles(full_name))`, y ninguna de esas dos tablas
-- tenía una policy RLS que dejara leer al PROFESOR — solo existía
-- "el alumno ve/edita su propia fila" (migración 001, ambas `for all`).
-- Nadie lo había notado porque hasta esta sesión no existía ninguna cuenta
-- de alumno real vinculada a un profesor.
--
-- Se agrega una policy de SOLO LECTURA en cada tabla, reutilizando
-- `is_professor_of` (la misma función que ya usan plans/workouts/etc. —
-- true si el usuario autenticado es profesor activo de ese alumno). No se
-- toca ninguna policy de escritura existente: el alumno sigue siendo el
-- único que puede escribir su propia fila de `students`/`profiles`.

create policy "students: el profesor ve la fila de sus alumnos"
  on public.students for select
  using (public.is_professor_of(id));

create policy "profiles: el profesor ve el perfil de sus alumnos"
  on public.profiles for select
  using (public.is_professor_of(id));
