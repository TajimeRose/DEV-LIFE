# Team Collaboration Migration Audit

This is a local source audit only. It does not prove that the migration has been applied to the remote Supabase project.

## Migration

`supabase/migrations/202607200001_team_collaboration.sql` modifies existing tables and functions. It does not create a new table or add a column.

- `project_invitations`: normalizes the legacy `editor` role to `developer`, changes the default role, and replaces role/status check constraints.
- `project_members`: adds `idx_project_members_user` on `user_id`.
- Functions: replaces `can_edit_project(uuid)` and creates `accept_project_invitation(text)` as `security definer` functions with restricted execute grants.
- Realtime: conditionally adds `project_members` and `project_invitations` to `supabase_realtime`.

## Role Values

The migration permits `maintainer`, `developer`, `reviewer`, and `viewer` invitation roles. `owner` is represented by `projects.user_id`, not by a membership row.

## Policy Coverage

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `tasks` | Project members | Maintainer/developer/owner | Maintainer/developer/owner | Maintainer/developer/owner |
| `notes` | Project members | Maintainer/developer/owner | Maintainer/developer/owner | Maintainer/developer/owner |
| `activities` | Project members with non-null project | Editors with `user_id = auth.uid()` | Not added | Not added |
| `versions` | Project members with non-null project | Editors with `user_id = auth.uid()` | Not added | Not added |
| `flowcharts` | Personal owner or project members | Personal owner or project editors | Same scoped condition | Same scoped condition |
| `project_invitations` | Owner or matching invitee email | Owner only, pending valid role | Owner only | Owner only |
| `project_members` | Existing policies not replaced here | Owner only | Owner only | Owner only |

## Ownership and Recursion

- Child records use `is_project_member(project_id)` or `can_edit_project(project_id)`, so they delegate authorization to the project helper rather than trusting a client-provided user ID.
- `can_edit_project` checks owner status or membership roles `maintainer`/`developer`.
- The migration does not define the bodies of `is_project_member` or `is_project_owner`; their remote definitions must be inspected before claiming complete RLS coverage.
- Because the helper functions are `security definer` and set `search_path = public`, direct recursion through ordinary table policies is reduced, but recursive policy behavior cannot be ruled out without the definitions of the referenced helper functions and all existing policies.

## Indexes and Constraints

- The migration adds an index for `project_members.user_id`, which supports membership discovery by user.
- It does not add child-table foreign-key indexes, uniqueness constraints, or parent ownership constraints.
- Existing foreign keys, indexes, cascade rules, and RLS enablement are outside this migration and require remote schema inspection.

## Verification Boundary

The statements above are verified from the tracked SQL only. Production application, policy state, constraint state, and migration history remain unverified without remote Supabase access.
