export const repositoryTabs = ["overview", "code", "commits", "pull-requests", "tasks"] as const;

export type RepositoryTab = typeof repositoryTabs[number];

export function repositoryTab(value: string | null): RepositoryTab {
  return repositoryTabs.includes(value as RepositoryTab) ? value as RepositoryTab : "overview";
}

export function safeMarkdownUrl(value: string, kind: "link" | "image" = "link") {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") return url.toString();
    if (kind === "link" && (url.protocol === "http:" || url.protocol === "mailto:")) return url.toString();
  } catch {
    return null;
  }
  return null;
}

export function safeGitHubUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeGitHubAvatarUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["avatars.githubusercontent.com", "github.com"].includes(url.hostname)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizeRelativePath(markdownPath: string, target: string) {
  const cleanTarget = target.split(/[?#]/, 1)[0];
  const parts = cleanTarget.startsWith("/") ? [] : markdownPath.split("/").slice(0, -1);
  for (const part of cleanTarget.replace(/^\//, "").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
}

export function resolveMarkdownUrl(
  value: string,
  context: { repositoryUrl: string; ref: string; markdownPath: string },
  kind: "link" | "image" = "link",
) {
  const trimmed = value.trim();
  if (kind === "link" && /^#[A-Za-z0-9_.:-]+$/.test(trimmed)) return trimmed;
  const absolute = safeMarkdownUrl(trimmed, kind);
  if (absolute) return absolute;
  if (kind === "image" || /^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) return null;
  const path = normalizeRelativePath(context.markdownPath, trimmed);
  if (path === null) return null;
  const resolved = repositoryGitHubPathUrl(context.repositoryUrl, path, context.ref, false);
  if (!resolved) return null;
  const suffix = trimmed.match(/([?#].*)$/)?.[1] ?? "";
  return `${resolved}${suffix}`;
}

export type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; language: string; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; rows: string[][] };

export function parseMarkdown(source: string) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const fence = line.match(/^\s*```([\w+-]*)\s*$/);
    if (fence) {
      const content: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) content.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language: fence[1], text: content.join("\n") });
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    const list = line.match(/^\s*(?:(\d+)[.)]|[-+*])\s+(.+)$/);
    if (list) {
      const ordered = Boolean(list[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*(?:(\d+)[.)]|[-+*])\s+(.+)$/);
        if (!item || Boolean(item[1]) !== ordered) break;
        items.push(item[2]);
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].startsWith("> ")) quote.push(lines[index++].slice(2));
      blocks.push({ type: "quote", text: quote.join("\n") });
      continue;
    }
    if (line.includes("|") && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) {
      const tableLines = [line];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) tableLines.push(lines[index++]);
      const rows = tableLines.map(row => row.replace(/^\s*\||\|\s*$/g, "").split("|").map(cell => cell.trim()));
      const width = rows[0].length;
      const validRows = rows.filter((row, rowIndex) => rowIndex === 0 || row.length === width);
      blocks.push({ type: "table", rows: validRows });
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s|^\s*```|^\s*(?:(\d+)[.)]|[-+*])\s|^> /.test(lines[index])) {
      paragraph.push(lines[index++]);
    }
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
  }
  return blocks;
}

export type SourceToken = { type: "plain" | "comment" | "string" | "number" | "keyword"; text: string };

const keywords = new Set([
  "async", "await", "break", "case", "class", "const", "continue", "def", "do", "else", "export",
  "extends", "false", "for", "from", "function", "if", "import", "in", "interface", "let", "new", "null",
  "of", "return", "static", "super", "switch", "this", "throw", "true", "try", "type", "undefined", "var",
  "while", "with", "yield",
]);

export function tokenizeSourceLine(line: string): SourceToken[] {
  const tokens: SourceToken[] = [];
  const pattern = /(\/\/.*$|#.*$|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;
  let cursor = 0;
  for (const match of line.matchAll(pattern)) {
    const at = match.index;
    if (at > cursor) tokens.push({ type: "plain", text: line.slice(cursor, at) });
    const text = match[0];
    const type = text.startsWith("//") || text.startsWith("#") || text.startsWith("/*")
      ? "comment"
      : /^["'`]/.test(text)
        ? "string"
        : /^\d/.test(text)
          ? "number"
          : keywords.has(text)
            ? "keyword"
            : "plain";
    tokens.push({ type, text });
    cursor = at + text.length;
  }
  if (cursor < line.length) tokens.push({ type: "plain", text: line.slice(cursor) });
  return tokens;
}

export function repositoryGitHubPathUrl(repositoryUrl: string, path: string, ref: string, directory: boolean) {
  try {
    const safeRepositoryUrl = safeGitHubUrl(repositoryUrl);
    if (!safeRepositoryUrl) return null;
    const base = new URL(safeRepositoryUrl);
    const encodedPath = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
    return `${base.toString().replace(/\/$/, "")}/${directory ? "tree" : "blob"}/${encodeURIComponent(ref)}${encodedPath ? `/${encodedPath}` : ""}`;
  } catch {
    return null;
  }
}
