Implement a new GitHub Repository Timeline and Team Collaboration feature in the existing project.

Important constraints:
- Use the existing project structure, UI system, authentication, Supabase client, coding conventions, and existing components.
- Do not redesign unrelated pages.
- Do not create duplicate tables.
- Before coding, inspect the current Supabase schema, TypeScript types, API routes, services, hooks, and existing repository synchronization logic.
- Use the exact existing column names, relationships, foreign keys, and generated database types.
- Do not guess database columns.
- Do not create a new migration unless a required field is genuinely missing. If something is missing, report it before creating a migration.
- Maintain existing Row Level Security rules and ensure users can access only projects and repositories they are authorized to access.

Existing tables relevant to this feature:
- projects
- project_members
- project_repositories
- repository_branches
- repository_commits
- repository_pull_requests
- repository_pull_request_reviews
- repository_sync_logs
- github_webhook_deliveries
- project_activity_logs
- activities
- tasks
- boards
- versions

Feature 1: Repository Timeline

Add a repository timeline inside the project repository page.

The timeline must:
- Display repository history in chronological order.
- Group related commits under their Pull Request when possible.
- Clearly separate:
  - Pull Requests
  - Commits
  - Merge events
  - Reviews
  - Repository synchronization events
- Show useful information such as:
  - Pull Request title and number
  - Pull Request status
  - Source branch and target branch
  - Author
  - Created date
  - Updated date
  - Merged date when available
  - Commit SHA in shortened form
  - Commit message
  - Commit author
  - Commit date
  - Review status
- Use data from the existing repository tables rather than requesting GitHub directly every time the page opens.
- Support loading, empty, error, and retry states.
- Use pagination or incremental loading when the timeline contains many items.
- Prevent duplicated timeline items when repository synchronization runs multiple times.

Pull Request interaction:
- Clicking a Pull Request timeline card must open its detailed view.
- The detail view must display the Pull Request information, included commits, reviews, and merge status.
- Users must be able to expand or select a commit inside the Pull Request.
- When a commit is selected, show the code changes for that commit if the existing application already stores or retrieves diff data.
- If commit diff data is not currently available in the database, use the existing secure server-side GitHub integration to retrieve it only when requested.
- Never expose GitHub access tokens to the browser.
- Do not store raw GitHub tokens in client-side storage.
- Respect the existing private repository configuration and authorization checks.
- Provide a clear fallback message when the diff cannot be retrieved.

Feature 2: Shared Project Collaboration

Treat each project as a shared workspace for authorized project members.

The collaboration feature must:
- Use project_members to determine who can access the shared project.
- Allow project members to see the same repository timeline, tasks, boards, and project activity according to their role.
- Keep existing tasks and boards as the main team work-management system.
- Display relevant repository activity in the project activity feed.
- Connect GitHub activity with the existing project context.

When repository activity occurs:
- Record meaningful events in the existing activity system using project_activity_logs or activities according to the current project architecture.
- Examples include:
  - New Pull Request synchronized
  - Pull Request merged
  - New commit synchronized
  - Review submitted
  - Repository synchronization completed or failed
- Do not create duplicate activity records for the same GitHub event.
- Use github_webhook_deliveries, repository_sync_logs, external GitHub IDs, or the existing idempotency mechanism to prevent duplicate processing.

Task and board integration:
- Do not automatically modify tasks based only on assumptions.
- If a commit or Pull Request references an existing task identifier using the project’s supported format, display the relationship between the repository event and that task.
- Show linked Pull Requests or commits inside the relevant task detail when a reliable reference exists.
- Team members must be able to understand:
  - What changed
  - Who changed it
  - Which Pull Request or commit caused it
  - Which task it is related to
  - The current work status on the board
- Preserve all existing task and board behavior.

UI requirements:
- Match the existing visual design and responsive layout.
- Add the timeline to the existing repository/project interface without replacing the current navigation.
- Use reusable components for:
  - Timeline item
  - Pull Request card
  - Commit card
  - Review item
  - Commit detail or diff viewer
  - Loading skeleton
  - Empty state
  - Error state
- Clearly distinguish open, closed, merged, approved, changes requested, pending, successful sync, and failed sync states.
- Ensure the page works on desktop and mobile.
- Avoid unnecessary animations or heavy dependencies.

Security requirements:
- All GitHub API requests that require credentials must run server-side.
- Verify the authenticated user belongs to the project before returning repository information.
- Verify repository access before returning commit or Pull Request details.
- Never return encrypted tokens, decrypted tokens, service-role keys, or secret environment variables to the frontend.
- Sanitize GitHub text before rendering.
- Do not render untrusted content as raw HTML.
- Preserve existing RLS policies.
- Do not use the Supabase service-role key in browser code.

