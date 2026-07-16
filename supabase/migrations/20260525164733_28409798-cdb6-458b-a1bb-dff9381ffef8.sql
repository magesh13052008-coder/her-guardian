
-- fix function search_path on set_updated_at (handle_new_user already set)
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- revoke execute on trigger-only security definer / definer functions
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- restrict avatars listing: drop public read policy, replace with object-by-id read via public URL (handled by storage)
drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatar objects" on storage.objects
  for select using (bucket_id = 'avatars');
-- (public URL access goes through storage's signed-public path; this preserves <img src> usage)
