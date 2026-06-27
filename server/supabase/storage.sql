-- Supabase Storage: public bucket for WebP product & category images
-- Dashboard → Storage → New bucket, OR run policies below after creating bucket "images"

-- 1. In Supabase Dashboard → Storage → New bucket:
--    Name: images
--    Public bucket: ON

-- 2. Then run these policies (SQL Editor):

create policy "Public read images"
  on storage.objects for select
  using (bucket_id = 'images');

create policy "Service role upload images"
  on storage.objects for insert
  with check (bucket_id = 'images');

create policy "Service role update images"
  on storage.objects for update
  using (bucket_id = 'images');

create policy "Service role delete images"
  on storage.objects for delete
  using (bucket_id = 'images');
