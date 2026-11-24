-- Run once in a new SGHA Supabase project. Dashboard owners manage uploads.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sgha-public-hymns','sgha-public-hymns',true,33554432,
        array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/wave']);
create policy "Visitors can list SGHA public hymns"
on storage.objects for select to anon, authenticated
using (bucket_id = 'sgha-public-hymns');
commit;
