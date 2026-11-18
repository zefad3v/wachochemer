-- Run against a local or disposable Supabase database. Every fixture rolls back.
begin;
set local plpgsql.check_asserts = on;

insert into auth.users (id, email, email_confirmed_at)
values
  ('10000000-0000-4000-8000-000000000001', 'planner-one@example.test', now()),
  ('10000000-0000-4000-8000-000000000002', 'planner-two@example.test', now()),
  ('10000000-0000-4000-8000-000000000003', 'planner-three@example.test', now()),
  ('10000000-0000-4000-8000-000000000004', 'planner-four@example.test', null);

insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
values ('20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002', 'totp', 'verified', now(), now());

set local role authenticated;
do $test$
declare
  first_account constant uuid := '10000000-0000-4000-8000-000000000001';
  second_account constant uuid := '10000000-0000-4000-8000-000000000002';
  outsider_account constant uuid := '10000000-0000-4000-8000-000000000003';
  unconfirmed_account constant uuid := '10000000-0000-4000-8000-000000000004';
  target uuid;
  other_household uuid;
  invitation uuid;
  next_invitation uuid;
  lunch_revision bigint;
  dinner_revision bigint;
  meal_date constant date := '2026-11-20';
  next_date constant date := '2026-11-21';
  original constant jsonb := '{"type":"recipe","recipeId":"poulet-fajitas","cookedServings":5,"consumedServings":2.5}';
  leftovers constant jsonb := '{"type":"leftover","sourceKey":"2026-11-20|lunch","portions":2}';
  manual constant jsonb := '{"type":"manual","title":"Picknick"}';
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', unconfirmed_account, 'aal', 'aal1')::text, true);
  begin
    perform public.create_household('Unconfirmed');
    raise exception 'Unconfirmed accounts must not create households';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', first_account, 'aal', 'aal1')::text, true);
  target := public.create_household('Erster Haushalt');
  lunch_revision := public.save_household_meal(target, meal_date, 'lunch', 0, original);
  assert lunch_revision > 0;
  invitation := public.invite_household_member(target, ' Planner-Two@Example.Test ');

  perform set_config('request.jwt.claims', jsonb_build_object('sub', outsider_account, 'aal', 'aal1')::text, true);
  other_household := public.create_household('Zweiter Haushalt');
  assert (select count(*) from public.households) = 1;
  assert not exists (select 1 from public.household_meals where household_id = target);
  assert not exists (select 1 from public.household_members where household_id = target);
  assert not exists (select 1 from public.household_invitations where household_id = target);
  begin
    update public.households set name = 'Fremder Zugriff' where id = target;
    raise exception 'Direct settings updates must use the versioned RPC';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.accept_household_invitation(invitation);
    raise exception 'An invitation is usable only by its email account';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_household_meal(target, meal_date, 'dinner', 0, manual);
    raise exception 'An outsider must not write a meal';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_household_meal(other_household, next_date, 'lunch', 0, leftovers);
    raise exception 'Leftover sources must belong to the same household';
  exception when check_violation then null;
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', second_account, 'aal', 'aal1')::text, true);
  begin
    perform public.accept_household_invitation(invitation);
    raise exception 'Verified 2FA requires a second factor before joining';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', second_account, 'aal', 'aal2')::text, true);
  assert public.accept_household_invitation(invitation) = target;
  assert (select count(*) from public.household_members where household_id = target) = 2;
  assert (select entry from public.household_meals where household_id = target and day = meal_date and slot = 'lunch') = original;
  perform public.save_household_settings(target, 1,
    '{"name":"Üse Haushalt","adults":2,"children":1,"babies":0,"adultsShare":1,"childrenShare":0.5,"babiesShare":0,"recipeShares":{},"extras":[]}');
  assert (public.household_snapshot(target)->'household'->>'revision') = '2';
  dinner_revision := public.save_household_meal(target, meal_date, 'dinner', 0, leftovers);
  assert dinner_revision > lunch_revision;
  next_invitation := public.invite_household_member(target, 'planner-three@example.test');
  perform set_config('request.jwt.claims', jsonb_build_object('sub', first_account, 'aal', 'aal1')::text, true);
  assert public.revoke_household_invitation(target, next_invitation);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', outsider_account, 'aal', 'aal1')::text, true);
  begin
    perform public.accept_household_invitation(next_invitation);
    raise exception 'A revoked invitation cannot be used';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', second_account, 'aal', 'aal2')::text, true);

  begin
    perform public.save_household_meal(target, meal_date, 'lunch', 0, original);
    raise exception 'A stale meal edit must not overwrite another session';
  exception when serialization_failure then null;
  end;
  begin
    perform public.save_household_meal(target, next_date, 'lunch', 0, leftovers);
    raise exception 'Leftover portions must not be reserved twice';
  exception when check_violation then null;
  end;
  begin
    perform public.save_household_meal(target, meal_date, 'lunch', lunch_revision, manual);
    raise exception 'An origin with reservations must stay a recipe';
  exception when check_violation then null;
  end;
  begin
    perform public.save_household_meal(target, meal_date, 'lunch', lunch_revision, null);
    raise exception 'An origin with reservations must not be deleted';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.household_meals (household_id, day, slot, entry)
      values (target, next_date, 'lunch', manual);
    raise exception 'Direct table writes must not bypass the meal RPC';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', second_account, 'aal', 'aal1')::text, true);
  assert not exists (select 1 from public.households where id = target);
  assert not exists (select 1 from public.household_meals where household_id = target);
  begin
    perform public.save_household_meal(target, meal_date, 'dinner', dinner_revision, manual);
    raise exception 'A session missing 2FA must not write meals';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', second_account, 'aal', 'aal2')::text, true);
  assert public.remove_household_member(target, first_account);
  begin
    perform public.remove_household_member(target, second_account);
    raise exception 'A household cannot lose its last member through the membership API';
  exception when check_violation then null;
  end;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', first_account, 'aal', 'aal1')::text, true);
  assert not exists (select 1 from public.households where id = target);
  begin
    perform public.save_household_meal(target, next_date, 'dinner', 0, manual);
    raise exception 'A removed member must no longer be able to write';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

set local role anon;
do $anon$
begin
  begin
    perform 1 from public.households;
    raise exception 'Anonymous requests must not read household data';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_household('Anonymous');
    raise exception 'Anonymous requests must not create a household';
  exception when insufficient_privilege then null;
  end;
end;
$anon$;

rollback;
