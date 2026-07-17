You are a senior full-stack engineer and security-focused code reviewer.

I am building a project called DEV-LIFE.

Current stack:
- Next.js App Router
- TypeScript
- Supabase Authentication
- Supabase PostgreSQL
- GitHub OAuth login
- Existing project, task, note, board, activity, and user systems
- The existing application must continue working without regressions

Your task is to implement a secure, read-only GitHub Repository integration for users who sign in with GitHub.

==================================================
PRIMARY GOAL
==================================================

Allow an authenticated user to:

1. Connect their GitHub account using Supabase GitHub OAuth.
2. View repositories that their own GitHub account is authorized to access.
3. View basic repository metadata.
4. Search, filter, and select a repository.
5. Optionally connect a selected GitHub repository to a DEV-LIFE project.

This integration must be READ-ONLY.

The application must never:
- create repositories;
- delete repositories;
- rename repositories;
- edit repository settings;
- push commits;
- create or delete branches;
- create, edit, merge, or close pull requests;
- create, edit, or delete issues;
- edit repository files;
- manage webhooks;
- manage collaborators;
- manage Actions secrets;
- manage deploy keys;
- manage organization settings;
- request unnecessary write permissions.

==================================================
IMPORTANT SECURITY DECISION
==================================================

Do not fetch GitHub repositories directly from browser components using the GitHub provider token.

Use this architecture:

Browser
→ authenticated Next.js server route
→ validate the Supabase user session
→ retrieve the authorized GitHub access token securely
→ call the GitHub REST API from the server
→ return only sanitized repository metadata to the browser

Never expose GitHub tokens in:
- rendered HTML;
- React props;
- browser console;
- client-side JavaScript bundles;
- query parameters;
- URLs;
- error messages;
- analytics;
- logs;
- API responses;
- localStorage;
- sessionStorage;
- cookies readable by JavaScript;
- Supabase public tables.

Do not print or log:
- GitHub provider_token;
- GitHub provider_refresh_token;
- Supabase access token;
- Supabase refresh token;
- GitHub Client Secret;
- Supabase service-role key.

==================================================
OAUTH REQUIREMENTS
==================================================

Use Supabase GitHub OAuth.

The login request must only request the minimum required permissions.

For the first implementation:

- Use only the default identity permissions when the application only needs public repositories.
- Request GitHub OAuth scope "repo" only if private repository access is an explicit product requirement.
- Request "read:user" only when additional profile information is actually required.
- Request "user:email" only when private GitHub email addresses are actually required.

Do not request write scopes.

Do not request:
- workflow;
- admin:repo_hook;
- write:org;
- admin:org;
- delete_repo;
- gist;
- notifications;
- packages write permissions;
- project write permissions.

Create a clearly named configuration flag:

GITHUB_PRIVATE_REPOS_ENABLED=false

Behavior:
- When false, do not request the "repo" scope.
- When true, request "repo" and clearly inform the user that the application will be able to read private repositories they can access.
- Never silently increase OAuth scopes.

Example OAuth function:

await supabase.auth.signInWithOAuth({
  provider: "github",
  options: {
    scopes: GITHUB_PRIVATE_REPOS_ENABLED
      ? "read:user user:email repo"
      : "read:user",
    redirectTo: `${window.location.origin}/auth/callback`,
  },
})

Before using this example, inspect the existing authentication code and adapt it to the project's current Supabase client pattern.

Do not create duplicate Supabase clients.

==================================================
AUTH CALLBACK
==================================================

Inspect whether the project already has:

app/auth/callback/route.ts

If it exists:
- preserve the existing behavior;
- modify only what is necessary;
- do not replace the entire callback without understanding it;
- preserve redirects and cookie handling.

If it does not exist:
- create a secure callback route compatible with Next.js App Router and Supabase SSR;
- exchange the OAuth code for a Supabase session;
- redirect only to an allowlisted internal path;
- prevent open redirect vulnerabilities.

Allowed redirect destinations:
- /dashboard
- /projects
- /settings/integrations

