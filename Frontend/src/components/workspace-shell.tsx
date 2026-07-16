"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, PageHeader, ToastProvider } from "@/components/ui";
import { navigation } from "@/lib/workspace";

export function WorkspaceShell({ children, projectName }: { children: React.ReactNode; projectName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => navigation.map(item => ({ title: item.label, type: "หน้า", href: item.href })).filter(item => item.title.toLowerCase().includes(query.toLowerCase())), [query]);
  const visible = query ? results : navigation.slice(0, 6).map(item => ({ title: item.label, type: "เปิดหน้า", href: item.href }));
  useEffect(() => {
    const saved = window.localStorage.getItem("sidebar-collapsed");
    const frame = window.requestAnimationFrame(() => setCollapsed(saved !== null ? saved === "true" : window.innerWidth < 1024));
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setActive(0); setPalette(current => !current); }
      if (event.key === "Escape") { setPalette(false); setMobile(false); }
    };
    window.addEventListener("keydown", shortcut);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("keydown", shortcut); };
  }, []);
  useEffect(() => { if (palette) window.requestAnimationFrame(() => searchRef.current?.focus()); }, [palette]);
  const go = (href: string) => { router.push(href); setPalette(false); setMobile(false); setQuery(""); };
  const toggleCollapsed = () => setCollapsed(current => { window.localStorage.setItem("sidebar-collapsed", String(!current)); return !current; });
  const groups = ["Workspace", "Tools"] as const;
  return <ToastProvider><main className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <aside id="workspace-navigation" className={`sidebar ${mobile ? "sidebar-open" : ""}`}><div className="sidebar-head"><Link className="brand" href="/dashboard"><Image src="/Logo.png" alt="Dev Life" width={42} height={42} priority /><div><b>DEV LIFE</b><small>Project cockpit</small></div></Link><button className="collapse-button" aria-label={collapsed ? "ขยายแถบเมนู" : "พับแถบเมนู"} aria-expanded={!collapsed} aria-controls="workspace-navigation" onClick={() => mobile ? setMobile(false) : toggleCollapsed()}><i /><i /><i /></button></div><Link className="project-switcher" href="/projects"><small>โปรเจกต์ที่กำลังเปิด</small><b>{projectName || "ยังไม่มีโปรเจกต์"}</b><span><i /> กดเพื่อสลับโปรเจกต์</span></Link><nav aria-label="เมนูหลัก">{groups.map(group => <section key={group}><p>{group}</p>{navigation.filter(item => item.group === group).map(item => <Link key={item.href} className={pathname === item.href ? "active" : ""} aria-current={pathname === item.href ? "page" : undefined} href={item.href} onClick={() => setMobile(false)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span className="nav-label">{item.label}</span></Link>)}</section>)}</nav><div className="repo-card"><small>CONNECTED CONTEXT</small><b>dev-life / workspace</b><span><i /> Read-only preview</span></div></aside>
    {mobile && <button className="scrim" aria-label="ปิดเมนู" onClick={() => setMobile(false)} />}
    <section className="workspace"><header className="topbar"><button className="mobile-toggle" aria-label="เปิดเมนู" aria-expanded={mobile} aria-controls="workspace-navigation" onClick={() => setMobile(true)}>Menu</button><div className="project-crumb"><span>Projects</span><b>/ {projectName || "Create project"}</b></div><button className="search-trigger" aria-haspopup="dialog" onClick={() => { setActive(0); setPalette(true); }}><span>Search or jump to…</span><kbd>⌘ K</kbd></button><div className="top-actions"><Link href="/checklists">Add task</Link></div></header><div className="content">{children}</div></section>
    {palette && <div className="modal-layer" role="presentation" onMouseDown={() => setPalette(false)}><section className="palette" role="dialog" aria-modal="true" aria-label="ค้นหา workspace" onMouseDown={event => event.stopPropagation()}><input ref={searchRef} value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setActive(current => Math.min(current + 1, visible.length - 1)); } if (event.key === "ArrowUp") { event.preventDefault(); setActive(current => Math.max(current - 1, 0)); } if (event.key === "Enter" && visible[active]) go(visible[active].href); }} placeholder="Search notes, tasks, and tools…" aria-label="คำค้นหา" aria-controls="command-results" aria-activedescendant={visible[active] ? `command-${active}` : undefined} /><div id="command-results" className="palette-results" role="listbox"><p>{query ? "RESULTS" : "QUICK ACTIONS"}</p>{visible.map((item, index) => <button id={`command-${index}`} role="option" aria-selected={index === active} className={index === active ? "focused" : ""} key={`${item.href}-${item.title}`} onMouseEnter={() => setActive(index)} onClick={() => go(item.href)}><span><b>{item.title}</b><small>{item.type}</small></span><kbd>↵</kbd></button>)}{!visible.length && <p>ไม่พบผลลัพธ์</p>}</div></section></div>}
  </main></ToastProvider>;
}

export function Heading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) { return <PageHeader eyebrow={eyebrow} title={title} description={text} action={action} />; }
export function DemoBadge({ children = "Demo · รอเชื่อมต่อ" }: { children?: React.ReactNode }) { return <span className="readonly">{children}</span>; }
export { Button };
