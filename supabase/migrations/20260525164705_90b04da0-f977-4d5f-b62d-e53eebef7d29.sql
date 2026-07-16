
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users can delete their own profile"
  on public.profiles for delete to authenticated using (auth.uid() = id);

-- auto-create profile + updated_at trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- emergency contacts
create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  relation text,
  created_at timestamptz not null default now()
);
alter table public.emergency_contacts enable row level security;
create policy "Owner can view contacts" on public.emergency_contacts
  for select to authenticated using (auth.uid() = user_id);
create policy "Owner can insert contacts" on public.emergency_contacts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Owner can update contacts" on public.emergency_contacts
  for update to authenticated using (auth.uid() = user_id);
create policy "Owner can delete contacts" on public.emergency_contacts
  for delete to authenticated using (auth.uid() = user_id);

-- sos alerts
create table public.sos_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  address text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
alter table public.sos_alerts enable row level security;
create policy "Owner can view alerts" on public.sos_alerts
  for select to authenticated using (auth.uid() = user_id);
create policy "Owner can insert alerts" on public.sos_alerts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Owner can update alerts" on public.sos_alerts
  for update to authenticated using (auth.uid() = user_id);

-- avatars bucket
insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
  on conflict (id) do nothing;
create policy "Public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "Users upload own avatar" on storage.objects
  for insert to authenticated with check (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update own avatar" on storage.objects
  for update to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own avatar" on storage.objects
  for delete to authenticated using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
