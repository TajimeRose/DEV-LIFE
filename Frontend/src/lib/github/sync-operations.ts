export type RepositorySyncOperation =
  | "start_log"
  | "mark_syncing"
  | "fetch_snapshot"
  | "persist_snapshot"
  | "record_activity"
  | "finalize_log"
  | "finalize_repository"
  | "record_completion"
  | "record_failure";

export type RepositorySyncErrorReporter = (
  operation: RepositorySyncOperation,
  error: unknown,
) => void;

export function reportRepositorySyncError(
  reporter: RepositorySyncErrorReporter,
  operation: RepositorySyncOperation,
  error: unknown,
) {
  try {
    reporter(operation, error);
  } catch {
    // Diagnostics must never interrupt repository synchronization.
  }
}

export async function attemptOptionalSyncOperation<T>(
  operation: RepositorySyncOperation,
  task: () => Promise<T>,
  reporter: RepositorySyncErrorReporter,
): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await task() };
  } catch (error) {
    reportRepositorySyncError(reporter, operation, error);
    return { ok: false };
  }
}
