# Next.js Client Hydration Recovery Design

## Problem

Interactive controls on the workspace do not respond. Submitting the create-project form produces `GET /dashboard?` instead of a Next.js Server Action `POST`, so `createProject()` is never called and Supabase is never reached. The browser also reports failed connections to `/_next/webpack-hmr`.

## Root cause

The Supabase session proxy matcher excludes selected static asset paths but still matches other Next.js internal paths, including `/_next/webpack-hmr`. Internal framework traffic must bypass the authentication proxy.

## Design

Change the proxy matcher to exclude the entire `/_next/` namespace while continuing to run for application routes. Do not change the Supabase schema, RLS policies, or project data actions.

Keep the create-project flow unchanged for this minimal fix. The form must remain hydrated and call the existing `createProject()` Server Action, after which the current page reload reads the new project.

## Verification

- Add a regression check showing the matcher does not match `/_next/webpack-hmr` and does match `/dashboard`.
- Run ESLint, TypeScript, and the production build.
- Restart the development server and hard-refresh the browser.
- Confirm Search opens its modal.
- Confirm creating a project sends `POST /dashboard`, writes a `projects` row, and displays the project workspace.

## Non-goals

- Database schema or RLS changes
- Feature completion work unrelated to project creation
- Refactoring other workspace components
