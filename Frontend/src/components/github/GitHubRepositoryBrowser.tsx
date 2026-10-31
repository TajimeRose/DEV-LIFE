"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { connectGitHub, disconnectGitHub } from "@/app/auth/actions";
import { Badge, Button, Card, EmptyState, Input, Modal, Select } from "@/components/ui";
import { RepositoryList, type ConnectedRepository } from "@/components/github/RepositoryList";
import type { GitHubErrorCode } from "@/lib/github/repositories-handler";
import type { GitHubRepository } from "@/lib/github/repository";
import { canEditProject } from "@/lib/projects/permissions";

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
  editable,
}: {
  repository: GitHubRepository;
  connected: boolean;
  connecting: boolean;
  onConnect: () => void;
  editable: boolean;
}) {
  return (
    <Card as="article" className={`github-repository-card ${connected ? "selected" : ""}`}>
      <div className="github-repository-head">
        <div className="github-repository-title-wrap">
          <small className="github-repository-owner">{repository.ownerLogin}</small>
          <h2>
            <a href={repository.htmlUrl} target="_blank" rel="noreferrer noopener">
              <span>{repository.name}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </h2>
        </div>
        <div className="github-repository-badges">
          <Badge tone={repository.private ? "warning" : "success"}>
            {repository.private ? "Private" : "Public"}
          </Badge>
          {repository.archived && <Badge tone="neutral">Archived</Badge>}
        </div>
      </div>
      <p className="github-repository-desc">{repository.description || "ไม่มีคำอธิบาย repository"}</p>
      <footer className="github-repository-footer">
        <div className="github-repository-meta">
          {repository.language && (
            <span className="repo-lang-pill">
              <span className="repo-lang-dot" aria-hidden="true" />
              {repository.language}
            </span>
          )}
          <span className="repo-stat-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {repository.stargazersCount}
          </span>
          <span className="repo-stat-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            {repository.forksCount}
          </span>
          <span className="repo-stat-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="6" r="3" />
              <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
              <line x1="12" y1="12" x2="12" y2="15" />
            </svg>
            {repository.defaultBranch}
          </span>
        </div>
        <Button
          size="sm"
          variant={connected ? "secondary" : "primary"}
          loading={connecting}
          disabled={connected || !editable}
          onClick={onConnect}
          className="repo-connect-btn"
        >
          {connected ? "เชื่อมต่อแล้ว" : editable ? "เชื่อมกับโปรเจกต์" : "อ่านอย่างเดียว"}
        </Button>
      </footer>
    </Card>
  );
}

