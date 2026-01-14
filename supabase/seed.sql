-- After you create a few auth users in Supabase (email/password signups),
-- update the `id` fields below to match auth.users.id and run this file.

-- Example placeholders (replace with actual user UUIDs)
-- select * from auth.users to copy uuids.
-- For quick demo you can run these as-is if you manually set the UUIDs to match your users.

-- Fighters
-- insert into profiles (id, handle, display_name, role, bio, disciplines, location_city, location_country)
-- values ('<USER_UUID_1>','ironlee','Aaron Lee','FIGHTER','Muay Thai striker', '{Muay Thai,Boxing}','Manchester','UK');

-- Coaches
-- insert into profiles (id, handle, display_name, role, bio) values ('<USER_UUID_2>','coachamy','Coach Amy','COACH','Head coach at Northside');
-- insert into coaches (profile_id, bio) values ('<USER_UUID_2>', 'Muay Thai / K-1');

-- Gyms
-- insert into profiles (id, handle, display_name, role) values ('<USER_UUID_3>','northsidegym','Northside Gym','GYM');
-- insert into gyms (profile_id, name, location_city, location_country, martial_arts, fighters_count, coaches_count, bio)
-- values ('<USER_UUID_3>','Northside Gym','Manchester','UK','{Muay Thai,Boxing}', 12, 3, 'Home of champions');

-- Promotions
-- insert into profiles (id, handle, display_name, role) values ('<USER_UUID_4>','legacy-promotions','Legacy Promotions','PROMOTION');
-- insert into promotions (profile_id, name, bio) values ('<USER_UUID_4>','Legacy Promotions','Regional combat sports shows');

-- Events + Bouts (owned by promotion user)
-- insert into events (owner_profile_id, name, city, country, date_start, status, martial_arts)
-- values ('<USER_UUID_4>', 'Legacy Manchester Fight Night', 'Manchester', 'UK', now()::date + 21, 'published', '{Muay Thai,Boxing}')
-- returning id;

-- Use the returned event id to add bouts:
-- insert into bouts (event_id, discipline, weight_class_kg, level, notes) values
--  ('<EVENT_ID>','Muay Thai', 63.5, 'amateur', 'Blue vs Red • 3x2'),
--  ('<EVENT_ID>','Boxing', 67, 'pro', '10oz gloves');

