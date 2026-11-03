-- One purchase per account. Passwords are handled by Supabase Auth (bcrypt), never stored here.
create table if not exists public.purchases(
  user_id uuid primary key references auth.users on delete cascade,
  email text not null,
  edition text not null check (edition in ('demo','standard','gold')),
  amount_cents bigint not null,
  coupon text,
  created_at timestamptz not null default now()
);
alter table public.purchases enable row level security;
drop policy if exists "read own purchase" on public.purchases;
create policy "read own purchase" on public.purchases for select using (auth.uid() = user_id);
-- No insert/update policy: rows are written only by claim_free() or the Stripe webhook (service role).

-- Free editions and discount codes, checked on the server.
create or replace function public.claim_free(p_edition text, p_code text)
returns public.purchases language plpgsql security definer set search_path = public as $$
declare r public.purchases;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from purchases where user_id = auth.uid()) then raise exception 'already purchased'; end if;
  if p_edition = 'demo' then
    insert into purchases(user_id, email, edition, amount_cents) values (auth.uid(), auth.jwt()->>'email', 'demo', 0) returning * into r;
  elsif p_edition = 'standard' and upper(coalesce(p_code, '')) = 'ABC466' then
    insert into purchases(user_id, email, edition, amount_cents, coupon) values (auth.uid(), auth.jwt()->>'email', 'standard', 0, 'ABC466') returning * into r;
  else
    raise exception 'payment required';
  end if;
  return r;
end $$;
revoke all on function public.claim_free(text, text) from public;
grant execute on function public.claim_free(text, text) to authenticated;
