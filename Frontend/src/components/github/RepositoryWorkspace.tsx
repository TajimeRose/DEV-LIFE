"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, Input, Select } from "@/components/ui";
import type { Tables } from "@/lib/database.types";
import type { NormalizedGitHubContents } from "@/lib/github/contents";
import {
  parseMarkdown,
  repositoryGitHubPathUrl,
  repositoryTab,
  repositoryTabs,
  resolveMarkdownUrl,
  safeGitHubAvatarUrl,
  safeGitHubUrl,
  tokenizeSourceLine,
  type RepositoryTab,
} from "@/lib/github/repository-workspace";
import type { TimelineEvent } from "@/lib/github/timeline";
import { dedupeTimelineEvents, sortTimelineEvents } from "@/lib/github/timeline";
import { isVisibleRepositoryActivity } from "@/lib/github/timeline-view";
import {
  CommitDetail,
  CommitTimelineCard,
  PullRequestDetail,
  PullRequestTimelineCard,
  ReviewTimelineCard,
} from "./RepositoryTimeline";

type ApiError = { error: { code: string; message: string } };
type Pagination = { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
type Branch = Pick<Tables<"repository_branches">, "id" | "branch_name" | "is_default" | "is_protected" | "latest_commit_sha" | "github_url" | "updated_at">;
type LinkedTask = Pick<Tables<"tasks">, "id" | "title" | "status" | "priority" | "task_type" | "assignee_id">;
type Commit = Pick<Tables<"repository_commits">, "id" | "sha" | "short_sha" | "message" | "message_body" | "author_name" | "author_email" | "author_github_login" | "author_avatar_url" | "committer_name" | "committed_at" | "parent_shas" | "github_url" | "verification_status" | "additions" | "deletions" | "files_changed"> & { linkedTasks: LinkedTask[] };
type PullRequest = Pick<Tables<"repository_pull_requests">, "id" | "pull_request_number" | "title" | "description" | "state" | "source_branch" | "target_branch" | "head_sha" | "author_github_login" | "author_avatar_url" | "github_created_at" | "github_updated_at" | "closed_at" | "merged_at" | "merged_by_github_login" | "github_url" | "is_draft" | "is_mergeable" | "has_conflicts" | "review_status" | "reviews_count" | "comments_count" | "commits_count" | "additions" | "deletions" | "changed_files_count" | "updated_at"> & { linkedTasks: LinkedTask[] };
type RepositoryTask = Tables<"tasks">;

type TimelineResponse = { data: { repository: Tables<"project_repositories">; events: TimelineEvent[]; pagination: { page: number; hasMore: boolean } } } | ApiError;
type BranchesResponse = { data: { branches: Branch[]; total: number } } | ApiError;
type CommitsResponse = { data: { commits: Commit[]; pagination: Pagination } } | ApiError;
type PullRequestsResponse = { data: { pullRequests: PullRequest[]; synchronizedReviewTotal: number; pagination: Pagination } } | ApiError;
type TasksResponse = { data: { tasks: RepositoryTask[]; total: number } } | ApiError;
type ContentsResponse = { data: NormalizedGitHubContents } | ApiError;
type SyncResponse = { data: { branchesProcessed: number; commitsProcessed: number; pullRequestsProcessed: number } } | ApiError;
type OverviewData = {
  commits: Commit[];
  commitTotal: number;
  pullRequests: PullRequest[];
  pullRequestTotal: number;
  reviewTotal: number;
};

type MarkdownContext = { repositoryUrl: string; ref: string; markdownPath: string };

const tabLabels: Record<RepositoryTab, string> = {
  overview: "Overview",
  code: "Code",
  commits: "Commits",
  "pull-requests": "Pull Requests",
  tasks: "Tasks",
};

function isError(value: object): value is ApiError {
  return "error" in value;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }) : "Unavailable";
}

function relativeDate(value: string | null | undefined) {
  if (!value) return "time unavailable";
  const seconds = Math.round((Date.parse(value) - Date.now()) / 1000);
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [["year", 31_536_000], ["month", 2_592_000], ["day", 86_400], ["hour", 3_600], ["minute", 60]];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of ranges) if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  return formatter.format(seconds, "second");
}

function safeSyncError(value: string | null) {
  if (!value) return null;
  if (["GitHub synchronization failed.", "Repository synchronization failed."].includes(value)) return value;
  return "The last repository synchronization failed. Retry to refresh the synchronized data.";
}

function errorGuidance(code: string) {
  if (["UNAUTHENTICATED", "GITHUB_NOT_CONNECTED"].includes(code)) return "Sign in or reconnect GitHub from Integrations, then try again.";
  if (["UNAUTHORIZED", "GITHUB_FORBIDDEN"].includes(code)) return "You do not have permission to access this repository data.";
  if (["NOT_FOUND", "CONTENT_NOT_FOUND"].includes(code)) return "The repository, branch, path, or file may no longer exist.";
  if (code === "GITHUB_RATE_LIMITED") return "GitHub's rate limit was reached. Wait briefly before retrying.";
  if (code === "FILE_TOO_LARGE") return "This file exceeds the supported 1 MB viewer limit. Open it on GitHub instead.";
  return "Try again. If the problem continues, synchronize the repository.";
}

function ErrorState({ title, error, onRetry }: { title: string; error: ApiError["error"]; onRetry?: () => void }) {
  return <Card className="repo-ws-error">
    <strong>{title}</strong>
    <p role="alert">{error.message}</p>
    <small>{errorGuidance(error.code)} <code>{error.code}</code></small>
    {onRetry && <Button onClick={onRetry}>Retry</Button>}
  </Card>;
}

