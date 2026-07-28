# Runtime, Permission, and Configuration Audit

## Permission Matrix From Current Source

| Action | Owner | Maintainer | Read-only (`reviewer`/`viewer`) |
| --- | ---: | ---: | ---: |
| View project | Yes | Yes | Yes |
| Rename project | Yes | No, owner-only query in `data.ts`; product decision remains open | No |
| Update project | Yes | No, owner-only query in `data.ts`; product decision remains open | No |
| Delete project | Yes | No, `ownProject` is owner-only | No |
| Create task | Yes | Yes | No |
| Edit task | Yes | Yes | No |
| Edit notes | Yes | Yes | No |
| Edit flowchart | Yes | Yes | No |
| Manage members | Yes | No, `ownerContext` is owner-only | No |
| Connect repository | Yes, project authorization permits access | Yes, project authorization permits access | No server-side edit check is currently visible in the repository connection route; requires product/security decision and focused authorization verification |
| Run GitHub sync | Yes, project authorization permits access | Yes, project authorization permits access | No server-side edit check is currently visible in the sync route; requires product/security decision and focused authorization verification |

### Evidence

- `canEditProject()` grants `owner`, `maintainer`, and `developer` write access for task/note/flowchart actions.
- `canManageTeam()` grants only `owner` team management.
- Project update/delete use owner filters and `ownProject()`.
- Repository connect/sync routes call `authorizeProjectAccess()` but do not call `canEditProject()` in the inspected source.
- Therefore maintainer rename/delete behavior is not changed or inferred. It remains a product decision, while repository write permissions need explicit confirmation and likely a server-side role check.

## Environment Boundary

Verified from source:

- `GITHUB_TOKEN_ENCRYPTION_KEY` is server-only because token vault imports `server-only`.
- Token key validation requires exactly 64 hexadecimal characters in `token-crypto.ts`.
- GitHub provider token is stored in an HTTP-only cookie and is not returned in API response models.
- Public variables are limited to Supabase URL/anon key and site URL in `.env.example`.
- Production callback URL is derived from `NEXT_PUBLIC_SITE_URL`.

Verified from local process without printing values:

- All requested environment variable names were absent from the shell environment.
- This does not inspect or expose `.env.local` values.

Requires administrator action:

- Configure production Supabase URL, anon key, and site URL.
- Configure a valid 64-character hexadecimal GitHub encryption key.
- Verify GitHub/Supabase OAuth callback allowlists match the production origin.
- Confirm preview deployments do not use localhost as their callback origin.

## Browser Test Boundary

Playwright is not installed and no browser test harness exists in the current project. No browser viewport result is claimed. Adding Playwright requires an explicit dependency installation and browser binary setup, which was not performed in this audit because it would change dependency state without a validated CI/runtime plan.
