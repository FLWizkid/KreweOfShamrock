-- Officer desk: Email members + Send invoices
-- Project: Krewe of Shamrock (oazwkwflgbthojvnclfc)
-- Safe to re-run. Extends outbound_emails / dues_payments; no card storage.

-- 1) Outreach log (who sent what / when) ---------------------------------------
create table if not exists public.officer_outreach_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('email', 'invoice')),
  audience text,
  subject text,
  body_html text,
  recipient_count integer not null default 0,
  member_ids uuid[] default '{}',
  meta jsonb not null default '{}'::jsonb,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists officer_outreach_log_created_at_idx
  on public.officer_outreach_log (created_at desc);
create index if not exists officer_outreach_log_kind_idx
  on public.officer_outreach_log (kind, created_at desc);

alter table public.officer_outreach_log enable row level security;

drop policy if exists "Officers read outreach log" on public.officer_outreach_log;
create policy "Officers read outreach log"
  on public.officer_outreach_log for select to authenticated
  using (public.is_krewe_officer());

drop policy if exists "Officers insert outreach log" on public.officer_outreach_log;
create policy "Officers insert outreach log"
  on public.officer_outreach_log for insert to authenticated
  with check (public.is_krewe_officer());

-- Prefer one unpaid/paid row per member+year when creating invoices
create unique index if not exists dues_payments_member_year_uidx
  on public.dues_payments (member_id, membership_year);

-- 2) Roster search for pick-lists ----------------------------------------------
create or replace function public.officer_search_roster(p_q text default '', p_limit integer default 40)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_q text := lower(btrim(coalesce(p_q, '')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 40), 100));
begin
  if not public.is_krewe_officer() then
    return jsonb_build_object('ok', false, 'message', 'Officers only.', 'members', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'ok', true,
    'members', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.last_name, x.first_name)
      from (
        select m.id, m.first_name, m.last_name, lower(m.email) as email,
               m.member_role, coalesce(m.officer_title, '') as officer_title,
               m.membership_status
        from public.members m
        where m.merged_into is null
          and m.membership_status in ('active', 'lapsed', 'pending-renewal')
          and m.email is not null
          and position('@' in m.email) > 0
          and (
            v_q = ''
            or lower(m.first_name) like '%' || v_q || '%'
            or lower(m.last_name) like '%' || v_q || '%'
            or lower(m.email) like '%' || v_q || '%'
            or lower(coalesce(m.officer_title, '')) like '%' || v_q || '%'
            or lower(m.first_name || ' ' || m.last_name) like '%' || v_q || '%'
          )
        order by m.last_name, m.first_name
        limit v_limit
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.officer_search_roster(text, integer) from public, anon;
grant execute on function public.officer_search_roster(text, integer) to authenticated;

-- 3) Audience counts for Email members UI --------------------------------------
create or replace function public.officer_email_audience_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_krewe_officer() then
    return jsonb_build_object('ok', false, 'message', 'Officers only.');
  end if;
  return jsonb_build_object(
    'ok', true,
    'active', (select count(*)::int from public.v_active_member_emails),
    'officers', (select count(*)::int from public.v_officer_emails),
    'chairs', (
      select count(*)::int from public.members m
      where m.merged_into is null
        and m.membership_status = 'active'
        and m.email is not null and position('@' in m.email) > 0
        and (
          lower(coalesce(m.officer_title, '')) like '%chair%'
          or lower(coalesce(m.member_role, '')) in ('officer', 'captain', 'board')
        )
    )
  );
end;
$$;

revoke all on function public.officer_email_audience_counts() from public, anon;
grant execute on function public.officer_email_audience_counts() to authenticated;

