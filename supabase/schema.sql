-- Legacy schema
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text,
  role text check (role in ('FIGHTER','COACH','GYM','PROMOTION','ADMIN')) not null,
  gym_id uuid,
  bio text,
  banner_url text,
  avatar_url text,
  location_city text,
  location_country text,
  disciplines text[],
  socials jsonb,
  created_at timestamptz default now()
);
create table if not exists fighters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique not null references profiles(id) on delete cascade,
  rank text, country text, record text, pro_record text, level text,
  height_cm int, fight_weight_kg numeric, martial_arts text[], status_looking boolean default false
);
create table if not exists coaches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique not null references profiles(id) on delete cascade,
  gym_id uuid, specialties text[], bio text
);
create table if not exists gyms (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null, opened_on date, location_city text, location_country text,
  martial_arts text[], head_coaches uuid[], fighters_count int, coaches_count int, bio text
);
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique not null references profiles(id) on delete cascade,
  name text not null, license_id text, bio text
);
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references profiles(id) on delete cascade,
  name text not null, date_start date, date_end date, city text, country text, venue text,
  status text check (status in ('draft','published','completed','cancelled')) default 'draft', martial_arts text[]
);
create table if not exists bouts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  discipline text not null, weight_class_kg numeric not null,
  level text check (level in ('amateur','pro')) not null,
  purse_base numeric, win_bonus numeric,
  blue_corner_profile_id uuid references profiles(id) on delete set null,
  red_corner_profile_id uuid references profiles(id) on delete set null,
  notes text, status text check (status in ('open','matched','closed')) default 'open',
  created_at timestamptz default now()
);
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  bout_id uuid not null references bouts(id) on delete cascade,
  from_profile_id uuid not null references profiles(id) on delete cascade,
  fighter_profile_id uuid not null references profiles(id) on delete cascade,
  terms jsonb, status text check (status in ('draft','sent','countered','accepted','declined','expired')) default 'sent',
  created_at timestamptz default now()
);
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  bout_id uuid not null references bouts(id) on delete cascade,
  fighter_profile_id uuid not null references profiles(id) on delete cascade,
  coach_or_gym_profile_id uuid references profiles(id) on delete set null,
  message text, status text check (status in ('pending','shortlisted','rejected','withdrawn')) default 'pending',
  created_at timestamptz default now()
);
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_profile_id uuid not null references profiles(id) on delete cascade,
  body text, media_urls text[], created_at timestamptz default now()
);
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_profile_id uuid not null references profiles(id) on delete cascade,
  body text not null, created_at timestamptz default now()
);
create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(), unique (post_id, profile_id)
);
create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(), primary key (follower_id, following_id)
);
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references profiles(id) on delete cascade,
  url text not null, type text check (type in ('image','video')) not null,
  caption text, created_at timestamptz default now()
);
create table if not exists rankings (
  id uuid primary key default gen_random_uuid(),
  org text not null, discipline text not null, weight_class text not null,
  rank int not null, fighter_name text not null, profile_id uuid, as_of date default now()
);
create table if not exists streams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete set null,
  title text not null, embed_url text, starts_at timestamptz, is_live boolean default false
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  actor_profile_id uuid references profiles(id) on delete set null,
  data jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
alter table fighters enable row level security;
alter table coaches enable row level security;
alter table gyms enable row level security;
alter table promotions enable row level security;
alter table events enable row level security;
alter table bouts enable row level security;
alter table offers enable row level security;
alter table applications enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;
alter table follows enable row level security;
alter table media enable row level security;
alter table rankings enable row level security;
alter table streams enable row level security;
alter table notifications enable row level security;

-- Policies
create policy "Public read" on profiles for select using (true);
create policy "Own profile insert" on profiles for insert with check (id = auth.uid());
create policy "Own profile update" on profiles for update using (id = auth.uid());

create policy "Public posts read" on posts for select using (true);
create policy "Own post insert" on posts for insert with check (author_profile_id = auth.uid());
create policy "Own post update" on posts for update using (author_profile_id = auth.uid());
create policy "Own post delete" on posts for delete using (author_profile_id = auth.uid());

create policy "Public events read" on events for select using (true);
create policy "Owner insert event" on events for insert with check (owner_profile_id = auth.uid());
create policy "Owner update event" on events for update using (owner_profile_id = auth.uid());

