import assert from "node:assert/strict";
import test from "node:test";
import { canEditProject, canManageTeam, normalizeProjectRole } from "./permissions.ts";

test("project roles map to collaboration permissions", () => {
  assert.equal(canEditProject("owner"), true);
  assert.equal(canEditProject("maintainer"), true);
  assert.equal(canEditProject("developer"), true);
  assert.equal(canEditProject("reviewer"), false);
  assert.equal(canEditProject("viewer"), false);
  assert.equal(canManageTeam("owner"), true);
  assert.equal(canManageTeam("maintainer"), false);
});

test("unknown project roles fail closed as viewer", () => {
  assert.equal(normalizeProjectRole("unexpected"), "viewer");
  assert.equal(canEditProject("unexpected"), false);
  assert.equal(canManageTeam("unexpected"), false);
});
