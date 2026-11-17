begin;

create schema wachochemer_private;
revoke all on schema wachochemer_private from public;
grant usage on schema wachochemer_private to authenticated;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  adults integer not null default 0 check (adults between 0 and 100),
  children integer not null default 0 check (children between 0 and 100),
  babies integer not null default 0 check (babies between 0 and 100),
  adults_share numeric not null default 1 check (adults_share between 0 and 1000),
  children_share numeric not null default 1 check (children_share between 0 and 1000),
  babies_share numeric not null default 0 check (babies_share between 0 and 1000),
  check (adults * adults_share + children * children_share + babies * babies_share <= 1000)
);

create table public.household_members (
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (household_id, user_id)
);
create index household_members_by_user on public.household_members (user_id, household_id);

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  email text not null check (char_length(email) between 3 and 254 and email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  unique (household_id, email)
);

create type public.meal_slot as enum ('lunch', 'dinner');
create sequence wachochemer_private.meal_revisions;
create table public.household_meals (
  household_id uuid not null references public.households on delete cascade,
  day date not null,
  slot public.meal_slot not null,
  revision bigint not null default nextval('wachochemer_private.meal_revisions'),
  entry jsonb not null check (jsonb_typeof(entry) = 'object'),
  source_day date,
  source_slot public.meal_slot,
  primary key (household_id, day, slot),
  foreign key (household_id, source_day, source_slot)
    references public.household_meals (household_id, day, slot),
  check ((source_day is null) = (source_slot is null)),
  check ((source_day, source_slot) < (day, slot))
);
create index household_meals_by_source on public.household_meals (household_id, source_day, source_slot)
  where source_day is not null;

-- Resolve the authenticated account at the database boundary. Accounts with a
-- verified second factor must present an AAL2 session on every household request.
create function wachochemer_private.actor_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null
    and (
      (select auth.jwt()->>'aal') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified'
      )
    );
$$;

create function wachochemer_private.is_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = target and m.user_id = (select wachochemer_private.actor_id())
  );
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invitations enable row level security;
alter table public.household_meals enable row level security;

create policy household_read on public.households for select to authenticated
  using (wachochemer_private.is_member(id));
create policy household_settings_update on public.households for update to authenticated
  using (wachochemer_private.is_member(id))
  with check (wachochemer_private.is_member(id));
create policy household_members_read on public.household_members for select to authenticated
  using (wachochemer_private.is_member(household_id));
create policy household_invitations_read on public.household_invitations for select to authenticated
  using (wachochemer_private.is_member(household_id));
create policy household_meals_read on public.household_meals for select to authenticated
  using (wachochemer_private.is_member(household_id));

revoke all on public.households, public.household_members, public.household_invitations,
  public.household_meals from public, anon, authenticated;
grant select on public.households, public.household_members, public.household_invitations,
  public.household_meals to authenticated;
grant update (name, adults, children, babies, adults_share, children_share, babies_share)
  on public.households to authenticated;

