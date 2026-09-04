-- MOVA — Alumno por usuario y contraseña (sin email).
--
-- Hay alumnos que no usan email habitualmente. Supabase Auth no tiene login
-- por username nativo: todo `auth.users` necesita un email (o teléfono, que
-- implica un proveedor SMS — fuera de alcance). La solución es un email
-- SINTÉTICO determinístico `<username>@alumno.mova.invalid` — `.invalid` es
-- el TLD reservado por RFC 2606 justo para direcciones que nunca deben
-- recibir correo real, así queda explícito en el propio dato que es
-- sintético. app/login/actions.ts reconstruye ese mismo email a partir del
-- username en el momento de loguearse (mapeo puro, sin tabla de lookup ni
-- RPC — cero superficie de fuga de datos entre alumnos).

alter table public.students add column username text;
alter table public.students add column phone text;

alter table public.students
  add constraint students_username_format
  check (username is null or username ~ '^[a-z0-9._-]{3,24}$');

comment on column public.students.username is
  'Solo lo tienen los alumnos creados por "usuario y contraseña" (app/alumnos/actions.ts createStudentWithUsername). Los invitados por email quedan NULL acá. Minúsculas/dígitos/._- únicamente — nunca "@", para no pisarse con el email sintético (ver comentario de arriba).';

comment on column public.students.phone is
  'Opcional. Solo se usa para prellenar el destinatario del link de WhatsApp al compartir usuario/contraseña — no es un dato validado ni obligatorio.';

create unique index students_username_unique
  on public.students (username)
  where username is not null;

-- Extiende handle_new_user (migración 013) para setear el username cuando
-- viene en la metadata. El trigger on_auth_user_created (migración 011) es
-- `after insert on auth.users` — si esta actualización viola el CHECK de
-- arriba, TODA la transacción de admin.createUser() se revierte, así que
-- nunca queda un auth.users huérfano con un username inválido.
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
    -- en student_professors (que el invite/alta crea aparte, no este trigger).
    insert into public.students (id, username) values (new.id, chosen_username);
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user is
  'Crea profiles + professors/students automáticamente al crearse el auth.users. Lee role/full_name/username de raw_user_meta_data. ''professor''/''individual'' vienen de signUp() autoservicio (app/signup); ''student'' viene de admin.inviteUserByEmail() (invitación por email) o admin.createUser() con email sintético (alta por usuario/contraseña) — ambos en app/alumnos/actions.ts, mismo trigger.';
