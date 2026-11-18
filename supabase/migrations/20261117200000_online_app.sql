begin;
alter table public.households add column revision bigint not null default 1,
  add column recipe_shares jsonb not null default '{}',
  add column shopping_extras jsonb not null default '[]',
  add column imported_from uuid;
revoke update on public.households from authenticated;
revoke update (name, adults, children, babies, adults_share, children_share, babies_share)
  on public.households from authenticated;

create function wachochemer_private.save_household_settings(target uuid, expected_revision bigint, profile jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_revision bigint;
  pair record;
  field text;
begin
  perform wachochemer_private.lock_household(target);
  select revision into current_revision from public.households where id = target;
  if current_revision is distinct from expected_revision then
    raise exception 'Household settings changed in another session' using errcode = '40001';
  end if;
  foreach field in array array['adults','children','babies'] loop
    if (jsonb_typeof(profile->field) = 'number'
      and (profile->>field)::numeric between 0 and 100
      and mod((profile->>field)::numeric,1) = 0) is not true then
      raise exception 'Invalid household count' using errcode = '23514';
    end if;
  end loop;
  foreach field in array array['adultsShare','childrenShare','babiesShare'] loop
    if (jsonb_typeof(profile->field) = 'number'
      and (profile->>field)::numeric between 0 and 1000) is not true then
      raise exception 'Invalid household portions' using errcode = '23514';
    end if;
  end loop;
  if jsonb_typeof(profile->'recipeShares') is distinct from 'object'
    or jsonb_typeof(profile->'extras') is distinct from 'array'
    or jsonb_array_length(profile->'extras') > 200 then
    raise exception 'Invalid household preferences' using errcode = '23514';
  end if;
  for pair in select * from jsonb_each(profile->'recipeShares') loop
    if (pair.key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      and jsonb_typeof(pair.value->'childrenShare') = 'number'
      and (pair.value->>'childrenShare')::numeric between 0 and 1000) is not true then
      raise exception 'Invalid recipe portions' using errcode = '23514';
    end if;
  end loop;
  for pair in select value from jsonb_array_elements(profile->'extras') loop
    if (jsonb_typeof(pair.value->'id') = 'string'
      and char_length(pair.value->>'id') between 1 and 100
      and jsonb_typeof(pair.value->'title') = 'string'
      and char_length(btrim(pair.value->>'title')) between 1 and 200
      and pair.value->>'date' ~ '^\d{4}-\d{2}-\d{2}$'
      and (pair.value->>'date')::date is not null) is not true then
      raise exception 'Invalid shopping item' using errcode = '23514';
    end if;
  end loop;
  update public.households set
    name = profile->>'name', adults = (profile->>'adults')::integer,
    children = (profile->>'children')::integer, babies = (profile->>'babies')::integer,
    adults_share = (profile->>'adultsShare')::numeric,
    children_share = (profile->>'childrenShare')::numeric,
    babies_share = (profile->>'babiesShare')::numeric,
    recipe_shares = profile->'recipeShares', shopping_extras = profile->'extras',
    revision = revision + 1 where id = target;
end;
$$;
create function public.save_household_settings(target uuid, expected_revision bigint, profile jsonb)
returns void language sql set search_path = '' as $$
  select wachochemer_private.save_household_settings(target, expected_revision, profile);
$$;

-- One statement returns a consistent plan and settings, including large revision
-- numbers as text so JavaScript never rounds a concurrency token.
create function public.household_snapshot(target uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'household', to_jsonb(h) || jsonb_build_object('revision', h.revision::text),
    'meals', coalesce((
      select jsonb_agg(to_jsonb(m) || jsonb_build_object('revision', m.revision::text))
      from public.household_meals m where m.household_id = h.id
    ), '[]'::jsonb)
  ) from public.households h where h.id = target;
$$;

-- Atomic, explicit import into a new household. Retry with the same identifier
-- is harmless even when the first response was lost.
create function wachochemer_private.import_household_plan(
  target uuid, import_id uuid, entries jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  imported uuid;
  item record;
begin
  perform wachochemer_private.lock_household(target);
  select imported_from into imported from public.households where id = target;
  if imported = import_id then return; end if;
  if imported is not null or exists (select 1 from public.household_meals where household_id = target) then
    raise exception 'Import needs an empty household plan' using errcode = '23514';
  end if;
  if import_id is null or jsonb_typeof(entries) is distinct from 'object' then
    raise exception 'Invalid import' using errcode = '23514';
  end if;
  for item in select key, value from jsonb_each(entries)
    order by split_part(key, '|', 1), case split_part(key, '|', 2) when 'lunch' then 0 else 1 end
  loop
    if item.key !~ '^\d{4}-\d{2}-\d{2}[|](lunch|dinner)$' then
      raise exception 'Invalid meal key' using errcode = '23514';
    end if;
    perform wachochemer_private.save_household_meal(target, split_part(item.key, '|', 1)::date,
      split_part(item.key, '|', 2)::public.meal_slot, 0, item.value);
  end loop;
  update public.households set imported_from = import_id where id = target;
end;
$$;
create function public.import_household_plan(target uuid, import_id uuid, entries jsonb)
returns void language sql set search_path = '' as $$
  select wachochemer_private.import_household_plan(target, import_id, entries);
$$;

-- Member names are account emails. Every member has the same management access.
create function wachochemer_private.household_people(target uuid) returns table(user_id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.email::text from auth.users u join public.household_members m on m.user_id = u.id
  where m.household_id = target and wachochemer_private.is_member(target);
$$;
create function public.household_people(target uuid) returns table(user_id uuid, email text)
language sql stable set search_path = '' as $$
  select * from wachochemer_private.household_people(target);
$$;

create table wachochemer_private.signup_allowlist (email text primary key check (email = lower(btrim(email))));
revoke all on wachochemer_private.signup_allowlist from public, anon, authenticated;
create function public.before_user_created(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare account_email text := lower(btrim(event->'user'->>'email'));
begin
  if exists (select 1 from wachochemer_private.signup_allowlist where email = account_email)
    or exists (select 1 from public.household_invitations where email = account_email and expires_at > now()) then
    return '{}'::jsonb;
  end if;
  return '{"error":{"http_code":403,"message":"Für die Registrierung brauchst du eine Haushaltseinladung."}}'::jsonb;
end;
$$;
revoke all on function public.before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;

revoke all on function wachochemer_private.save_household_settings(uuid,bigint,jsonb),
  wachochemer_private.import_household_plan(uuid,uuid,jsonb), wachochemer_private.household_people(uuid)
  from public, anon, authenticated;
grant execute on function wachochemer_private.save_household_settings(uuid,bigint,jsonb),
  wachochemer_private.import_household_plan(uuid,uuid,jsonb), wachochemer_private.household_people(uuid)
  to authenticated;
revoke all on function public.save_household_settings(uuid,bigint,jsonb), public.household_snapshot(uuid),
  public.import_household_plan(uuid,uuid,jsonb), public.household_people(uuid) from public, anon, authenticated;
grant execute on function public.save_household_settings(uuid,bigint,jsonb), public.household_snapshot(uuid),
  public.import_household_plan(uuid,uuid,jsonb), public.household_people(uuid) to authenticated;
commit;