-- 4) Send member email (flexible audience) -------------------------------------
create or replace function public.officer_send_member_email(
  p_subject text,
  p_body_html text,
  p_audience text default 'active',
  p_member_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_audience text := lower(coalesce(nullif(btrim(p_audience), ''), 'active'));
  v_subject text := nullif(btrim(p_subject), '');
  v_body_in text := nullif(btrim(p_body_html), '');
  v_body text;
  v_count integer := 0;
  v_ids uuid[] := '{}';
  r record;
  v_log_id uuid;
begin
  if not public.is_krewe_officer() then
    return jsonb_build_object('ok', false, 'message', 'Officers only.');
  end if;
  if v_subject is null then
    return jsonb_build_object('ok', false, 'message', 'Subject is required.');
  end if;
  if v_body_in is null then
    return jsonb_build_object('ok', false, 'message', 'Message body is required.');
  end if;
  if v_audience not in ('active', 'officers', 'chairs', 'selected') then
    return jsonb_build_object('ok', false, 'message', 'Choose an audience: active, officers, chairs, or selected.');
  end if;
  if v_audience = 'selected' and (p_member_ids is null or cardinality(p_member_ids) = 0) then
    return jsonb_build_object('ok', false, 'message', 'Pick at least one member from the roster.');
  end if;

  v_body := public.wrap_all_krewe_email_html(v_subject, v_body_in);

  if v_audience = 'active' then
    for r in
      select member_id, first_name, last_name, email from public.v_active_member_emails
    loop
      perform public.enqueue_email(
        r.email,
        nullif(btrim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')), ''),
        v_subject, v_body, 'officer_email', r.member_id
      );
      v_ids := array_append(v_ids, r.member_id);
      v_count := v_count + 1;
    end loop;
  elsif v_audience = 'officers' then
    for r in
      select member_id, first_name, last_name, email from public.v_officer_emails
    loop
      perform public.enqueue_email(
        r.email,
        nullif(btrim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')), ''),
        v_subject, v_body, 'officer_email', r.member_id
      );
      v_ids := array_append(v_ids, r.member_id);
      v_count := v_count + 1;
    end loop;
  elsif v_audience = 'chairs' then
    for r in
      select m.id as member_id, m.first_name, m.last_name, lower(m.email) as email
      from public.members m
      where m.merged_into is null
        and m.membership_status = 'active'
        and m.email is not null and position('@' in m.email) > 0
        and (
          lower(coalesce(m.officer_title, '')) like '%chair%'
          or lower(coalesce(m.member_role, '')) in ('officer', 'captain', 'board')
        )
    loop
      perform public.enqueue_email(
        r.email,
        nullif(btrim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')), ''),
        v_subject, v_body, 'officer_email', r.member_id
      );
      v_ids := array_append(v_ids, r.member_id);
      v_count := v_count + 1;
    end loop;
  else
    for r in
      select m.id as member_id, m.first_name, m.last_name, lower(m.email) as email
      from public.members m
      where m.id = any(p_member_ids)
        and m.merged_into is null
        and m.email is not null and position('@' in m.email) > 0
    loop
      perform public.enqueue_email(
        r.email,
        nullif(btrim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')), ''),
        v_subject, v_body, 'officer_email', r.member_id
      );
      v_ids := array_append(v_ids, r.member_id);
      v_count := v_count + 1;
    end loop;
  end if;

  insert into public.officer_outreach_log
    (kind, audience, subject, body_html, recipient_count, member_ids, meta, sent_by)
  values
    ('email', v_audience, v_subject, v_body_in, v_count, v_ids,
     jsonb_build_object('purpose', 'officer_email'), auth.uid())
  returning id into v_log_id;

  -- Also mirror full-membership sends into all_krewe_messages history when audience=active
  if v_audience = 'active' then
    insert into public.all_krewe_messages (subject, body_html, sent_by, recipient_count, segment)
    values (v_subject, v_body_in, auth.uid(), v_count, 'active');
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_log_id,
    'recipient_count', v_count,
    'audience', v_audience,
    'message', 'Queued for ' || v_count || ' recipient(s). Delivery uses the krewe outbound email queue.'
  );
end;
$$;

revoke all on function public.officer_send_member_email(text, text, text, uuid[]) from public, anon;
grant execute on function public.officer_send_member_email(text, text, text, uuid[]) to authenticated;

-- 5) Invoice targets (unpaid / year / search) ----------------------------------
create or replace function public.officer_list_invoice_targets(
  p_filter text default 'unpaid',
  p_year integer default null,
  p_q text default '',
  p_limit integer default 80
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_filter text := lower(coalesce(nullif(btrim(p_filter), ''), 'unpaid'));
  v_year integer := coalesce(p_year, extract(year from current_date)::integer);
  v_q text := lower(btrim(coalesce(p_q, '')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 80), 200));
begin
  if not public.is_krewe_officer() then
    return jsonb_build_object('ok', false, 'message', 'Officers only.', 'targets', '[]'::jsonb);
  end if;
  if v_filter not in ('unpaid', 'active', 'search') then
    return jsonb_build_object('ok', false, 'message', 'Invalid filter.', 'targets', '[]'::jsonb);
  end if;

  if v_filter = 'unpaid' then
    return jsonb_build_object(
      'ok', true,
      'filter', v_filter,
      'year', v_year,
      'targets', coalesce((
        select jsonb_agg(to_jsonb(x) order by x.last_name, x.first_name)
        from (
          select d.member_id as id, m.first_name, m.last_name, lower(m.email) as email,
                 d.membership_year, d.amount, d.paid, d.due_date, d.id as dues_payment_id,
                 coalesce(m.officer_title, '') as officer_title
          from public.dues_payments d
          join public.members m on m.id = d.member_id
          where d.paid = false
            and m.merged_into is null
            and m.membership_status in ('active', 'lapsed', 'pending-renewal')
            and (p_year is null or d.membership_year = v_year)
          order by m.last_name, m.first_name
          limit v_limit
        ) x
      ), '[]'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'filter', v_filter,
    'year', v_year,
    'targets', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.last_name, x.first_name)
      from (
        select m.id, m.first_name, m.last_name, lower(m.email) as email,
               v_year as membership_year,
               coalesce(d.amount, 375)::numeric as amount,
               coalesce(d.paid, false) as paid,
               d.due_date,
               d.id as dues_payment_id,
               coalesce(m.officer_title, '') as officer_title
        from public.members m
        left join public.dues_payments d
          on d.member_id = m.id and d.membership_year = v_year
        where m.merged_into is null
          and m.membership_status = 'active'
          and m.email is not null and position('@' in m.email) > 0
          and (
            v_filter = 'active'
            or v_q = ''
            or lower(m.first_name) like '%' || v_q || '%'
            or lower(m.last_name) like '%' || v_q || '%'
            or lower(m.email) like '%' || v_q || '%'
            or lower(m.first_name || ' ' || m.last_name) like '%' || v_q || '%'
          )
        order by m.last_name, m.first_name
        limit v_limit
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.officer_list_invoice_targets(text, integer, text, integer) from public, anon;
grant execute on function public.officer_list_invoice_targets(text, integer, text, integer) to authenticated;

-- 6) Create invoices (+ optional email with Zeffy pay link) --------------------
create or replace function public.officer_create_and_send_invoices(
  p_member_ids uuid[],
  p_year integer default null,
  p_amount numeric default null,
  p_note text default null,
  p_invoice_type text default 'dues_year',
  p_send_email boolean default true,
  p_pay_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_year integer := coalesce(p_year, extract(year from current_date)::integer);
  v_type text := lower(coalesce(nullif(btrim(p_invoice_type), ''), 'dues_year'));
  v_amount numeric;
  v_note text := nullif(btrim(p_note), '');
  v_pay text := coalesce(
    nullif(btrim(p_pay_url), ''),
    'https://www.zeffy.com/en-US/ticketing/krewe-of-shamrock-membership'
  );
  v_created integer := 0;
  v_updated integer := 0;
  v_emailed integer := 0;
  v_ids uuid[] := '{}';
  v_dues_ids uuid[] := '{}';
  r record;
  v_dues_id uuid;
  v_amt numeric;
  v_subj text;
  v_body text;
  v_body_wrapped text;
  v_log_id uuid;
  v_name text;
begin
  if not public.is_krewe_officer() then
    return jsonb_build_object('ok', false, 'message', 'Officers only.');
  end if;
  if p_member_ids is null or cardinality(p_member_ids) = 0 then
    return jsonb_build_object('ok', false, 'message', 'Pick at least one member.');
  end if;
  if v_type not in ('dues_year', 'custom') then
    return jsonb_build_object('ok', false, 'message', 'Invoice type must be dues_year or custom.');
  end if;
  if v_type = 'custom' and (p_amount is null or p_amount <= 0) then
    return jsonb_build_object('ok', false, 'message', 'Custom invoices need a positive amount.');
  end if;

  for r in
    select m.id, m.first_name, m.last_name, lower(m.email) as email
    from public.members m
    where m.id = any(p_member_ids)
      and m.merged_into is null
  loop
    v_amt := coalesce(p_amount, 375);
    -- Keep existing unpaid amount if creating dues_year without explicit amount
    select id, amount into v_dues_id, v_amount
    from public.dues_payments
    where member_id = r.id and membership_year = v_year
    limit 1;

    if v_dues_id is null then
      insert into public.dues_payments (member_id, membership_year, amount, due_date, paid, notes)
      values (
        r.id, v_year, v_amt,
        make_date(v_year, 6, 30),
        false,
        coalesce(v_note, case when v_type = 'custom' then 'Custom invoice' else 'Dues invoice' end)
      )
      returning id into v_dues_id;
      v_created := v_created + 1;
    else
      update public.dues_payments
         set amount = case when p_amount is not null then p_amount else amount end,
             notes = case
                       when v_note is not null then
                         trim(both from coalesce(notes, '') || case when coalesce(notes, '') = '' then '' else E'\n' end || v_note)
                       else notes
                     end,
             paid = case when paid then paid else false end
       where id = v_dues_id
         and paid = false;
      if found then v_updated := v_updated + 1; end if;
      select amount into v_amt from public.dues_payments where id = v_dues_id;
    end if;

    v_ids := array_append(v_ids, r.id);
    v_dues_ids := array_append(v_dues_ids, v_dues_id);

    if p_send_email and r.email is not null and position('@' in r.email) > 0 then
      -- Skip if already paid
      if exists (select 1 from public.dues_payments where id = v_dues_id and paid = true) then
        continue;
      end if;
      v_name := nullif(btrim(coalesce(r.first_name, '') || ' ' || coalesce(r.last_name, '')), '');
      v_subj := 'Krewe of Shamrock dues invoice (' || v_year::text || ')';
      v_body :=
        '<p>Hi ' || coalesce(r.first_name, 'friend') || ',</p>' ||
        '<p>This is your Krewe of Shamrock membership invoice for <b>' || v_year::text || '</b>.</p>' ||
        '<p><b>Amount due:</b> $' || trim(to_char(v_amt, 'FM999990.00')) || '</p>' ||
        case when v_note is not null then '<p>' || replace(replace(v_note, '<', '&lt;'), '>', '&gt;') || '</p>' else '' end ||
        '<p>Please pay securely through our Zeffy membership form (no card numbers are collected in the Member Hub):</p>' ||
        '<p style="margin:18px 0;"><a href="' || v_pay || '" ' ||
        'style="display:inline-block;background:#14532d;color:#fff;padding:12px 18px;border-radius:999px;' ||
        'text-decoration:none;font-weight:700;">Pay dues on Zeffy</a></p>' ||
        '<p style="font-size:13px;color:#5f6b5a;">Or open Member Hub, Home, and use the Pay dues path when available.</p>' ||
        '<p>If you already paid, thank you. You can ignore this note.</p>' ||
        '<p>Slainte,<br>Krewe of Shamrock · Secretary</p>';
      v_body_wrapped := public.wrap_all_krewe_email_html(v_subj, v_body);
      perform public.enqueue_email(r.email, v_name, v_subj, v_body_wrapped, 'invoice_notice', r.id);
      v_emailed := v_emailed + 1;
    end if;
  end loop;

  insert into public.officer_outreach_log
    (kind, audience, subject, body_html, recipient_count, member_ids, meta, sent_by)
  values (
    'invoice',
    v_type,
    'Invoices ' || v_year::text,
    coalesce(v_note, ''),
    cardinality(v_ids),
    v_ids,
    jsonb_build_object(
      'year', v_year,
      'amount', p_amount,
      'created', v_created,
      'updated', v_updated,
      'emailed', v_emailed,
      'dues_payment_ids', to_jsonb(v_dues_ids),
      'pay_url', v_pay,
      'send_email', p_send_email
    ),
    auth.uid()
  )
  returning id into v_log_id;

  return jsonb_build_object(
    'ok', true,
    'id', v_log_id,
    'created', v_created,
    'updated', v_updated,
    'emailed', v_emailed,
    'member_count', cardinality(v_ids),
    'year', v_year,
    'message', 'Created/updated ' || (v_created + v_updated)::text ||
               ' invoice(s)' ||
               case when p_send_email then '; queued ' || v_emailed::text || ' email notice(s).' else '.' end
  );
end;
$$;

revoke all on function public.officer_create_and_send_invoices(uuid[], integer, numeric, text, text, boolean, text) from public, anon;
grant execute on function public.officer_create_and_send_invoices(uuid[], integer, numeric, text, text, boolean, text) to authenticated;

-- 7) Recent outreach history ---------------------------------------------------
create or replace function public.officer_list_outreach_log(
  p_kind text default null,
  p_limit integer default 40
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_kind text := lower(nullif(btrim(p_kind), ''));
  v_limit integer := greatest(1, least(coalesce(p_limit, 40), 100));
begin
  if not public.is_krewe_officer() then
    return jsonb_build_object('ok', false, 'message', 'Officers only.', 'items', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'ok', true,
    'items', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select id, kind, audience, subject, recipient_count, meta, sent_by, created_at
        from public.officer_outreach_log
        where v_kind is null or kind = v_kind
        order by created_at desc
        limit v_limit
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.officer_list_outreach_log(text, integer) from public, anon;
grant execute on function public.officer_list_outreach_log(text, integer) to authenticated;
