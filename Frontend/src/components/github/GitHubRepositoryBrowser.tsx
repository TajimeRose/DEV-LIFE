"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { connectGitHub, disconnectGitHub } from "@/app/auth/actions";
import { Badge, Button, Card, EmptyState, Input, Modal, Select } from "@/components/ui";
import { RepositoryList, type ConnectedRepository } from "@/components/github/RepositoryList";
import type { GitHubErrorCode } from "@/lib/github/repositories-handler";
import type { GitHubRepository } from "@/lib/github/repository";

type ApiError = { error: { code: GitHubErrorCode; message: string } };
type ApiSuccess = {
  data: {
    repositories: GitHubRepository[];
    pagination: { page: number; hasNext: boolean };
    privateReposEnabled: boolean;
  };
};

type Affiliation = "all" | "owner" | "collaborator" | "organization";
type Visibility = "all" | "public" | "private";
type Archived = "all" | "active" | "archived";

function isApiError(value: ApiError | ApiSuccess): value is ApiError {
  return "error" in value;
}

function RepositorySkeleton() {
  return <div className="github-repository-grid github-skeleton" aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
  </div>;
}

function GitHubSearchRepositoryCard({
  repository,
  connected,
  connecting,
  onConnect,
}: {
  repository: GitHubRepository;
  connected: boolean;
  connecting: boolean;
  onConnect: () => void;
}) {
  return <Card as="article" className={`github-repository-card ${connected ? "selected" : ""}`}>
    <div className="github-repository-head">
      <div>
        <small>{repository.ownerLogin}</small>
        <h2><a href={repository.htmlUrl} target="_blank" rel="noreferrer noopener">{repository.name}</a></h2>
      </div>
      <div className="github-repository-badges">
        <Badge tone={repository.private ? "warning" : "success"}>{repository.private ? "Private" : "Public"}</Badge>
        {repository.archived && <Badge>Archived</Badge>}
      </div>
    </div>
    <p>{repository.description || "ไม่มีคำอธิบาย repository"}</p>
    <footer>
      <span>{repository.language || "ไม่ระบุภาษา"}</span>
      <span>★ {repository.stargazersCount}</span>
      <span>⑂ {repository.forksCount}</span>
      <span>Branch: {repository.defaultBranch}</span>
      <Button size="sm" variant={connected ? "primary" : "secondary"} loading={connecting} disabled={connected} onClick={onConnect}>{connected ? "✓ Connected" : "Connect to project"}</Button>
    </footer>
  </Card>;
}

