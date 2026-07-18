"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import type { Tables } from "@/lib/database.types";

export type ConnectedRepository = Tables<"project_repositories">;

type RepositoryListResponse =
  | { data: { repositories: ConnectedRepository[] } }
  | { error: { code: string; message: string } };

function isError(value: RepositoryListResponse): value is Extract<RepositoryListResponse, { error: unknown }> {
  return "error" in value;
}

export function RepositoryCard({
  projectId,
  repository,
}: {
  projectId: string;
  repository: ConnectedRepository;
}) {
  return <Card as="article" className="connected-repository-card">
    <div>
      <small>{repository.github_owner}</small>
      <h3>{repository.github_name}</h3>
      <p>{repository.default_branch ? `Default branch: ${repository.default_branch}` : "Default branch unavailable"}</p>
    </div>
    <div className="connected-repository-status">
      <Badge tone={repository.sync_status === "failed" ? "danger" : repository.sync_status === "success" ? "success" : "neutral"}>
        {repository.sync_status}
      </Badge>
      {repository.is_private && <Badge tone="warning">Private</Badge>}
    </div>
    <Link href={`/projects/${projectId}/repositories/${repository.id}`}>Open timeline →</Link>
  </Card>;
}

export function RepositoryList({
  projectId,
  refreshKey = 0,
  onLoaded,
}: {
  projectId: string;
  refreshKey?: number;
  onLoaded?: (repositories: ConnectedRepository[]) => void;
}) {
  const [repositories, setRepositories] = useState<ConnectedRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const load = useCallback(async (signal: AbortSignal) => {
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/repositories`, {
        cache: "no-store",
        signal,
      });
      const payload = await response.json() as RepositoryListResponse;
      if (!response.ok || isError(payload)) {
        setRepositories([]);
        setError(isError(payload) ? payload.error.message : "Unable to load connected repositories.");
        return;
      }
      setRepositories(payload.data.repositories);
      onLoaded?.(payload.data.repositories);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError("Unable to load connected repositories.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [onLoaded, projectId]);

  useEffect(() => {
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => void load(controller.signal));
    return () => {
      window.cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [load, refreshKey, retryKey]);

  return <section className="connected-repositories" aria-labelledby="connected-repositories-title">
    <div className="section-head">
      <div>
        <span>PROJECT REPOSITORIES</span>
        <h2 id="connected-repositories-title">Connected repositories</h2>
      </div>
      {!loading && !error && <Badge tone="neutral">{repositories.length}</Badge>}
    </div>
    {loading && <div className="connected-repository-skeleton" aria-label="Loading connected repositories"><span /><span /></div>}
    {!loading && error && <Card className="github-error"><h3>Connected repositories unavailable</h3><p role="alert">{error}</p><Button onClick={() => setRetryKey(value => value + 1)}>Retry</Button></Card>}
    {!loading && !error && repositories.length === 0 && <Card><EmptyState title="No connected repositories" description="Choose a GitHub repository below to share it with this project." /></Card>}
    {!loading && !error && repositories.length > 0 && <div className="connected-repository-grid">{repositories.map(repository => <RepositoryCard key={repository.id} projectId={projectId} repository={repository} />)}</div>}
  </section>;
}