function LoadingState({ label }: { label: string }) {
  return <div className="repo-ws-loading" role="status"><span aria-hidden="true" />{label}</div>;
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  const safeUrl = safeGitHubAvatarUrl(url);
  return safeUrl
    ? <Image className="repo-ws-avatar" src={safeUrl} alt="" width={32} height={32} loading="lazy" referrerPolicy="no-referrer" loader={({ src }) => src} />
    : <span className="repo-ws-avatar repo-ws-avatar-fallback" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>;
}

function commitEvent(commit: Commit): TimelineEvent {
  return {
    id: `commit:${commit.id}`,
    type: "commit_pushed",
    occurredAt: commit.committed_at ?? new Date(0).toISOString(),
    title: commit.message,
    description: commit.message_body,
    actor: commit.author_github_login ?? commit.author_name,
    status: "connected",
    pullRequestId: null,
    pullRequestNumber: null,
    sourceBranch: null,
    targetBranch: null,
    commitSha: commit.sha,
    commitShortSha: commit.short_sha ?? commit.sha.slice(0, 7),
    githubUrl: safeGitHubUrl(commit.github_url),
    errorMessage: null,
    additions: null,
    deletions: null,
    filesChanged: null,
  };
}

function LinkedTasks({ tasks }: { tasks: LinkedTask[] }) {
  if (!tasks.length) return null;
  return <div className="repo-ws-linked-tasks"><span>Linked tasks</span>{tasks.map(task => <Link key={task.id} href="/checklists">{task.title} · {task.status}</Link>)}</div>;
}

function InlineMarkdown({ text, context }: { text: string; context: MarkdownContext }) {
  const expression = /(!?\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*|__[^_]+__)/g;
  return <>{text.split(expression).map((part, index) => {
    const image = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      const url = resolveMarkdownUrl(image[2], context, "image");
      return url ? <Image key={index} src={url} alt={image[1]} width={800} height={600} loading="lazy" referrerPolicy="no-referrer" loader={({ src }) => src} /> : <span key={index}>[relative or unsafe image omitted: {image[1] || "image"}]</span>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const url = resolveMarkdownUrl(link[2], context);
      const external = url && !url.startsWith("#") && !url.startsWith("mailto:");
      return url ? <a key={index} href={url} target={external ? "_blank" : undefined} rel={external ? "noreferrer noopener" : undefined}>{link[1]}</a> : <span key={index}>{link[1]}</span>;
    }
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return <Fragment key={index}>{part}</Fragment>;
  })}</>;
}

function SourceViewer({ source }: { source: string }) {
  return <pre className="repo-ws-source" aria-label="Syntax highlighted source code"><code>{source.split("\n").map((line, index) => <span className="repo-ws-source-line" key={index}><span className="repo-ws-line-number" aria-hidden="true">{index + 1}</span><span>{tokenizeSourceLine(line).map((token, tokenIndex) => <span className={`source-${token.type}`} key={tokenIndex}>{token.text}</span>)}</span>{"\n"}</span>)}</code></pre>;
}

