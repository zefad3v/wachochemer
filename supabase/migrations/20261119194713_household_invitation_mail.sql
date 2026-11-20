begin;

alter table public.household_invitations
  add column last_email_attempt_at timestamptz,
  add column email_sent_at timestamptz;

-- One bounded counter per sender, including sends to different households.
create table wachochemer_private.invitation_mail_limits (
  sender_id uuid primary key references auth.users on delete cascade,
  window_started_at timestamptz not null,
  attempts integer not null
);
alter table wachochemer_private.invitation_mail_limits enable row level security;
revoke all on wachochemer_private.invitation_mail_limits from public, anon, authenticated;

create or replace function wachochemer_private.invite_household_member(target uuid, target_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  invitation_id uuid;
  recipient text := lower(btrim(target_email));
begin
  perform wachochemer_private.lock_household(target);
  select id into invitation_id
  from public.household_invitations
  where household_id = target and email = recipient and expires_at > now();
  if found then
    return invitation_id;
  end if;

  insert into public.household_invitations (household_id, email)
    values (target, recipient)
  on conflict (household_id, email) do update
    set id = gen_random_uuid(), expires_at = excluded.expires_at,
        last_email_attempt_at = null, email_sent_at = null
  returning id into invitation_id;
  return invitation_id;
end;
$$;

create function wachochemer_private.reserve_household_invitation_mail(target uuid, invitation uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  pending public.household_invitations;
  sending_at timestamptz;
  sender uuid;
begin
  perform wachochemer_private.lock_household(target);
  sender := wachochemer_private.actor_id();
  sending_at := clock_timestamp();
  select * into pending from public.household_invitations
    where id = invitation and household_id = target and expires_at > sending_at;
  if not found then
    raise exception 'Invitation unavailable' using errcode = 'PT404';
  end if;
  if pending.last_email_attempt_at > sending_at - interval '1 minute' then
    raise exception 'Invitation mail cooldown' using errcode = 'PT429';
  end if;

  insert into wachochemer_private.invitation_mail_limits as limits (sender_id, window_started_at, attempts)
    values (sender, sending_at, 1)
  on conflict (sender_id) do update set
    attempts = case when limits.window_started_at <= sending_at - interval '1 hour' then 1 else limits.attempts + 1 end,
    window_started_at = case when limits.window_started_at <= sending_at - interval '1 hour' then sending_at else limits.window_started_at end
  where limits.window_started_at <= sending_at - interval '1 hour' or limits.attempts < 12;
  if not found then
    raise exception 'Invitation mail rate limit' using errcode = 'PT429';
  end if;

  update public.household_invitations set last_email_attempt_at = sending_at where id = invitation;
  return jsonb_build_object('email', pending.email, 'attempt_at', sending_at);
end;
$$;

create function public.reserve_household_invitation_mail(target uuid, invitation uuid) returns jsonb
language sql set search_path = '' as $$
  select wachochemer_private.reserve_household_invitation_mail(target, invitation);
$$;

create function public.confirm_household_invitation_mail(invitation uuid, attempt_at timestamptz) returns void
language sql set search_path = '' as $$
  update public.household_invitations set email_sent_at = clock_timestamp()
    where id = invitation and last_email_attempt_at = attempt_at;
$$;

revoke all on function wachochemer_private.reserve_household_invitation_mail(uuid, uuid),
  public.reserve_household_invitation_mail(uuid, uuid),
  public.confirm_household_invitation_mail(uuid, timestamptz) from public, anon, authenticated;
grant execute on function wachochemer_private.reserve_household_invitation_mail(uuid, uuid),
  public.reserve_household_invitation_mail(uuid, uuid) to authenticated;
grant execute on function public.confirm_household_invitation_mail(uuid, timestamptz) to service_role;
grant update (email_sent_at), select (id, last_email_attempt_at) on public.household_invitations to service_role;

commit;
