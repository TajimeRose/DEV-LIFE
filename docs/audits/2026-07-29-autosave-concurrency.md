# Autosave Concurrency Proposal

This document describes the current implementation and proposes database-backed options. No migration is applied by this document.

## Current State

### Notes

- Notes use local dirty state and a one-second debounce after editing.
- A save uses the selected note snapshot and updates local state only when the response still matches the snapshot being saved.
- Realtime refresh is ignored while the note is dirty, reducing remote data from replacing local edits.
- A pending transition prevents another save from starting in the same editor.
- Multiple tabs and multiple users are not database-protected. The effective behavior is last write wins.

### Flowchart

- Flowchart changes use a one-second debounce.
- The editor has an in-flight save guard and a queued-save marker.
- If a change occurs while a save is in flight, the next save is scheduled after the current request completes and the latest React state is observed.
- Realtime refresh is ignored unless the local save status is `saved`.
- There is no database revision/precondition in the current schema.
- Multiple tabs/users can still overwrite each other. The effective database behavior is last write wins.

## Race Scenario

If request A starts first, request B starts later, B completes first, and A completes last, current database behavior can still leave A's older payload as the final value. The single-editor Flowchart guard prevents A and B from being sent concurrently by that editor, but it cannot coordinate another tab or user. Notes have a stale-response UI guard, but no database conflict protection.

## Data Loss Scenarios

- Two browser tabs edit the same Note or Flowchart.
- Two project members edit the same entity at nearly the same time.
- A browser loses connectivity after local changes but before the queued save completes.
- A realtime refresh arrives after a save and before local dirty state is reconciled.

## Option A: `updated_at` Preconditions

- Migration: no new column required if the current `updated_at` value is reliable; otherwise add/standardize trigger behavior.
- API: client sends the last observed `updated_at`; update uses `WHERE id = ? AND updated_at = ?` and returns conflict when zero rows update.
- UX: show "มีคนอื่นแก้ข้อมูลนี้แล้ว" with reload/keep-local choices.
- Complexity: medium.
- Rollback: remove the precondition from the update path; no data rollback required.
- Supabase compatibility: good with filtered updates and `.select()`, but exact zero-row/conflict handling must be tested against deployed PostgREST behavior.
- Fit: good first option for Notes and Flowcharts when timestamp precision and update triggers are trustworthy.

## Option B: Integer Revision

- Migration: add `revision integer not null default 0` to Notes and/or Flowcharts, plus an update convention or trigger.
- API: client sends revision; update uses `WHERE id = ? AND revision = ?`, increments revision, and returns the new revision.
- UX: explicit conflict state with reload/overwrite decision.
- Complexity: medium-high.
- Rollback: deploy code that ignores revision, then remove the column only after all clients are compatible; dropping the column is a separate destructive schema operation and should not be automatic.
- Supabase compatibility: strong and explicit; requires migration, generated type updates, and coordinated clients.
- Fit: best for Flowcharts with large JSON payloads and Notes with frequent autosaves.

## Option C: Append-only Versions

- Migration: add a write/version table or extend the existing versions model with immutable current snapshots and conflict metadata.
- API: writes append versions; a server resolver chooses the current version and exposes history/conflict state.
- UX: compare and merge versions instead of silently overwriting.
- Complexity: high.
- Rollback: stop appending new versions and continue reading the prior current representation; cleanup requires a separate data migration.
- Supabase compatibility: possible, but requires transactional functions/RPC or carefully coordinated writes.
- Fit: strongest for Notes; Flowcharts are harder because node/edge-level merge semantics are complex.

## Recommendation

Use Option A as the smallest first step for Notes and Flowcharts. If conflicts or timestamp precision become operational problems, move to Option B. Option C is appropriate only when product requirements demand conflict history and merge UX. No option should be applied without remote schema/RLS verification and an approved migration.
