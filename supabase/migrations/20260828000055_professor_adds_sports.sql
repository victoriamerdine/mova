create policy "sports: el profesor agrega"
  on public.sports for insert
  to authenticated
  with check (exists (select 1 from public.professors p where p.id = (select auth.uid())));
