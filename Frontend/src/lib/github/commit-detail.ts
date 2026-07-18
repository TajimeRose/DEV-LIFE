import { z } from "zod";
import {
  GITHUB_API_ORIGIN,
  GITHUB_API_VERSION,
  GITHUB_REQUEST_TIMEOUT_MS,
} from "./config.ts";
import { GitHubClientError } from "./client.ts";

const commitFileSchema = z.object({
  filename: z.string().min(1).max(4096),
  previous_filename: z.string().min(1).max(4096).optional(),
  status: z.string().min(1).max(50),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  changes: z.number().int().nonnegative(),
  blob_url: z.string().url().nullable(),
  patch: z.string().optional(),
});

const commitDetailSchema = z.object({
  sha: z.string().min(7),
  stats: z.object({
    additions: z.number().int().nonnegative(),
    deletions: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
  files: z.array(commitFileSchema).max(100),
});

export type GitHubCommitDetail = {
  sha: string;
  stats: {
    additions: number;
    deletions: number;
    total: number;
    filesChanged: number;
  };
  files: Array<{
    filename: string;
    previousFilename: string | null;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    blobUrl: string | null;
    patch: string | null;
    patchTruncated: boolean;
  }>;
};

type GitHubFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
const MAX_PATCH_LENGTH = 50_000;

function responseError(response: Response) {
  if (response.status === 401) return new GitHubClientError("auth");
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    return new GitHubClientError("rate_limit");
  }
  if (response.status === 403) return new GitHubClientError("permission");
  if (response.status === 404) return new GitHubClientError("not_found");
  if (response.status >= 500 || (response.status >= 300 && response.status < 400)) {
    return new GitHubClientError("unavailable");
  }
  return new GitHubClientError("invalid_response");
}

export async function fetchGitHubCommitDetail(
  token: string,
  owner: string,
  name: string,
  sha: string,
  fetcher: GitHubFetch = fetch,
  timeoutMs = GITHUB_REQUEST_TIMEOUT_MS,
): Promise<GitHubCommitDetail> {
  const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits/${encodeURIComponent(sha)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(new URL(path, GITHUB_API_ORIGIN), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "DEV-LIFE",
      },
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    if (!response.ok) throw responseError(response);

    let parsed: z.infer<typeof commitDetailSchema>;
    try {
      parsed = commitDetailSchema.parse(await response.json());
    } catch {
      throw new GitHubClientError("invalid_response");
    }

    return {
      sha: parsed.sha,
      stats: {
        ...parsed.stats,
        filesChanged: parsed.files.length,
      },
      files: parsed.files.map(file => ({
        filename: file.filename,
        previousFilename: file.previous_filename ?? null,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        blobUrl: file.blob_url,
        patch: file.patch?.slice(0, MAX_PATCH_LENGTH) ?? null,
        patchTruncated: (file.patch?.length ?? 0) > MAX_PATCH_LENGTH,
      })),
    };
  } catch (error) {
    if (error instanceof GitHubClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GitHubClientError("timeout");
    }
    throw new GitHubClientError("unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
