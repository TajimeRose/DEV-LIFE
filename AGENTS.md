# AGENTS.md

## Purpose

This file defines the repository-wide operating rules for coding agents working on DEV-LIFE. Read it before changing code, configuration, tests, or database-related behavior.

Use the current source code, configuration, and tests as the primary evidence for how the system works. Historical product documents are useful context, but they may not describe the deployed schema or current implementation accurately.

## Project Overview

DEV-LIFE is a full-stack developer workspace for projects, tasks, notes, boards, activity history, flowcharts, and GitHub repository timelines. The application is a Next.js monolith backed by Supabase; there is no separate backend service in this repository.

The production application lives in `Frontend/`. Run application commands from that directory, not from the repository root.

## Repository Layout

```text
.
|-- Frontend/                         # Main Next.js application
|   |-- public/                       # Static assets
|   `-- src/
|       |-- app/                      # App Router pages, actions, auth, and APIs
|       |   |-- (workspace)/          # Authenticated workspace routes
|       |   |-- actions/              # Server Actions
|       |   |-- api/                  # Route Handlers
|       |   `-- auth/                 # Supabase and GitHub OAuth flows
|       |-- components/
|       |   |-- ui/                   # Shared UI primitives
|       |   |-- github/               # Repository and timeline UI
|       |   `-- flowchart/            # React Flow editor UI
|       |-- lib/
|       |   |-- supabase/             # Browser and server clients
|       |   |-- projects/             # Project authorization
|       |   |-- github/               # GitHub API, sync, token, and timeline logic
|       |   |-- flowchart/            # Flowchart domain logic
|       |   |-- database.types.ts     # Current typed database contract
|       |   `-- current-workspace.ts  # Active project and workspace data
|       `-- proxy.ts                  # Supabase session refresh proxy
|-- Backend/                          # Currently empty; do not assume a service exists
|-- supabase/                         # No tracked migrations or policy definitions
|-- docs/superpowers/                 # Task-specific design and implementation notes
|-- devlife.md                        # Historical development rules and schema notes
`-- Newfeatures.md                    # Historical GitHub feature requirements/schema snapshot
```

Do not inspect or modify generated/vendor artifacts unless the task explicitly requires it. This includes `.git/`, `node_modules/`, `.next/`, `out/`, `build/`, `.vercel/`, coverage output, and Supabase temporary files.

## Runtime And Stack

- Node.js 22, constrained to `>=22 <23`
- npm 10, constrained to `>=10 <11`; package manager is `npm@10.9.7`
- Next.js 16 App Router
- React 19
- TypeScript in strict mode with `noEmit`
- Supabase Auth and PostgreSQL through `@supabase/ssr` and `@supabase/supabase-js`
- Zod for runtime validation at trust boundaries
- `@xyflow/react` for flowcharts
- Tailwind CSS 4 through PostCSS, plus substantial global CSS
- ESLint 9 with Next.js Core Web Vitals and TypeScript rules
- Node's built-in test runner; there is no Jest or Vitest setup

There is no Prisma or Drizzle implementation despite references in older documentation.

## Setup And Commands

Run all application commands from `Frontend/`:

```bash
cd Frontend
nvm use
npm ci
```

Use `npm install` instead of `npm ci` only when intentionally changing dependencies and `package-lock.json`.

```bash
npm run dev                       # Development server
npm run build                     # Production build
npm run start                     # Start a production build
npm run lint                      # ESLint
npx tsc --noEmit                  # Explicit type-check; no typecheck script exists
npm test                          # Full test suite
```

For LAN development:

```bash
npm run dev -- --hostname 0.0.0.0
```

Run one test file with the same Node flags used by the package script:

```bash
node --no-warnings --test --experimental-test-isolation=none \
  src/lib/github/timeline.test.ts
```

Run a named test with:

```bash
node --no-warnings --test --experimental-test-isolation=none \
  --test-name-pattern="timeline events are sorted newest first" \
  src/lib/github/timeline.test.ts
```

There is no repository command for formatting, browser E2E tests, or coverage. Do not claim those checks were run unless the required tooling was deliberately added.

## Architecture And Boundaries

### Server And Client

- Prefer Server Components. Add `"use client"` only for state, effects, event handlers, or browser APIs.
- Put authenticated mutations in Server Actions or Route Handlers.
- Use `src/lib/supabase/server.ts` on the server and `src/lib/supabase/client.ts` in the browser.
- Direct browser database writes must be justified and protected by verified RLS. Flowchart autosave currently follows this pattern.
- Credentialed GitHub requests are server-only. Never move them into Client Components.
- Private dynamic API responses should remain uncached and use safe, controlled response bodies.

### Authentication And Active Project

- Supabase Auth is the only authentication mechanism.
- The active project is stored in the HTTP-only `devlife-active-project` cookie.
- `getCurrentWorkspace()` resolves the authenticated user and authorized active project.
- Project access includes both owners (`projects.user_id`) and members (`project_members`). Do not replace member-aware authorization with owner-only checks.
- Use `authorizeProjectAccess()` for project-scoped server operations.
- For repository endpoints, verify all three conditions: the user is authenticated, the user can access the project, and the repository belongs to that project.
- RLS is an additional security boundary, not a substitute for explicit server authorization.

