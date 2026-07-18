import assert from "node:assert/strict";
import test from "node:test";
import type { Tables } from "@/lib/database.types";
import { ProjectAccessError } from "../projects/authorization.ts";
import {
  handleProjectRepositoriesGet,
  handleProjectRepositoriesPost,
  type RepositoryConnectionDependencies,
} from "./repository-connections-handler.ts";

const connected = {
  id: "repository-id",
  project_id: "project-id",
  connected_by: "user-id",
  github_repository_id: 42,
  github_owner: "team",
  github_name: "repo",
  github_full_name: "team/repo",
  github_url: "https://github.com/team/repo",
  default_branch: "main",
  visibility: "public",
  is_private: false,
  is_archived: false,
  sync_status: "idle",
  last_synced_at: null,
  sync_error: null,
  created_at: "2026-07-18T00:00:00Z",
  updated_at: "2026-07-18T00:00:00Z",
} satisfies Tables<"project_repositories">;

const githubRepository = {
  id: 42,
  nodeId: "R_42",
  name: "repo",
  fullName: "team/repo",
  ownerLogin: "team",
  ownerAvatarUrl: null,
  description: null,
  htmlUrl: "https://github.com/team/repo",
  private: false,
  fork: false,
  archived: false,
  disabled: false,
  visibility: "public" as const,
  defaultBranch: "main",
  language: "TypeScript",
  stargazersCount: 0,
  forksCount: 0,
  openIssuesCount: 0,
  createdAt: "2026-07-18T00:00:00Z",
  updatedAt: "2026-07-18T00:00:00Z",
  pushedAt: null,
};

function dependencies(overrides: Partial<RepositoryConnectionDependencies> = {}) {
  let persisted: Tables<"project_repositories">[] = [];
  const value: RepositoryConnectionDependencies & { persisted: typeof persisted } = {
    authenticate: async () => ({ userId: "user-id" }),
    authorize: async () => {},
    list: async () => persisted,
    findDuplicate: async (_projectId, repositoryId) => persisted.find(item => item.github_repository_id === repositoryId) ?? null,
    readGitHubRepository: async () => githubRepository,
    insert: async () => {
      persisted = [connected];
      value.persisted = persisted;
      return connected;
    },
    recordConnection: async () => {},
    persisted,
    ...overrides,
  };
  return value;
}

function connectRequest() {
  return new Request("https://app.test/api/projects/project-id/repositories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ githubRepositoryId: 42 }),
  });
}

test("authorized members can persist and list a repository connection", async () => {
  const deps = dependencies();
  const connect = await handleProjectRepositoriesPost(connectRequest(), "project-id", deps);
  assert.equal(connect.status, 201);
  assert.equal(deps.persisted.length, 1);
  const list = await handleProjectRepositoriesGet("project-id", deps);
  assert.equal(list.status, 200);
  assert.equal((await list.json()).data.repositories[0].github_full_name, "team/repo");
});

test("non-members are rejected before repository data is read", async () => {
  let githubRead = false;
  const response = await handleProjectRepositoriesPost(connectRequest(), "project-id", dependencies({
    authorize: async () => { throw new ProjectAccessError(403, "denied"); },
    readGitHubRepository: async () => { githubRead = true; return githubRepository; },
  }));
  assert.equal(response.status, 403);
  assert.equal(githubRead, false);
});

test("duplicate repository connections return a controlled conflict", async () => {
  const response = await handleProjectRepositoriesPost(connectRequest(), "project-id", dependencies({
    findDuplicate: async () => connected,
  }));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, "DUPLICATE_REPOSITORY");
});

test("repository connection responses never include GitHub secrets", async () => {
  const response = await handleProjectRepositoriesPost(connectRequest(), "project-id", dependencies());
  const body = await response.text();
  assert.equal(body.includes("server-only-token"), false);
  assert.equal(body.includes("GITHUB_TOKEN_ENCRYPTION_KEY"), false);
});