export function GitHubRepositoryBrowser({
  projectId,
  projectRole,
  privateReposEnabled,
  callbackStatus,
}: {
  projectId: string;
  projectRole: string;
  privateReposEnabled: boolean;
  callbackStatus?: string;
}) {
  const editable = canEditProject(projectRole);
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
    if (!editable || connectingId !== undefined) return;
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
        <small>GitHub แบบอ่านอย่างเดียว</small>
        <h1>Repository</h1>
        <p>ค้นหาและดู Repository ที่บัญชี GitHub ของคุณอนุญาตให้ DEV LIFE เข้าถึง</p>
      </div>
      <div className="github-connection-actions">
        <Badge tone={connected ? "success" : "neutral"}>{connected ? "เชื่อมต่อแล้ว" : "ยังไม่ได้เชื่อมต่อ"}</Badge>
        {(needsConnection || needsReconnect) && <form action={connectGitHub}><Button variant="primary" type="submit">{needsReconnect ? "เชื่อมต่อ GitHub อีกครั้ง" : "เชื่อมต่อ GitHub"}</Button></form>}
        {connected && editable && <Button variant="danger" onClick={() => setConfirmDisconnect(true)}>ยกเลิกการเชื่อมต่อ</Button>}
      </div>
    </header>

    <RepositoryList projectId={projectId} refreshKey={connectionRefresh} onLoaded={connectedLoaded} />

    <Card className="github-privacy">
      <span aria-hidden="true">01</span>
      <div>
        <b>เข้าถึงแบบอ่านอย่างเดียว</b>
        <p>DEV LIFE อ่านเฉพาะข้อมูล Repository ที่คุณอนุญาตผ่าน GitHub และไม่แก้ไข ลบ หรือ Push ข้อมูล</p>
        {privateReposEnabled && <small>การเข้าถึง Private Repository เป็นตัวเลือกและต้องได้รับสิทธิ์เพิ่มเติม โดยใช้เพื่อแสดงเฉพาะ Repository ที่คุณมีสิทธิ์ดู</small>}
      </div>
    </Card>

    {callbackStatus === "configuration_required" && <p className="form-error" role="alert">การเชื่อมต่อสำเร็จ แต่ server ยังไม่ได้ตั้งค่า GitHub token encryption key กรุณาตั้งค่าแล้วเชื่อมต่อใหม่</p>}
    {callbackStatus === "error" && <p className="form-error" role="alert">เชื่อมต่อ GitHub ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>}
    {callbackStatus === "disconnected" && <p className="form-success" role="status">ยกเลิกการเชื่อมต่อ GitHub ใน DEV-LIFE แล้ว</p>}
    {connectionStatus && <p className={connectionStatus.tone === "success" ? "form-success" : "form-error"} role={connectionStatus.tone === "success" ? "status" : "alert"}>{connectionStatus.message}</p>}

    {connected && (
      <Card className="github-filters">
        <div className="github-filters-search">
          <label htmlFor="repo-search-input">ค้นหา repository</label>
          <div className="search-input-wrap">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <Input
              id="repo-search-input"
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาชื่อ หรือคำอธิบาย repository…"
            />
          </div>
        </div>
        <div className="github-filters-controls">
          <label>
            <span>การมองเห็น</span>
            <Select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as Visibility)}
            >
              <option value="all">ทั้งหมด</option>
              <option value="public">Public</option>
              {privateReposEnabled && <option value="private">Private</option>}
            </Select>
          </label>
          <label>
            <span>สิทธิ์</span>
            <Select
              value={affiliation}
              onChange={(event) => setAffiliation(event.target.value as Affiliation)}
            >
              <option value="all">ทั้งหมด</option>
              <option value="owner">Owner</option>
              <option value="collaborator">Collaborator</option>
              <option value="organization">Organization</option>
            </Select>
          </label>
          <label>
            <span>สถานะ</span>
            <Select
              value={archived}
              onChange={(event) => setArchived(event.target.value as Archived)}
            >
              <option value="all">ทั้งหมด</option>
              <option value="active">ใช้งานอยู่</option>
              <option value="archived">Archived</option>
            </Select>
          </label>
        </div>
      </Card>
    )}

    <div aria-live="polite">
      {loading && <RepositorySkeleton />}
      {!loading && error && <Card className="github-error"><h2>โหลด GitHub ไม่สำเร็จ</h2><p>{error.message}</p>{needsReconnect && <form action={connectGitHub}><Button variant="primary">Reconnect GitHub</Button></form>}{needsConnection && <form action={connectGitHub}><Button variant="primary">Connect GitHub</Button></form>}</Card>}
      {!loading && !error && visibleRepositories.length === 0 && <Card><EmptyState title="ไม่พบ repository" description={search ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "บัญชีนี้ยังไม่มี repository ที่ตรงกับตัวกรอง"} /></Card>}
       {!loading && !error && visibleRepositories.length > 0 && <div className="github-repository-grid">{visibleRepositories.map(repository => <GitHubSearchRepositoryCard key={repository.id} repository={repository} connected={connectedIds.has(repository.id)} connecting={connectingId === repository.id} editable={editable} onConnect={() => void connectRepository(repository)} />)}</div>}
    </div>

    {!loading && !error && hasNext && <div className="github-load-more"><Button onClick={() => void loadMore()} loading={loadingMore}>Load more</Button></div>}

     <Modal
      open={confirmDisconnect}
      onClose={() => setConfirmDisconnect(false)}
      title="ยกเลิกการเชื่อมต่อ GitHub?"
      description="DEV LIFE จะหยุดโหลดข้อมูล Repository แต่จะไม่ลบ Repository หรือบัญชีของคุณ"
      footer={<><Button onClick={() => setConfirmDisconnect(false)}>ยกเลิก</Button><form action={disconnectGitHub}><Button variant="danger" type="submit">ยืนยันการยกเลิก</Button></form></>}
    >
      <p>การดำเนินการนี้จะลบเฉพาะ Token ของ DEV LIFE คุณสามารถเพิกถอน OAuth App เพิ่มเติมได้ใน GitHub Settings ส่วน Applications</p>
    </Modal>
  </>;
}