Implementation process:
1. Inspect the existing database schema and generated types.
2. Inspect current repository synchronization and GitHub API integration.
3. Reuse existing services and components where possible.
4. Implement server-side queries or endpoints.
5. Implement the repository timeline UI.
6. Implement Pull Request and commit detail interaction.
7. Connect repository events to the existing project activity system.
8. Add reliable task references only when an explicit task identifier exists.
9. Run formatting, linting, type checking, tests, and production build.
10. Fix all errors introduced by this feature.

Required tests:

Unit tests:
- Timeline items are sorted correctly.
- Commits are grouped under the correct Pull Request.
- Standalone commits remain visible.
- Duplicate GitHub events are removed.
- Pull Request status is mapped correctly.
- Review status is mapped correctly.
- Task references are detected only when they match the supported task identifier format.
- Unauthorized users cannot access repository timeline data.

Integration tests:
- A project member can load the repository timeline.
- A non-member receives an authorization error.
- Clicking a Pull Request loads its commits and reviews.
- Clicking a commit loads its details or returns a controlled fallback when diff data is unavailable.
- Reprocessing the same webhook delivery does not create duplicate commits, Pull Requests, reviews, or activity records.
- Repository synchronization failures create a readable error state without breaking the project page.
- Private repository data is never returned without valid authorization.

UI tests:
- Loading state is displayed.
- Empty repository state is displayed.
- Timeline cards render the correct status.
- Pull Request details can be opened and closed.
- Commit details can be selected.
- Error retry works.
- Mobile layout does not overflow.

Final verification commands:
- Run the project’s existing lint command.
- Run TypeScript type checking.
- Run all existing and new tests.
- Run the production build.
- Do not report completion while any test, type-check, lint, or build error caused by this implementation remains.

At the end, provide:
- Files created
- Files modified
- Existing database tables used
- API routes or server actions added
- Authorization rules applied
- Tests added
- Test, lint, type-check, and build results
- Any database field that is still required, without inventing or automatically creating it

