import { Buffer } from "node:buffer";
import { z } from "zod";
import {
  GITHUB_API_ORIGIN,
  GITHUB_API_VERSION,
  GITHUB_REQUEST_TIMEOUT_MS,
} from "./config.ts";
import { GitHubClientError } from "./client.ts";

export const MAX_GITHUB_FILE_SIZE = 1_000_000;
const MAX_DIRECTORY_ENTRIES = 1_000;
const MAX_ENCODED_CONTENT_LENGTH = Math.ceil(MAX_GITHUB_FILE_SIZE / 3) * 4 + 16;

const common = {
  name: z.string().min(1).max(255),
  path: z.string().min(1).max(1024),
  sha: z.string().regex(/^[a-f0-9]{7,64}$/i),
  size: z.number().int().nonnegative(),
  html_url: z.string().url().nullable(),
};

const directoryEntrySchema = z.object({
  ...common,
  type: z.enum(["file", "dir", "symlink", "submodule"]),
});

const fileSchema = z.object({
  ...common,
  type: z.literal("file"),
  encoding: z.literal("base64"),
  content: z.string().max(MAX_ENCODED_CONTENT_LENGTH),
});

const fileMetadataSchema = z.object({
  type: z.literal("file"),
  size: z.number().int().nonnegative(),
});

const imageMediaTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const markdownExtensions = new Set([".md", ".markdown", ".mdown", ".mkd"]);

export type NormalizedGitHubContents =
  | {
      type: "directory";
      path: string;
      ref: string;
      entries: Array<{
        name: string;
        path: string;
        type: "file" | "directory" | "symlink" | "submodule";
        size: number;
        sha: string;
        htmlUrl: string | null;
      }>;
      readme: { name: string; path: string } | null;
    }
  | {
      type: "file";
      path: string;
      name: string;
      ref: string;
      sha: string;
      size: number;
      htmlUrl: string | null;
      kind: "text" | "markdown" | "image" | "binary";
      mediaType: string | null;
      content: string | null;
      contentBase64: string | null;
    };

type GitHubFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class GitHubContentsValidationError extends Error {}

function extension(name: string) {
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index).toLowerCase();
}

function safeGitHubHtmlUrl(input: string | null) {
  if (!input) return null;
  const url = new URL(input);
  return url.protocol === "https:" && url.hostname === "github.com" ? url.toString() : null;
}

export function validateGitHubRef(input: string) {
  if (input.length < 1 || input.length > 255 || input.startsWith("/") || input.endsWith("/") || input.startsWith("-")) return false;
  if (/\.\.|@\{|[\u0000-\u0020~^:?*\[\\]/.test(input)) return false;
  return input.split("/").every(part => part.length > 0 && part !== "." && part !== ".." && !part.startsWith(".") && !part.endsWith(".") && !part.endsWith(".lock"));
}

export function normalizeGitHubPath(input: string) {
  if (input === "") return "";
  if (input.length > 1024 || input.startsWith("/") || input.endsWith("/") || /[\\\u0000-\u001f\u007f]/.test(input)) {
    throw new GitHubContentsValidationError();
  }
  const parts = input.split("/");
  if (parts.some(part => !part || part === "." || part === ".." || part.length > 255)) {
    throw new GitHubContentsValidationError();
  }
  return parts.join("/");
}

function decodeBase64(value: string) {
  const compact = value.replace(/\s/g, "");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) {
    throw new GitHubClientError("invalid_response");
  }
  return Buffer.from(compact, "base64");
}

function isBinary(bytes: Buffer) {
  const sample = bytes.subarray(0, Math.min(bytes.length, 8_000));
  if (sample.includes(0)) return true;
  let suspicious = 0;
  for (const byte of sample) {
    if (byte < 7 || (byte > 13 && byte < 32)) suspicious += 1;
  }
  if (sample.length > 0 && suspicious / sample.length > 0.1) return true;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return false;
  } catch {
    return true;
  }
}

function imageMediaType(name: string, bytes: Buffer) {
  const suffix = extension(name);
  const configured = imageMediaTypes[suffix];
  if (!configured) return null;
  const valid = suffix === ".png"
    ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : suffix === ".jpg" || suffix === ".jpeg"
      ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : suffix === ".gif"
        ? bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a"
        : suffix === ".webp"
          ? bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"
          : bytes.subarray(4, 12).toString("ascii") === "ftypavif" || bytes.subarray(4, 12).toString("ascii") === "ftypavis";
  return valid ? configured : null;
}

