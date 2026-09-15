-- MOVA — fix: handle_new_user() perdió 'student' de los roles válidos.
--
-- 20260828000035 (rol admin) reescribió handle_new_user() para soportar
-- 'admin', pero el `if chosen_role not in (...)` de esa versión solo lista
-- ('professor', 'individual', 'admin') — 'student' quedó afuera sin que
-- nadie lo haya pedido así. Desde esa migración, todo alumno dado de alta
-- por `createStudentWithUsername`/`inviteStudent` (app/alumnos/actions.ts,
-- que sí manda role:'student' en user_metadata) caía al else de
-- `chosen_role := 'individual'` — profiles.role quedaba 'individual' en
-- vez de 'student', y además se perdía el `username` que esa rama nunca
-- escribía. Un alumno así no puede entrar a /alumno: getCurrentStudent()
-- exige profile.role = 'student'.
--
-- Esta migración no toca datos — la reparación de las cuentas ya
-- afectadas (Brian Gil, Hernan Cabrera) se hizo aparte, vía service_role,
-- porque su metadata original (role/username) seguía intacta en
-- auth.users.raw_user_meta_data y no hacía falta ninguna migración de
-- esquema para corregirla.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_role text := coalesce(new.raw_user_meta_data ->> 'role', 'individual');
  chosen_name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.email);
  chosen_username text := new.raw_user_meta_data ->> 'username';
begin
  if chosen_role not in ('professor', 'individual', 'admin', 'student') then
    chosen_role := 'individual';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, chosen_role, chosen_name);

  if chosen_role = 'professor' then
    insert into public.professors (id, status, document_id, phone, address)
    values (
      new.id,
      'pending',
      new.raw_user_meta_data ->> 'document_id',
      new.raw_user_meta_data ->> 'phone',
      new.raw_user_meta_data ->> 'address'
    );
  elsif chosen_role in ('individual', 'student') then
    insert into public.students (id, username) values (new.id, chosen_username);
  end if;
  -- 'admin': no lleva fila en professors/students.

  return new;
end;
$$;
