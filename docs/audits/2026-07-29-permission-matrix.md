# Full Permission Matrix

This matrix is derived from the current source, not from role names alone. `Allowed` means both the server path and current role helper allow the action. `Denied` means the server path explicitly rejects it or applies an owner-only filter. `Not defined` means the route/action exists but does not perform the role check needed to make the permission decision. `Product decision required` means source behavior is intentionally narrower or ambiguous and must not be widened by inference.

| Action | Owner | Maintainer | Developer | Reviewer | Viewer |
| --- | --- | --- | --- | --- | --- |
| View project | Allowed | Allowed | Allowed | Allowed | Allowed |
| Rename project | Allowed | Denied | Denied | Denied | Denied |
| Update project | Allowed | Denied | Denied | Denied | Denied |
| Delete project | Allowed | Denied | Denied | Denied | Denied |
| Create task | Allowed | Allowed | Allowed | Denied | Denied |
| Edit task | Allowed | Allowed | Allowed | Denied | Denied |
| Delete task | Allowed | Allowed | Allowed | Denied | Denied |
| Edit notes | Allowed | Allowed | Allowed | Denied | Denied |
| Edit flowchart | Allowed | Allowed | Allowed | Denied | Denied |
| Delete flowchart | Allowed | Allowed | Allowed | Denied | Denied |
| Manage members | Allowed | Denied | Denied | Denied | Denied |
| Invite members | Allowed | Denied | Denied | Denied | Denied |
| Change member role | Allowed | Denied | Denied | Denied | Denied |
| Remove member | Allowed | Denied | Denied | Denied | Denied |
| Connect repository | Allowed | Allowed | Allowed | Denied | Denied |
| Disconnect repository | Not defined | Not defined | Not defined | Not defined | Not defined |
| Run GitHub sync | Allowed | Allowed | Allowed | Denied | Denied |
| View GitHub data | Allowed | Allowed | Allowed | Allowed | Allowed |

## Evidence and Exceptions

- `canEditProject()` allows `owner`, `maintainer`, and `developer`.
- Task, Note, and Flowchart Server Actions call `editableProject()` or `context()` before writes.
- Repository connect now calls `authorizeWrite`, which delegates to `canEditProject()`.
- Repository sync now checks `canEditProject()` before reading the repository and token.
- Team actions use `ownerContext()` and therefore allow only owners.
- Project rename/update/delete use owner-only filters and `ownProject()`.
- Repository disconnect in the current source means disconnecting the GitHub OAuth token, not disconnecting one repository record. There is no repository-level disconnect action or route, so every role is `Not defined`, not `Denied`.
- The client now receives `projectRole` for GitHub repository browser/workspace pages. Read-only roles cannot initiate connect or sync controls. Server checks remain authoritative.

## Product Decisions Still Required

- Whether `maintainer` should rename/update a project.
- Whether `maintainer` should delete a project.
- Whether repository-level disconnect should be added, and which roles may use it.