export function GitHubRepositoryBrowser({
  projectId,
  privateReposEnabled,
  callbackStatus,
}: {
  projectId: string;
  privateReposEnabled: boolean;
  callbackStatus?: string;
}) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [visibility, setVisibility] = useState<Visibility>(privateReposEnabled ? "all" : "public");
  const [affiliation, setAffiliation] = useState<Affiliation>("all");
  const [archived, setArchived] = useState<Archived>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError["error"]>();
  const [connected, setConnected] = useState(false);
  const [connectedIds, setConnectedIds] = useState<Set<number>>(new Set());
  const [connectingId, setConnectingId] = useState<number>();
  const [connectionRefresh, setConnectionRefresh] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<{ tone: "success" | "danger"; message: string }>();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(undefined);
      const query = new URLSearchParams({ page: "1", visibility, affiliation, archived });
      try {
        const response = await fetch(`/api/github/repositories?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json() as ApiError | ApiSuccess;
        if (isApiError(payload)) {
          setRepositories([]);
          setConnected(false);
          setError(payload.error);
          return;
        }
        setRepositories(payload.data.repositories);
        setPage(payload.data.pagination.page);
        setHasNext(payload.data.pagination.hasNext);
        setConnected(true);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError({ code: "GITHUB_UNAVAILABLE", message: "ไม่สามารถโหลดข้อมูลจาก GitHub ได้ในขณะนี้" });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [affiliation, archived, visibility]);

  const visibleRepositories = useMemo(() => {
    const value = search.trim().toLocaleLowerCase();
    if (!value) return repositories;
    return repositories.filter(repository =>
      [repository.name, repository.fullName, repository.description ?? ""]
        .some(field => field.toLocaleLowerCase().includes(value)),
    );
  }, [repositories, search]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    setError(undefined);
    const query = new URLSearchParams({
      page: String(nextPage),
      visibility,
      affiliation,
      archived,
    });
    try {
      const response = await fetch(`/api/github/repositories?${query}`, { cache: "no-store" });
      const payload = await response.json() as ApiError | ApiSuccess;
      if (isApiError(payload)) {
        setError(payload.error);
        return;
      }
      setRepositories(current => {
        const existing = new Set(current.map(repository => repository.id));
        return [...current, ...payload.data.repositories.filter(repository => !existing.has(repository.id))];
      });
      setPage(payload.data.pagination.page);
      setHasNext(payload.data.pagination.hasNext);
    } catch {
      setError({ code: "GITHUB_UNAVAILABLE", message: "ไม่สามารถโหลด repository เพิ่มได้" });
    } finally {
      setLoadingMore(false);
    }
  };

  const needsConnection = error?.code === "GITHUB_NOT_CONNECTED";
  const needsReconnect = error?.code === "GITHUB_AUTH_REQUIRED" || error?.code === "GITHUB_PERMISSION_REQUIRED";
  const connectedLoaded = useCallback((items: ConnectedRepository[]) => {
    setConnectedIds(new Set(items.map(item => item.github_repository_id)));
  }, []);
  const connectRepository = async (repository: GitHubRepository) => {
    setConnectingId(repository.id);
    setConnectionStatus(undefined);
    try {
      const response = await fetch(`/api/projects/${projectId}/repositories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubRepositoryId: repository.id }),
      });
      const payload = await response.json() as { error?: { code: string; message: string } };
      if (!response.ok) {
        setConnectionStatus({
          tone: payload.error?.code === "DUPLICATE_REPOSITORY" ? "success" : "danger",
          message: payload.error?.message ?? "Unable to connect this repository.",
        });
        if (payload.error?.code === "DUPLICATE_REPOSITORY") {
          setConnectedIds(current => new Set(current).add(repository.id));
        }
        return;
      }
      setConnectedIds(current => new Set(current).add(repository.id));
      setConnectionStatus({ tone: "success", message: `${repository.fullName} is now shared with this project.` });
      setConnectionRefresh(value => value + 1);
    } catch {
      setConnectionStatus({ tone: "danger", message: "Unable to connect this repository." });
    } finally {
      setConnectingId(undefined);
    }
  };

  return <>
    <header className="github-page-header">
      <div>
        <small>GITHUB · READ-ONLY</small>
        <h1>GitHub repositories</h1>
        <p>ค้นหาและดู repository ที่บัญชี GitHub ของคุณอนุญาตให้ DEV-LIFE เข้าถึง</p>
      </div>
      <div className="github-connection-actions">
        <Badge tone={connected ? "success" : "neutral"}>{connected ? "● Connected" : "○ Not connected"}</Badge>
        {(needsConnection || needsReconnect) && <form action={connectGitHub}><Button variant="primary" type="submit">{needsReconnect ? "Reconnect GitHub" : "Connect GitHub"}</Button></form>}
        {connected && <Button variant="danger" onClick={() => setConfirmDisconnect(true)}>Disconnect GitHub</Button>}
      </div>
    </header>

    <RepositoryList projectId={projectId} refreshKey={connectionRefresh} onLoaded={connectedLoaded} />

    <Card className="github-privacy">
      <span aria-hidden="true">◇</span>
      <div>
        <b>Read-only by design</b>
        <p>DEV-LIFE only reads repository information that you authorize through GitHub. It does not modify, delete, push to, or manage your repositories.</p>
        {privateReposEnabled && <small>Private repository access is optional and requires additional GitHub permission. DEV-LIFE will use this permission only to display repositories you are authorized to view.</small>}
      </div>
    </Card>

    {callbackStatus === "configuration_required" && <p className="form-error" role="alert">การเชื่อมต่อสำเร็จ แต่ server ยังไม่ได้ตั้งค่า GitHub token encryption key กรุณาตั้งค่าแล้วเชื่อมต่อใหม่</p>}
    {callbackStatus === "error" && <p className="form-error" role="alert">เชื่อมต่อ GitHub ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>}
    {callbackStatus === "disconnected" && <p className="form-success" role="status">ยกเลิกการเชื่อมต่อ GitHub ใน DEV-LIFE แล้ว</p>}
    {connectionStatus && <p className={connectionStatus.tone === "success" ? "form-success" : "form-error"} role={connectionStatus.tone === "success" ? "status" : "alert"}>{connectionStatus.message}</p>}

    {connected && <Card className="github-filters">
      <label><span>ค้นหา repository</span><Input value={search} maxLength={100} onChange={event => setSearch(event.target.value)} placeholder="ชื่อหรือคำอธิบาย…" /></label>
      <label><span>การมองเห็น</span><Select value={visibility} onChange={event => setVisibility(event.target.value as Visibility)}><option value="all">ทั้งหมด</option><option value="public">Public</option>{privateReposEnabled && <option value="private">Private</option>}</Select></label>
      <label><span>ความสัมพันธ์</span><Select value={affiliation} onChange={event => setAffiliation(event.target.value as Affiliation)}><option value="all">ทั้งหมด</option><option value="owner">Owner</option><option value="collaborator">Collaborator</option><option value="organization">Organization</option></Select></label>
      <label><span>สถานะ</span><Select value={archived} onChange={event => setArchived(event.target.value as Archived)}><option value="all">ทั้งหมด</option><option value="active">ใช้งานอยู่</option><option value="archived">Archived</option></Select></label>
    </Card>}

    <div aria-live="polite">
      {loading && <RepositorySkeleton />}
      {!loading && error && <Card className="github-error"><h2>โหลด GitHub ไม่สำเร็จ</h2><p>{error.message}</p>{needsReconnect && <form action={connectGitHub}><Button variant="primary">Reconnect GitHub</Button></form>}{needsConnection && <form action={connectGitHub}><Button variant="primary">Connect GitHub</Button></form>}</Card>}
      {!loading && !error && visibleRepositories.length === 0 && <Card><EmptyState title="ไม่พบ repository" description={search ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "บัญชีนี้ยังไม่มี repository ที่ตรงกับตัวกรอง"} /></Card>}
      {!loading && !error && visibleRepositories.length > 0 && <div className="github-repository-grid">{visibleRepositories.map(repository => <GitHubSearchRepositoryCard key={repository.id} repository={repository} connected={connectedIds.has(repository.id)} connecting={connectingId === repository.id} onConnect={() => void connectRepository(repository)} />)}</div>}
    </div>

    {!loading && !error && hasNext && <div className="github-load-more"><Button onClick={() => void loadMore()} loading={loadingMore}>Load more</Button></div>}

    <Modal
      open={confirmDisconnect}
      onClose={() => setConfirmDisconnect(false)}
      title="ยกเลิกการเชื่อมต่อ GitHub?"
      description="Disconnecting GitHub will stop DEV-LIFE from loading your repositories. It will not delete your GitHub repositories or your DEV-LIFE account."
      footer={<><Button onClick={() => setConfirmDisconnect(false)}>ยกเลิก</Button><form action={disconnectGitHub}><Button variant="danger" type="submit">Disconnect GitHub</Button></form></>}
    >
      <p>การดำเนินการนี้จะลบเฉพาะ token ชั่วคราวของ DEV-LIFE คุณสามารถเพิกถอน OAuth App เพิ่มเติมได้ที่ GitHub Settings → Applications</p>
    </Modal>
  </>;
}
