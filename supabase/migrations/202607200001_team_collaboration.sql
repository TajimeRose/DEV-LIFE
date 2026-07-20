-- Project invitations, role-aware collaboration, and realtime access.

update public.project_invitations
set role = 'developer'
where role = 'editor';

alter table public.project_invitations
  alter column role set default 'developer';

alter table public.project_invitations
  drop constraint if exists project_invitations_role_check;

alter table public.project_invitations
  add constraint project_invitations_role_check
  check (role in ('maintainer', 'developer', 'reviewer', 'viewer'));

alter table public.project_invitations
  drop constraint if exists project_invitations_status_check;

alter table public.project_invitations
  add constraint project_invitations_status_check
  check (status in ('pending', 'accepted', 'revoked', 'expired'));

create index if not exists idx_project_members_user
  on public.project_members (user_id);

create or replace function public.can_edit_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_project_owner(target_project_id)
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = target_project_id
        and pm.user_id = auth.uid()
        and pm.role in ('maintainer', 'developer')
    );
$$;

create or replace function public.accept_project_invitation(invitation_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.project_invitations%rowtype;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  current_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select *
  into invitation
  from public.project_invitations
  where token = invitation_token
  for update;

  if not found
    or invitation.status <> 'pending'
    or invitation.expires_at is null
    or invitation.expires_at <= now()
    or lower(invitation.invited_email) <> current_email then
    raise exception 'Invitation is invalid or expired' using errcode = '22023';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (invitation.project_id, auth.uid(), invitation.role)
  on conflict (project_id, user_id) do nothing;

  update public.project_invitations
  set status = 'accepted'
  where id = invitation.id;

  return invitation.project_id;
end;
$$;

revoke all on function public.can_edit_project(uuid) from public;
grant execute on function public.can_edit_project(uuid) to authenticated, service_role;
revoke all on function public.accept_project_invitation(text) from public;
grant execute on function public.accept_project_invitation(text) to authenticated;

drop policy if exists "Users can access own tasks" on public.tasks;
create policy "Project members can view tasks"
on public.tasks for select to authenticated
using (public.is_project_member(project_id));
create policy "Project editors can create tasks"
on public.tasks for insert to authenticated
with check (public.can_edit_project(project_id));
create policy "Project editors can update tasks"
on public.tasks for update to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));
create policy "Project editors can delete tasks"
on public.tasks for delete to authenticated
using (public.can_edit_project(project_id));

drop policy if exists "Users can access own notes" on public.notes;
create policy "Project members can view notes"
on public.notes for select to authenticated
using (public.is_project_member(project_id));
create policy "Project editors can create notes"
on public.notes for insert to authenticated
with check (public.can_edit_project(project_id));
create policy "Project editors can update notes"
on public.notes for update to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));
create policy "Project editors can delete notes"
on public.notes for delete to authenticated
using (public.can_edit_project(project_id));

drop policy if exists "Users can access own activities" on public.activities;
drop policy if exists "Users can insert activities for their projects" on public.activities;
drop policy if exists "Users can view their own activities" on public.activities;
create policy "Project members can view activities"
on public.activities for select to authenticated
using (project_id is not null and public.is_project_member(project_id));
create policy "Project editors can create activities"
on public.activities for insert to authenticated
with check (
  project_id is not null
  and user_id = auth.uid()
  and public.can_edit_project(project_id)
);

drop policy if exists "Users can access own versions" on public.versions;
create policy "Project members can view versions"
on public.versions for select to authenticated
using (project_id is not null and public.is_project_member(project_id));
create policy "Project editors can create versions"
on public.versions for insert to authenticated
with check (
  project_id is not null
  and user_id = auth.uid()
  and public.can_edit_project(project_id)
);

drop policy if exists "Users can create their own flowcharts" on public.flowcharts;
drop policy if exists "Users can delete their own flowcharts" on public.flowcharts;
drop policy if exists "Users can update their own flowcharts" on public.flowcharts;
drop policy if exists "Users can view their own flowcharts" on public.flowcharts;
create policy "Users can view personal or project flowcharts"
on public.flowcharts for select to authenticated
using (
  (project_id is null and user_id = auth.uid())
  or (project_id is not null and public.is_project_member(project_id))
);
create policy "Users can create personal or project flowcharts"
on public.flowcharts for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    project_id is null
    or public.can_edit_project(project_id)
  )
);
create policy "Users can update personal or project flowcharts"
on public.flowcharts for update to authenticated
using (
  (project_id is null and user_id = auth.uid())
  or (project_id is not null and public.can_edit_project(project_id))
)
with check (
  (project_id is null and user_id = auth.uid())
  or (project_id is not null and public.can_edit_project(project_id))
);
create policy "Users can delete personal or project flowcharts"
on public.flowcharts for delete to authenticated
using (
  (project_id is null and user_id = auth.uid())
  or (project_id is not null and public.can_edit_project(project_id))
);

drop policy if exists "Project owners can create invitations" on public.project_invitations;
create policy "Project owners can create invitations"
on public.project_invitations for insert to authenticated
with check (
  invited_by = auth.uid()
  and public.is_project_owner(project_id)
  and status = 'pending'
  and role in ('maintainer', 'developer', 'reviewer', 'viewer')
);
drop policy if exists "Owners and invitees can view invitations" on public.project_invitations;
create policy "Owners and invitees can view invitations"
on public.project_invitations for select to authenticated
using (
  public.is_project_owner(project_id)
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
drop policy if exists "Project owners can update invitations" on public.project_invitations;
create policy "Project owners can update invitations"
on public.project_invitations for update to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));
drop policy if exists "Project owners can delete invitations" on public.project_invitations;
create policy "Project owners can delete invitations"
on public.project_invitations for delete to authenticated
using (public.is_project_owner(project_id));

drop policy if exists "Project owners can add members" on public.project_members;
create policy "Project owners can add members"
on public.project_members for insert to authenticated
with check (public.is_project_owner(project_id));
drop policy if exists "Project owners can update members" on public.project_members;
create policy "Project owners can update members"
on public.project_members for update to authenticated
using (public.is_project_owner(project_id))
with check (public.is_project_owner(project_id));
drop policy if exists "Project owners can remove members" on public.project_members;
create policy "Project owners can remove members"
on public.project_members for delete to authenticated
using (public.is_project_owner(project_id));

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_members'
  ) then
    alter publication supabase_realtime add table only public.project_members;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_invitations'
  ) then
    alter publication supabase_realtime add table only public.project_invitations;
  end if;
end
$$;
