"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logout } from "@/app/auth/actions";
import { navigation } from "@/lib/workspace";

export function WorkspaceShell({ children, email, projectName }: { children: React.ReactNode; email?: string; projectName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => navigation.map(x => ({ title: x.label, type: "หน้า", href: x.href })).filter(x => x.title.toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => {
    const saved = window.localStorage.getItem("sidebar-collapsed");
    const frame = window.requestAnimationFrame(() => setCollapsed(saved !== null ? saved === "true" : window.innerWidth < 1024));
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPalette(x => !x); }
      if (event.key === "Escape") { setPalette(false); setMobile(false); }
    };
    window.addEventListener("keydown", shortcut);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", shortcut);
    };
  }, []);
  const go = (href: string) => { router.push(href); setPalette(false); setMobile(false); setQuery(""); };
  const toggleCollapsed = () => setCollapsed(current => {
    window.localStorage.setItem("sidebar-collapsed", String(!current));
    return !current;
  });
  const groups = ["Workspace", "Tools"] as const;
  return <main className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside id="workspace-navigation" className={`sidebar ${mobile ? "sidebar-open" : ""}`}><div className="sidebar-head"><Link className="brand" href="/dashboard"><Image src="/Logo.png" alt="Dev Life" width={42} height={42} priority /><div><b>DEV LIFE</b><small>Project cockpit</small></div></Link><button className="collapse-button" aria-label={collapsed ? "ขยายแถบเมนู" : "พับแถบเมนู"} aria-expanded={!collapsed} aria-controls="workspace-navigation" onClick={() => mobile ? setMobile(false) : toggleCollapsed()}><i /><i /><i /></button></div><Link className="new-button" href="/notes"><span>+</span> New note</Link><div className="project-switcher"><small>CURRENT PROJECT</small><b>{projectName || "No project"}</b><span><i /> Active workspace</span></div><nav>{groups.map(group => <section key={group}><p>{group}</p>{navigation.filter(item => item.group === group).map(item => <Link key={item.href} className={pathname === item.href ? "active" : ""} href={item.href} onClick={() => setMobile(false)}><span>{item.icon}</span>{item.label}</Link>)}</section>)}</nav><div className="repo-card"><small>CONNECTED CONTEXT</small><b>dev-life / workspace</b><span><i /> Read-only preview</span></div></aside>
    {mobile && <button className="scrim" aria-label="ปิดเมนู" onClick={() => setMobile(false)} />}
    <section className="workspace"><header className="topbar"><button className="mobile-toggle" aria-label="เปิดเมนู" aria-expanded={mobile} aria-controls="workspace-navigation" onClick={() => setMobile(true)}>Menu</button><div className="project-crumb"><span>Projects</span><b>/ {projectName || "Create project"}</b></div><button className="search-trigger" onClick={() => setPalette(true)}><span>Search or jump to…</span><kbd>⌘ K</kbd></button><div className="top-actions"><Link href="/checklists">Add task</Link><details><summary aria-label="เปิดเมนูบัญชี">{email?.slice(0, 1).toUpperCase() || "U"}</summary><div><span>{email}</span><form action={logout}><button type="submit">Log out</button></form></div></details></div></header><div className="content">{children}</div></section>
    {palette && <div className="modal-layer" role="dialog" aria-modal="true" aria-label="ค้นหา workspace" onMouseDown={() => setPalette(false)}><section className="palette" onMouseDown={e => e.stopPropagation()}><input aria-label="คำค้นหา" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes, tasks, and tools…" /><div className="palette-results"><p>{query ? "RESULTS" : "QUICK ACTIONS"}</p>{(query ? results : navigation.slice(0, 6).map(x => ({ title: x.label, type: "เปิดหน้า", href: x.href }))).map(item => <button key={`${item.href}-${item.title}`} onClick={() => go(item.href)}><span><b>{item.title}</b><small>{item.type}</small></span><kbd>↵</kbd></button>)}</div></section></div>}
  </main>;
}

export function Heading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) { return <div className="heading"><div><small>{eyebrow}</small><h1>{title}</h1><p>{text}</p></div>{action}</div>; }
export function DemoBadge({ children = "Demo · รอเชื่อมต่อ" }: { children?: React.ReactNode }) { return <span className="readonly">{children}</span>; }
