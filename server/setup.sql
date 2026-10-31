-- =====================================================================
--  Egg game: every player gets exactly one egg, rolled on the server.
--  Paste all of this into Supabase > SQL Editor > New query > Run.
--  Safe to run again: it updates the lists and leaves existing eggs alone.
-- =====================================================================

-- how likely each rarity is (relative weights, per creature)
create table if not exists public.rarity_weights (
  rarity text primary key,
  weight numeric not null check (weight > 0)
);

-- the creatures that can hatch
create table if not exists public.creatures (
  id text primary key,
  rarity text not null references public.rarity_weights(rarity)
);

-- one egg per player, forever
create table if not exists public.eggs (
  owner uuid primary key references auth.users(id) on delete cascade,
  creature text not null references public.creatures(id),
  created_at timestamptz not null default now(),
  hatched_at timestamptz
);

-- players can read, never write. Eggs are only made by claim_egg() below.
alter table public.rarity_weights enable row level security;
alter table public.creatures enable row level security;
alter table public.eggs enable row level security;

drop policy if exists "anyone reads weights" on public.rarity_weights;
create policy "anyone reads weights" on public.rarity_weights for select using (true);
drop policy if exists "anyone reads creatures" on public.creatures;
create policy "anyone reads creatures" on public.creatures for select using (true);
drop policy if exists "players read their own egg" on public.eggs;
create policy "players read their own egg" on public.eggs for select using (auth.uid() = owner);

insert into public.rarity_weights (rarity, weight) values
  ('common', 10), ('uncommon', 5), ('rare', 2.5), ('epic', 1), ('legendary', 0.3)
on conflict (rarity) do update set weight = excluded.weight;

insert into public.creatures (id, rarity) values
  ('winglet', 'common'), ('bloop', 'common'), ('sunspike', 'common'), ('octoodle', 'common'),
  ('limefin', 'common'), ('shroomie', 'common'), ('petalpop', 'common'), ('noodle', 'common'),
  ('pompom', 'common'), ('clackster', 'common'),
  ('puffhorn', 'uncommon'), ('orbit', 'uncommon'), ('tweetle', 'uncommon'), ('cloudbun', 'uncommon'),
  ('emberwing', 'rare'), ('nightflap', 'rare'), ('pebblebot', 'rare'), ('mossdragon', 'rare'),
  ('flufflet', 'epic'),
  ('moonpaw', 'legendary')
on conflict (id) do update set rarity = excluded.rarity;

-- Gives the signed-in player their egg. The first call rolls it; every later call
-- (another phone, a reinstall) returns the same one.
create or replace function public.claim_egg()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  picked text;
  total numeric;
  r numeric;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  select creature into picked from eggs where owner = uid;
  if picked is not null then
    return picked;
  end if;

  select sum(w.weight) into total from creatures c join rarity_weights w using (rarity);
  r := random() * total;

  select x.id into picked from (
    select c.id, sum(w.weight) over (order by c.id) as upto
    from creatures c join rarity_weights w using (rarity)
  ) x
  where x.upto >= r
  order by x.upto
  limit 1;

  insert into eggs (owner, creature) values (uid, picked) on conflict (owner) do nothing;
  select creature into picked from eggs where owner = uid;
  return picked;
end;
$$;

-- remembers when the egg hatched (the first time only)
create or replace function public.mark_hatched()
returns void
language sql
security definer
set search_path = public
as $$
  update eggs set hatched_at = coalesce(hatched_at, now()) where owner = auth.uid();
$$;

revoke all on function public.claim_egg() from public, anon;
revoke all on function public.mark_hatched() from public, anon;
grant execute on function public.claim_egg() to authenticated;
grant execute on function public.mark_hatched() to authenticated;
