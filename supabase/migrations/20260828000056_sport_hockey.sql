insert into public.sports (name, slug, status)
values ('Hockey', 'hockey', 'active')
on conflict (slug) do nothing;