Never accept an arbitrary external URL from a "next", "redirect", or "returnTo" query parameter.

Create a redirect validation helper.

Example rule:
- redirect path must begin with "/";
- must not begin with "//";
- must not contain a protocol such as "http:" or "https:";
- fallback must be "/dashboard".

==================================================
TOKEN HANDLING
==================================================

Supabase provider tokens must be treated as sensitive credentials.

Requirements:

1. Do not store provider_token in localStorage.
2. Do not store provider_token in sessionStorage.
3. Do not return provider_token from API routes.
4. Do not place provider_token inside a normal Supabase user profile table.
5. Do not expose provider_token to React client components.
6. Do not send provider_token to third-party monitoring services.
7. Do not persist the token unless persistent GitHub synchronization is explicitly required.

For the initial implementation:
- use the provider token only during the authenticated session;
- process GitHub requests on the server;
- avoid long-term token persistence.

If the current Supabase architecture makes the provider token unavailable to a later server request:
- do not invent an insecure workaround;
- explain the limitation;
- implement a dedicated secure GitHub connection callback or recommend migrating the integration from a broad OAuth App to a GitHub App;
- never save the token in a public or browser-readable location.

If persistent synchronization is needed later:
- store encrypted tokens only in a server-only secret store or protected database table;
- use strong authenticated encryption;
- restrict access using server-only code;
- never allow direct client SELECT access;
- never expose the encryption key;
- include token revocation and disconnection behavior.

Do not implement persistent token storage in this task unless it is already part of the project architecture.

==================================================
SERVER API ROUTE
==================================================

Create a server-only endpoint:

GET /api/github/repositories

Suggested file:

app/api/github/repositories/route.ts

This route must:

1. Accept GET only.
2. Verify the Supabase session on the server.
3. Return 401 when the user is not authenticated.
4. Confirm the authenticated account has GitHub connected.
5. Obtain the GitHub token from a trusted server-side source.
6. Call the GitHub REST API.
7. Use a request timeout.
8. handle GitHub pagination safely.
9. Set an upper repository limit.
10. sanitize the GitHub response.
11. return only fields approved below.
12. never return the GitHub token.
13. never return the complete raw GitHub API response.
14. never leak internal exception details.

GitHub endpoint:

GET https://api.github.com/user/repos

Use headers:

Authorization: Bearer <token>
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
User-Agent: DEV-LIFE

Suggested query parameters:

visibility=all
affiliation=owner,collaborator,organization_member
sort=updated
direction=desc
per_page=50
page=<validated page>

Validate all query parameters.

Allowed:
- page: integer from 1 to 10
- per_page: fixed at 50 or maximum 100
- visibility: all, public, private
- sort: updated, created, pushed, full_name
- direction: asc, desc

Do not pass arbitrary user-supplied query values directly to GitHub.

Maximum repositories returned in one application request:
500

Stop pagination after:
- no next page;
- 500 repositories;
- GitHub rate limit error;
- timeout;
- invalid response.

==================================================
RESPONSE DATA ALLOWLIST
==================================================

Return only this repository model:

type GitHubRepository = {
  id: number
  nodeId: string
  name: string
  fullName: string
  ownerLogin: string
  ownerAvatarUrl: string | null
  description: string | null
  htmlUrl: string
  private: boolean
  fork: boolean
  archived: boolean
  disabled: boolean
  visibility: "public" | "private" | "internal" | null
  defaultBranch: string
  language: string | null
  stargazersCount: number
  forksCount: number
  openIssuesCount: number
  createdAt: string
  updatedAt: string
  pushedAt: string | null
}

Do not return:
- permissions object;
- temp_clone_token;
- clone_url;
- ssh_url;
- git_url;
- svn_url;
- hooks_url;
- collaborators_url;
- deployments_url;
- keys_url;
- secrets;
- security settings;
- organization permissions;
- raw owner object;
- raw GitHub API response.

Validate the GitHub response at runtime using Zod or the validation library already used in the project.

