import assert from "node:assert/strict";
import test from "node:test";
import { SafeAppError, logInternalError, safeError, toSafeError } from "./errors.ts";

test("safe errors expose only controlled codes and messages", () => {
  const error = toSafeError(new Error("relation private_table does not exist"), "DATABASE_UNAVAILABLE");
  assert.equal(error.code, "DATABASE_UNAVAILABLE");
  assert.equal(error.message, "ระบบข้อมูลไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง");
  assert.doesNotMatch(error.message, /private_table|relation/);
});

test("existing safe errors are preserved", () => {
  const error = safeError("PERMISSION_DENIED", "อ่านอย่างเดียว");
  assert.ok(error instanceof SafeAppError);
  assert.equal(toSafeError(error), error);
});

test("diagnostic logging does not print raw error messages", () => {
  const original = console.error;
  let output = "";
  console.error = (...args: unknown[]) => { output = JSON.stringify(args); };
  try {
    logInternalError("test", new Error("secret token and private_table"));
  } finally {
    console.error = original;
  }
  assert.doesNotMatch(output, /secret token|private_table/);
  assert.match(output, /test/);
});