function MarkdownViewer({ source, context }: { source: string; context: MarkdownContext }) {
  return <div className="repo-ws-markdown">{parseMarkdown(source).map((block, index) => {
    if (block.type === "heading") {
      const Heading = `h${block.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return <Heading key={index}><InlineMarkdown text={block.text} context={context} /></Heading>;
    }
    if (block.type === "paragraph") return <p key={index}><InlineMarkdown text={block.text} context={context} /></p>;
    if (block.type === "quote") return <blockquote key={index}><InlineMarkdown text={block.text} context={context} /></blockquote>;
    if (block.type === "code") return <SourceViewer key={index} source={block.text} />;
    if (block.type === "list") {
      const List = block.ordered ? "ol" : "ul";
      return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown text={item} context={context} /></li>)}</List>;
    }
    return <div className="repo-ws-table-scroll" key={index}><table><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => rowIndex === 0 ? <th key={cellIndex}><InlineMarkdown text={cell} context={context} /></th> : <td key={cellIndex}><InlineMarkdown text={cell} context={context} /></td>)}</tr>)}</tbody></table></div>;
  })}</div>;
}

function Overview({ data, metricsError, branchTotal, branchError, taskTotal, taskError, repository, events, hasMoreActivity, loadingMoreActivity, onLoadMoreActivity, onRetry, onCommit, onPullRequest }: { data?: OverviewData; metricsError?: ApiError["error"]; branchTotal?: number; branchError?: ApiError["error"]; taskTotal?: number; taskError?: ApiError["error"]; repository: Tables<"project_repositories">; events: TimelineEvent[]; hasMoreActivity: boolean; loadingMoreActivity: boolean; onLoadMoreActivity: () => void; onRetry: () => void; onCommit: (event: TimelineEvent) => void; onPullRequest: (id: string) => void }) {
  const recentEvents = events.filter(isVisibleRepositoryActivity);
  const latest = data?.commits[0];
  const totals = [
    ["Branches", branchTotal, branchError],
    ["Commits", data?.commitTotal, metricsError],
    ["Pull Requests", data?.pullRequestTotal, metricsError],
    ["Reviews", data?.reviewTotal, metricsError],
    ["Related tasks", taskTotal, taskError],
  ] as const;
  return <div className="repo-ws-overview">
    <section className="repo-ws-totals" aria-label="Exact synchronized repository totals">
      {totals.map(([label, count, error]) => <Card key={label}><span>Synchronized {label}</span><strong>{count ?? "Unavailable"}</strong>{error && <small title={error.message}>{error.code}</small>}</Card>)}
    </section>
    {(metricsError || branchError || taskError) && <Card className="repo-ws-stale-warning"><strong>Some synchronized totals are unavailable</strong><p role="alert">Available sections remain current; unavailable sections are labeled above.</p><Button onClick={onRetry}>Retry unavailable data</Button></Card>}
    <div className="repo-ws-overview-grid">
      <section className="repo-ws-panel">
        <header><div><small>Latest synchronized commit</small><h2>{latest?.message ?? "No commits synchronized"}</h2></div>{latest?.short_sha && <code>{latest.short_sha}</code>}</header>
        {latest ? <>
          <p>{latest.author_github_login ?? latest.author_name ?? "Author unavailable"} · <time dateTime={latest.committed_at ?? undefined}>{formatDate(latest.committed_at)}</time></p>
          <p className="repo-ws-note">Changed-file and addition/deletion stats are unavailable in the synchronized commit summary. Open details to fetch live GitHub stats.</p>
          <Button onClick={() => onCommit(commitEvent(latest))}>View changed files</Button>
        </> : <p>Use Sync Repository to load GitHub history into the synchronized database.</p>}
      </section>
      <section className="repo-ws-panel">
        <header><div><small>Repository record</small><h2>Connection metadata</h2></div></header>
        <dl className="repo-ws-record-details"><div><dt>Connected</dt><dd>{formatDate(repository.created_at)}</dd></div><div><dt>Record updated</dt><dd>{formatDate(repository.updated_at)}</dd></div><div><dt>Visibility</dt><dd>{repository.visibility ?? (repository.is_private ? "private" : "public")}</dd></div><div><dt>Archived</dt><dd>{repository.is_archived ? "Yes" : "No"}</dd></div><div><dt>Last successful sync</dt><dd>{formatDate(repository.last_synced_at)}</dd></div><div><dt>Sync error</dt><dd>{safeSyncError(repository.sync_error) ?? "None recorded"}</dd></div></dl>
        <p>Counts reflect synchronized Supabase rows, not live GitHub totals. Recent activity combines separately paginated commits, Pull Requests, reviews, and project activity before sorting.</p>
        <p className="repo-ws-note">Timeline pages are paginated per source, so the merged activity feed is not a global chronological cursor.</p>
      </section>
    </div>
    <section className="repo-ws-panel repo-ws-activity" aria-labelledby="recent-activity-title">
      <header><div><small>Preserved timeline data</small><h2 id="recent-activity-title">Recent activity</h2></div><Badge>{recentEvents.length} events</Badge></header>
      {!recentEvents.length && <EmptyState title="No recent activity" description="Synchronize the repository to load commits, Pull Requests, and reviews." />}
      <div>{recentEvents.map(event => {
        if (event.type === "commit_pushed") return <CommitTimelineCard key={event.id} event={event} onOpen={onCommit} />;
        if (event.type === "review_submitted") return <ReviewTimelineCard key={event.id} event={event} onOpen={onPullRequest} />;
        if (event.type.startsWith("pull_request_")) return <PullRequestTimelineCard key={event.id} event={event} onOpen={onPullRequest} />;
        return null;
      })}</div>
      {hasMoreActivity && <div className="repo-ws-activity-more"><Button loading={loadingMoreActivity} onClick={onLoadMoreActivity}>Load more activity</Button></div>}
    </section>
  </div>;
}

function CodeBrowser({ projectId, repositoryId, repository, branches }: { projectId: string; repositoryId: string; repository: Tables<"project_repositories">; branches: Branch[] }) {
  const defaultBranch = branches.find(branch => branch.is_default)?.branch_name
    ?? branches.find(branch => branch.branch_name === repository.default_branch)?.branch_name
    ?? branches[0]?.branch_name
    ?? "";
  const [branch, setBranch] = useState(defaultBranch);
  const [branchInput, setBranchInput] = useState(defaultBranch);
  const [path, setPath] = useState("");
  const [contents, setContents] = useState<NormalizedGitHubContents>();
  const [readme, setReadme] = useState<Extract<NormalizedGitHubContents, { type: "file" }>>();
  const [error, setError] = useState<ApiError["error"]>();
  const [loading, setLoading] = useState(Boolean(defaultBranch));
  const [retry, setRetry] = useState(0);
  const [mode, setMode] = useState<"preview" | "source">("preview");
  const [branchNotice, setBranchNotice] = useState("");

  const load = useCallback(async (requestedPath: string, requestedBranch: string, signal: AbortSignal, allowRootRetry = false) => {
    setLoading(true);
    setError(undefined);
    setReadme(undefined);
    setContents(undefined);
    try {
      const query = new URLSearchParams({ path: requestedPath, ref: requestedBranch });
      const response = await fetch(`/api/projects/${projectId}/repositories/${repositoryId}/contents?${query}`, { cache: "no-store", signal });
      const payload = await response.json() as ContentsResponse;
      if (!response.ok || isError(payload)) {
        if (isError(payload) && payload.error.code === "CONTENT_NOT_FOUND" && requestedPath && allowRootRetry) {
          setPath("");
          setBranchNotice(`The path did not exist on ${requestedBranch}; showing the branch root instead.`);
          return;
        }
        setError(isError(payload) ? payload.error : { code: "CONTENTS_UNAVAILABLE", message: "Repository contents are unavailable." });
        return;
      }
      setContents(payload.data);
      setMode(payload.data.type === "file" && payload.data.kind === "markdown" ? "preview" : "source");
      if (payload.data.type === "directory" && payload.data.path === "" && payload.data.readme) {
        const readmeQuery = new URLSearchParams({ path: payload.data.readme.path, ref: requestedBranch });
        const readmeResponse = await fetch(`/api/projects/${projectId}/repositories/${repositoryId}/contents?${readmeQuery}`, { cache: "no-store", signal });
        const readmePayload = await readmeResponse.json() as ContentsResponse;
        if (readmeResponse.ok && !isError(readmePayload) && readmePayload.data.type === "file" && readmePayload.data.kind === "markdown") setReadme(readmePayload.data);
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError({ code: "CONTENTS_UNAVAILABLE", message: "Repository contents are unavailable." });
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [projectId, repositoryId]);

  useEffect(() => {
    if (!branch) return;
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => void load(path, branch, controller.signal, true));
    return () => {
      window.cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [branch, load, path, retry]);

  const parts = path ? path.split("/") : [];
  const githubUrl = contents ? (contents.type === "file" ? contents.htmlUrl : repositoryGitHubPathUrl(repository.github_url, contents.path, branch, true)) : null;
  return <div className="repo-ws-code">
    {!branches.length && <EmptyState title="No synchronized branches" description="Code browsing requires a synchronized branch and will not request contents with an empty ref. Use Sync Repository in the header, then retry." />}
    {branches.length > 0 && <>
    <section className="repo-ws-code-toolbar">
      <label><span>Search or select code branch</span><Input list="repository-branches" value={branchInput} onChange={event => {
        const value = event.target.value;
        setBranchInput(value);
        if (branches.some(item => item.branch_name === value)) {
          setBranchNotice("");
          setBranch(value);
        }
      }} onBlur={() => {
        if (!branches.some(item => item.branch_name === branchInput)) setBranchInput(branch);
      }} /></label>
      <datalist id="repository-branches">{branches.map(item => <option key={item.id} value={item.branch_name}>{item.is_default ? "default" : "branch"}{item.is_protected ? ", protected" : ""} · {item.latest_commit_sha?.slice(0, 7) ?? "SHA unavailable"}</option>)}</datalist>
      <div className="repo-ws-branch-meta">{branches.filter(item => item.branch_name === branch).map(item => <Fragment key={item.id}><Badge tone={item.is_default ? "brand" : "neutral"}>{item.is_default ? "default" : "branch"}</Badge>{item.is_protected && <Badge>protected</Badge>}<code>{item.latest_commit_sha?.slice(0, 12) ?? "latest SHA unavailable"}</code></Fragment>)}</div>
    </section>
    {branchNotice && <p className="repo-ws-notice" role="status">{branchNotice}</p>}
    <nav className="repo-ws-breadcrumb" aria-label="Repository path">
      <button onClick={() => setPath("")}>{repository.github_name}</button>
      {parts.map((part, index) => <Fragment key={`${part}-${index}`}><span>/</span><button onClick={() => setPath(parts.slice(0, index + 1).join("/"))}>{part}</button></Fragment>)}
    </nav>
    {loading && <LoadingState label="Loading repository contents…" />}
    {!loading && error && <ErrorState title="Contents unavailable" error={error} onRetry={() => setRetry(value => value + 1)} />}
    {!loading && contents?.type === "directory" && <>
      <section className="repo-ws-directory" aria-label={`Contents of ${contents.path || "repository root"}`}>
        <header><strong>{contents.entries.length} entries</strong>{githubUrl && <a href={githubUrl} target="_blank" rel="noreferrer noopener">Open this path on GitHub</a>}</header>
        {contents.path && <button className="repo-ws-directory-row" onClick={() => setPath(parts.slice(0, -1).join("/"))}><span aria-hidden="true">↑</span><strong>Parent directory</strong><span /></button>}
        {[...contents.entries].sort((left, right) => Number(right.type === "directory") - Number(left.type === "directory") || left.name.localeCompare(right.name)).map(entry => <button className="repo-ws-directory-row" key={entry.sha + entry.path} onClick={() => entry.type === "directory" || entry.type === "file" ? setPath(entry.path) : undefined} disabled={entry.type === "symlink" || entry.type === "submodule"}>
          <span aria-hidden="true">{entry.type === "directory" ? "DIR" : entry.type === "file" ? "FILE" : "REF"}</span><strong>{entry.name}</strong><span>{entry.type}{entry.type === "file" ? ` · ${entry.size.toLocaleString()} B` : ""}</span>
        </button>)}
        {!contents.entries.length && <EmptyState title="Empty directory" description="This synchronized GitHub path has no entries." />}
      </section>
      {contents.path === "" && readme && <section className="repo-ws-readme"><header><small>Root README</small><h2>{readme.name}</h2></header><MarkdownViewer source={readme.content ?? ""} context={{ repositoryUrl: repository.github_url, ref: branch, markdownPath: readme.path }} /></section>}
    </>}
    {!loading && contents?.type === "file" && <FileViewer file={contents} branch={branch} repositoryUrl={repository.github_url} mode={mode} setMode={setMode} />}
    </>}
  </div>;
}

function FileViewer({ file, branch, repositoryUrl, mode, setMode }: { file: Extract<NormalizedGitHubContents, { type: "file" }>; branch: string; repositoryUrl: string; mode: "preview" | "source"; setMode: (mode: "preview" | "source") => void }) {
  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.alert(`Unable to copy ${label}.`);
    }
  };
  return <section className="repo-ws-file">
    <header>
      <div><small>{file.path}</small><h2>{file.name}</h2><p>{branch} · {file.size.toLocaleString()} bytes · {file.kind}</p></div>
      <div><Button size="sm" onClick={() => void copy(file.path, "path")}>Copy path</Button>{file.content !== null && <Button size="sm" onClick={() => void copy(file.content ?? "", "content")}>Copy content</Button>}{file.htmlUrl && <a href={file.htmlUrl} target="_blank" rel="noreferrer noopener">Open on GitHub</a>}</div>
    </header>
    {file.kind === "markdown" && <div className="repo-ws-mode" role="group" aria-label="Markdown display mode"><Button variant={mode === "preview" ? "primary" : "secondary"} onClick={() => setMode("preview")}>Preview</Button><Button variant={mode === "source" ? "primary" : "secondary"} onClick={() => setMode("source")}>Source</Button></div>}
    {file.kind === "image" && file.mediaType && file.contentBase64 && <div className="repo-ws-image"><Image src={`data:${file.mediaType};base64,${file.contentBase64}`} alt={file.name} width={1200} height={900} unoptimized /></div>}
    {file.kind === "binary" && <EmptyState title="Binary or unsupported file" description="This file cannot be rendered safely. Use Open on GitHub when available; no external raw action is exposed." />}
    {file.kind === "markdown" && mode === "preview" && <MarkdownViewer source={file.content ?? ""} context={{ repositoryUrl, ref: branch, markdownPath: file.path }} />}
    {(file.kind === "text" || file.kind === "markdown" && mode === "source") && <SourceViewer source={file.content ?? ""} />}
  </section>;
}

function CommitsTab({ projectId, repositoryId, onOpen }: { projectId: string; repositoryId: string; onOpen: (event: TimelineEvent) => void }) {
  const [filters, setFilters] = useState({ search: "", author: "", from: "", to: "" });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Extract<CommitsResponse, { data: unknown }>["data"]>();
  const [error, setError] = useState<ApiError["error"]>();
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError(undefined);
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (query.search) params.set("search", query.search);
      if (query.author) params.set("author", query.author);
      if (query.from) params.set("from", new Date(`${query.from}T00:00:00`).toISOString());
      if (query.to) params.set("to", new Date(`${query.to}T23:59:59.999`).toISOString());
      try {
        const response = await fetch(`/api/projects/${projectId}/repositories/${repositoryId}/commits?${params}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as CommitsResponse;
        if (!response.ok || isError(payload)) {
          setData(undefined);
          setError(isError(payload) ? payload.error : { code: "COMMITS_UNAVAILABLE", message: "Commits are unavailable." });
        } else setData(payload.data);
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setData(undefined);
          setError({ code: "COMMITS_UNAVAILABLE", message: "Commits are unavailable." });
        }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [page, projectId, query, repositoryId, retry]);
  return <section>
    <form className="repo-ws-filters" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(filters); }}>
      <label><span>Search message or SHA</span><Input value={filters.search} onChange={event => setFilters(current => ({ ...current, search: event.target.value }))} /></label>
      <label><span>Author</span><Input value={filters.author} onChange={event => setFilters(current => ({ ...current, author: event.target.value }))} /></label>
      <label><span>From</span><Input type="date" value={filters.from} onChange={event => setFilters(current => ({ ...current, from: event.target.value }))} /></label>
      <label><span>To</span><Input type="date" value={filters.to} onChange={event => setFilters(current => ({ ...current, to: event.target.value }))} /></label>
      <Button type="submit" variant="primary">Apply filters</Button>
    </form>
    {loading && <LoadingState label="Loading synchronized commits…" />}
    {!loading && error && <ErrorState title="Commits unavailable" error={error} onRetry={() => setRetry(value => value + 1)} />}
    {!loading && data && <>
      <header className="repo-ws-list-heading"><div><small>Synchronized commits</small><h2>{data.pagination.total} results</h2></div><span>Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)}</span></header>
      {!data.commits.length && <EmptyState title="No commits found" description="Change the filters or synchronize the repository." />}
      <div className="repo-ws-list">{data.commits.map(commit => <article key={commit.id}>
        <Avatar url={commit.author_avatar_url} name={commit.author_github_login ?? commit.author_name ?? "?"} />
        <div><button className="repo-ws-title-button" onClick={() => onOpen(commitEvent(commit))}>{commit.message}</button>{commit.message_body && <p>{commit.message_body}</p>}<p>{commit.author_github_login ?? commit.author_name ?? "Author unavailable"} · committed by {commit.committer_name ?? "unavailable"}</p><LinkedTasks tasks={commit.linkedTasks} /></div>
        <aside><code>{commit.short_sha ?? commit.sha.slice(0, 7)}</code><time dateTime={commit.committed_at ?? undefined} title={formatDate(commit.committed_at)}>{relativeDate(commit.committed_at)}</time><span title="Open details to fetch live GitHub stats">Change stats unavailable in synchronized summary</span>{commit.verification_status && <Badge>{commit.verification_status}</Badge>}{safeGitHubUrl(commit.github_url) && <a href={safeGitHubUrl(commit.github_url) ?? undefined} target="_blank" rel="noreferrer noopener">GitHub</a>}</aside>
      </article>)}</div>
      <PaginationControls pagination={data.pagination} setPage={setPage} />
    </>}
  </section>;
}

