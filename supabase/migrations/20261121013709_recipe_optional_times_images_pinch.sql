begin;
create or replace function wachochemer_private.save_recipe(target uuid, recipe_id uuid, expected integer, draft jsonb)
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
    and (draft->'prepMinutes'='null'::jsonb or (jsonb_typeof(draft->'prepMinutes')='number' and draft->>'prepMinutes' ~ '^[0-9]{1,4}$'))
    and (draft->'cookMinutes'='null'::jsonb or (jsonb_typeof(draft->'cookMinutes')='number' and draft->>'cookMinutes' ~ '^[0-9]{1,4}$'))
    and (not draft ? 'totalMinutes' or draft->'totalMinutes'='null'::jsonb or (jsonb_typeof(draft->'totalMinutes')='number' and draft->>'totalMinutes' ~ '^[0-9]{1,4}$'))
    and (not draft ? 'image' or (jsonb_typeof(draft->'image')='string' and length(draft->>'image')<=2000 and (draft->>'image'='' or draft->>'image' ~ '^https://[^[:space:]@]+$')))
    and jsonb_array_length(draft->'ingredients') between 1 and 100
    and jsonb_array_length(draft->'steps') between 1 and 100) is not true then
    raise exception 'Invalid recipe' using errcode='23514';
  end if;
  for item in select value from jsonb_array_elements(draft->'ingredients') loop
    if (jsonb_typeof(item->'name')='string' and length(btrim(item->>'name')) between 1 and 200
      and jsonb_typeof(item->'optional')='boolean' and
      ((item->>'unit'='to_taste' and item->'quantity'='null'::jsonb) or
       (item->>'unit' in ('g','kg','ml','l','piece','tsp','tbsp','pinch') and jsonb_typeof(item->'quantity')='number'
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
commit;
