-- Lock billing, credit and unlock state against writes from the browser.
--
-- Found 2026-10-01. The Supabase anon key ships to every browser, and three policies trusted it:
--
--   1. "Anyone can read quotes by share_token" used `share_token is not null`, which never checks
--      the token VALUE. Every shared quote was readable in bulk by anyone. Confirmed live: an
--      unauthenticated request counted 21 rows. The share page already reads by exact token with
--      the service role, so this policy is not needed by anything.
--
--   2. "Users can update own profile" had no column limits, so a user could set
--      billing_status = 'active' from the console and get paid access, or reset their credits.
--      saveProfileSetupAction also re-sent free_quotes_used = 0 on every submission, so credits
--      could be reset without the console at all.
--
--   3. "Users can update own quotes" / "insert own quotes" let a user set is_unlocked = true
--      directly, skipping the credit check.
--
--   4. increment_free_quotes_used(user_id) was SECURITY DEFINER and trusted its argument, so any
--      user could burn any OTHER user's credits.
--
-- The guards below test current_user. PostgREST runs browser requests as `anon` or
-- `authenticated`, and server requests (service role key) as `service_role`. Inside a SECURITY
-- DEFINER function current_user is the function owner, so trusted database functions also pass.
-- That means: the browser cannot touch these columns; the server and our own functions can.
--
-- Profile guard REVERTS rather than raises, deliberately. Legitimate flows (onboarding upserts,
-- settings saves) send some of these columns with harmless values, and raising would break them.
-- Reverting neutralises the attack and leaves every honest request working.

begin;

-- 1. No bulk read of shared quotes ---------------------------------------------------------------
drop policy if exists "Anyone can read quotes by share_token" on public.quotes;


-- 2. Profiles: billing, credit and moderation columns are server-only -----------------------------
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.billing_status           := 'inactive';
    new.billing_cycle            := null;
    new.paypal_subscription_id   := null;
    new.paypal_payer_id          := null;
    new.guarantee_eligible_until := null;
    new.refund_used_at           := null;
    new.lifetime_deal_claimed_at := null;
    new.free_quotes_used         := 0;
    new.free_quotes_limit        := 3;
    new.status                   := 'active';
  else
    new.billing_status           := old.billing_status;
    new.billing_cycle            := old.billing_cycle;
    new.paypal_subscription_id   := old.paypal_subscription_id;
    new.paypal_payer_id          := old.paypal_payer_id;
    new.guarantee_eligible_until := old.guarantee_eligible_until;
    new.refund_used_at           := old.refund_used_at;
    new.lifetime_deal_claimed_at := old.lifetime_deal_claimed_at;
    new.free_quotes_used         := old.free_quotes_used;
    new.free_quotes_limit        := old.free_quotes_limit;
    new.status                   := old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();


-- 3. Quotes: only a paying user may unlock from the browser ---------------------------------------
-- Free users unlock through consume_free_quote() plus a server write. Not SECURITY DEFINER on
-- purpose: current_user must stay the caller's role, and the policy already guarantees
-- new.user_id = auth.uid(), so reading that profile through RLS is enough.
create or replace function public.guard_quote_unlock()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  paid boolean;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if new.is_unlocked and (tg_op = 'INSERT' or not old.is_unlocked) then
    select (billing_status = 'active') into paid
      from public.profiles
     where id = new.user_id;

    if not coalesce(paid, false) then
      new.is_unlocked := case when tg_op = 'UPDATE' then old.is_unlocked else false end;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists quotes_guard_unlock on public.quotes;
create trigger quotes_guard_unlock
  before insert or update on public.quotes
  for each row execute function public.guard_quote_unlock();


-- 4. Credits: consume your own, atomically, and say whether it worked -----------------------------
drop function if exists public.increment_free_quotes_used(uuid);

create or replace function public.consume_free_quote()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.profiles
     set free_quotes_used = free_quotes_used + 1
   where id = auth.uid()
     and free_quotes_used < free_quotes_limit;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

revoke all on function public.consume_free_quote() from public, anon;
grant execute on function public.consume_free_quote() to authenticated;

commit;
