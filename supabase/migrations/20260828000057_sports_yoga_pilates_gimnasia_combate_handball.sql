insert into public.sports (name, slug, status)
values
  ('Yoga', 'yoga', 'active'),
  ('Pilates', 'pilates', 'active'),
  ('Gimnasia artística', 'gimnasia-artistica', 'active'),
  ('Gimnasia rítmica', 'gimnasia-ritmica', 'active'),
  ('Taekwondo', 'taekwondo', 'active'),
  ('Handball', 'handball', 'active')
on conflict (slug) do nothing;
