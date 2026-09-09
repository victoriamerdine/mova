-- MOVA — Fix: recursión infinita en RLS ("stack depth limit exceeded").
--
-- is_admin() (migración 035) lee public.profiles, y la policy
-- "profiles: el admin ve todo" que agregó esa misma migración también
-- llama a is_admin() → ciclo. Lo mismo con "professors: el admin gestiona
-- todo" a través de is_professor().
--
-- Solución estándar (misma que la migración 024 para professors):
-- is_admin() pasa a SECURITY DEFINER para leer profiles sin disparar RLS.
-- auth.uid() sigue siendo el del usuario que llama; no hay escalada de
-- privilegios (solo devuelve true si ESE usuario tiene role = 'admin').

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;
