-- MOVA — Panel del profesor: "Nuevo alumno" invita una cuenta real (a
-- diferencia de Focus Entrena, donde el alumno es solo un nombre sin
-- login — en MOVA students.id exige una cuenta real de auth.users, por
-- diseño, para que el alumno pueda algún día loguearse y ver/registrar su
-- propio entrenamiento).
--
-- handle_new_user() (migración 011) solo sabía crear 'professor' o
-- 'individual' — se extiende acá para el caso 'student', que se crea vía
-- supabase.auth.admin.inviteUserByEmail() desde el Server Action de
-- invitación (lib/supabase/service-role.ts), no desde un signup
-- autoservicio.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_role text := coalesce(new.raw_user_meta_data ->> 'role', 'individual');
  chosen_name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.email);
begin
  if chosen_role not in ('professor', 'individual', 'student') then
    chosen_role := 'individual';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, chosen_role, chosen_name);

  if chosen_role = 'professor' then
    insert into public.professors (id) values (new.id);
  else
    -- 'individual' y 'student' comparten la misma fila base en students —
    -- lo que los distingue es profiles.role y si tienen o no una relación
    -- en student_professors (que el invite crea aparte, no este trigger).
    insert into public.students (id) values (new.id);
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user is
  'Crea profiles + professors/students automáticamente al crearse el auth.users. Lee role/full_name de raw_user_meta_data. ''professor''/''individual'' vienen de signUp() autoservicio (app/signup); ''student'' viene de admin.inviteUserByEmail() (invitación del profesor, app/alumnos/actions.ts) — en ambos casos el trigger es el mismo, solo cambia quién dispara la creación del auth.users.';
