update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"is_super_admin": true}'::jsonb
where email = 'yoelbulaciavaca178@gmail.com';