-- Tartan Ball sponsorships: tiers, claims, public view, front-door RPC, and seed.
-- Melissa runs this in the Supabase SQL editor on project oazwkwflgbthojvnclfc
-- (same as the other Event Studio scripts). Safe to run more than once.
--
-- Maps the 2026 sponsorship plan onto the existing Event Studio architecture:
--   * Exclusive single-sponsor opportunities (Moon Coin Band, Photography,
--     Irish Dancers) are tiers with inventory_limit = 1. A sold-out exclusive
--     tier disappears from the public view so it cannot be double-booked.
--   * The $50 Liquor Wagon sponsorship is an unlimited multi-quantity tier
--     (members may sponsor several increments in one order).
--   * Corporate packages: Bronze $500, Silver $1,000, Gold $1,500
--     (pricing confirmed 2026-09-19).
-- Requires: public.events + can_manage_events() (sql/kos_event_studio.sql),
--           enqueue_email (sql/kos_public_events_and_rsvp.sql),
--           the Tartan Ball event row (sql/kos_seed_fall_2026_events.sql).

-- 1. Sponsorship tiers -------------------------------------------------------

create table if not exists public.sponsorship_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  perks text,                       -- one perk per line, rendered as a list
  price_cents integer,              -- null = custom pricing (corporate drafts)
  inventory_limit integer,          -- null = unlimited; 1 = exclusive
  max_per_order integer not null default 1,
  payment_url text,                 -- Zeffy (or Stripe) payment link
  tier_group text,                  -- e.g. 'corporate' groups Gold/Silver/Bronze
  sort_order integer not null default 100,
  status text not null default 'published',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name)
);

do $$ begin
  alter table public.sponsorship_tiers drop constraint if exists sponsorship_tiers_status_check;
  alter table public.sponsorship_tiers add constraint sponsorship_tiers_status_check
    check (status in ('draft','published','sold_out','hidden'));
exception when others then null;
end $$;

alter table public.sponsorship_tiers enable row level security;
-- No direct client policies on purpose: anonymous visitors read through the
-- v_public_sponsorship_tiers view, officers go through the RPCs below.

-- 2. Sponsorship claims (orders) --------------------------------------------

