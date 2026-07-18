import assert from "node:assert/strict";
import test from "node:test";
import { attemptOptionalSyncOperation } from "./sync-operations.ts";

test("optional synchronization metadata failures are reported without stopping the sync", async () => {
  const databaseError = Object.assign(new Error("sync log insert denied"), { code: "42501" });
  const reported: Array<{ operation: string; error: unknown }> = [];

  const result = await attemptOptionalSyncOperation(
    "start_log",
    async () => { throw databaseError; },
    (operation, error) => { reported.push({ operation, error }); },
  );

  assert.deepEqual(result, { ok: false });
  assert.deepEqual(reported, [{ operation: "start_log", error: databaseError }]);
});

test("diagnostic reporter failures do not stop optional synchronization work", async () => {
  const result = await attemptOptionalSyncOperation(
    "record_activity",
    async () => { throw new Error("activity unavailable"); },
    () => { throw new Error("logger unavailable"); },
  );

  assert.deepEqual(result, { ok: false });
});
