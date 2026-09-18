-- Event Studio: permanently delete a mistaken krewe event.
-- Apply live after review (Supabase SQL editor or `supabase db query`).
-- Safe to re-run (CREATE OR REPLACE). Does not drop or alter tables.
--
-- Related-data behavior (matches live FKs on oazwkwflgbthojvnclfc):
--   event_signups              ON DELETE CASCADE  — RSVPs/ticket intents for
--                            this event are removed (they only belong here).
--   payments.event_id          NO ACTION, nullable — ledger rows are KEPT;
--                            this RPC nulls event_id so the delete is not blocked.
--   raffle_events.krewe_event_id  ON DELETE SET NULL — raffle data is KEPT;
--                            this RPC unlinks first (does not delete raffles).
--   events.raffle_event_id     points the other way; deleting the krewe event
--                            does not delete raffle_events.
--   clover_ledger.event_id     ON DELETE SET NULL — Clover history kept.
--   volunteer_hours.event_id   ON DELETE SET NULL — hours kept.
--   legacy_event_registrations ON DELETE SET NULL — WA import rows kept.
--   tartan_ball_orders         ON DELETE CASCADE, event_id NOT NULL —
--                            BLOCK delete with a clear message so seating /
--                            ticket orders are not destroyed. Cancel the event
--                            instead.
--
-- Cancelled status is unchanged. This RPC is the hard-delete path only.

create or replace function public.officer_delete_event(p_event_id uuid, p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.events%rowtype;
  v_confirm text;
  v_signups integer := 0;
  v_payments integer := 0;
  v_raffles integer := 0;
  v_tartan integer := 0;
begin
  if not public.can_manage_events() then
    return jsonb_build_object('ok', false, 'message',
      'Only board members, officers, and committee chairs can manage events.');
  end if;

  if p_event_id is null then
    return jsonb_build_object('ok', false, 'message', 'Event id is required.');
  end if;

  select * into v_row from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Event not found.');
  end if;

  if coalesce(v_row.source, '') = 'ikc' then
    return jsonb_build_object('ok', false, 'message',
      'IKC sync events cannot be deleted.');
  end if;

  v_confirm := btrim(coalesce(p_confirm, ''));
  if v_confirm = '' then
    return jsonb_build_object('ok', false, 'message',
      'Type the event name or Delete permanently to confirm.');
  end if;
  if lower(v_confirm) is distinct from lower(btrim(coalesce(v_row.name, '')))
     and lower(v_confirm) is distinct from 'delete permanently' then
    return jsonb_build_object('ok', false, 'message',
      'Confirmation did not match. Type the event name or Delete permanently.');
  end if;

  -- Tartan Ball seating/ticket orders cascade-delete with the event and
  -- event_id is NOT NULL, so we refuse rather than destroy those records.
  if to_regclass('public.tartan_ball_orders') is not null then
    execute 'select count(*)::int from public.tartan_ball_orders where event_id = $1'
      into v_tartan
      using p_event_id;
    if coalesce(v_tartan, 0) > 0 then
      return jsonb_build_object('ok', false, 'message',
        'This event has Tartan Ball orders. Set Status to Cancelled instead of deleting so seating and ticket records stay intact.');
    end if;
  end if;

  -- Keep the payments ledger; clear the event link so NO ACTION does not fail.
  if to_regclass('public.payments') is not null then
    update public.payments
       set event_id = null
     where event_id = p_event_id;
    get diagnostics v_payments = row_count;
  end if;

  -- Unlink raffles rather than deleting raffle_events / baskets / entries.
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'raffle_events'
       and column_name = 'krewe_event_id'
  ) then
    update public.raffle_events
       set krewe_event_id = null
     where krewe_event_id = p_event_id;
    get diagnostics v_raffles = row_count;
  end if;

  -- RSVPs / ticket-intent rows for this event only.
  if to_regclass('public.event_signups') is not null then
    delete from public.event_signups where event_id = p_event_id;
    get diagnostics v_signups = row_count;
  end if;

  begin
    delete from public.events where id = p_event_id;
  exception when foreign_key_violation then
    return jsonb_build_object('ok', false, 'message',
      'This event still has linked records and cannot be deleted. Set Status to Cancelled instead.');
  end;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Event not found.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'event_id', p_event_id,
    'name', v_row.name,
    'signups_removed', v_signups,
    'payments_unlinked', v_payments,
    'raffles_unlinked', v_raffles
  );
end;
$$;

revoke all on function public.officer_delete_event(uuid, text) from public;
grant execute on function public.officer_delete_event(uuid, text) to authenticated;

comment on function public.officer_delete_event(uuid, text) is
  'Officer Event Studio hard-delete. Requires can_manage_events() and a confirm token (event name or Delete permanently). Keeps payments and raffles; removes RSVPs; blocks Tartan Ball orders.';