create table if not exists public.sponsorship_claims (
  id uuid primary key default gen_random_uuid(),
  tier_id uuid not null references public.sponsorship_tiers(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  company_name text,
  signage_name text not null,       -- exactly how the sponsor appears on signage
  logo_url text,                    -- uploaded to the sponsor-logos bucket
  quantity integer not null default 1 check (quantity >= 1),
  amount_cents integer,
  payment_status text not null default 'pledged',
  notes text,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.sponsorship_claims drop constraint if exists sponsorship_claims_payment_status_check;
  alter table public.sponsorship_claims add constraint sponsorship_claims_payment_status_check
    check (payment_status in ('pledged','paid','cancelled'));
exception when others then null;
end $$;

alter table public.sponsorship_claims enable row level security;
-- Written only via claim_sponsorship(); read only via officer_list_sponsorships().

-- 3. Public view: what the sponsorship page renders --------------------------
-- Published tiers of published, public events. Exclusive tiers vanish once
-- claimed ("hide when sold out"); limited multi-slot tiers stay visible with
-- sold_out = true so the page can show a Sold Out ribbon.

create or replace view public.v_public_sponsorship_tiers as
with claimed as (
  select tier_id, coalesce(sum(quantity), 0) as claimed_quantity
  from public.sponsorship_claims
  where payment_status <> 'cancelled'
  group by tier_id
)
select
  t.id,
  t.event_id,
  e.name        as event_name,
  e.start_time  as event_start_time,
  t.name,
  t.description,
  t.perks,
  t.price_cents,
  t.inventory_limit,
  t.max_per_order,
  t.payment_url,
  t.tier_group,
  t.sort_order,
  coalesce(c.claimed_quantity, 0) as claimed_quantity,
  case when t.inventory_limit is null then null
       else greatest(t.inventory_limit - coalesce(c.claimed_quantity, 0), 0)
  end as remaining,
  (t.status = 'sold_out'
   or (t.inventory_limit is not null
       and coalesce(c.claimed_quantity, 0) >= t.inventory_limit)) as sold_out
from public.sponsorship_tiers t
join public.events e on e.id = t.event_id
left join claimed c on c.tier_id = t.id
where t.status in ('published','sold_out')
  and e.is_public = true
  and coalesce(e.status, 'published') = 'published'
  -- hide exclusive tiers entirely once they are claimed
  and not (
    t.inventory_limit = 1
    and (t.status = 'sold_out' or coalesce(c.claimed_quantity, 0) >= 1)
  );

grant select on public.v_public_sponsorship_tiers to anon, authenticated;

-- 4. The public front door: claim a sponsorship ------------------------------

create or replace function public.claim_sponsorship(
  p_tier_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_signage_name text,
  p_company_name text default null,
  p_logo_url text default null,
  p_quantity integer default 1,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_tier public.sponsorship_tiers%rowtype;
  v_event_name text;
  v_member_id uuid;
  v_claimed integer;
  v_remaining integer;
  v_claim_id uuid;
  v_amount_cents integer;
  v_subject text;
  v_body text;
begin
  if p_email is null or position('@' in p_email) = 0 then
    return jsonb_build_object('ok', false, 'message', 'A valid email is required.');
  end if;
  if coalesce(btrim(p_first_name), '') = '' or coalesce(btrim(p_last_name), '') = '' then
    return jsonb_build_object('ok', false, 'message', 'First and last name are required.');
  end if;
  if coalesce(btrim(p_signage_name), '') = '' then
    return jsonb_build_object('ok', false, 'message',
      'Please tell us exactly how your name or company should appear on event signage.');
  end if;
  if p_quantity is null or p_quantity < 1 then
    p_quantity := 1;
  end if;

  -- Lock the tier row so two sponsors cannot claim the last slot at once.
  select * into v_tier
  from public.sponsorship_tiers
  where id = p_tier_id
  for update;
  if not found or v_tier.status not in ('published','sold_out') then
    return jsonb_build_object('ok', false, 'message',
      'That sponsorship was not found or is not open yet.');
  end if;

  select name into v_event_name
  from public.events
  where id = v_tier.event_id and is_public = true;
  if not found then
    return jsonb_build_object('ok', false, 'message',
      'That sponsorship''s event is not open for sign-ups.');
  end if;

  if p_quantity > v_tier.max_per_order then
    return jsonb_build_object('ok', false, 'message',
      'You can sponsor at most ' || v_tier.max_per_order || ' of that tier in one order.');
  end if;

  if v_tier.inventory_limit is not null then
    select coalesce(sum(quantity), 0) into v_claimed
    from public.sponsorship_claims
    where tier_id = v_tier.id and payment_status <> 'cancelled';

    v_remaining := v_tier.inventory_limit - v_claimed;
    if v_tier.status = 'sold_out' or v_remaining <= 0 then
      return jsonb_build_object('ok', false, 'sold_out', true, 'message',
        'So sorry — the ' || v_tier.name || ' has already been claimed. '
        || 'Please pick another way to support the ball!');
    end if;
    if p_quantity > v_remaining then
      return jsonb_build_object('ok', false, 'message',
        'Only ' || v_remaining || ' of that sponsorship '
        || case when v_remaining = 1 then 'slot is' else 'slots are' end || ' left.');
    end if;
  end if;

  -- Match or create the roster record, same as rsvp_to_event.
  select id into v_member_id from public.members where lower(email) = lower(p_email);
  if not found then
    insert into public.members (first_name, last_name, email, member_role, membership_status)
    values (btrim(p_first_name), btrim(p_last_name), lower(p_email), 'prospect', 'prospect')
    returning id into v_member_id;
  end if;

  v_amount_cents := v_tier.price_cents * p_quantity;

  insert into public.sponsorship_claims (
    tier_id, event_id, member_id, first_name, last_name, email,
    company_name, signage_name, logo_url, quantity, amount_cents, notes
  ) values (
    v_tier.id, v_tier.event_id, v_member_id, btrim(p_first_name), btrim(p_last_name),
    lower(p_email), nullif(btrim(coalesce(p_company_name,'')), ''),
    btrim(p_signage_name), nullif(btrim(coalesce(p_logo_url,'')), ''),
    p_quantity, v_amount_cents, nullif(btrim(coalesce(p_notes,'')), '')
  )
  returning id into v_claim_id;

  -- Exclusive slot just filled: flip the tier so it leaves the public page.
  if v_tier.inventory_limit is not null
     and (coalesce(v_claimed, 0) + p_quantity) >= v_tier.inventory_limit then
    update public.sponsorship_tiers
    set status = 'sold_out', updated_at = now()
    where id = v_tier.id;
  end if;

  -- Sponsor-specific confirmation, distinct from attendee RSVP emails.
  v_subject := 'Thank you for sponsoring: ' || v_event_name;
  v_body := '<p>Dear ' || btrim(p_first_name) || ',</p>'
    || '<p>Thank you for claiming the <strong>' || v_tier.name || '</strong>'
    || case when p_quantity > 1 then ' (×' || p_quantity || ')' else '' end
    || ' for <strong>' || v_event_name || '</strong>.'
    || case when v_amount_cents is not null
            then ' Your sponsorship total is <strong>$'
              || to_char(v_amount_cents / 100.0, 'FM999,990.00') || '</strong>.'
            else '' end
    || '</p>'
    || '<p>On event signage you will appear as: <strong>'
    || btrim(p_signage_name) || '</strong></p>'
    || case when v_tier.payment_url is not null
            then '<p>If you have not paid yet, please complete your payment here: '
              || '<a href="' || v_tier.payment_url || '">' || v_tier.payment_url || '</a>. '
              || 'The Krewe of Shamrock is a 501(c)(3) nonprofit; your payment receipt '
              || 'doubles as your tax receipt.</p>'
            else '<p>An officer will follow up with payment details. The Krewe of '
              || 'Shamrock is a 501(c)(3) nonprofit; your payment receipt doubles as '
              || 'your tax receipt.</p>' end
    || '<p>Please send any remaining branding materials (high-resolution logo, '
    || 'preferred wording) by <strong>Friday, October 9, 2026</strong> so we can '
    || 'have your signage and the 7:00 PM dinner presentation mentions ready for '
    || 'the ball on October 24.</p>'
    || '<p>Sláinte! 🍀<br/>Krewe of Shamrock</p>';

  perform public.enqueue_email(
    lower(p_email), btrim(p_first_name) || ' ' || btrim(p_last_name),
    v_subject, v_body, 'sponsorship_confirmation', v_member_id);

  return jsonb_build_object(
    'ok', true,
    'claim_id', v_claim_id,
    'payment_url', v_tier.payment_url,
    'amount_cents', v_amount_cents,
    'message', 'Thank you! Your sponsorship is reserved — check your email for confirmation.'
  );
end;
$function$;

revoke all on function public.claim_sponsorship(uuid,text,text,text,text,text,text,integer,text) from public;
grant execute on function public.claim_sponsorship(uuid,text,text,text,text,text,text,integer,text) to anon, authenticated;

-- 5. Officer management RPCs --------------------------------------------------

create or replace function public.officer_upsert_sponsorship_tier(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_row public.sponsorship_tiers%rowtype;
  v_name text;
  v_event_id uuid;
begin
  if not public.can_manage_events() then
    return jsonb_build_object('ok', false, 'message',
      'Only board members, officers, and committee chairs can manage sponsorships.');
  end if;

  v_name := nullif(btrim(coalesce(p->>'name','')), '');
  if v_name is null then
    return jsonb_build_object('ok', false, 'message', 'Sponsorship name is required.');
  end if;

  v_id := nullif(p->>'id','')::uuid;
  v_event_id := nullif(p->>'event_id','')::uuid;

  if v_id is null then
    if v_event_id is null then
      return jsonb_build_object('ok', false, 'message', 'An event is required.');
    end if;
    insert into public.sponsorship_tiers (
      event_id, name, description, perks, price_cents, inventory_limit,
      max_per_order, payment_url, tier_group, sort_order, status, created_by
    ) values (
      v_event_id,
      v_name,
      nullif(p->>'description',''),
      nullif(p->>'perks',''),
      nullif(p->>'price_cents','')::integer,
      nullif(p->>'inventory_limit','')::integer,
      coalesce(nullif(p->>'max_per_order','')::integer, 1),
      nullif(p->>'payment_url',''),
      nullif(p->>'tier_group',''),
      coalesce(nullif(p->>'sort_order','')::integer, 100),
      coalesce(nullif(p->>'status',''), 'published'),
      auth.uid()
    )
    returning * into v_row;
  else
    update public.sponsorship_tiers t set
      name = v_name,
      description = case when p ? 'description' then nullif(p->>'description','') else t.description end,
      perks = case when p ? 'perks' then nullif(p->>'perks','') else t.perks end,
      price_cents = case when p ? 'price_cents' then nullif(p->>'price_cents','')::integer else t.price_cents end,
      inventory_limit = case when p ? 'inventory_limit' then nullif(p->>'inventory_limit','')::integer else t.inventory_limit end,
      max_per_order = coalesce(nullif(p->>'max_per_order','')::integer, t.max_per_order),
      payment_url = case when p ? 'payment_url' then nullif(p->>'payment_url','') else t.payment_url end,
      tier_group = case when p ? 'tier_group' then nullif(p->>'tier_group','') else t.tier_group end,
      sort_order = coalesce(nullif(p->>'sort_order','')::integer, t.sort_order),
      status = coalesce(nullif(p->>'status',''), t.status),
      updated_at = now()
    where t.id = v_id
    returning * into v_row;

    if not found then
      return jsonb_build_object('ok', false, 'message', 'Sponsorship tier not found.');
    end if;
  end if;

  return jsonb_build_object('ok', true, 'tier', to_jsonb(v_row));
end;
$$;

revoke all on function public.officer_upsert_sponsorship_tier(jsonb) from public;
grant execute on function public.officer_upsert_sponsorship_tier(jsonb) to authenticated;

create or replace function public.officer_list_sponsorships(p_event_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.can_manage_events() then
    return jsonb_build_object('ok', false, 'message', 'Not authorized.',
      'tiers', '[]'::jsonb, 'claims', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'ok', true,
    'tiers', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.sort_order, t.name)
      from public.sponsorship_tiers t
      where p_event_id is null or t.event_id = p_event_id
    ), '[]'::jsonb),
    'claims', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.created_at desc)
      from public.sponsorship_claims c
      where p_event_id is null or c.event_id = p_event_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.officer_list_sponsorships(uuid) from public;
grant execute on function public.officer_list_sponsorships(uuid) to authenticated;

-- 6. Sponsor logo uploads -----------------------------------------------------
-- Public bucket like event-flyers, but sponsors upload before they have an
-- account, so anonymous inserts are allowed. The bucket's own size and MIME
-- limits bound the abuse surface; officers can delete anything unwanted.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sponsor-logos', 'sponsor-logos', true,
  10485760, -- 10 MB, matches the sponsorship page client-side check
  array['image/jpeg','image/png','image/webp','image/svg+xml','application/pdf']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Sponsor logos are publicly readable" on storage.objects;
create policy "Sponsor logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'sponsor-logos');

drop policy if exists "Anyone may upload a sponsor logo" on storage.objects;
create policy "Anyone may upload a sponsor logo"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'sponsor-logos');

drop policy if exists "Event managers update sponsor logos" on storage.objects;
create policy "Event managers update sponsor logos"
  on storage.objects for update to authenticated
  using (bucket_id = 'sponsor-logos' and public.can_manage_events())
  with check (bucket_id = 'sponsor-logos' and public.can_manage_events());

drop policy if exists "Event managers delete sponsor logos" on storage.objects;
create policy "Event managers delete sponsor logos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'sponsor-logos' and public.can_manage_events());

-- 7. Seed the Tartan Ball 2026 tiers -----------------------------------------
-- Confirmed pricing (2026-09-19): Photography $350; Corporate Bronze $500,
-- Silver $1,000, Gold $1,500. Corporate perks below are sensible defaults —
-- edit them any time via officer_upsert_sponsorship_tier or the SQL editor.

do $$
declare
  v_event_id uuid;
begin
  select id into v_event_id
  from public.events
  where name = 'Tartan Ball' and start_time::date = date '2026-10-24'
  limit 1;

  if v_event_id is null then
    raise notice 'Tartan Ball 2026 event not found; run sql/kos_seed_fall_2026_events.sql first.';
    return;
  end if;

  insert into public.sponsorship_tiers
    (event_id, name, description, perks, price_cents, inventory_limit, max_per_order, tier_group, sort_order, status)
  select v_event_id, x.name, x.description, x.perks, x.price_cents, x.inventory_limit, x.max_per_order, x.tier_group, x.sort_order, x.status
  from (values
    ('Moon Coin Band Sponsor',
     'Underwrite the Moon Coin band that plays the 6:00 PM cocktail hour.',
     E'Exclusive: only one band sponsor\nLogo or name on event signage\nThank-you mention during the 7:00 PM dinner presentations\nSocial media shoutout',
     35000, 1, 1, null, 10, 'published'),
    ('Photography Sponsor',
     'Sponsor the evening''s professional photography so every royal moment is captured.',
     E'Exclusive: only one photography sponsor\nLogo or name on event signage\nThank-you mention during the 7:00 PM dinner presentations\nSocial media shoutout',
     35000, 1, 1, null, 20, 'published'),
    ('Irish Dancers Sponsor',
     'Bring the Irish dancers to the floor for the ball.',
     E'Exclusive: only one dancers sponsor\nLogo or name on event signage\nThank-you mention during the 7:00 PM dinner presentations\nSocial media shoutout',
     30000, 1, 1, null, 30, 'published'),
    ('Liquor Wagon Sponsor',
     'Chip in $50 toward the liquor wagon raffle prize — sponsor as many increments as you like.',
     E'Name listed on the liquor wagon signage\nThank-you in the event program\nDrawn and awarded at 10:00 PM',
     5000, null, 10, null, 40, 'published'),
    ('Corporate Gold Sponsor',
     'Our top corporate package: put your company at the front of the season''s grandest evening.',
     E'Premier logo placement on event signage\nFeatured thank-you during the 7:00 PM dinner presentations\nThank-you in the event program\nDedicated social media spotlight',
     150000, null, 1, 'corporate', 50, 'published'),
    ('Corporate Silver Sponsor',
     'A prominent corporate presence at the Tartan Ball.',
     E'Company logo on event signage\nThank-you mention during the 7:00 PM dinner presentations\nThank-you in the event program\nSocial media shoutout',
     100000, null, 1, 'corporate', 60, 'published'),
    ('Corporate Bronze Sponsor',
     'A great way for a company to support the ball and be seen doing it.',
     E'Company name on event signage\nThank-you in the event program\nSocial media shoutout',
     50000, null, 1, 'corporate', 70, 'published')
  ) as x(name, description, perks, price_cents, inventory_limit, max_per_order, tier_group, sort_order, status)
  where not exists (
    select 1 from public.sponsorship_tiers t
    where t.event_id = v_event_id and t.name = x.name
  );

  -- 8. Confirmed pricing (2026-09-19), for databases where an earlier version
  -- of this file already seeded these tiers as drafts. Only touches rows still
  -- in 'draft', so officer customizations are never overwritten.
  update public.sponsorship_tiers
  set status = 'published', updated_at = now()
  where event_id = v_event_id and name = 'Photography Sponsor'
    and status = 'draft';

  update public.sponsorship_tiers t
  set price_cents = x.price_cents,
      description = x.description,
      perks = x.perks,
      status = 'published',
      updated_at = now()
  from (values
    ('Corporate Gold Sponsor', 150000,
     'Our top corporate package: put your company at the front of the season''s grandest evening.',
     E'Premier logo placement on event signage\nFeatured thank-you during the 7:00 PM dinner presentations\nThank-you in the event program\nDedicated social media spotlight'),
    ('Corporate Silver Sponsor', 100000,
     'A prominent corporate presence at the Tartan Ball.',
     E'Company logo on event signage\nThank-you mention during the 7:00 PM dinner presentations\nThank-you in the event program\nSocial media shoutout'),
    ('Corporate Bronze Sponsor', 50000,
     'A great way for a company to support the ball and be seen doing it.',
     E'Company name on event signage\nThank-you in the event program\nSocial media shoutout')
  ) as x(name, price_cents, description, perks)
  where t.event_id = v_event_id and t.name = x.name
    and t.status = 'draft';
end $$;