[
  {
    "table_schema": "public",
    "table_name": "activities",
    "column_order": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "activities",
    "column_order": 2,
    "column_name": "user_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "activities",
    "column_order": 3,
    "column_name": "project_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "activities",
    "column_order": 4,
    "column_name": "action",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "activities",
    "column_order": 5,
    "column_name": "entity_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "activities",
    "column_order": 6,
    "column_name": "entity_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "activities",
    "column_order": 7,
    "column_name": "metadata",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "activities",
    "column_order": 8,
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "udt_name": "timestamp",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "boards",
    "column_order": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "boards",
    "column_order": 2,
    "column_name": "project_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "boards",
    "column_order": 3,
    "column_name": "name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "flowcharts",
    "column_order": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "flowcharts",
    "column_order": 2,
    "column_name": "user_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "flowcharts",
    "column_order": 3,
    "column_name": "project_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "flowcharts",
    "column_order": 4,
    "column_name": "name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "flowcharts",
    "column_order": 5,
    "column_name": "description",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "flowcharts",
    "column_order": 6,
    "column_name": "nodes",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "NO",
    "column_default": "'[]'::jsonb"
  },
  {
    "table_schema": "public",
    "table_name": "flowcharts",
    "column_order": 7,
    "column_name": "edges",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "NO",
    "column_default": "'[]'::jsonb"
  },
  {
    "table_schema": "public",
    "table_name": "flowcharts",
    "column_order": 8,
    "column_name": "viewport",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": "'{}'::jsonb"
  },
  {
    "table_schema": "public",
    "table_name": "flowcharts",
    "column_order": 9,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "flowcharts",
    "column_order": 10,
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "github_webhook_deliveries",
    "column_order": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "github_webhook_deliveries",
    "column_order": 2,
    "column_name": "delivery_id",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "github_webhook_deliveries",
    "column_order": 3,
    "column_name": "github_event",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "github_webhook_deliveries",
    "column_order": 4,
    "column_name": "repository_github_id",
    "data_type": "bigint",
    "udt_name": "int8",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "github_webhook_deliveries",
    "column_order": 5,
    "column_name": "repository_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "github_webhook_deliveries",
    "column_order": 6,
    "column_name": "status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'received'::text"
  },
  {
    "table_schema": "public",
    "table_name": "github_webhook_deliveries",
    "column_order": 7,
    "column_name": "error_message",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "github_webhook_deliveries",
    "column_order": 8,
    "column_name": "received_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "github_webhook_deliveries",
    "column_order": 9,
    "column_name": "processed_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "github_webhook_deliveries",
    "column_order": 10,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "notes",
    "column_order": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "notes",
    "column_order": 2,
    "column_name": "project_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "notes",
    "column_order": 3,
    "column_name": "title",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "notes",
    "column_order": 4,
    "column_name": "content",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "notes",
    "column_order": 5,
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "udt_name": "timestamp",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 2,
    "column_name": "project_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 3,
    "column_name": "repository_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 4,
    "column_name": "actor_user_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 5,
    "column_name": "actor_github_login",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 6,
    "column_name": "action_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 7,
    "column_name": "entity_type",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 8,
    "column_name": "entity_id",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 9,
    "column_name": "title",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 10,
    "column_name": "description",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 11,
    "column_name": "commit_sha",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 12,
    "column_name": "pull_request_number",
    "data_type": "integer",
    "udt_name": "int4",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 13,
    "column_name": "task_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 14,
    "column_name": "old_value",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 15,
    "column_name": "new_value",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 16,
    "column_name": "metadata",
    "data_type": "jsonb",
    "udt_name": "jsonb",
    "is_nullable": "NO",
    "column_default": "'{}'::jsonb"
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 17,
    "column_name": "occurred_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "project_activity_logs",
    "column_order": 18,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "project_members",
    "column_order": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "project_members",
    "column_order": 2,
    "column_name": "project_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_members",
    "column_order": 3,
    "column_name": "user_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_members",
    "column_order": 4,
    "column_name": "role",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'developer'::text"
  },
  {
    "table_schema": "public",
    "table_name": "project_members",
    "column_order": 5,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "project_members",
    "column_order": 6,
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 2,
    "column_name": "project_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 3,
    "column_name": "github_repository_id",
    "data_type": "bigint",
    "udt_name": "int8",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 4,
    "column_name": "github_owner",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 5,
    "column_name": "github_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 6,
    "column_name": "github_full_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 7,
    "column_name": "github_url",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 8,
    "column_name": "default_branch",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 9,
    "column_name": "visibility",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 10,
    "column_name": "is_private",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "NO",
    "column_default": "false"
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 11,
    "column_name": "is_archived",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "NO",
    "column_default": "false"
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 12,
    "column_name": "connected_by",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 13,
    "column_name": "sync_status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": "'idle'::text"
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 14,
    "column_name": "last_synced_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 15,
    "column_name": "sync_error",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 16,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "project_repositories",
    "column_order": 17,
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "projects",
    "column_order": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "projects",
    "column_order": 2,
    "column_name": "name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "projects",
    "column_order": 3,
    "column_name": "status",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": "'active'::text"
  },
  {
    "table_schema": "public",
    "table_name": "projects",
    "column_order": 4,
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "udt_name": "timestamp",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "projects",
    "column_order": 5,
    "column_name": "user_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_branches",
    "column_order": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "repository_branches",
    "column_order": 2,
    "column_name": "repository_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_branches",
    "column_order": 3,
    "column_name": "branch_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_branches",
    "column_order": 4,
    "column_name": "latest_commit_sha",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_branches",
    "column_order": 5,
    "column_name": "is_default",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "NO",
    "column_default": "false"
  },
  {
    "table_schema": "public",
    "table_name": "repository_branches",
    "column_order": 6,
    "column_name": "is_protected",
    "data_type": "boolean",
    "udt_name": "bool",
    "is_nullable": "NO",
    "column_default": "false"
  },
  {
    "table_schema": "public",
    "table_name": "repository_branches",
    "column_order": 7,
    "column_name": "github_url",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_branches",
    "column_order": 8,
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "repository_branches",
    "column_order": 9,
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "udt_name": "timestamptz",
    "is_nullable": "NO",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "repository_commits",
    "column_order": 1,
    "column_name": "id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "repository_commits",
    "column_order": 2,
    "column_name": "repository_id",
    "data_type": "uuid",
    "udt_name": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_commits",
    "column_order": 3,
    "column_name": "sha",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_commits",
    "column_order": 4,
    "column_name": "short_sha",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_commits",
    "column_order": 5,
    "column_name": "message",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_commits",
    "column_order": 6,
    "column_name": "message_body",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_commits",
    "column_order": 7,
    "column_name": "author_name",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_commits",
    "column_order": 8,
    "column_name": "author_email",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "repository_commits",
    "column_order": 9,
    "column_name": "author_avatar_url",
    "data_type": "text",
    "udt_name": "text",
    "is_nullable": "YES",
    "column_default": null
  }
]

---