### Session Proxy

`Frontend/src/proxy.ts` refreshes Supabase sessions through `auth.getClaims()`. Its matcher is security- and runtime-sensitive:

- Keep the matcher statically analyzable by Next.js.
- Never match `/_next/`, including HMR and internal assets.
- Preserve the regression coverage in `src/lib/proxy-matcher.test.ts`.
- A broad matcher can break hydration, HMR, and Server Action submissions.

### Workspace Writes

Task, note, and activity behavior is connected:

- Important creates and updates generally create `activities` records.
- Important task/note updates can create `versions` records.
- Existing write-failure semantics differ by operation; some audit writes are required and others are best-effort. Read the complete action before changing transaction/error behavior.
- Do not silently weaken a critical write or make an optional audit write block a successful primary operation without an explicit product decision.

## GitHub Integration

### Token Security

- GitHub OAuth provider tokens are encrypted server-side and stored in the HTTP-only `devlife-github-session` cookie.
- `GITHUB_TOKEN_ENCRYPTION_KEY` must be a 64-character hexadecimal value representing 32 bytes.
- Token encryption uses AES-GCM and the cookie payload is bound to the Supabase user and expiration time.
- Never expose, return, log, or persist plaintext tokens, encrypted token payloads, encryption keys, service-role keys, or secret environment values in client-visible data.
- Never store GitHub tokens in `localStorage` or `sessionStorage`.
- Do not import `src/lib/github/token-vault.ts` into client code; it is server-only.

### API And Synchronization

- GitHub calls use the fixed origin `https://api.github.com`, GET requests, manual redirect handling, no-store caching, timeouts, and Zod response validation.
- Do not accept a user-controlled GitHub API origin or remove validation, timeouts, redirect restrictions, or response field allowlists.
- Repository listing is rate-limited in memory. This is process-local protection, not a distributed production rate limiter.
- Normal timeline loads read synchronized Supabase data. They must not fetch the entire timeline from GitHub on every page view.
- Commit details may fetch diffs server-side on demand after authorization.
- Synchronization uses deterministic UUIDs, upserts, and idempotent activity records. Use `stableUuid()` for external entities/events that must survive retries; do not replace those IDs with random UUIDs.
- Validate and sanitize all external GitHub data. Never render GitHub or user content as raw HTML.
- Preserve controlled errors. Do not return raw GitHub responses, database errors, stack traces, or secret-bearing messages.

Current limitations are intentional facts, not invitations to invent schema:

- Pull Request detail does not currently map related commits.
- Pull Request diff data is not part of the current stored model.
- Timeline pagination is performed per data source before events are merged, not with a global chronological cursor.
- The UI intentionally hides `sync_*` activity events from the user-facing timeline.
- The rate limiter does not coordinate across server instances.

## Database Contract

Use `Frontend/src/lib/database.types.ts` as the current code-level database contract. Prefer its helpers:

```ts
Tables<"tasks">
TablesInsert<"tasks">
TablesUpdate<"tasks">
Json
```

Current typed tables include:

- `activities`, `boards`, `flowcharts`, `notes`, `projects`, `project_members`
- `tasks`, `versions`
- `project_repositories`, `repository_branches`, `repository_commits`
- `repository_pull_requests`, `repository_pull_request_reviews`
- `repository_sync_logs`, `github_webhook_deliveries`, `project_activity_logs`

Database rules:

- Never invent, rename, or repurpose tables, columns, relations, defaults, nullability, or enum-like values.
- Never edit generated types merely to make TypeScript pass when the deployed schema has not changed.
- Do not use `database.types.backup.ts` as a source of truth; it is incomplete and outdated.
- Do not treat the schema descriptions in `devlife.md` or `Newfeatures.md` as proof of the deployed database.
- This repository contains no tracked SQL migrations or complete RLS definitions. Before any schema or policy change, inspect the linked Supabase project and confirm the real schema, constraints, indexes, and policies.
- Do not create a migration or change RLS without explicit approval. If a required field is missing, report the gap instead of guessing.
- Use UUIDs and database timestamps consistently with the existing schema.
- Preserve project isolation and owner/member access in every query and mutation.

Flowchart paths currently contain owner-only behavior in places even though other project features support members. Do not generalize or change that behavior accidentally; treat collaboration changes there as a scoped authorization task requiring RLS verification.

## Environment Variables

The application expects the variables documented in `Frontend/.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GITHUB_PRIVATE_REPOS_ENABLED=false
GITHUB_TOKEN_ENCRYPTION_KEY=
```

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL used by browser, server, and proxy clients.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon/publishable key used with RLS; never substitute a service-role key in browser code.
- `NEXT_PUBLIC_SITE_URL`: base URL for OAuth callbacks; production must match the deployed origin and Supabase redirect allowlist.
- `GITHUB_PRIVATE_REPOS_ENABLED`: private repository access is enabled only when the exact value is `"true"`.
- `GITHUB_TOKEN_ENCRYPTION_KEY`: server-only 256-bit token-encryption secret encoded as 64 hexadecimal characters.

