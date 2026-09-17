insert into public.sports (name, slug, status)
values ('Crossfit', 'crossfit', 'active')
on conflict (slug) do nothing;
