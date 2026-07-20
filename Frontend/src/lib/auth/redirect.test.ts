import assert from "node:assert/strict";
import test from "node:test";
import { safeAuthRedirect } from "./redirect.ts";

test("auth redirects accept only allowlisted internal paths", () => {
  assert.equal(safeAuthRedirect("/dashboard"), "/dashboard");
  assert.equal(safeAuthRedirect("/settings/integrations"), "/settings/integrations");
  assert.equal(safeAuthRedirect(`/invitations/${"a".repeat(64)}`), `/invitations/${"a".repeat(64)}`);
  assert.equal(safeAuthRedirect("/invitations/not-a-token"), "/projects");
  assert.equal(safeAuthRedirect("https://evil.example"), "/projects");
  assert.equal(safeAuthRedirect("//evil.example"), "/projects");
  assert.equal(safeAuthRedirect("/dashboard:https"), "/projects");
  assert.equal(safeAuthRedirect("/unapproved"), "/projects");
});
