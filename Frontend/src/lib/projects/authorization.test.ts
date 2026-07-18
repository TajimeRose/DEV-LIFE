import assert from "node:assert/strict";
import test from "node:test";
import {
  ProjectAccessError,
  verifyProjectAccess,
  type ProjectAccessDependencies,
} from "./authorization.ts";

function dependencies(member: { id: string; role: string } | null): ProjectAccessDependencies {
  return {
    findProject: async projectId => ({ id: projectId, user_id: "owner-id" }),
    findMembership: async () => member,
  };
}

test("project owners and members are authorized", async () => {
  assert.equal((await verifyProjectAccess("project-id", "owner-id", dependencies(null))).role, "owner");
  assert.equal((await verifyProjectAccess("project-id", "member-id", dependencies({ id: "membership-id", role: "developer" }))).role, "developer");
});

test("non-members and unauthenticated users are rejected", async () => {
  await assert.rejects(
    verifyProjectAccess("project-id", "other-user", dependencies(null)),
    error => error instanceof ProjectAccessError && error.status === 403,
  );
  await assert.rejects(
    verifyProjectAccess("project-id", null, dependencies(null)),
    error => error instanceof ProjectAccessError && error.status === 401,
  );
});
