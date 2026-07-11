"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { navigation, newsItems } from "@/lib/workspace";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => [...navigation.map(x => ({ title: x.label, type: "หน้า", href: x.href })), ...newsItems.map(x => ({ title: x.title, type: "ข่าว Demo", href: "/news" }))].filter(x => x.title.toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPalette(x => !x); }
      if (event.key === "Escape") { setPalette(false); setMobile(false); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const go = (href: string) => { router.push(href); setPalette(false); setMobile(false); setQuery(""); };
  return <main className="app-shell">
    <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}><Link className="brand" href="/dashboard"><span>DL</span><b>DEV LIFE</b></Link><Link className="new-button" href="/notes">＋ New note</Link><nav>{navigation.map(item => <Link key={item.href} className={pathname === item.href ? "active" : ""} href={item.href} onClick={() => setMobile(false)}><span>{item.icon}</span>{item.label}</Link>)}</nav><div className="repo-card"><small>DEMO REPOSITORY</small><b>dev-life / workspace</b><span>Read-only · รอเชื่อมต่อ</span></div></aside>
    {mobile && <button className="scrim" aria-label="ปิดเมนู" onClick={() => setMobile(false)} />}
    <section className="workspace"><header className="topbar"><button className="mobile-toggle" aria-label="เปิดเมนู" onClick={() => setMobile(true)}>☰</button><button className="search-trigger" onClick={() => setPalette(true)}>⌕ <span>Search workspace...</span><kbd>⌘ K</kbd></button><div className="top-actions"><Link href="/ai-tools">✦ Ask AI <small>Demo</small></Link><button className="avatar">TJ</button></div></header><div className="content">{children}</div></section>
    {palette && <div className="modal-layer" role="dialog" aria-modal="true" onMouseDown={() => setPalette(false)}><section className="palette" onMouseDown={e => e.stopPropagation()}><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหา workspace..." /><div className="palette-results"><p>{query ? "RESULTS" : "QUICK ACTIONS"}</p>{(query ? results : navigation.slice(0, 6).map(x => ({ title: x.label, type: "เปิดหน้า", href: x.href }))).map(item => <button key={`${item.href}-${item.title}`} onClick={() => go(item.href)}><span><b>{item.title}</b><small>{item.type}</small></span><kbd>↵</kbd></button>)}</div></section></div>}
  </main>;
}

export function Heading({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: React.ReactNode }) { return <div className="heading"><div><small>{eyebrow}</small><h1>{title}</h1><p>{text}</p></div>{action}</div>; }
export function DemoBadge({ children = "Demo · รอเชื่อมต่อ" }: { children?: React.ReactNode }) { return <span className="readonly">{children}</span>; }
