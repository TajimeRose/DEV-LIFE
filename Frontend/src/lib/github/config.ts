export const GITHUB_API_ORIGIN = "https://api.github.com";
export const GITHUB_API_VERSION = "2022-11-28";
export const GITHUB_PAGE_SIZE = 50;
export const GITHUB_MAX_PAGE = 10;
export const GITHUB_REQUEST_TIMEOUT_MS = 10_000;

export function githubPrivateReposEnabled() {
  return process.env.GITHUB_PRIVATE_REPOS_ENABLED === "true";
}

export function githubOAuthScopes() {
  return githubPrivateReposEnabled() ? "repo" : undefined;
}
