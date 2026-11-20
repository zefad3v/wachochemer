begin;
create table public.household_recipes (
  household_id uuid not null references public.households on delete cascade,
  id uuid not null,
  revision integer not null default 1,
  draft jsonb not null,
  primary key (household_id,id)
);
create unique index household_recipe_source on public.household_recipes
  (household_id,(draft->>'source')) where draft->>'source' <> '';
alter table public.household_recipes enable row level security;
create policy recipe_read on public.household_recipes for select to authenticated
  using (wachochemer_private.is_member(household_id));
revoke all on public.household_recipes from public, anon, authenticated;
grant select on public.household_recipes to authenticated;

create function wachochemer_private.save_recipe(target uuid, recipe_id uuid, expected integer, draft jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare current_row public.household_recipes; item jsonb;
begin
  perform wachochemer_private.lock_household(target);
  if (jsonb_typeof(draft)='object' and octet_length(draft::text)<=120000
    and jsonb_typeof(draft->'title')='string' and length(btrim(draft->>'title')) between 1 and 160
    and jsonb_typeof(draft->'description')='string' and length(draft->>'description')<=2000
    and jsonb_typeof(draft->'source')='string' and length(draft->>'source')<=2000
    and (draft->>'source'='' or draft->>'source' ~ '^https://[^[:space:]]+$')
    and jsonb_typeof(draft->'baseServings')='number' and draft->>'baseServings' ~ '^[1-9][0-9]{0,2}$'
    and jsonb_typeof(draft->'prepMinutes')='number' and draft->>'prepMinutes' ~ '^[0-9]{1,4}$'
    and jsonb_typeof(draft->'cookMinutes')='number' and draft->>'cookMinutes' ~ '^[0-9]{1,4}$'
    and jsonb_array_length(draft->'ingredients') between 1 and 100
    and jsonb_array_length(draft->'steps') between 1 and 100) is not true then
    raise exception 'Invalid recipe' using errcode='23514';
  end if;
  for item in select value from jsonb_array_elements(draft->'ingredients') loop
    if (jsonb_typeof(item->'name')='string' and length(btrim(item->>'name')) between 1 and 200
      and jsonb_typeof(item->'optional')='boolean' and
      ((item->>'unit'='to_taste' and item->'quantity'='null'::jsonb) or
       (item->>'unit' in ('g','kg','ml','l','piece','tsp','tbsp') and jsonb_typeof(item->'quantity')='number'
        and (item->>'quantity')::numeric > 0 and (item->>'quantity')::numeric <= 1000000))) is not true then
      raise exception 'Invalid ingredient' using errcode='23514';
    end if;
  end loop;
  for item in select value from jsonb_array_elements(draft->'steps') loop
    if jsonb_typeof(item)<>'string' or length(btrim(item#>>'{}')) not between 1 and 3000 then
      raise exception 'Invalid step' using errcode='23514';
    end if;
  end loop;
  select * into current_row from public.household_recipes r where r.household_id=target and r.id=recipe_id;
  -- The same save may be retried after a lost response.
  if current_row.draft=draft then return current_row.revision; end if;
  if coalesce(current_row.revision,0) is distinct from expected then
    raise exception 'Recipe changed' using errcode='40001';
  end if;
  insert into public.household_recipes values(target,recipe_id,expected+1,draft)
    on conflict(household_id,id) do update set draft=excluded.draft, revision=excluded.revision;
  return expected+1;
end;
$$;
create function public.save_household_recipe(target uuid, recipe_id uuid, expected integer, draft jsonb)
returns integer language sql set search_path='' as $$
 select wachochemer_private.save_recipe(target,recipe_id,expected,draft);
$$;

-- One bounded counter row per household; the import endpoint never needs a service key.
create table wachochemer_private.recipe_import_usage (
 household_id uuid primary key references public.households on delete cascade,
 day date not null, requests integer not null, ai_requests integer not null
);
alter table wachochemer_private.recipe_import_usage enable row level security;
create table wachochemer_private.recipe_ai_usage (
 user_id uuid primary key references auth.users on delete cascade,
 day date not null, requests integer not null
);
alter table wachochemer_private.recipe_ai_usage enable row level security;
create function wachochemer_private.reserve_recipe_import(target uuid, use_ai boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare today date := (now() at time zone 'UTC')::date;
begin
 perform wachochemer_private.lock_household(target);
 insert into wachochemer_private.recipe_import_usage as usage values(target,today,1,use_ai::int)
 on conflict(household_id) do update set day=today,
   requests=case when usage.day=today then usage.requests+1 else 1 end,
   ai_requests=case when usage.day=today then usage.ai_requests else 0 end + use_ai::int
 where usage.day<>today or (usage.requests<100 and (not use_ai or usage.ai_requests<10));
 if not found then return false; end if;
 if use_ai then
   insert into wachochemer_private.recipe_ai_usage as usage
     values(wachochemer_private.actor_id(),today,1)
   on conflict(user_id) do update set day=today,
     requests=case when usage.day=today then usage.requests+1 else 1 end
   where usage.day<>today or usage.requests<10;
   if not found then raise exception 'Account daily AI limit' using errcode='PT429'; end if;
 end if;
 return true;
end;
$$;
create function public.reserve_recipe_import(target uuid, use_ai boolean)
returns boolean language sql set search_path='' as $$
 select wachochemer_private.reserve_recipe_import(target,use_ai);
$$;
revoke all on function wachochemer_private.save_recipe(uuid,uuid,integer,jsonb),
 public.save_household_recipe(uuid,uuid,integer,jsonb), wachochemer_private.reserve_recipe_import(uuid,boolean),
 public.reserve_recipe_import(uuid,boolean) from public,anon,authenticated;
grant execute on function wachochemer_private.save_recipe(uuid,uuid,integer,jsonb),
 public.save_household_recipe(uuid,uuid,integer,jsonb), wachochemer_private.reserve_recipe_import(uuid,boolean),
 public.reserve_recipe_import(uuid,boolean) to authenticated;

create or replace function public.household_snapshot(target uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'household', to_jsonb(h) || jsonb_build_object('revision', h.revision::text),
    'recipes', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'revision',r.revision) order by r.id)
      from public.household_recipes r where r.household_id=h.id), '[]'::jsonb),
    'meals', coalesce((
      select jsonb_agg(to_jsonb(m) || jsonb_build_object('revision', m.revision::text))
      from public.household_meals m where m.household_id = h.id
    ), '[]'::jsonb)
  ) from public.households h where h.id = target;
$$;
commit;