Do not trust external API response shapes blindly.

==================================================
READ-ONLY ENFORCEMENT
==================================================

The GitHub integration must use only GET requests.

Create a small GitHub API wrapper that rejects unsupported HTTP methods.

Example:

type AllowedGitHubMethod = "GET"

The wrapper must not accept:
- POST
- PUT
- PATCH
- DELETE

Do not create generic proxy routes such as:

/api/github/[...path]

A generic proxy could allow users to call unauthorized GitHub endpoints.

Only create explicit allowlisted server routes.

For this task, the only GitHub route should be:

GET /api/github/repositories

Do not accept a complete GitHub API URL from the browser.

Do not fetch a URL supplied by the user.

This prevents:
- SSRF;
- arbitrary GitHub API access;
- access to unintended endpoints;
- token misuse.

==================================================
URL AND SSRF PROTECTION
==================================================

All outbound requests must use a hard-coded GitHub API origin:

https://api.github.com

Do not allow:
- custom hostnames;
- custom ports;
- user-controlled protocols;
- redirects to non-GitHub hosts;
- arbitrary fetch URLs.

Disable or manually validate redirects.

If a redirect is returned:
- do not forward the Authorization header to another origin;
- reject redirects outside api.github.com.

Repository htmlUrl values must be validated to use:
- protocol: https
- hostname: github.com

If invalid, return null or omit the link.

==================================================
RATE LIMITING
==================================================

Implement basic per-user rate limiting for:

GET /api/github/repositories

Suggested limit:
- 20 requests per authenticated user per minute.

Use an existing project rate-limit solution if available.

If none exists:
- implement a simple development-safe limiter;
- clearly mark that an in-memory limiter is not sufficient for multi-instance production hosting;
- structure the code so Redis, Upstash, or another shared limiter can be added later.

On rate-limit failure return:

HTTP 429

Response:

{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many GitHub requests. Please try again shortly."
  }
}

Do not include tokens or internal details.

Also inspect GitHub response headers:

- x-ratelimit-limit
- x-ratelimit-remaining
- x-ratelimit-reset

Do not expose unnecessary rate-limit metadata publicly.

A sanitized remaining/reset value may be returned only when useful to the UI.

==================================================
TIMEOUT AND ERROR HANDLING
==================================================

Use AbortController.

Suggested timeout:
10 seconds

Handle these cases:

- 400 invalid request;
- 401 Supabase session missing;
- 401 GitHub token expired or revoked;
- 403 insufficient GitHub scope;
- 403 GitHub rate limit exceeded;
- 404 GitHub resource unavailable;
- 429 application rate limit;
- 500 unexpected internal error;
- 502 invalid GitHub response;
- 503 GitHub temporarily unavailable;
- 504 GitHub request timeout.

Use a consistent response shape:

{
  "error": {
    "code": "GITHUB_AUTH_REQUIRED",
    "message": "Please reconnect your GitHub account."
  }
}

Allowed user-facing codes:

- UNAUTHENTICATED
- GITHUB_NOT_CONNECTED
- GITHUB_AUTH_REQUIRED
- GITHUB_PERMISSION_REQUIRED
- GITHUB_RATE_LIMITED
- RATE_LIMITED
- GITHUB_UNAVAILABLE
- REQUEST_TIMEOUT
- INVALID_REQUEST
- INTERNAL_ERROR

Do not expose:
- stack traces;
- access tokens;
- response headers containing sensitive data;
- full GitHub error bodies;
- database errors;
- environment variables;
- internal file paths.

Server logs may include:
- request ID;
- authenticated Supabase user ID;
- endpoint name;
- HTTP status;
- sanitized GitHub status;
- duration.

Server logs must not include tokens.

==================================================
CLIENT UI
==================================================

Create or update a page such as:

app/settings/integrations/github/page.tsx

or adapt the existing project structure.

The UI must contain:

