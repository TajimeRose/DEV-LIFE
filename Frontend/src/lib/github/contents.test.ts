import assert from "node:assert/strict";
import test from "node:test";
import { GitHubClientError } from "./client.ts";
import {
  fetchGitHubContents,
  GitHubContentsValidationError,
  normalizeGitHubContents,
  normalizeGitHubPath,
  validateGitHubRef,
} from "./contents.ts";

const sha = "abcdef1234567890";

test("contents client uses a fixed-origin GET and returns an allowlisted root directory", async () => {
  const result = await fetchGitHubContents("secret-token", "team", "repo", "", "main", async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.github.com");
    assert.equal(url.pathname, "/repos/team/repo/contents");
    assert.equal(url.searchParams.get("ref"), "main");
    assert.equal(init?.method, "GET");
    assert.equal(init?.redirect, "manual");
    assert.equal(init?.cache, "no-store");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer secret-token");
    return Response.json([{
      name: "ReadMe.MD",
      path: "ReadMe.MD",
      sha,
      size: 12,
      html_url: "https://github.com/team/repo/blob/main/ReadMe.MD",
      type: "file",
      download_url: "https://raw.githubusercontent.com/team/repo/main/ReadMe.MD",
      private_field: "must-not-leak",
    }]);
  });

  assert.equal(result.type, "directory");
  assert.deepEqual(result.readme, { name: "ReadMe.MD", path: "ReadMe.MD" });
  assert.equal(JSON.stringify(result).includes("raw.githubusercontent.com"), false);
  assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
  assert.equal(JSON.stringify(result).includes("secret-token"), false);
});

test("contents client encodes each validated path segment without changing the API origin", async () => {
  await fetchGitHubContents("token", "team", "repo", "docs/file name.md", "release/v1", async input => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.github.com");
    assert.equal(url.pathname, "/repos/team/repo/contents/docs/file%20name.md");
    assert.equal(url.searchParams.get("ref"), "release/v1");
    const content = Buffer.from("# Safe\n", "utf8");
    return Response.json({
      name: "file name.md",
      path: "docs/file name.md",
      sha,
      size: content.length,
      html_url: null,
      type: "file",
      encoding: "base64",
      content: content.toString("base64"),
    });
  });
});

test("contents normalization distinguishes markdown, images, and binary files", () => {
  const markdown = Buffer.from("# Heading\n", "utf8");
  const normalizedMarkdown = normalizeGitHubContents({
    name: "README.md",
    path: "README.md",
    sha,
    size: markdown.length,
    html_url: null,
    type: "file",
    encoding: "base64",
    content: markdown.toString("base64"),
  }, "README.md", "main");
  assert.equal(normalizedMarkdown.type, "file");
  assert.equal(normalizedMarkdown.kind, "markdown");
  assert.equal(normalizedMarkdown.content, "# Heading\n");

  const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const normalizedImage = normalizeGitHubContents({
    name: "logo.png",
    path: "logo.png",
    sha,
    size: image.length,
    html_url: null,
    type: "file",
    encoding: "base64",
    content: image.toString("base64"),
  }, "logo.png", "main");
  assert.equal(normalizedImage.type, "file");
  assert.equal(normalizedImage.kind, "image");
  assert.equal(normalizedImage.mediaType, "image/png");
  assert.equal(normalizedImage.content, null);

  const fakeImage = Buffer.from("not an image", "utf8");
  const normalizedFakeImage = normalizeGitHubContents({
    name: "fake.png",
    path: "fake.png",
    sha,
    size: fakeImage.length,
    html_url: "https://evil.example/fake.png",
    type: "file",
    encoding: "base64",
    content: fakeImage.toString("base64"),
  }, "fake.png", "main");
  assert.equal(normalizedFakeImage.type, "file");
  assert.equal(normalizedFakeImage.kind, "binary");
  assert.equal(normalizedFakeImage.htmlUrl, null);

  const binary = Buffer.from([0, 1, 2, 3]);
  const normalizedBinary = normalizeGitHubContents({
    name: "archive.bin",
    path: "archive.bin",
    sha,
    size: binary.length,
    html_url: null,
    type: "file",
    encoding: "base64",
    content: binary.toString("base64"),
  }, "archive.bin", "main");
  assert.equal(normalizedBinary.type, "file");
  assert.equal(normalizedBinary.kind, "binary");
  assert.equal(normalizedBinary.content, null);
  assert.equal(normalizedBinary.contentBase64, null);
});

test("contents validation rejects traversal, unsafe refs, oversized files, and malformed responses", async () => {
  for (const path of ["../secret", "/absolute", "docs//file", "docs\\file", "docs/"]) {
    assert.throws(() => normalizeGitHubPath(path), GitHubContentsValidationError);
  }
  for (const ref of ["", "../main", "refs/heads/main.lock", "main~1", "main@{1}", "/main", "-unsafe"]) {
    assert.equal(validateGitHubRef(ref), false, ref);
  }
  assert.equal(validateGitHubRef("feature/safe-name"), true);

  await assert.rejects(
    fetchGitHubContents("token", "team", "repo", "../secret", "main", async () => {
      throw new Error("fetch must not run");
    }),
    GitHubContentsValidationError,
  );

  assert.throws(() => normalizeGitHubContents([{
    name: "safe.txt",
    path: "../safe.txt",
    sha,
    size: 1,
    html_url: null,
    type: "file",
  }], "", "main"), error => error instanceof GitHubClientError && error.kind === "invalid_response");

  assert.throws(() => normalizeGitHubContents({
    name: "large.txt",
    path: "large.txt",
    sha,
    size: 1_000_001,
    html_url: null,
    type: "file",
    encoding: "base64",
    content: "",
  }, "large.txt", "main"), error => error instanceof GitHubContentsValidationError && error.message === "file_too_large");

  await assert.rejects(
    fetchGitHubContents("token", "team", "repo", "file.txt", "main", async () => Response.json({ token: "upstream-secret" })),
    error => error instanceof GitHubClientError && error.kind === "invalid_response",
  );
});

test("contents client rejects redirects and maps aborted requests to timeout", async () => {
  await assert.rejects(
    fetchGitHubContents("token", "team", "repo", "", "main", async () => new Response(null, {
      status: 302,
      headers: { location: "https://evil.example/steal" },
    })),
    error => error instanceof GitHubClientError && error.kind === "unavailable",
  );

  await assert.rejects(
    fetchGitHubContents("token", "team", "repo", "", "main", (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }), 1),
    error => error instanceof GitHubClientError && error.kind === "timeout",
  );
});
