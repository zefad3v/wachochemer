begin;
set local plpgsql.check_asserts = on;
insert into auth.users (id,email,email_confirmed_at) values
  ('30000000-0000-4000-8000-000000000001','import@example.test',now());
set local role authenticated;
do $$
declare
  target uuid;
  token uuid := '30000000-0000-4000-8000-000000000002';
  invalid jsonb := '{"2026-11-20|lunch":{"type":"manual","title":"Test"},"2026-11-21|lunch":{"type":"leftover","sourceKey":"2026-11-20|lunch","portions":2}}';
  valid jsonb := '{"2026-11-20|lunch":{"type":"recipe","recipeId":"poulet-fajitas","cookedServings":5,"consumedServings":2.5},"2026-11-21|lunch":{"type":"leftover","sourceKey":"2026-11-20|lunch","portions":2}}';
  profile jsonb := '{"name":"Test","adults":2,"children":1,"babies":0,"adultsShare":1,"childrenShare":0.5,"babiesShare":0,"recipeShares":{},"extras":[]}';
begin
  perform set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","aal":"aal1"}',true);
  target := public.create_household('Import');
  begin
    perform public.import_household_plan(target, token, invalid);
    raise exception 'Invalid imports must fail';
  exception when check_violation then null;
  end;
  assert jsonb_array_length(public.household_snapshot(target)->'meals') = 0;
  perform public.import_household_plan(target, token, valid);
  perform public.import_household_plan(target, token, valid);
  assert jsonb_array_length(public.household_snapshot(target)->'meals') = 2;
  begin
    perform public.import_household_plan(target, gen_random_uuid(), valid);
    raise exception 'A second import must not replace a household';
  exception when check_violation then null;
  end;
  perform public.save_household_settings(target,1,profile);
  begin
    perform public.save_household_settings(target,2,jsonb_set(profile,'{children}','1.5'));
    raise exception 'Fractional people must fail';
  exception when check_violation then null;
  end;
  begin
    perform public.save_household_settings(target,2,jsonb_set(profile,'{childrenShare}','"0.5"'));
    raise exception 'Text portions must fail';
  exception when check_violation then null;
  end;
  begin
    perform public.save_household_settings(target,1,profile);
    raise exception 'Stale settings must not overwrite';
  exception when serialization_failure then null;
  end;
end;
$$;
reset role;
do $$
begin
  assert public.before_user_created('{"user":{"email":"stranger@example.test"}}') ? 'error';
  insert into wachochemer_private.signup_allowlist values ('owner@example.test');
  assert public.before_user_created('{"user":{"email":"Owner@example.test"}}') = '{}';
end;
$$;
rollback;