function PullRequestsTab({ projectId, repositoryId, onOpen }: { projectId: string; repositoryId: string; onOpen: (id: string) => void }) {
  const [filters, setFilters] = useState({ search: "", state: "all" });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Extract<PullRequestsResponse, { data: unknown }>["data"]>();
  const [error, setError] = useState<ApiError["error"]>();
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError(undefined);
      const params = new URLSearchParams({ page: String(page), limit: "20", search: query.search, state: query.state });
      try {
        const response = await fetch(`/api/projects/${projectId}/repositories/${repositoryId}/pull-requests?${params}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as PullRequestsResponse;
        if (!response.ok || isError(payload)) {
          setData(undefined);
          setError(isError(payload) ? payload.error : { code: "PULL_REQUESTS_UNAVAILABLE", message: "Pull Requests are unavailable." });
        } else setData(payload.data);
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setData(undefined);
          setError({ code: "PULL_REQUESTS_UNAVAILABLE", message: "Pull Requests are unavailable." });
        }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load(); return () => controller.abort();
  }, [page, projectId, query, repositoryId, retry]);
  return <section>
    <form className="repo-ws-filters repo-ws-pr-filters" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(filters); }}>
      <label><span>Search title or number</span><Input value={filters.search} onChange={event => setFilters(current => ({ ...current, search: event.target.value }))} /></label>
      <label><span>State</span><Select value={filters.state} onChange={event => setFilters(current => ({ ...current, state: event.target.value }))}><option value="all">All</option><option value="open">Open</option><option value="merged">Merged</option><option value="closed">Closed</option></Select></label>
      <Button type="submit" variant="primary">Apply filters</Button>
    </form>
    {loading && <LoadingState label="Loading synchronized Pull Requests…" />}
    {!loading && error && <ErrorState title="Pull Requests unavailable" error={error} onRetry={() => setRetry(value => value + 1)} />}
    {!loading && data && <>
      <header className="repo-ws-list-heading"><div><small>Synchronized Pull Requests</small><h2>{data.pagination.total} results</h2></div><span>{data.synchronizedReviewTotal} synchronized reviews</span></header>
      {!data.pullRequests.length && <EmptyState title="No Pull Requests found" description="Change the filters or synchronize the repository." />}
      <div className="repo-ws-list">{data.pullRequests.map(item => <article key={item.id}>
        <Avatar url={item.author_avatar_url} name={item.author_github_login ?? "?"} />
        <div><button className="repo-ws-title-button" onClick={() => onOpen(item.id)}>#{item.pull_request_number} {item.title}</button><p>{item.author_github_login ?? "Author unavailable"} · {item.source_branch} → {item.target_branch}</p><div className="repo-ws-statline"><span>+{item.additions}</span><span>-{item.deletions}</span><span>{item.changed_files_count} files</span><span>{item.comments_count} comments</span></div><LinkedTasks tasks={item.linkedTasks} /></div>
        <aside><Badge tone={item.merged_at ? "success" : item.state === "open" ? "brand" : "neutral"}>{item.merged_at ? "merged" : item.state}</Badge>{item.is_draft && <Badge>draft</Badge>}<span>{item.reviews_count} reviews</span><span>{item.commits_count} commits</span><time dateTime={item.github_updated_at ?? undefined} title={formatDate(item.github_updated_at)}>{relativeDate(item.github_updated_at)}</time>{safeGitHubUrl(item.github_url) && <a href={safeGitHubUrl(item.github_url) ?? undefined} target="_blank" rel="noreferrer noopener">GitHub</a>}</aside>
      </article>)}</div>
      <p className="repo-ws-note">Related commits and Pull Request diff data are unavailable in the synchronized model. Open a Pull Request to view its preserved details and reviews.</p>
      <PaginationControls pagination={data.pagination} setPage={setPage} />
    </>}
  </section>;
}

function PaginationControls({ pagination, setPage }: { pagination: Pagination; setPage: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return <nav className="repo-ws-pagination" aria-label="Results pages"><Button disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>Previous</Button><span>Page {pagination.page} of {pagination.totalPages}</span><Button disabled={!pagination.hasMore} onClick={() => setPage(pagination.page + 1)}>Next</Button></nav>;
}

function TasksTab({ tasks, total }: { tasks: RepositoryTask[]; total: number }) {
  return <section><header className="repo-ws-list-heading"><div><small>Repository-linked tasks</small><h2>{total} tasks</h2></div><Link href="/checklists">Open checklists</Link></header>
    {!tasks.length && <EmptyState title="No related tasks" description="No endpoint task is linked to this repository." />}
    <div className="repo-ws-task-grid">{tasks.map(task => <Card as="article" key={task.id}><header><Badge>{task.status}</Badge><Badge>{task.priority}</Badge></header><h3><Link href="/checklists">{task.title}</Link></h3>{task.description && <p>{task.description}</p>}<dl><div><dt>Assignee ID</dt><dd>{task.assignee_id ?? "Unavailable"}</dd></div><div><dt>Due</dt><dd>{task.due_date ? formatDate(task.due_date) : "Unavailable"}</dd></div><div><dt>Updated</dt><dd>{formatDate(task.updated_at)}</dd></div><div><dt>Repository link</dt><dd>{task.branch_name ? `Branch ${task.branch_name}` : task.linked_commit_sha ? `Commit ${task.linked_commit_sha.slice(0, 7)}` : task.linked_pull_request_number ? `PR #${task.linked_pull_request_number}` : "Repository only"}</dd></div></dl></Card>)}</div>
  </section>;
}

export function RepositoryWorkspace({ projectId, repositoryId, projectName }: { projectId: string; repositoryId: string; projectName?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = repositoryTab(searchParams.get("tab"));
  const [repository, setRepository] = useState<Tables<"project_repositories">>();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [timelinePage, setTimelinePage] = useState(0);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const [loadingMoreActivity, setLoadingMoreActivity] = useState(false);
  const [overview, setOverview] = useState<OverviewData>();
  const [branchData, setBranchData] = useState<{ branches: Branch[]; total: number }>();
  const [taskData, setTaskData] = useState<{ tasks: RepositoryTask[]; total: number }>();
  const [baseError, setBaseError] = useState<ApiError["error"]>();
  const [overviewError, setOverviewError] = useState<ApiError["error"]>();
  const [branchError, setBranchError] = useState<ApiError["error"]>();
  const [taskError, setTaskError] = useState<ApiError["error"]>();
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [selectedCommit, setSelectedCommit] = useState<TimelineEvent>();
  const [selectedPullRequest, setSelectedPullRequest] = useState<string>();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ tone: "success" | "danger"; text: string }>();

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setBaseError(undefined);
      setOverviewError(undefined);
      setBranchError(undefined);
      setTaskError(undefined);
      try {
        const base = `/api/projects/${projectId}/repositories/${repositoryId}`;
        const request = async <T extends object>(url: string, fallback: ApiError["error"]) => {
          try {
            const response = await fetch(url, { cache: "no-store", signal: controller.signal });
            const payload = await response.json() as T | ApiError;
            return response.ok && !isError(payload) ? { data: payload as T } : { error: isError(payload) ? payload.error : fallback };
          } catch (cause) {
            if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
            return { error: fallback };
          }
        };
        const [timelineResult, branchesResult, commitsResult, prsResult, tasksResult] = await Promise.all([
          request<Extract<TimelineResponse, { data: unknown }>>(`${base}/timeline?page=0&limit=12`, { code: "TIMELINE_UNAVAILABLE", message: "Repository metadata is unavailable." }),
          request<Extract<BranchesResponse, { data: unknown }>>(`${base}/branches`, { code: "BRANCHES_UNAVAILABLE", message: "Repository branches are unavailable." }),
          request<Extract<CommitsResponse, { data: unknown }>>(`${base}/commits?page=1&limit=8`, { code: "COMMITS_UNAVAILABLE", message: "Synchronized commit totals are unavailable." }),
          request<Extract<PullRequestsResponse, { data: unknown }>>(`${base}/pull-requests?page=1&limit=8&state=all`, { code: "PULL_REQUESTS_UNAVAILABLE", message: "Synchronized Pull Request totals are unavailable." }),
          request<Extract<TasksResponse, { data: unknown }>>(`${base}/tasks`, { code: "TASKS_UNAVAILABLE", message: "Repository tasks are unavailable." }),
        ]);
        if (timelineResult.data) {
          const timeline = timelineResult.data.data;
          setRepository(timeline.repository);
          setEvents(sortTimelineEvents(dedupeTimelineEvents(timeline.events)));
          setTimelinePage(timeline.pagination.page);
          setHasMoreActivity(timeline.pagination.hasMore);
        } else {
          setBaseError(timelineResult.error);
        }
        if (branchesResult.data) setBranchData(branchesResult.data.data);
        else setBranchError(branchesResult.error);
        if (tasksResult.data) setTaskData(tasksResult.data.data);
        else setTaskError(tasksResult.error);
        if (commitsResult.data && prsResult.data) {
          setOverview({
            commits: commitsResult.data.data.commits,
            commitTotal: commitsResult.data.data.pagination.total,
            pullRequests: prsResult.data.data.pullRequests,
            pullRequestTotal: prsResult.data.data.pagination.total,
            reviewTotal: prsResult.data.data.synchronizedReviewTotal,
          });
        } else {
          setOverviewError(commitsResult.error ?? prsResult.error);
        }
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setBaseError({ code: "REPOSITORY_UNAVAILABLE", message: "Repository workspace is unavailable." });
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load(); return () => controller.abort();
  }, [projectId, repositoryId, retry]);

  const selectTab = (tab: RepositoryTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };
  const synchronize = async () => {
    if (syncing) return;
    setSyncing(true); setSyncMessage(undefined);
    try {
      const response = await fetch(`/api/projects/${projectId}/repositories/${repositoryId}/sync`, { method: "POST" });
      const payload = await response.json() as SyncResponse;
      if (!response.ok || isError(payload)) setSyncMessage({ tone: "danger", text: isError(payload) ? payload.error.message : "Repository synchronization failed." });
      else setSyncMessage({ tone: "success", text: `Synchronized ${payload.data.commitsProcessed} commits, ${payload.data.pullRequestsProcessed} Pull Requests, and ${payload.data.branchesProcessed} branches.` });
    } catch { setSyncMessage({ tone: "danger", text: "Repository synchronization failed." }); }
    finally { setSyncing(false); setRetry(value => value + 1); }
  };
  const loadMoreActivity = async () => {
    if (loadingMoreActivity || !hasMoreActivity) return;
    setLoadingMoreActivity(true);
    try {
      const nextPage = timelinePage + 1;
      const response = await fetch(`/api/projects/${projectId}/repositories/${repositoryId}/timeline?page=${nextPage}&limit=12`, { cache: "no-store" });
      const payload = await response.json() as TimelineResponse;
      if (!response.ok || isError(payload)) {
        setSyncMessage({ tone: "danger", text: isError(payload) ? payload.error.message : "Unable to load more repository activity." });
        return;
      }
      setEvents(current => sortTimelineEvents(dedupeTimelineEvents([...current, ...payload.data.events])));
      setTimelinePage(payload.data.pagination.page);
      setHasMoreActivity(payload.data.pagination.hasMore);
    } catch {
      setSyncMessage({ tone: "danger", text: "Unable to load more repository activity." });
    } finally {
      setLoadingMoreActivity(false);
    }
  };

  if (loading && !repository) return <div className="repository-workspace"><LoadingState label="Loading repository workspace…" /></div>;
  if (baseError && !repository) return <div className="repository-workspace"><ErrorState title="Repository unavailable" error={baseError} onRetry={() => setRetry(value => value + 1)} /></div>;
  if (!repository) return null;
  const branches = branchData?.branches ?? [];
  const currentBranch = branches.find(branch => branch.is_default)?.branch_name ?? repository.default_branch;
  const repositoryUrl = safeGitHubUrl(repository.github_url);
  return <div className="repository-workspace">
    <header className="repo-ws-header">
      <div className="repo-ws-identity"><small>{projectName ? `${projectName} / connected repository` : "Connected repository"}</small><h1><span>{repository.github_owner}/</span>{repository.github_name}</h1><div><Badge>{repository.visibility ?? (repository.is_private ? "private" : "public")}</Badge><Badge tone="success">repository connected</Badge>{repository.is_archived && <Badge>archived</Badge>}</div></div>
      <div className="repo-ws-actions"><Button variant="primary" loading={syncing} disabled={syncing} onClick={() => void synchronize()}>Sync Repository</Button>{repositoryUrl && <a className="ui-button" href={repositoryUrl} target="_blank" rel="noreferrer noopener">Open on GitHub</a>}</div>
      <dl className="repo-ws-status"><div><dt>Code branch</dt><dd>{currentBranch ?? "Unavailable"}</dd></div><div><dt>Sync status</dt><dd>{repository.sync_status}</dd></div><div><dt>Last successful sync</dt><dd>{formatDate(repository.last_synced_at)}</dd></div><div><dt>Connection</dt><dd>Repository record connected; token validity not asserted</dd></div></dl>
      {safeSyncError(repository.sync_error) && <p className="repo-ws-sync-error" role="alert">{safeSyncError(repository.sync_error)}</p>}
      {baseError && <p className="repo-ws-sync-error" role="alert">Repository metadata refresh failed: {baseError.message} Existing repository data may be stale.</p>}
      {syncMessage && <p className={syncMessage.tone === "success" ? "repo-ws-sync-success" : "repo-ws-sync-error"} role={syncMessage.tone === "success" ? "status" : "alert"}>{syncMessage.text}</p>}
    </header>
    <nav className="repo-ws-tabs" aria-label="Repository sections" role="tablist">{repositoryTabs.map(tab => <button id={`repository-tab-${tab}`} aria-controls="repository-panel" key={tab} role="tab" aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1} onClick={() => selectTab(tab)} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const current = repositoryTabs.indexOf(tab);
      const next = event.key === "Home" ? 0 : event.key === "End" ? repositoryTabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + repositoryTabs.length) % repositoryTabs.length;
      selectTab(repositoryTabs[next]);
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>{tabLabels[tab]}</button>)}</nav>
    <main id="repository-panel" className="repo-ws-content" role="tabpanel" aria-labelledby={`repository-tab-${activeTab}`}>
      {activeTab === "overview" && <Overview data={overview} metricsError={overviewError} branchTotal={branchData?.total} branchError={branchError} taskTotal={taskData?.total} taskError={taskError} repository={repository} events={events} hasMoreActivity={hasMoreActivity} loadingMoreActivity={loadingMoreActivity} onLoadMoreActivity={() => void loadMoreActivity()} onRetry={() => setRetry(value => value + 1)} onCommit={setSelectedCommit} onPullRequest={setSelectedPullRequest} />}
      {activeTab === "code" && branchError && branchData && <Card className="repo-ws-stale-warning"><strong>Branch refresh failed</strong><p role="alert">Showing the previously loaded branch list. {branchError.message}</p><Button onClick={() => setRetry(value => value + 1)}>Retry</Button></Card>}
      {activeTab === "code" && (branchData ? <CodeBrowser projectId={projectId} repositoryId={repositoryId} repository={repository} branches={branches} /> : branchError && <ErrorState title="Branches unavailable" error={branchError} onRetry={() => setRetry(value => value + 1)} />)}
      {activeTab === "commits" && <CommitsTab projectId={projectId} repositoryId={repositoryId} onOpen={setSelectedCommit} />}
      {activeTab === "pull-requests" && <PullRequestsTab projectId={projectId} repositoryId={repositoryId} onOpen={setSelectedPullRequest} />}
      {activeTab === "tasks" && taskError && taskData && <Card className="repo-ws-stale-warning"><strong>Task refresh failed</strong><p role="alert">Showing previously loaded tasks. {taskError.message}</p><Button onClick={() => setRetry(value => value + 1)}>Retry</Button></Card>}
      {activeTab === "tasks" && (taskData ? <TasksTab tasks={taskData.tasks} total={taskData.total} /> : taskError && <ErrorState title="Tasks unavailable" error={taskError} onRetry={() => setRetry(value => value + 1)} />)}
    </main>
    <PullRequestDetail projectId={projectId} repositoryId={repositoryId} pullRequestId={selectedPullRequest} onClose={() => setSelectedPullRequest(undefined)} />
    <CommitDetail projectId={projectId} repositoryId={repositoryId} event={selectedCommit} onClose={() => setSelectedCommit(undefined)} />
  </div>;
}