create function wachochemer_private.create_household(household_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := wachochemer_private.actor_id();
  target_id uuid;
begin
  if actor is null then
    raise exception 'Sign-in verification required' using errcode = '42501';
  end if;
  insert into public.households (name) values (btrim(household_name))
    returning id into target_id;
  insert into public.household_members (household_id, user_id) values (target_id, actor);
  return target_id;
end;
$$;

-- Check before and after locking. Returning users cannot write after a
-- concurrent membership removal. Writers serialize within one household.
create function wachochemer_private.lock_household(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not wachochemer_private.is_member(target) then
    raise exception 'Household access denied' using errcode = '42501';
  end if;
  perform 1 from public.households h where h.id = target for update;
  if not wachochemer_private.is_member(target) then
    raise exception 'Household access denied' using errcode = '42501';
  end if;
end;
$$;

create function wachochemer_private.invite_household_member(target uuid, target_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  invitation_id uuid;
begin
  perform wachochemer_private.lock_household(target);
  insert into public.household_invitations (household_id, email)
    values (target, lower(btrim(target_email)))
  on conflict (household_id, email) do update
    set id = gen_random_uuid(), expires_at = excluded.expires_at
  returning id into invitation_id;
  return invitation_id;
end;
$$;

create function wachochemer_private.accept_household_invitation(invitation uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := wachochemer_private.actor_id();
  actor_email text;
  target uuid;
begin
  select lower(btrim(u.email)) into actor_email from auth.users u where u.id = actor;
  select i.household_id into target from public.household_invitations i
    where i.id = invitation and i.email = actor_email and i.expires_at > now();
  if not found then
    raise exception 'Invitation unavailable for this account' using errcode = '42501';
  end if;

  perform 1 from public.households h where h.id = target for update;
  delete from public.household_invitations i
    where i.id = invitation and i.email = actor_email and i.expires_at > now();
  if not found then
    raise exception 'Invitation unavailable for this account' using errcode = '42501';
  end if;
  insert into public.household_members (household_id, user_id)
    values (target, actor) on conflict do nothing;
  return target;
end;
$$;

create function wachochemer_private.revoke_household_invitation(target uuid, invitation uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform wachochemer_private.lock_household(target);
  delete from public.household_invitations i where i.household_id = target and i.id = invitation;
  return found;
end;
$$;

create function wachochemer_private.remove_household_member(target uuid, member_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform wachochemer_private.lock_household(target);
  if not exists (
    select 1 from public.household_members m where m.household_id = target and m.user_id <> member_id
  ) then
    raise exception 'The household must keep one member' using errcode = '23514';
  end if;
  delete from public.household_members m where m.household_id = target and m.user_id = member_id;
  return found;
end;
$$;

create function wachochemer_private.save_household_meal(
  target uuid, meal_day date, meal_slot public.meal_slot, expected_revision bigint, meal_entry jsonb
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  previous_revision bigint;
  origin_day date;
  origin_slot public.meal_slot;
  origin_entry jsonb;
  kind text := meal_entry->>'type';
  cooked numeric;
  consumed numeric;
  reserved numeric;
  requested numeric;
begin
  perform wachochemer_private.lock_household(target);
  select m.revision into previous_revision from public.household_meals m
    where m.household_id = target and m.day = meal_day and m.slot = meal_slot;
  if coalesce(previous_revision, 0) is distinct from expected_revision then
    raise exception 'Meal was changed in another session' using errcode = '40001';
  end if;

  if meal_entry is null then
    delete from public.household_meals m
      where m.household_id = target and m.day = meal_day and m.slot = meal_slot;
    return 0;
  end if;

  if kind = 'recipe' then
    cooked := (meal_entry->>'cookedServings')::numeric;
    consumed := (meal_entry->>'consumedServings')::numeric;
    if (meal_entry->>'recipeId' ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      and jsonb_typeof(meal_entry->'cookedServings') = 'number'
      and jsonb_typeof(meal_entry->'consumedServings') = 'number'
      and cooked > 0 and cooked <= 1000 and consumed between 0 and cooked) is not true then
      raise exception 'Invalid recipe portions' using errcode = '23514';
    end if;
  elsif kind = 'manual' then
    if (jsonb_typeof(meal_entry->'title') = 'string'
      and char_length(btrim(meal_entry->>'title')) between 1 and 140) is not true then
      raise exception 'Invalid meal title' using errcode = '23514';
    end if;
  elsif kind = 'leftover' then
    requested := (meal_entry->>'portions')::numeric;
    if (meal_entry->>'sourceKey' ~ '^\d{4}-\d{2}-\d{2}[|](lunch|dinner)$'
      and jsonb_typeof(meal_entry->'portions') = 'number'
      and requested > 0 and requested <= 1000) is not true then
      raise exception 'Invalid leftover portions or source' using errcode = '23514';
    end if;
    origin_day := split_part(meal_entry->>'sourceKey', '|', 1)::date;
    origin_slot := split_part(meal_entry->>'sourceKey', '|', 2)::public.meal_slot;
    select m.entry into origin_entry from public.household_meals m
      where m.household_id = target and m.day = origin_day and m.slot = origin_slot;
    if (origin_entry->>'type' = 'recipe' and (origin_day, origin_slot) < (meal_day, meal_slot)) is not true then
      raise exception 'Leftovers need an earlier recipe in this household' using errcode = '23514';
    end if;
    select coalesce(sum((m.entry->>'portions')::numeric), 0) into reserved
      from public.household_meals m
      where m.household_id = target and m.source_day = origin_day and m.source_slot = origin_slot
        and (m.day, m.slot) <> (meal_day, meal_slot);
    if reserved + requested >
      (origin_entry->>'cookedServings')::numeric - (origin_entry->>'consumedServings')::numeric + 0.0000000001 then
      raise exception 'Not enough leftover portions' using errcode = '23514';
    end if;
  else
    raise exception 'Invalid meal type' using errcode = '23514';
  end if;

  select coalesce(sum((m.entry->>'portions')::numeric), 0) into reserved
    from public.household_meals m where m.household_id = target
      and m.source_day = meal_day and m.source_slot = meal_slot;
  if reserved > 0 and (kind <> 'recipe' or reserved > cooked - consumed + 0.0000000001) then
    raise exception 'Meal has reserved leftover portions' using errcode = '23514';
  end if;

  insert into public.household_meals (household_id, day, slot, entry, source_day, source_slot)
    values (target, meal_day, meal_slot, meal_entry, origin_day, origin_slot)
  on conflict (household_id, day, slot) do update
    set entry = excluded.entry, source_day = excluded.source_day, source_slot = excluded.source_slot,
      revision = excluded.revision
  returning revision into previous_revision;
  return previous_revision;
end;
$$;

-- PostgREST exposes these invoker wrappers. The privileged implementations
-- live in a schema outside the exposed API and check the caller independently.
create function public.create_household(household_name text) returns uuid
language sql set search_path = '' as $$
  select wachochemer_private.create_household(household_name);
$$;
create function public.invite_household_member(target uuid, target_email text) returns uuid
language sql set search_path = '' as $$
  select wachochemer_private.invite_household_member(target, target_email);
$$;
create function public.accept_household_invitation(invitation uuid) returns uuid
language sql set search_path = '' as $$
  select wachochemer_private.accept_household_invitation(invitation);
$$;
create function public.revoke_household_invitation(target uuid, invitation uuid) returns boolean
language sql set search_path = '' as $$
  select wachochemer_private.revoke_household_invitation(target, invitation);
$$;
create function public.remove_household_member(target uuid, member_id uuid) returns boolean
language sql set search_path = '' as $$
  select wachochemer_private.remove_household_member(target, member_id);
$$;
create function public.save_household_meal(
  target uuid, meal_day date, meal_slot public.meal_slot, expected_revision bigint, meal_entry jsonb
) returns bigint
language sql set search_path = '' as $$
  select wachochemer_private.save_household_meal(target, meal_day, meal_slot, expected_revision, meal_entry);
$$;

revoke all on all functions in schema wachochemer_private from public, anon, authenticated;
grant execute on function wachochemer_private.is_member(uuid),
  wachochemer_private.create_household(text), wachochemer_private.invite_household_member(uuid, text),
  wachochemer_private.accept_household_invitation(uuid),
  wachochemer_private.revoke_household_invitation(uuid, uuid),
  wachochemer_private.remove_household_member(uuid, uuid),
  wachochemer_private.save_household_meal(uuid, date, public.meal_slot, bigint, jsonb)
  to authenticated;

revoke all on function public.create_household(text), public.invite_household_member(uuid, text),
  public.accept_household_invitation(uuid), public.remove_household_member(uuid, uuid),
  public.revoke_household_invitation(uuid, uuid),
  public.save_household_meal(uuid, date, public.meal_slot, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.create_household(text), public.invite_household_member(uuid, text),
  public.accept_household_invitation(uuid), public.remove_household_member(uuid, uuid),
  public.revoke_household_invitation(uuid, uuid),
  public.save_household_meal(uuid, date, public.meal_slot, bigint, jsonb) to authenticated;

commit;
