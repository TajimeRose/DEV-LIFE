"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, PageHeader, ToastProvider } from "@/components/ui";
import { Icon } from "@/components/ui/icons";
import { navigation } from "@/lib/workspace";

function isCurrentRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  if (href === "/flowchart") {
    return pathname === href || pathname.includes("/flowcharts");
  }
  if (href === "/settings/integrations") {
    return (
      pathname === href ||
      pathname.includes("/repositories/") ||
      pathname === "/github"
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceShell({
  children,
  projectName,
}: {
  children: React.ReactNode;
  projectName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const paletteRef = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(
    () =>
      navigation
        .map((item) => ({
          title: item.label,
          type: item.group === "Workspace" ? "พื้นที่ทำงาน" : "เครื่องมือ",
          href: item.href,
        }))
        .filter((item) =>
          item.title.toLocaleLowerCase("th").includes(query.toLocaleLowerCase("th")),
        ),
    [query],
  );
  const visible = query
    ? results
    : navigation.slice(0, 6).map((item) => ({
        title: item.label,
        type: item.group === "Workspace" ? "พื้นที่ทำงาน" : "เครื่องมือ",
        href: item.href,
      }));

  useEffect(() => {
    const saved = window.localStorage.getItem("sidebar-collapsed");
    const frame = window.requestAnimationFrame(() =>
      setCollapsed(saved !== null ? saved === "true" : window.innerWidth < 1024),
    );
    const shortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setActive(0);
        setPalette((current) => !current);
      }
      if (event.key === "Escape") {
        setPalette(false);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", shortcut);
    };
  }, []);

  useEffect(() => {
    if (!palette) return;
    const previousOverflow = document.body.style.overflow;
    const searchTrigger = searchTriggerRef.current;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !paletteRef.current) return;
      const controls = Array.from(
        paletteRef.current.querySelectorAll<HTMLElement>(
          "input, button:not([disabled])",
        ),
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = previousOverflow;
      searchTrigger?.focus();
    };
  }, [palette]);

  const go = (href: string) => {
    router.push(href);
    setPalette(false);
    setMobile(false);
    setQuery("");
  };

  const toggleCollapsed = () =>
    setCollapsed((current) => {
      window.localStorage.setItem("sidebar-collapsed", String(!current));
      return !current;
    });

  const groups = [
    { key: "Workspace" as const, label: "พื้นที่ทำงาน" },
    { key: "Tools" as const, label: "จัดการ" },
  ];

  return (
    <ToastProvider>
      <main className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
        <aside
          id="workspace-navigation"
          className={`sidebar ${mobile ? "sidebar-open" : ""}`}
        >
          <div className="sidebar-head">
            <Link className="brand" href="/dashboard">
              <Image
                src="/Logo.png"
                alt="Dev Life"
                width={42}
                height={42}
                priority
              />
              <div>
                <b>DEV LIFE</b>
                <small>พื้นที่ทำงานของนักพัฒนา</small>
              </div>
            </Link>
            <button
              className="collapse-button"
              aria-label={collapsed ? "ขยายแถบเมนู" : "พับแถบเมนู"}
              aria-expanded={!collapsed}
              aria-controls="workspace-navigation"
              onClick={() =>
                mobile ? setMobile(false) : toggleCollapsed()
              }
            >
              <span aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>
          </div>

          <Link className="project-switcher" href="/projects">
            <small>โปรเจกต์ปัจจุบัน</small>
            <b>{projectName || "ยังไม่มีโปรเจกต์"}</b>
            <span>เปลี่ยนโปรเจกต์</span>
          </Link>

          <nav aria-label="เมนูหลัก">
            {groups.map((group) => (
              <section key={group.key}>
                <p>{group.label}</p>
                {navigation
                  .filter((item) => item.group === group.key)
                  .map((item) => {
                    const current = isCurrentRoute(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        className={current ? "active" : ""}
                        aria-current={current ? "page" : undefined}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        onClick={() => setMobile(false)}
                      >
                        <span className="nav-icon" aria-hidden="true">
                          <Icon name={item.icon} size={19} />
                        </span>
                        <span className="nav-label">{item.label}</span>
                      </Link>
                    );
                  })}
              </section>
            ))}
          </nav>

          <Link className="sidebar-settings-link" href="/settings">
            จัดการบัญชีและโปรเจกต์
          </Link>
        </aside>

        {mobile && (
          <button
            className="scrim"
            aria-label="ปิดเมนู"
            onClick={() => setMobile(false)}
          />
        )}

        <section className="workspace">
          <header className="topbar">
            <button
              className="mobile-toggle"
              aria-label="เปิดเมนู"
              aria-expanded={mobile}
              aria-controls="workspace-navigation"
              onClick={() => setMobile(true)}
            >
              <span aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>
            <div className="project-crumb">
              <span>โปรเจกต์</span>
              <b>{projectName || "สร้างโปรเจกต์"}</b>
            </div>
            <button
              ref={searchTriggerRef}
              className="search-trigger"
              aria-haspopup="dialog"
              onClick={() => {
                setActive(0);
                setPalette(true);
              }}
            >
              <Icon name="search" size={17} />
              <span className="search-trigger-label">ไปยังหน้า…</span>
              <span className="search-trigger-mobile">ค้นหาเมนู</span>
              <kbd>Ctrl K</kbd>
            </button>
            <div className="top-actions">
              <Link href="/checklists">เพิ่มงาน</Link>
            </div>
          </header>
          <div className="content">{children}</div>
        </section>

        {palette && (
          <div
            className="modal-layer"
            role="presentation"
            onMouseDown={() => setPalette(false)}
          >
            <section
              ref={paletteRef}
              className="palette"
              role="dialog"
              aria-modal="true"
              aria-label="ไปยังหน้า"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="palette-search-row">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setActive((current) =>
                        Math.min(current + 1, visible.length - 1),
                      );
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActive((current) => Math.max(current - 1, 0));
                    }
                    if (event.key === "Enter" && visible[active]) {
                      go(visible[active].href);
                    }
                  }}
                  placeholder="ค้นหาหน้าและเครื่องมือ…"
                  aria-label="ค้นหาหน้าและเครื่องมือ"
                  aria-controls="command-results"
                  aria-activedescendant={
                    visible[active] ? `command-${active}` : undefined
                  }
                />
                <button type="button" onClick={() => setPalette(false)}>
                  ปิด
                </button>
              </div>
              <div
                id="command-results"
                className="palette-results"
                role="listbox"
              >
                <p>{query ? "ผลการค้นหา" : "หน้าที่ใช้บ่อย"}</p>
                {visible.map((item, index) => (
                  <button
                    id={`command-${index}`}
                    role="option"
                    aria-selected={index === active}
                    className={index === active ? "focused" : ""}
                    key={`${item.href}-${item.title}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(item.href)}
                  >
                    <span>
                      <b>{item.title}</b>
                      <small>{item.type}</small>
                    </span>
                    <span className="palette-open-label">เปิด</span>
                  </button>
                ))}
                {!visible.length && <p>ไม่พบหน้าที่ค้นหา</p>}
              </div>
            </section>
          </div>
        )}
      </main>
    </ToastProvider>
  );
}

export function Heading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow?: string;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={text}
      action={action}
    />
  );
}

export function DemoBadge({
  children = "ข้อมูลตัวอย่าง",
}: {
  children?: React.ReactNode;
}) {
  return <span className="readonly">{children}</span>;
}

export { Button };
