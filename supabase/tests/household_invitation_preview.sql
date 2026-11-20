begin;
set local plpgsql.check_asserts = on;

insert into auth.users (id, email, email_confirmed_at)
values ('30000000-0000-4000-8000-000000000001', 'invited@example.test', now());
insert into public.households (id, name)
values ('40000000-0000-4000-8000-000000000001', 'Familie Vorschau');
insert into public.household_invitations (id, household_id, email, expires_at)
values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'invited@example.test', now() + interval '1 day'),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'expired@example.test', now() - interval '1 day');

set local role anon;
do $test$
declare preview jsonb;
begin
  preview := public.household_invitation_preview('50000000-0000-4000-8000-000000000001');
  assert preview = '{"email":"invited@example.test","household_name":"Familie Vorschau"}'::jsonb;
  assert public.household_invitation_preview('50000000-0000-4000-8000-000000000002') is null;
  assert public.household_invitation_preview('50000000-0000-4000-8000-000000000003') is null;
  assert public.household_invitation_preview(null) is null;
  assert not has_table_privilege('anon', 'public.households', 'SELECT');
  assert not has_table_privilege('anon', 'public.household_invitations', 'SELECT');
  assert not has_function_privilege('anon', 'wachochemer_private.actor_id()', 'EXECUTE');
  assert not has_function_privilege('anon', 'public.accept_household_invitation(uuid)', 'EXECUTE');
end;
$test$;

set local role authenticated;
do $test$
begin
  assert public.household_invitation_preview('50000000-0000-4000-8000-000000000001')->>'email' = 'invited@example.test';
  assert not exists (select 1 from public.households);
  assert not exists (select 1 from public.household_invitations);
  begin
    perform public.accept_household_invitation('50000000-0000-4000-8000-000000000001');
    raise exception 'Preview must not grant membership or bypass verified identity';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

reset role;
delete from public.household_invitations where id = '50000000-0000-4000-8000-000000000001';
set local role anon;
do $test$
begin
  assert public.household_invitation_preview('50000000-0000-4000-8000-000000000001') is null;
end;
$test$;
rollback;