Never read secrets into output, commit `.env.local`, or replace placeholders in `.env.example` with real values. Root and frontend local environment files may exist and must remain private.

## Code Conventions

### TypeScript

- Keep strict typing. Avoid `any`, `@ts-ignore`, unsafe casts, and lint suppression.
- Parse form, request, query, cookie payload, database JSON, and external API data at trust boundaries, usually with Zod.
- Start untrusted values as `unknown` and narrow them explicitly.
- Prefer types generated from `database.types.ts` over duplicate handwritten database models.
- Use the `@/...` alias for application imports. Some isolated domain tests intentionally use relative imports with `.ts`; follow the local file pattern.
- Match existing style: double quotes, semicolons, two-space indentation, trailing commas in multiline constructs, camelCase values/functions, and PascalCase components/types/classes.
- Keep changes focused. There is no formatter-enforced baseline, so do not reformat unrelated dense files.

### Next.js And APIs

- Keep server-only modules out of the client bundle.
- Authenticate and authorize before reading protected data.
- Validate route parameters and request bodies before use.
- Keep API errors stable and safe, generally in this form:

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Safe user-facing message"
  }
}
```

- Use `Cache-Control: private, no-store` for private dynamic data where the surrounding route follows that convention.
- Abort client fetches during cleanup and handle `AbortError` without surfacing a false failure.
- Add `rel="noreferrer noopener"` to links opened with `target="_blank"`.

### UI And CSS

- Reuse shared primitives from `src/components/ui/index.tsx` and existing feature components before creating alternatives.
- Preserve the established responsive workspace shell and mixed Thai/English product language unless localization is in scope.
- Maintain keyboard behavior, focus management, `aria-label`, `aria-live`, `role="alert"`/`role="status"`, and reduced-motion behavior.
- Never use `dangerouslySetInnerHTML` for GitHub or user-provided content.
- Avoid heavy dependencies, unnecessary animation, and redesigns outside the task.
- Inspect both `src/app/globals.css` and `src/app/swiss.css` before changing shared tokens or classes. `swiss.css` loads later and overrides many global definitions.
- Verify UI changes on desktop and mobile and avoid horizontal overflow.

## Testing

Tests are colocated with domain code as `*.test.ts` and use `node:test` plus `node:assert/strict`.

- Do not use Jest/Vitest globals.
- Keep unit tests deterministic and independent of live network or database access.
- Prefer dependency injection, faked `fetch`, and native `Request`/`Response` objects.
- Add focused regression tests for bugs and security-sensitive behavior.
- Error-path tests should assert status, stable error code, safe message, and absence of raw internal details.
- Preserve coverage for authentication, owner/member authorization, redirect safety, GitHub origin/method/timeout restrictions, malformed external responses, token tamper detection, idempotent synchronization, timeline ordering/deduplication, controlled fallbacks, and proxy exclusions.
- Keep `--experimental-test-isolation=none` in direct Node test commands; existing proxy/SWC tests depend on the current runner setup.

## Verification Standard

Run the narrowest relevant test while developing. Before reporting a normal code change complete, run from `Frontend/`:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

The production build may require valid Supabase environment variables. If an environment-dependent check cannot run, report the exact command and blocker. Do not report completion while lint, type, test, or build failures introduced by the change remain.

For documentation-only changes, inspect the diff and validate every documented path, script, and configuration value; a production build is not required unless the documentation change affects executable configuration.

## Deployment

- Vercel is the configured deployment target.
- The Vercel project root must be `Frontend/`.
- `Frontend/vercel.json` installs with `npm ci` and builds with `npm run build`.
- There is no tracked GitHub Actions workflow, Dockerfile, or Docker Compose configuration.
- Deployment configuration does not replace local lint, type-check, and test verification.

## Agent Workflow

1. Read this file and inspect the relevant implementation, types, tests, and nearby styles before editing.
2. Confirm the task boundary and identify authentication, authorization, data, and client/server implications.
3. For database work, verify the remote Supabase schema and RLS before proposing changes. Ask before migrations or policy changes.
4. Make the smallest coherent change and preserve unrelated behavior.
5. Add or update focused tests for changed logic, regressions, authorization, and error handling.
6. Run focused checks, then the required verification appropriate to the change.
7. Report modified files, behavior, security decisions, verification results, and any unresolved schema/environment limitation.

## Instruction Precedence

When repository information conflicts, use this evidence order:

1. Current source code and configuration
2. `Frontend/src/lib/database.types.ts` together with the verified remote Supabase schema and RLS
3. Existing tests
4. The current task requirements
5. Historical documents such as `devlife.md`, `Newfeatures.md`, and task-specific plans

Do not resolve conflicts involving schema, authorization, or secrets by guessing. Stop and ask for clarification when the verified implementation and the requested behavior cannot both be preserved safely.
