-- Volunteer Dues Waiver (Service in Lieu of Dues) — Doug and Melissa Tully
-- Companion document: VOLUNTEER_DUES_WAIVER.md (read it before running this).
-- Safe to re-run. Extends dues_payments with a 'waiver' payment method and
-- records the two waived dues rows so finance, dues reminders, and the
-- parade-ready check all see these members as settled at $0.00.

-- 1) Allow 'waiver' as an official payment method ------------------------------
-- The original check constraint only allowed cash/check/card/paypal/square/other.
-- Recording waivers under their own method (instead of hiding them in 'other')
-- keeps the treasurer's reports honest: a waiver is visibly not money received.
alter table public.dues_payments
  drop constraint if exists dues_payments_payment_method_check;
alter table public.dues_payments
  add constraint dues_payments_payment_method_check
  check (payment_method is null
         or payment_method in ('cash','check','card','paypal','square','waiver','other'));

-- 2) Record the waiver for Doug Tully and Melissa Tully ------------------------
-- One row per member per membership year (enforced by dues_payments_member_year_uidx).
-- amount = 0 and paid = true means: nothing is owed, nothing was collected, and
-- the member drops out of v_outstanding_dues so reminder emails never go to them.
do $$
declare
  v_year integer := 2027;  -- membership year of the current dues cycle.
                           -- The live Zeffy dues campaigns (see PAYMENTS_SETUP.md)
                           -- run through June 30 and use membership_year 2027.
                           -- If your roster's existing dues rows use a different
                           -- year, change this value to match before running.
  v_note text := 'Volunteer Dues Waiver — service in lieu of dues. '
              || 'Standard dues waived in full; amount due and collected: $0.00. '
              || 'See VOLUNTEER_DUES_WAIVER.md in the repository for the approval '
              || 'record and the finance and accounting treatment.';
  v_member record;
  v_count integer := 0;
begin
  for v_member in
    select id, first_name, last_name
      from public.members
     where lower(last_name) = 'tully'
       and lower(first_name) in ('doug', 'douglas', 'melissa')
  loop
    insert into public.dues_payments
      (member_id, membership_year, amount, paid, paid_date, payment_method, notes)
    values
      (v_member.id, v_year, 0, true, current_date, 'waiver', v_note)
    on conflict (member_id, membership_year) do update
      set amount         = 0,
          paid           = true,
          paid_date      = coalesce(public.dues_payments.paid_date, current_date),
          payment_method = 'waiver',
          notes          = excluded.notes;
    v_count := v_count + 1;
    raise notice 'Recorded volunteer dues waiver for % % (membership year %)',
      v_member.first_name, v_member.last_name, v_year;
  end loop;

  if v_count <> 2 then
    raise warning
      'Expected to match exactly 2 members (Doug Tully and Melissa Tully) but matched %. '
      'Check the spelling of their first_name and last_name in public.members.', v_count;
  end if;
end $$;

-- 3) Verify ---------------------------------------------------------------------
-- Both rows should show amount 0, paid true, payment_method 'waiver'.
select m.first_name, m.last_name, d.membership_year, d.amount, d.paid,
       d.paid_date, d.payment_method, d.notes
  from public.dues_payments d
  join public.members m on m.id = d.member_id
 where lower(m.last_name) = 'tully'
 order by m.first_name, d.membership_year;
