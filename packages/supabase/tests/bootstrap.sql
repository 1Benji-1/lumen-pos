create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_app_meta_data jsonb default '{}');
-- Controlled minimal MFA factor identity schema, not the Supabase Auth service.
create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), status text not null check(status in ('verified','unverified')));
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}');
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