export function normalizeGitHubContents(input: unknown, path: string, ref: string): NormalizedGitHubContents {
  if (Array.isArray(input)) {
    let parsed: z.infer<typeof directoryEntrySchema>[];
    try {
      parsed = z.array(directoryEntrySchema).max(MAX_DIRECTORY_ENTRIES).parse(input);
    } catch {
      throw new GitHubClientError("invalid_response");
    }
    const entries = parsed.map(item => {
      let itemPath: string;
      try {
        itemPath = normalizeGitHubPath(item.path);
      } catch {
        throw new GitHubClientError("invalid_response");
      }
      const expectedPath = path ? `${path}/${item.name}` : item.name;
      if (itemPath !== expectedPath || item.name.includes("/") || item.name.includes("\\")) {
        throw new GitHubClientError("invalid_response");
      }
      return {
        name: item.name,
        path: itemPath,
        type: item.type === "dir" ? "directory" as const : item.type,
        size: item.size,
        sha: item.sha,
        htmlUrl: safeGitHubHtmlUrl(item.html_url),
      };
    });
    const readmeEntry = path === ""
      ? entries.find(item => item.type === "file" && /^readme(?:\.[^/]*)?$/i.test(item.name))
      : undefined;
    return {
      type: "directory",
      path,
      ref,
      entries,
      readme: readmeEntry ? { name: readmeEntry.name, path: readmeEntry.path } : null,
    };
  }

  const metadata = fileMetadataSchema.safeParse(input);
  if (metadata.success && metadata.data.size > MAX_GITHUB_FILE_SIZE) {
    throw new GitHubContentsValidationError("file_too_large");
  }
  let file: z.infer<typeof fileSchema>;
  try {
    file = fileSchema.parse(input);
  } catch {
    throw new GitHubClientError("invalid_response");
  }
  let filePath: string;
  try {
    filePath = normalizeGitHubPath(file.path);
  } catch {
    throw new GitHubClientError("invalid_response");
  }
  if (filePath !== path || file.name !== path.split("/").at(-1)) {
    throw new GitHubClientError("invalid_response");
  }
  const bytes = decodeBase64(file.content);
  if (bytes.length !== file.size || bytes.length > MAX_GITHUB_FILE_SIZE) {
    throw new GitHubClientError("invalid_response");
  }

  const suffix = extension(file.name);
  const declaredImage = suffix in imageMediaTypes;
  const mediaType = imageMediaType(file.name, bytes);
  const binary = isBinary(bytes);
  const kind = mediaType ? "image" : markdownExtensions.has(suffix) ? "markdown" : binary || declaredImage ? "binary" : "text";
  return {
    type: "file",
    path: filePath,
    name: file.name,
    ref,
    sha: file.sha,
    size: file.size,
    htmlUrl: safeGitHubHtmlUrl(file.html_url),
    kind,
    mediaType,
    content: kind === "text" || kind === "markdown" ? bytes.toString("utf8") : null,
    contentBase64: kind === "image" ? bytes.toString("base64") : null,
  };
}

function responseError(response: Response) {
  if (response.status === 401) return new GitHubClientError("auth");
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") return new GitHubClientError("rate_limit");
  if (response.status === 403) return new GitHubClientError("permission");
  if (response.status === 404) return new GitHubClientError("not_found");
  if (response.status >= 500 || (response.status >= 300 && response.status < 400)) return new GitHubClientError("unavailable");
  return new GitHubClientError("invalid_response");
}

export async function fetchGitHubContents(
  token: string,
  owner: string,
  repository: string,
  path: string,
  ref: string,
  fetcher: GitHubFetch = fetch,
  timeoutMs = GITHUB_REQUEST_TIMEOUT_MS,
) {
  if (!validateGitHubRef(ref)) throw new GitHubContentsValidationError();
  const normalizedPath = normalizeGitHubPath(path);
  const encodedPath = normalizedPath.split("/").map(encodeURIComponent).join("/");
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents`;
  const url = new URL(encodedPath ? `${base}/${encodedPath}` : base, GITHUB_API_ORIGIN);
  url.searchParams.set("ref", ref);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
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
    let input: unknown;
    try {
      input = await response.json();
    } catch {
      throw new GitHubClientError("invalid_response");
    }
    return normalizeGitHubContents(input, normalizedPath, ref);
  } catch (cause) {
    if (cause instanceof GitHubClientError || cause instanceof GitHubContentsValidationError) throw cause;
    if (cause instanceof DOMException && cause.name === "AbortError") throw new GitHubClientError("timeout");
    throw new GitHubClientError("unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
