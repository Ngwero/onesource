-- Optional: run after categories.sql if you manage categories manually.
-- Prefer: cd server && npm run seed:chillies (upserts category + products).

insert into public.categories (id, name, icon, category_group, sort_order, image, active)
values (
  'chillies-and-peppers',
  'Chillies and Peppers',
  '🌶️',
  'produce',
  8,
  null,
  true
)
on conflict (id) do update set
  name = excluded.name,
  icon = excluded.icon,
  category_group = excluded.category_group,
  active = true,
  updated_at = now();
