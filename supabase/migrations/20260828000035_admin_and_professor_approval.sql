-- MOVA — Rol Admin + aprobación de profesores.
--
-- * El rol 'admin' ya está permitido en profiles.role (migración 001) pero
--   nada lo usaba. Se agrega is_admin() y policies para que el admin
--   gestione profesores.
-- * Un profesor ahora se auto-registra con sus datos personales pero la
--   cuenta queda 'pending' hasta que un admin la aprueba. Los profesores
--   que ya existían quedan 'active' (grandfathered).
-- * El primer admin se marca a mano (ver el final del archivo); después
--   un admin puede promover a otros desde la pantalla /admin.

-- ------------------------------------------------------------
-- professors: estado de aprobación + datos personales del alta
-- ------------------------------------------------------------
alter table public.professors add column if not exists status text;
alter table public.professors add column if not exists document_id text;
alter table public.professors add column if not exists phone text;
alter table public.professors add column if not exists address text;

update public.professors set status = 'active' where status is null;

alter table public.professors alter column status set default 'pending';
alter table public.professors alter column status set not null;
alter table public.professors drop constraint if exists professors_status_check;
alter table public.professors
  add constraint professors_status_check check (status in ('pending', 'active', 'suspended'));

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Un profesor solo "cuenta" si está aprobado. Antes: cualquier fila en
-- professors. Cambia la gestión de biblioteca (única user de is_professor()).
create or replace function public.is_professor()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.professors p where p.id = auth.uid() and p.status = 'active'
  );
$$;

-- ------------------------------------------------------------
-- Alta automática: soporta 'admin' (solo profile) y guarda los datos
-- personales del profesor, que arranca 'pending'.
-- ------------------------------------------------------------
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
  if chosen_role not in ('professor', 'individual', 'admin') then
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
  elsif chosen_role = 'individual' then
    insert into public.students (id) values (new.id);
  end if;
  -- 'admin': no lleva fila en professors/students.

  return new;
end;
$$;

-- ------------------------------------------------------------
-- Un profesor NO puede cambiarse su propio status (su policy `for all`
-- lo permitiría). Solo el admin. El intento se ignora en silencio.
-- ------------------------------------------------------------
create or replace function public.guard_professor_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status is distinct from old.status and not public.is_admin() then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists professors_guard_status on public.professors;
create trigger professors_guard_status
  before update on public.professors
  for each row
  execute function public.guard_professor_status();

-- ------------------------------------------------------------
-- RLS para el admin
-- ------------------------------------------------------------
drop policy if exists "profiles: el admin ve todo" on public.profiles;
create policy "profiles: el admin ve todo"
  on public.profiles for select to authenticated using (public.is_admin());

drop policy if exists "profiles: el admin edita" on public.profiles;
create policy "profiles: el admin edita"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "professors: el admin gestiona todo" on public.professors;
create policy "professors: el admin gestiona todo"
  on public.professors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Stats para la pantalla de admin.
drop policy if exists "student_professors: el admin lee todo" on public.student_professors;
create policy "student_professors: el admin lee todo"
  on public.student_professors for select to authenticated using (public.is_admin());

drop policy if exists "plans: el admin lee todo" on public.plans;
create policy "plans: el admin lee todo"
  on public.plans for select to authenticated using (public.is_admin());

-- ------------------------------------------------------------
-- Marcar el primer admin (editar el id y descomentar):
--   update public.profiles set role = 'admin' where id = '<AUTH_USER_ID>';
-- ------------------------------------------------------------