1. GitHub connection status.
2. "Connect GitHub" button when disconnected.
3. "Reconnect GitHub" button when token is expired or scope is missing.
4. "Disconnect GitHub" button.
5. Repository search input.
6. Filters:
   - All
   - Public
   - Private
   - Owner
   - Collaborator
   - Organization
   - Archived
7. Repository cards or table.
8. Loading skeleton.
9. Empty state.
10. Error state.
11. Pagination or Load More.
12. Clear privacy explanation.

Privacy message:

"DEV-LIFE only reads repository information that you authorize through GitHub. It does not modify, delete, push to, or manage your repositories."

If private repository access is enabled, show:

"Private repository access is optional and requires additional GitHub permission. DEV-LIFE will use this permission only to display repositories you are authorized to view."

Never display:
- GitHub access tokens;
- OAuth secrets;
- raw API JSON;
- internal API errors.

Use accessible controls:
- labels;
- keyboard navigation;
- visible focus states;
- aria-live for loading and errors;
- sufficient contrast.

Preserve the existing DEV-LIFE design system.

Do not redesign unrelated pages.

==================================================
DISCONNECT FLOW
==================================================

Add a secure disconnect action.

The action must:

1. require an authenticated Supabase user;
2. require CSRF-safe server action or same-site protected POST route;
3. remove only DEV-LIFE's stored GitHub connection data, if any;
4. never delete the user's Supabase account;
5. never delete GitHub repositories;
6. never delete DEV-LIFE projects;
7. clear cached repository data for that user;
8. show instructions that the user may also revoke the OAuth App in GitHub settings.

Do not pretend that signing out of Supabase automatically revokes the GitHub OAuth authorization.

Use an explicit confirmation dialog:

"Disconnecting GitHub will stop DEV-LIFE from loading your repositories. It will not delete your GitHub repositories or your DEV-LIFE account."

==================================================
OPTIONAL DATABASE LINK
==================================================

Only if repository-to-project linking is required, create a table:

project_github_repositories

Suggested columns:

- id uuid primary key default gen_random_uuid()
- project_id uuid not null references public.projects(id) on delete cascade
- user_id uuid not null references auth.users(id) on delete cascade
- github_repository_id bigint not null
- github_node_id text
- github_owner text not null
- github_name text not null
- github_full_name text not null
- github_html_url text not null
- github_default_branch text
- github_is_private boolean not null default false
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

Constraints:

unique(user_id, project_id, github_repository_id)

Enable Row Level Security.

Policies must ensure:

SELECT:
user_id = auth.uid()
and the linked project belongs to auth.uid()

INSERT:
user_id = auth.uid()
and the linked project belongs to auth.uid()

UPDATE:
user_id = auth.uid()
and the linked project belongs to auth.uid()

DELETE:
user_id = auth.uid()
and the linked project belongs to auth.uid()

Do not store:
- provider_token;
- provider_refresh_token;
- GitHub Client Secret;
- repository source code;
- private repository files;
- GitHub secrets.

Before creating the table:
- inspect whether an equivalent table already exists;
- do not create duplicate tables;
- use existing naming conventions;
- provide the SQL migration separately;
- do not automatically execute destructive migrations.

==================================================
CACHE RULES
==================================================

Repository metadata may be cached briefly.

Maximum recommended cache:
5 minutes

Cache key must include:
- authenticated Supabase user ID;
- requested visibility;
- page;
- sort;
- direction.

Never cache one user's repositories under a shared public cache key.

Never mark authenticated repository responses as public.

Use:

Cache-Control: private, no-store

for the initial secure implementation.

Do not use Next.js static generation for authenticated repository data.

Do not place private repository results in:
- static HTML;
- build output;
- public CDN cache;
- ISR pages;
- shared fetch cache.

==================================================
INPUT VALIDATION
==================================================

Validate:
- page;
- search query;
- visibility;
- sort;
- direction;
- project ID;
- GitHub repository ID;
- repository full name;
- returned URLs.

Search query maximum length:
100 characters

Project ID must be a valid UUID.

GitHub repository ID must be a positive safe integer or validated bigint string.

Never insert raw repository names into SQL strings.

