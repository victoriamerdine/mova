-- MOVA — Fase 5 (arranque): trigger que crea profiles/professors/students
-- automáticamente al registrarse, a partir de la metadata que manda
-- supabase.auth.signUp({ options: { data: { full_name, role } } }).
--
-- Por qué un trigger y no un INSERT desde la Server Action: si el proyecto
-- tiene confirmación de email activada (default en Supabase), signUp() no
-- devuelve sesión hasta que el usuario confirma — un INSERT hecho desde la
-- app en ese momento correría como `anon` (auth.uid() = NULL) y la propia
-- política de RLS de profiles (id = auth.uid()) lo rechazaría. El trigger
-- corre a nivel de base de datos, en la misma transacción que crea la fila
-- en auth.users, sin depender de que exista sesión — es el patrón
-- recomendado por Supabase para este caso exacto.

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
  if chosen_role not in ('professor', 'individual') then
    chosen_role := 'individual';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, chosen_role, chosen_name);

  if chosen_role = 'professor' then
    insert into public.professors (id) values (new.id);
  else
    insert into public.students (id) values (new.id);
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user is
  'Crea profiles + professors/students automáticamente al registrarse. Lee role/full_name de auth.users.raw_user_meta_data (mandado por signUp options.data). Solo soporta alta autoservicio de professor/individual — un ''student'' invitado por su profesor es un flujo distinto (no autoservicio), sin construir todavía.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
