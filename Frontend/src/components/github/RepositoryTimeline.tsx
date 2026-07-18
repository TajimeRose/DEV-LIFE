"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Modal } from "@/components/ui";
import type { Tables } from "@/lib/database.types";
import {
  dedupeTimelineEvents,
  sortTimelineEvents,
  type TimelineEvent,
} from "@/lib/github/timeline";
import {
  groupTimelineEventsByDate,
  isVisibleRepositoryActivity,
  timelineViewState,
} from "@/lib/github/timeline-view";

type TimelineResponse =
  | {
      data: {
        repository: Tables<"project_repositories">;
        events: TimelineEvent[];
        pagination: { page: number; hasMore: boolean };
      };
    }
  | { error: { code: string; message: string } };

type PullRequestDetailResponse =
  | {
      data: {
        pullRequest: Tables<"repository_pull_requests">;
        reviews: Tables<"repository_pull_request_reviews">[];
        relatedCommits: [];
        diff: { available: false; reason: string };
      };
    }
  | { error: { code: string; message: string } };

type SyncResponse =
  | {
      data: {
        commitsProcessed: number;
        pullRequestsProcessed: number;
        branchesProcessed: number;
      };
    }
  | { error: { code: string; message: string } };

type CommitDetailResponse =
  | {
      data: {
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
    }
  | { error: { code: string; message: string } };

function isError<T extends { error: { code: string; message: string } }>(value: T | object): value is T {
  return "error" in value;
}

function statusTone(status: TimelineEvent["status"]): "neutral" | "success" | "warning" | "danger" | "brand" {
  if (["merged", "approved", "succeeded", "connected"].includes(status)) return "success";
  if (["failed", "changes_requested"].includes(status)) return "danger";
  if (["closed", "dismissed"].includes(status)) return "warning";
  if (["open", "started"].includes(status)) return "brand";
  return "neutral";
}

function eventLabel(type: TimelineEvent["type"]) {
  const labels: Record<TimelineEvent["type"], string> = {
    pull_request_opened: "Pull Request opened",
    pull_request_updated: "Pull Request updated",
    pull_request_closed: "Pull Request closed",
    pull_request_merged: "Pull Request merged",
    commit_pushed: "Commit",
    review_submitted: "Review submitted",
    sync_started: "Synchronization",
    sync_succeeded: "Synchronization",
    sync_failed: "Synchronization",
    repository_connected: "Repository",
  };
  return labels[type];
}

function eventIcon(type: TimelineEvent["type"]) {
  if (type === "commit_pushed") return "CM";
  if (type.startsWith("pull_request_")) return "PR";
  if (type === "review_submitted") return "RV";
  if (type.startsWith("sync_")) return "SY";
  return "EV";
}

function eventTime(event: TimelineEvent) {
  return new Date(event.occurredAt).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TimelineLoadingSkeleton() {
  return <div className="repository-timeline-skeleton" aria-label="Loading repository timeline">
    {Array.from({ length: 3 }, (_, index) => <span key={index} />)}
  </div>;
}

export function TimelineEmptyState() {
  return <Card><EmptyState title="No repository activity yet" description="Synchronize this repository to load commits, Pull Requests, and reviews." /></Card>;
}

export function TimelineErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Card className="github-error"><h2>Timeline unavailable</h2><p role="alert">{message}</p><Button onClick={onRetry}>Retry</Button></Card>;
}

export function TimelineItem({ event, children }: { event: TimelineEvent; children: React.ReactNode }) {
  return <article className={`repository-timeline-item timeline-${event.type}`}>
    <div className="timeline-marker" aria-hidden="true">{eventIcon(event.type)}</div>
    <div className="timeline-event-body">{children}</div>
  </article>;
}

function EventHeader({ event }: { event: TimelineEvent }) {
  return <header>
    <div>
      <span>{eventLabel(event.type)}</span>
      <time dateTime={event.occurredAt}>{eventTime(event)}</time>
    </div>
    <Badge tone={statusTone(event.status)}>{event.status.replaceAll("_", " ")}</Badge>
  </header>;
}

export function PullRequestTimelineCard({
  event,
  onOpen,
}: {
  event: TimelineEvent;
  onOpen: (pullRequestId: string) => void;
}) {
  return <TimelineItem event={event}>
    <button className="timeline-card-button" onClick={() => event.pullRequestId && onOpen(event.pullRequestId)}>
      <EventHeader event={event} />
      <div className="timeline-row-main">
        <div>
          <h3>#{event.pullRequestNumber} {event.title}</h3>
          <p>{event.actor ? `${event.actor} · ` : ""}<span className="timeline-branch">{event.sourceBranch}</span><span className="timeline-branch-arrow">ไปยัง</span><span className="timeline-branch">{event.targetBranch}</span></p>
        </div>
        <span className="timeline-open-detail">ดูรายละเอียด</span>
      </div>
    </button>
  </TimelineItem>;
}

export function CommitTimelineCard({
  event,
  onOpen,
}: {
  event: TimelineEvent;
  onOpen: (event: TimelineEvent) => void;
}) {
  return <TimelineItem event={event}>
    <button className="timeline-card-button" onClick={() => onOpen(event)}>
      <EventHeader event={event} />
      <div className="timeline-row-main">
        <div>
          <h3>{event.title}</h3>
          <p>{event.actor ? `${event.actor} committed` : "Commit author unavailable"}</p>
        </div>
        <div className="timeline-row-actions">
          <code>{event.commitShortSha}</code>
          <span className="timeline-open-detail">ดูรายละเอียด</span>
        </div>
      </div>
      {event.description && <p className="timeline-description">{event.description}</p>}
    </button>
  </TimelineItem>;
}

export function ReviewTimelineCard({
  event,
  onOpen,
}: {
  event: TimelineEvent;
  onOpen: (pullRequestId: string) => void;
}) {
  return <TimelineItem event={event}>
    <button className="timeline-card-button" onClick={() => event.pullRequestId && onOpen(event.pullRequestId)}>
      <EventHeader event={event} />
      <div className="timeline-row-main">
        <div>
          <h3>{event.title}</h3>
          <p>{event.actor ? `Reviewed by ${event.actor}` : "Reviewer unavailable"}</p>
        </div>
        <span className="timeline-open-detail">ดูรีวิว</span>
      </div>
      {event.description && <blockquote>{event.description}</blockquote>}
    </button>
  </TimelineItem>;
}

export function SyncTimelineCard({ event }: { event: TimelineEvent }) {
  return <TimelineItem event={event}>
    <div className="timeline-static-card">
      <EventHeader event={event} />
      <div className="timeline-row-main">
        <div>
          <h3>{event.title}</h3>
          {event.description && <p>{event.description}</p>}
        </div>
      </div>
      {event.errorMessage && <p className="timeline-sync-error" role="status">{event.errorMessage}</p>}
    </div>
  </TimelineItem>;
}

export function CommitDetail({
  projectId,
  repositoryId,
  event,
  onClose,
}: {
  projectId: string;
  repositoryId: string;
  event?: TimelineEvent;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Extract<CommitDetailResponse, { data: unknown }>["data"]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const commitSha = event?.commitSha;
    if (!commitSha) return;
    const controller = new AbortController();
    const load = async () => {
      await Promise.resolve();
      setLoading(true);
      setError("");
      setDetail(undefined);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/repositories/${repositoryId}/commits/${encodeURIComponent(commitSha)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = await response.json() as CommitDetailResponse;
        if (!response.ok || isError(payload)) {
          setError(isError(payload) ? payload.error.message : "Unable to load commit details.");
          return;
        }
        setDetail(payload.data);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError("Unable to load commit details.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [event?.commitSha, projectId, repositoryId, retry]);

  const activeDetail = detail?.sha === event?.commitSha ? detail : undefined;
  const additions = activeDetail?.stats.additions ?? event?.additions ?? 0;
  const deletions = activeDetail?.stats.deletions ?? event?.deletions ?? 0;
  const filesChanged = activeDetail?.stats.filesChanged ?? event?.filesChanged ?? 0;

  return <Modal
    open={Boolean(event)}
    onClose={onClose}
    title={event?.title ?? "Commit"}
    description={event?.commitShortSha ?? undefined}
    footer={<Button onClick={onClose}>Close</Button>}
  >
    {event && <div className="commit-detail">
      <p>{event.actor ? `Committed by ${event.actor}` : "Commit author unavailable"}</p>
      <dl>
        <div><dt>SHA</dt><dd><code>{event.commitSha}</code></dd></div>
        <div><dt>Files changed</dt><dd>{filesChanged}</dd></div>
        <div><dt>Additions</dt><dd>+{additions}</dd></div>
        <div><dt>Deletions</dt><dd>−{deletions}</dd></div>
      </dl>
      {loading && <div className="commit-detail-loading" role="status">Loading changed files from GitHub…</div>}
      {!loading && error && <Card className="commit-detail-error">
        <h3>Commit changes unavailable</h3>
        <p role="alert">{error}</p>
        <Button onClick={() => setRetry(value => value + 1)}>Retry</Button>
      </Card>}
      {!loading && activeDetail && <section className="commit-file-list">
        <h3>Changed files ({activeDetail.files.length})</h3>
        {activeDetail.files.map(file => <article key={file.filename}>
          <header>
            <div>
              {file.blobUrl
                ? <a href={file.blobUrl} target="_blank" rel="noreferrer noopener">{file.filename}</a>
                : <strong>{file.filename}</strong>}
              {file.previousFilename && <small>renamed from {file.previousFilename}</small>}
            </div>
            <div>
              <Badge tone="neutral">{file.status}</Badge>
              <span className="additions">+{file.additions}</span>
              <span className="deletions">−{file.deletions}</span>
            </div>
          </header>
          {file.patch
            ? <pre><code>{file.patch}{file.patchTruncated ? "\n… patch truncated" : ""}</code></pre>
            : <p>No textual patch is available for this file.</p>}
        </article>)}
        {!activeDetail.files.length && <p className="empty-copy">GitHub reported no changed files for this commit.</p>}
      </section>}
      {event.githubUrl && <a href={event.githubUrl} target="_blank" rel="noreferrer noopener">เปิด Commit บน GitHub</a>}
    </div>}
  </Modal>;
}

export function PullRequestDetail({
  projectId,
  repositoryId,
  pullRequestId,
  onClose,
}: {
  projectId: string;
  repositoryId: string;
  pullRequestId?: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Extract<PullRequestDetailResponse, { data: unknown }>["data"]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!pullRequestId) return;
    const controller = new AbortController();
    const load = async () => {
      await Promise.resolve();
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/projects/${projectId}/repositories/${repositoryId}/pull-requests/${pullRequestId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json() as PullRequestDetailResponse;
        if (!response.ok || isError(payload)) {
          setError(isError(payload) ? payload.error.message : "Unable to load Pull Request details.");
          return;
        }
        setDetail(payload.data);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError("Unable to load Pull Request details.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [projectId, pullRequestId, repositoryId, retry]);

  const activeDetail = detail?.pullRequest.id === pullRequestId ? detail : undefined;
  const pullRequest = activeDetail?.pullRequest;
  return <Modal
    open={Boolean(pullRequestId)}
    onClose={onClose}
    title={pullRequest ? `#${pullRequest.pull_request_number} ${pullRequest.title}` : "Pull Request details"}
    description={pullRequest ? `${pullRequest.source_branch} ไปยัง ${pullRequest.target_branch}` : undefined}
    footer={<Button onClick={onClose}>Close</Button>}
  >
    {loading && <TimelineLoadingSkeleton />}
    {!loading && error && <TimelineErrorState message={error} onRetry={() => setRetry(value => value + 1)} />}
    {!loading && pullRequest && activeDetail && <div className="pull-request-detail">
      <div className="pull-request-detail-badges">
        <Badge tone={pullRequest.merged_at ? "success" : pullRequest.state === "closed" ? "warning" : "brand"}>{pullRequest.merged_at ? "merged" : pullRequest.state}</Badge>
        {pullRequest.review_status && <Badge tone="neutral">{pullRequest.review_status}</Badge>}
        {pullRequest.is_draft && <Badge tone="warning">draft</Badge>}
      </div>
      {pullRequest.description && <p>{pullRequest.description}</p>}
      <dl>
        <div><dt>Author</dt><dd>{pullRequest.author_github_login ?? "Unavailable"}</dd></div>
        <div><dt>Created</dt><dd>{pullRequest.github_created_at ? new Date(pullRequest.github_created_at).toLocaleString("th-TH") : "Unavailable"}</dd></div>
        <div><dt>Updated</dt><dd>{pullRequest.github_updated_at ? new Date(pullRequest.github_updated_at).toLocaleString("th-TH") : "Unavailable"}</dd></div>
        <div><dt>Closed</dt><dd>{pullRequest.closed_at ? new Date(pullRequest.closed_at).toLocaleString("th-TH") : "—"}</dd></div>
        <div><dt>Merged</dt><dd>{pullRequest.merged_at ? new Date(pullRequest.merged_at).toLocaleString("th-TH") : "—"}</dd></div>
        <div><dt>Changes</dt><dd>+{pullRequest.additions} −{pullRequest.deletions} · {pullRequest.changed_files_count} files</dd></div>
      </dl>
      <section className="pull-request-reviews">
        <h3>Reviews ({activeDetail.reviews.length})</h3>
        {activeDetail.reviews.map(review => <article key={review.id}>
          <div><b>{review.reviewer_github_login ?? "Unknown reviewer"}</b><Badge tone={statusTone(review.review_state.toLocaleLowerCase() as TimelineEvent["status"])}>{review.review_state.replaceAll("_", " ").toLocaleLowerCase()}</Badge></div>
          {review.review_body && <p>{review.review_body}</p>}
          <small>{review.submitted_at ? new Date(review.submitted_at).toLocaleString("th-TH") : "Submission time unavailable"}</small>
        </article>)}
        {!activeDetail.reviews.length && <p className="empty-copy">No reviews have been synchronized.</p>}
      </section>
      <Card className="diff-unavailable"><h3>Related commits and diff unavailable</h3><p>{activeDetail.diff.reason}</p></Card>
      {pullRequest.github_url && <a href={pullRequest.github_url} target="_blank" rel="noreferrer noopener">เปิด Pull Request บน GitHub</a>}
    </div>}
  </Modal>;
}

export function RepositoryTimeline({
  projectId,
  repositoryId,
}: {
  projectId: string;
  repositoryId: string;
}) {
  const [repository, setRepository] = useState<Tables<"project_repositories">>();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selectedPullRequest, setSelectedPullRequest] = useState<string>();
  const [selectedCommit, setSelectedCommit] = useState<TimelineEvent>();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ tone: "success" | "danger"; text: string }>();

  const loadPage = useCallback(async (nextPage: number, signal?: AbortSignal) => {
    await Promise.resolve();
    if (nextPage === 0) setLoading(true);
    else setLoadingMore(true);
    if (nextPage === 0) setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/repositories/${repositoryId}/timeline?page=${nextPage}&limit=12`, {
        cache: "no-store",
        signal,
      });
      const payload = await response.json() as TimelineResponse;
      if (!response.ok || isError(payload)) {
        setError(isError(payload) ? payload.error.message : "Unable to load repository timeline.");
        return;
      }
      setRepository(payload.data.repository);
      setEvents(current => sortTimelineEvents(dedupeTimelineEvents(nextPage === 0 ? payload.data.events : [...current, ...payload.data.events])));
      setPage(payload.data.pagination.page);
      setHasMore(payload.data.pagination.hasMore);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError("Unable to load repository timeline.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [projectId, repositoryId]);

  useEffect(() => {
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => void loadPage(0, controller.signal));
    return () => {
      window.cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [loadPage, retry]);

  const visibleEvents = useMemo(
    () => sortTimelineEvents(dedupeTimelineEvents(events)).filter(isVisibleRepositoryActivity),
    [events],
  );
  const dateGroups = useMemo(() => groupTimelineEventsByDate(visibleEvents), [visibleEvents]);
  const commitCount = visibleEvents.filter(event => event.type === "commit_pushed").length;
  const pullRequestCount = new Set(visibleEvents.flatMap(event => event.pullRequestId ? [event.pullRequestId] : [])).size;
  const reviewCount = visibleEvents.filter(event => event.type === "review_submitted").length;
  const hasGitHubActivity = commitCount + pullRequestCount + reviewCount > 0;
  const view = timelineViewState(loading, error, visibleEvents.length);
  const synchronize = async () => {
    setSyncing(true);
    setSyncMessage(undefined);
    try {
      const response = await fetch(`/api/projects/${projectId}/repositories/${repositoryId}/sync`, {
        method: "POST",
      });
      const payload = await response.json() as SyncResponse;
      if (!response.ok || isError(payload)) {
        setSyncMessage({ tone: "danger", text: isError(payload) ? payload.error.message : "Repository synchronization failed." });
        setRetry(value => value + 1);
        return;
      }
      setSyncMessage({
        tone: "success",
        text: `Synchronized ${payload.data.commitsProcessed} commits, ${payload.data.pullRequestsProcessed} Pull Requests, and ${payload.data.branchesProcessed} branches.`,
      });
      setRetry(value => value + 1);
    } catch {
      setSyncMessage({ tone: "danger", text: "Repository synchronization failed." });
      setRetry(value => value + 1);
    } finally {
      setSyncing(false);
    }
  };

  return <>
    <header className="repository-page-header">
      <div>
        <Link href="/settings/integrations">กลับไปหน้า Repository</Link>
        <small>ประวัติ Repository</small>
        <h1>{repository?.github_full_name ?? "Repository"}</h1>
        <p>Shared commits, Pull Requests, and reviews from Supabase.</p>
      </div>
      <div className="repository-page-actions">
        <Button variant="primary" loading={syncing} onClick={() => void synchronize()}>Sync from GitHub</Button>
        {repository?.github_url && <a className="view-board" href={repository.github_url} target="_blank" rel="noreferrer noopener">เปิดบน GitHub</a>}
      </div>
    </header>
    {syncMessage && <p className={syncMessage.tone === "success" ? "form-success" : "form-error"} role={syncMessage.tone === "success" ? "status" : "alert"}>{syncMessage.text}</p>}

    {view === "loading" && <TimelineLoadingSkeleton />}
    {view === "error" && <TimelineErrorState message={error} onRetry={() => setRetry(value => value + 1)} />}
    {view === "empty" && <TimelineEmptyState />}
    {view === "timeline" && <>
      <section className="repository-timeline-summary" aria-label="Repository activity summary">
        <div><span>Default branch</span><strong>{repository?.default_branch ?? "—"}</strong></div>
        <div><span>Commits loaded</span><strong>{commitCount}</strong></div>
        <div><span>Pull Requests</span><strong>{pullRequestCount}</strong></div>
        <div><span>Reviews</span><strong>{reviewCount}</strong></div>
      </section>
      {!hasGitHubActivity && <Card className="timeline-sync-prompt">
        <div><strong>ยังไม่พบ commit จาก GitHub</strong><p>กด Sync from GitHub เพื่อดึง commit, Pull Request และ review ล่าสุดมาแสดงใน timeline</p></div>
        <Button variant="primary" loading={syncing} onClick={() => void synchronize()}>Sync now</Button>
      </Card>}
      <section className="repository-history-panel" aria-labelledby="repository-history-title">
        <header className="repository-history-header">
          <div><small>ประวัติ Repository</small><h2 id="repository-history-title">กิจกรรม</h2></div>
          <Badge tone="neutral">{visibleEvents.length} events</Badge>
        </header>
        <div className="repository-timeline-scroll" aria-label="Repository timeline">
          {dateGroups.map(group => <section className="timeline-date-group" key={group.key}>
            <header className="timeline-date-heading"><span aria-hidden="true" /><h3>Activity on {group.label}</h3></header>
            <div className="timeline-date-events">
              {group.events.map(event => {
                if (event.type.startsWith("pull_request_")) return <PullRequestTimelineCard key={event.id} event={event} onOpen={setSelectedPullRequest} />;
                if (event.type === "commit_pushed") return <CommitTimelineCard key={event.id} event={event} onOpen={setSelectedCommit} />;
                if (event.type === "review_submitted") return <ReviewTimelineCard key={event.id} event={event} onOpen={setSelectedPullRequest} />;
                return <SyncTimelineCard key={event.id} event={event} />;
              })}
            </div>
          </section>)}
        </div>
      </section>
    </>}
    {view === "timeline" && hasMore && <div className="github-load-more"><Button loading={loadingMore} onClick={() => void loadPage(page + 1)}>Load more activity</Button></div>}

    <PullRequestDetail projectId={projectId} repositoryId={repositoryId} pullRequestId={selectedPullRequest} onClose={() => setSelectedPullRequest(undefined)} />
    <CommitDetail
      projectId={projectId}
      repositoryId={repositoryId}
      event={selectedCommit}
      onClose={() => setSelectedCommit(undefined)}
    />
  </>;
}
