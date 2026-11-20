begin;
set local plpgsql.check_asserts = on;
insert into auth.users(id,email,email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001','recipe1@example.test',now()),
 ('10000000-0000-4000-8000-000000000002','recipe2@example.test',now());
set local role authenticated;
do $$
declare
 target uuid; rid uuid:=gen_random_uuid();
 draft jsonb:='{"title":"Test","description":"","source":"https://fooby.ch/example","baseServings":2,"prepMinutes":3,"cookMinutes":5,"ingredients":[{"name":"Mehl","quantity":100,"unit":"g","optional":false}],"steps":["Mischen."]}';
begin
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
 target:=public.create_household('Küche');
 assert public.save_household_recipe(target,rid,0,draft)=1;
 assert public.save_household_recipe(target,rid,0,draft)=1;
 assert public.household_snapshot(target)->'recipes'->0->>'id'=rid::text;
 begin
  perform public.save_household_recipe(target,gen_random_uuid(),0,draft);
  raise exception 'Duplicate source accepted';
 exception when unique_violation then null; end;
 begin
  perform public.save_household_recipe(target,rid,0,draft||'{"title":"Lost update"}');
  raise exception 'Changed revision accepted';
 exception when serialization_failure then null; end;
 begin
  perform public.save_household_recipe(target,rid,1,jsonb_set(draft,'{ingredients,0,quantity}','null'));
  raise exception 'Invalid quantity accepted';
 exception when check_violation then null; end;
 assert public.save_household_recipe(target,rid,1,draft||'{"title":"Neu"}')=2;
 for i in 1..10 loop assert public.reserve_recipe_import(target,true); end loop;
 assert not public.reserve_recipe_import(target,true);
 assert public.reserve_recipe_import(target,false);
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","aal":"aal1"}',true);
 assert not exists(select 1 from public.household_recipes);
 begin perform public.save_household_recipe(target,rid,2,draft);
  raise exception 'Outsider write accepted';
 exception when insufficient_privilege then null; end;
 begin perform public.reserve_recipe_import(target,true);
  raise exception 'Outsider import accepted';
 exception when insufficient_privilege then null; end;
 assert not has_table_privilege('authenticated','public.household_recipes','UPDATE');
 assert not has_table_privilege('anon','public.household_recipes','SELECT');
 assert not has_function_privilege('anon','public.reserve_recipe_import(uuid,boolean)','EXECUTE');
 perform set_config('wachochemer.test_household',target::text,true);
end;$$;
reset role;
insert into public.household_members values(current_setting('wachochemer.test_household')::uuid,'10000000-0000-4000-8000-000000000002');
insert into auth.mfa_factors values(gen_random_uuid(),'10000000-0000-4000-8000-000000000002','totp','verified',now(),now());
set local role authenticated;
do $$ begin
 assert not exists(select 1 from public.household_recipes);
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","aal":"aal2"}',true);
 assert (select draft->>'title' from public.household_recipes)='Neu';
end; $$;
rollback;