Use parameterized queries or the Supabase client.

Escape user-visible repository data through React's default escaping.

Never use dangerouslySetInnerHTML for repository descriptions.

==================================================
ORGANIZATION REPOSITORIES
==================================================

Some organization repositories may be restricted by GitHub organization OAuth policies or SAML SSO.

Handle this gracefully.

Do not claim that every organization repository will always be visible.

When GitHub returns insufficient access, show:

"This repository may require approval from your GitHub organization or an active SSO authorization."

Do not attempt to bypass organization policies.

==================================================
TESTING REQUIREMENTS
==================================================

Add tests for:

Authentication:
- unauthenticated request returns 401;
- authenticated request without GitHub connection returns safe error;
- expired token returns reconnect message.

Authorization:
- user A cannot access user B's cached repositories;
- user A cannot link a repository to user B's project;
- RLS blocks cross-user access.

Security:
- token never appears in API responses;
- token never appears in logs;
- only GET is allowed for GitHub API;
- arbitrary GitHub path is rejected;
- arbitrary URL fetch is impossible;
- external redirect is rejected;
- invalid query values are rejected;
- rate limiter works;
- timeout works.

Data validation:
- malformed GitHub response returns 502;
- unexpected fields are stripped;
- invalid GitHub URL is rejected;
- description containing HTML is rendered as plain text.

UI:
- loading state;
- empty state;
- public repository;
- private repository indicator;
- archived repository indicator;
- API error;
- reconnect flow;
- pagination;
- search and filters.

Do not use a real GitHub access token in tests.

Mock GitHub API responses.

==================================================
CODE QUALITY REQUIREMENTS
==================================================

Use:
- TypeScript strict typing;
- existing project aliases;
- existing Supabase server/client helpers;
- existing UI components;
- existing error handling conventions;
- existing lint and formatting rules.

Do not:
- use any;
- disable TypeScript errors;
- suppress ESLint globally;
- hard-code secrets;
- add unnecessary dependencies;
- duplicate auth logic;
- rewrite unrelated components;
- delete existing features;
- change existing database tables without explanation;
- run destructive SQL;
- modify environment files containing real secrets.

Create an environment example only when required:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GITHUB_PRIVATE_REPOS_ENABLED=false

Do not place:
- GitHub Client Secret in NEXT_PUBLIC variables;
- Supabase service-role key in NEXT_PUBLIC variables.

GitHub Client ID and Client Secret are configured in Supabase Dashboard, not exposed in frontend code.

==================================================
IMPLEMENTATION ORDER
==================================================

Follow this exact order:

1. Inspect the current project structure.
2. Identify existing Supabase clients and auth callback.
3. Identify whether GitHub login already exists.
4. Identify whether SSR auth is configured correctly.
5. Report the files that must be changed.
6. Explain the security architecture briefly.
7. Implement the minimum OAuth scope configuration.
8. Implement the server-only GitHub client.
9. Implement GET /api/github/repositories.
10. Add runtime response validation.
11. Add rate limiting and timeout.
12. Add repository UI.
13. Add disconnect/reconnect states.
14. Add optional project-linking only if requested.
15. Add tests.
16. Run:
    - typecheck;
    - lint;
    - tests;
    - production build.
17. Fix all errors caused by the changes.
18. Provide a final change report.

==================================================
FINAL RESPONSE FORMAT
==================================================

At the end, report:

1. Architecture used.
2. Files created.
3. Files modified.
4. OAuth scopes requested and why.
5. Security protections added.
6. Database changes, if any.
7. Environment variables required.
8. Supabase Dashboard settings required.
9. GitHub Dashboard settings required.
10. Commands used for testing.
11. Test results.
12. Build result.
13. Remaining limitations.
14. Exact manual steps I must complete.

Do not claim that something works unless you ran and verified it.

If access to a file, environment variable, Supabase setting, or GitHub setting is missing:
- stop at that dependency;
- explain exactly what is missing;
- do not fabricate values;
- do not insert placeholder secrets into real configuration files.