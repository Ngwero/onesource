-- Hide removed categories from the shop (run after categories-active.sql)
update public.categories
set active = false
where id in (
  'processed-agricultural-products',
  'animal-feeds-fodder',
  'seeds-planting-materials',
  'agro-industrial-raw-materials',
  'farm-inputs',
  'flowers-ornamental-plants',
  'organic-products'
);






