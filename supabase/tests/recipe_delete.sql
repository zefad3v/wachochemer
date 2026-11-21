begin;
set local plpgsql.check_asserts=on;
insert into auth.users(id,email,email_confirmed_at) values('20000000-0000-4000-8000-000000000001','delete@example.test',now());
set local role authenticated;
do $$ declare target uuid; rid uuid:=gen_random_uuid(); draft jsonb:='{"title":"Test","description":"","source":"","baseServings":2,"prepMinutes":null,"cookMinutes":null,"ingredients":[{"name":"Butterflocken","quantity":null,"unit":"unspecified","optional":false}],"steps":["Mischen."]}'; begin
 perform set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
 target:=public.create_household('Löschtest');
 perform public.save_household_recipe(target,rid,0,draft);
 begin perform public.delete_household_recipe(target,rid,0);raise exception 'Stale delete accepted';exception when serialization_failure then null;end;
 perform public.save_household_meal(target,'2026-11-21','lunch',0,jsonb_build_object('type','recipe','recipeId','haushalt-'||rid::text,'servings',2,'cookedServings',2,'consumedServings',2));
 begin perform public.delete_household_recipe(target,rid,1);raise exception 'Planned delete accepted';exception when object_in_use then null;end;
 perform public.save_household_meal(target,'2026-11-21','lunch',(select revision from public.household_meals where household_id=target),null);
 perform public.delete_household_recipe(target,rid,1);
 assert not exists(select 1 from public.household_recipes where household_id=target);
 perform public.delete_household_recipe(target,rid,1);
 begin perform public.save_household_meal(target,'2026-11-21','lunch',0,jsonb_build_object('type','recipe','recipeId','haushalt-'||rid::text,'servings',2,'cookedServings',2,'consumedServings',2));raise exception 'Deleted reference accepted';exception when foreign_key_violation then null;end;
 assert not has_function_privilege('anon','public.delete_household_recipe(uuid,uuid,integer)','execute');
end;$$;
rollback;
