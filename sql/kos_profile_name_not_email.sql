-- Krewe of Shamrock — a member's name is never their email address.
-- Applied to oazwkwflgbthojvnclfc. Safe to run more than once.
--
-- Bug report 2026-09-19: the liability waiver's "type your full legal name"
-- field prefilled with a login email (dougtully@protonmail.com) instead of
-- the member's name. Cause: some early profiles stored the login email in
-- profiles.full_name, and get_my_krewe_profile passed it through as
-- display_name. This migration:
--   1. clears every full_name that is actually an email address (the real
--      first_name/last_name stay untouched, so nothing is lost);
--   2. re-creates get_my_krewe_profile (from kos_rich_member_profiles.sql)
--      with a guard so an email-shaped full_name can never come back as
--      display_name even if one is stored again.
-- members.html applies the same rule client-side and prefers the roster's
-- first + last name for the waiver and Photo & Image Release sign fields.

-- 1) Data cleanup: no legal name contains "@".
update public.profiles
set full_name = null
where full_name is not null and position('@' in full_name) > 0;

-- 2) Guarded profile function (one change from kos_rich_member_profiles.sql:
--    the display_name coalesce ignores email-shaped full_name values).
create or replace function public.get_my_krewe_profile()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'user_id',            p.id,
    'member_id',          p.member_id,
    'email',              auth.email(),
    'first_name',         coalesce(p.first_name, m.first_name),
    'last_name',          coalesce(p.last_name,  m.last_name),
    'display_name',       coalesce(
                            case when position('@' in coalesce(p.full_name,'')) > 0 then null
                                 else p.full_name end,
                            nullif(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), ''),
                            nullif(trim(coalesce(m.first_name,'') || ' ' || coalesce(m.last_name,'')), '')),
    'phone',              coalesce(p.phone, m.phone),
    'bio',                coalesce(m.bio, p.bio),
    'hometown',           m.hometown,
    'parade_since',       m.parade_since,
    'interests',          m.interests,
    'hobbies',            m.hobbies,
    'favorite_memory',    m.favorite_memory,
    'fun_fact',           m.fun_fact,
    'birthday',           m.birthday,
    'anniversary',        m.anniversary,
    'photo_url',          m.photo_url,
    'profile_visible',    coalesce(m.profile_visible, true),
    'membership_status',  m.membership_status,
    'member_role',        m.member_role,
    'officer_title',      m.officer_title,
    'roles',              coalesce((select jsonb_agg(r.role)
                                    from public.member_roles r where r.user_id = p.id), '[]'::jsonb),
    'pending_role_request', exists (select 1 from public.role_requests q
                                    where q.user_id = p.id and q.status = 'pending'),
    'profile_complete',   (coalesce(p.first_name, m.first_name) is not null
                           and coalesce(p.last_name, m.last_name) is not null)
  )
  from public.profiles p
  left join public.members m on m.id = p.member_id and m.merged_into is null
  where p.id = auth.uid();
$$;
revoke all on function public.get_my_krewe_profile() from anon;
