import assert from "node:assert/strict";
import test from "node:test";
import {
  parseMarkdown,
  repositoryGitHubPathUrl,
  repositoryTab,
  resolveMarkdownUrl,
  safeGitHubAvatarUrl,
  safeGitHubUrl,
  safeMarkdownUrl,
  tokenizeSourceLine,
} from "./repository-workspace.ts";

test("repository tabs fall back to Overview", () => {
  assert.equal(repositoryTab("pull-requests"), "pull-requests");
  assert.equal(repositoryTab("unknown"), "overview");
  assert.equal(repositoryTab(null), "overview");
});

test("Markdown URLs allow safe protocols and reject relative, script, and image HTTP URLs", () => {
  assert.equal(safeMarkdownUrl("javascript:alert(1)"), null);
  assert.equal(safeMarkdownUrl("../private"), null);
  assert.equal(safeMarkdownUrl("http://example.com/image.png", "image"), null);
  assert.equal(safeMarkdownUrl("https://example.com/image.png", "image"), "https://example.com/image.png");
  assert.equal(safeMarkdownUrl("mailto:dev@example.com"), "mailto:dev@example.com");
});

test("Markdown parser keeps raw HTML as inert paragraph text and parses useful blocks", () => {
  const blocks = parseMarkdown("# Title\n\n- one\n- two\n\n```ts\nconst safe = true;\n```\n\n<script>alert(1)</script>");
  assert.deepEqual(blocks.map(block => block.type), ["heading", "list", "code", "paragraph"]);
  const finalBlock = blocks.at(-1);
  assert.equal(finalBlock?.type === "paragraph" ? finalBlock.text : undefined, "<script>alert(1)</script>");
});

test("source tokenizer identifies common tokens without changing source text", () => {
  const source = "const answer = 42; // value";
  const tokens = tokenizeSourceLine(source);
  assert.equal(tokens.map(token => token.text).join(""), source);
  assert.deepEqual(tokens.filter(token => token.type !== "plain").map(token => token.type), ["keyword", "number", "comment"]);
});

test("repository paths are generated only from trusted GitHub repository URLs", () => {
  assert.equal(repositoryGitHubPathUrl("https://evil.example/team/repo", "src/a b.ts", "feature/x", false), null);
  assert.equal(
    repositoryGitHubPathUrl("https://github.com/team/repo", "src/a b.ts", "feature/x", false),
    "https://github.com/team/repo/blob/feature%2Fx/src/a%20b.ts",
  );
});

test("stored GitHub links and avatars use narrow HTTPS allowlists", () => {
  assert.equal(safeGitHubUrl("https://github.com/team/repo/pull/1"), "https://github.com/team/repo/pull/1");
  assert.equal(safeGitHubUrl("http://github.com/team/repo"), null);
  assert.equal(safeGitHubUrl("https://github.com.evil.test/team/repo"), null);
  assert.equal(safeGitHubAvatarUrl("https://avatars.githubusercontent.com/u/1?v=4"), "https://avatars.githubusercontent.com/u/1?v=4");
  assert.equal(safeGitHubAvatarUrl("https://github.com/images/avatar.png"), "https://github.com/images/avatar.png");
  assert.equal(safeGitHubAvatarUrl("https://raw.githubusercontent.com/team/repo/avatar.png"), null);
});

test("relative Markdown links resolve to trusted GitHub blobs while relative images stay private", () => {
  const context = { repositoryUrl: "https://github.com/team/repo", ref: "feature/x", markdownPath: "docs/README.md" };
  assert.equal(
    resolveMarkdownUrl("../src/main.ts#L4", context),
    "https://github.com/team/repo/blob/feature%2Fx/src/main.ts#L4",
  );
  assert.equal(resolveMarkdownUrl("#usage", context), "#usage");
  assert.equal(resolveMarkdownUrl("../images/private.png", context, "image"), null);
  assert.equal(resolveMarkdownUrl("javascript:alert(1)", context), null);
});
