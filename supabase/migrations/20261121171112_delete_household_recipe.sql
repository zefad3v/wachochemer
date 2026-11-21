begin;
create function wachochemer_private.delete_recipe(target uuid, recipe_id uuid, expected integer)
returns void language plpgsql security definer set search_path='' as $$
declare current_revision integer;
begin
 perform wachochemer_private.lock_household(target);
 select r.revision into current_revision from public.household_recipes r where r.household_id=target and r.id=recipe_id;
 if not found then return; end if;
 if current_revision is distinct from expected then raise exception 'Recipe changed' using errcode='40001'; end if;
 if exists(select 1 from public.household_meals m where m.household_id=target and m.entry->>'recipeId'='haushalt-'||recipe_id::text) then
   raise exception 'Rezept ist im Wochenplan eingetragen. Bitte zuerst diese Einträge entfernen.' using errcode='55006';
 end if;
 delete from public.household_recipes r where r.household_id=target and r.id=recipe_id;
end;
$$;
create function public.delete_household_recipe(target uuid, recipe_id uuid, expected integer)
returns void language sql set search_path='' as $$ select wachochemer_private.delete_recipe(target,recipe_id,expected); $$;
revoke all on function public.delete_household_recipe(uuid,uuid,integer),wachochemer_private.delete_recipe(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.delete_household_recipe(uuid,uuid,integer),wachochemer_private.delete_recipe(uuid,uuid,integer) to authenticated;
create function wachochemer_private.check_meal_recipe() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.entry->>'type'='recipe' and new.entry->>'recipeId' like 'haushalt-%' and not exists(
   select 1 from public.household_recipes r where r.household_id=new.household_id and 'haushalt-'||r.id::text=new.entry->>'recipeId'
 ) then raise exception 'Haushaltsrezept wurde gelöscht. Bitte ein anderes Rezept wählen.' using errcode='23503'; end if;
 return new;
end;
$$;
revoke all on function wachochemer_private.check_meal_recipe() from public,anon,authenticated;
create trigger household_meal_recipe_check before insert or update on public.household_meals
for each row execute function wachochemer_private.check_meal_recipe();
commit;
