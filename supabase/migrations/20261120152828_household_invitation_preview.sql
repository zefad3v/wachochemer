begin;

-- Deliberate pre-login capability: possession of one live random invitation UUID
-- reveals only its destination email and household name, never household data.
create function wachochemer_private.household_invitation_preview(invitation uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('email', i.email, 'household_name', h.name)
  from public.household_invitations i
  join public.households h on h.id = i.household_id
  where i.id = invitation and i.expires_at > now();
$$;

create function public.household_invitation_preview(invitation uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select wachochemer_private.household_invitation_preview(invitation);
$$;

revoke all on function wachochemer_private.household_invitation_preview(uuid),
  public.household_invitation_preview(uuid) from public, anon, authenticated;
grant usage on schema wachochemer_private to anon;
grant execute on function wachochemer_private.household_invitation_preview(uuid),
  public.household_invitation_preview(uuid) to anon, authenticated;

commit;
