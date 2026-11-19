begin;
set local plpgsql.check_asserts = on;

insert into auth.users (id, email, email_confirmed_at)
values
  ('10000000-0000-4000-8000-000000000001', 'sender@example.test', now()),
  ('10000000-0000-4000-8000-000000000002', 'other@example.test', now());
insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
values ('20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001', 'totp', 'verified', now(), now());

set local role authenticated;
do $test$
declare
  sender constant uuid := '10000000-0000-4000-8000-000000000001';
  other_account constant uuid := '10000000-0000-4000-8000-000000000002';
  target uuid;
  other_household uuid;
  invitation uuid;
  next_invitation uuid;
  reserved jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', sender, 'aal', 'aal2')::text, true);
  target := public.create_household('Familie');
  other_household := public.create_household('Andere Familie');
  invitation := public.invite_household_member(target, 'Guest@Example.Test');
  assert public.invite_household_member(target, 'guest@example.test') = invitation;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', sender, 'aal', 'aal1')::text, true);
  begin
    perform public.reserve_household_invitation_mail(target, invitation);
    raise exception 'AAL1 must not be able to send mail with verified MFA';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', other_account, 'aal', 'aal1')::text, true);
  begin
    perform public.reserve_household_invitation_mail(target, invitation);
    raise exception 'An outsider must not be able to send mail';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', sender, 'aal', 'aal2')::text, true);
  begin
    perform public.reserve_household_invitation_mail(other_household, invitation);
    raise exception 'The invitation must match its household';
  exception when sqlstate 'PT404' then null;
  end;
  reserved := public.reserve_household_invitation_mail(target, invitation);
  assert reserved->>'email' = 'guest@example.test';
  assert (select email_sent_at from public.household_invitations where id = invitation) is null;
  begin
    perform public.reserve_household_invitation_mail(target, invitation);
    raise exception 'Immediate duplicate send must be rate limited';
  exception when sqlstate 'PT429' then null;
  end;
  begin
    perform public.confirm_household_invitation_mail(invitation, (reserved->>'attempt_at')::timestamptz);
    raise exception 'A member must not mark an invitation as sent';
  exception when insufficient_privilege then null;
  end;
  perform set_config('test.invitation_id', invitation::text, true);
  perform set_config('test.attempt_at', reserved->>'attempt_at', true);

  for attempt in 2..12 loop
    next_invitation := public.invite_household_member(target, attempt::text || '@example.test');
    perform public.reserve_household_invitation_mail(target, next_invitation);
  end loop;
  next_invitation := public.invite_household_member(other_household, 'rate-limit@example.test');
  begin
    perform public.reserve_household_invitation_mail(other_household, next_invitation);
    raise exception 'The hourly rate limit must apply across households';
  exception when sqlstate 'PT429' then null;
  end;
end;
$test$;

set local role service_role;
select public.confirm_household_invitation_mail(
  current_setting('test.invitation_id')::uuid,
  current_setting('test.attempt_at')::timestamptz
);

set local role authenticated;
do $test$
begin
  assert (select email_sent_at from public.household_invitations
          where id = current_setting('test.invitation_id')::uuid) is not null;
end;
$test$;

rollback;