create policy "Public bouts read" on bouts for select using (true);
create policy "Owner insert bout" on bouts for insert with check (
  exists (select 1 from events e where e.id = event_id and e.owner_profile_id = auth.uid())
);
create policy "Owner update bout" on bouts for update using (
  exists (select 1 from events e where e.id = event_id and e.owner_profile_id = auth.uid())
);

create policy "Public streams read" on streams for select using (true);
create policy "Owner insert stream" on streams for insert with check (
  (event_id is null) or exists (select 1 from events e where e.id = event_id and e.owner_profile_id = auth.uid())
);

create policy "Public likes read" on likes for select using (true);
create policy "Own like insert" on likes for insert with check (profile_id = auth.uid());
create policy "Own like delete" on likes for delete using (profile_id = auth.uid());

create policy "Public follows read" on follows for select using (true);
create policy "Own follow insert" on follows for insert with check (follower_id = auth.uid());
create policy "Own follow delete" on follows for delete using (follower_id = auth.uid());

create policy "Public offers read" on offers for select using (true);
create policy "Only coach/gym send offers" on offers for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('COACH','GYM'))
);
create policy "Offer participants update" on offers for update using (
  from_profile_id = auth.uid()
  or exists (select 1 from bouts b where b.id = bout_id and (b.blue_corner_profile_id = auth.uid() or b.red_corner_profile_id = auth.uid()))
);

create policy "Public applications read" on applications for select using (true);
create policy "Fighter apply" on applications for insert with check (fighter_profile_id = auth.uid());

create policy "Own notifications read" on notifications for select using (profile_id = auth.uid());
create policy "Insert notifications" on notifications for insert with check (true);
create policy "Update own notifications" on notifications for update using (profile_id = auth.uid());

-- Seed tables
create table if not exists disciplines (
  id serial primary key,
  name text unique not null
);
create table if not exists weight_classes (
  id serial primary key,
  discipline text not null,
  label text not null,
  min_kg numeric,
  max_kg numeric
);

-- Seed data
insert into disciplines (name) values
  ('MMA'), ('Muay Thai'), ('Boxing'), ('Kickboxing'), ('BJJ')
on conflict do nothing;

-- Boxing sample
insert into weight_classes (discipline, label, min_kg, max_kg) values
 ('Boxing','Flyweight (51kg)',49,51),
 ('Boxing','Bantamweight (54kg)',52,54),
 ('Boxing','Featherweight (57kg)',55,57),
 ('Boxing','Lightweight (60kg)',58,60),
 ('Boxing','Super Lightweight (63.5kg)',61,63.5),
 ('Boxing','Welterweight (67kg)',65,67),
 ('Boxing','Middleweight (75kg)',72,75),
 ('Boxing','Light Heavyweight (80kg)',78,80),
 ('Boxing','Heavyweight (92+kg)',92,null)
on conflict do nothing;

-- Muay Thai sample
insert into weight_classes (discipline, label, min_kg, max_kg) values
 ('Muay Thai','-57kg',null,57),
 ('Muay Thai','-60kg',null,60),
 ('Muay Thai','-63.5kg',null,63.5),
 ('Muay Thai','-67kg',null,67),
 ('Muay Thai','-70kg',null,70),
 ('Muay Thai','-72.5kg',null,72.5),
 ('Muay Thai','-75kg',null,75)
on conflict do nothing;

-- MMA sample
insert into weight_classes (discipline, label, min_kg, max_kg) values
 ('MMA','Flyweight (56.7kg)',null,56.7),
 ('MMA','Bantamweight (61.2kg)',56.8,61.2),
 ('MMA','Featherweight (65.8kg)',61.3,65.8),
 ('MMA','Lightweight (70.3kg)',65.9,70.3),
 ('MMA','Welterweight (77.1kg)',70.4,77.1),
 ('MMA','Middleweight (83.9kg)',77.2,83.9),
 ('MMA','Light Heavyweight (93.0kg)',84.0,93.0),
 ('MMA','Heavyweight (120.2kg)',93.1,120.2)
on conflict do nothing;

-- Demo Data (users must exist to create matching profiles; for demo, we create public profiles with random UUIDs)
-- Replace these UUIDs with real auth user ids after signup, or update via the app.
