-- Run this entire script in Supabase Dashboard > SQL Editor.
-- Public guest submissions are pending moderation; only approved content is readable.
create extension if not exists pgcrypto;

create table if not exists public.wedding_rsvps (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null check (char_length(guest_name) between 1 and 100),
  attending boolean not null,
  guest_count integer not null default 0 check (guest_count between 0 and 6),
  created_at timestamptz not null default now()
);

create table if not exists public.wedding_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  message text not null check (char_length(message) between 1 and 500),
  rating integer not null check (rating between 1 and 5),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wedding_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  caption text default '',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.wedding_rsvps enable row level security;
alter table public.wedding_reviews enable row level security;
alter table public.wedding_photos enable row level security;

-- Guests may submit RSVPs but cannot read the guest list.
drop policy if exists "Guests can submit RSVP" on public.wedding_rsvps;
create policy "Guests can submit RSVP" on public.wedding_rsvps
for insert to anon, authenticated with check (
  char_length(guest_name) between 1 and 100 and guest_count between 0 and 6
);

-- Guests may submit wishes/ratings; only approved wishes are publicly visible.
drop policy if exists "Guests can submit wishes" on public.wedding_reviews;
create policy "Guests can submit wishes" on public.wedding_reviews
for insert to anon, authenticated with check (
  char_length(name) between 1 and 80 and char_length(message) between 1 and 500 and rating between 1 and 5
);
drop policy if exists "Read approved wishes" on public.wedding_reviews;
create policy "Read approved wishes" on public.wedding_reviews
for select to anon, authenticated using (approved = true);

-- Guest photos are submitted pending moderation; only approved gallery entries are readable.
drop policy if exists "Guests can submit photo records" on public.wedding_photos;
create policy "Guests can submit photo records" on public.wedding_photos
for insert to anon, authenticated with check (
  char_length(storage_path) between 1 and 300 and char_length(public_url) between 1 and 2000
);
drop policy if exists "Read approved photo records" on public.wedding_photos;
create policy "Read approved photo records" on public.wedding_photos
for select to anon, authenticated using (approved = true);

-- Create a PUBLIC bucket named wedding-photos in Storage, or run:
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-photos', 'wedding-photos', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "Guest image uploads" on storage.objects;
create policy "Guest image uploads" on storage.objects
for insert to anon, authenticated with check (
  bucket_id = 'wedding-photos'
  and lower(storage.objects.name) ~ '\\.(jpg|jpeg|png|webp)$'
);

-- IMPORTANT: No anonymous UPDATE/DELETE policies are provided.
-- Approve reviews/photos manually in Supabase Table Editor after checking them.
-- RSVP data is private: only project owners/admins can view it in the dashboard.
