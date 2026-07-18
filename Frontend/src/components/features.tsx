"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Tabs,
  Textarea,
  useToast,
} from "@/components/ui";
import { initialTasks, newsItems } from "@/lib/workspace";
import { DemoBadge, Heading } from "./workspace-shell";

const Panel = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <Card className={`feature-panel ${className}`}>{children}</Card>;

export function Templates() {
  const [used, setUsed] = useState("");
  const templates = [
    "ข้อกำหนดฟีเจอร์",
    "การตรวจสอบข้อผิดพลาด",
    "การออกแบบ API",
    "บอร์ด Sprint",
    "รายการตรวจ Pull Request",
    "แผนการเผยแพร่",
  ];

  return (
    <>
      <Heading
        eyebrow="ฟีเจอร์ทดลอง"
        title="แม่แบบ"
        text="หน้านี้ใช้ข้อมูลตัวอย่างและเก็บสถานะไว้เฉพาะในเบราว์เซอร์"
        action={<DemoBadge />}
      />
      {used && (
        <Panel>
          <b>สร้างแบบร่างจาก: {used}</b>
          <p>บริบท · เป้าหมาย · รายละเอียด · รายการตรวจสอบ</p>
        </Panel>
      )}
      <div className="template-grid">
        {templates.map((item, index) => (
          <Card as="article" key={item}>
            <Badge tone="brand">{String(index + 1).padStart(2, "0")}</Badge>
            <h2>{item}</h2>
            <p>โครงตัวอย่างสำหรับเริ่มจัดระเบียบข้อมูล</p>
            <Button variant="ghost" onClick={() => setUsed(item)}>
              ใช้แม่แบบ
            </Button>
          </Card>
        ))}
      </div>
    </>
  );
}

export function Search() {
  const [query, setQuery] = useState("");
  const sampleItems = [
    ...initialTasks.map((item) => ({ title: item.title, type: "งานตัวอย่าง" })),
    ...newsItems.map((item) => ({ title: item.title, type: "ข่าวตัวอย่าง" })),
    { title: "แผนเปิดตัว Beta", type: "โน้ตตัวอย่าง" },
    { title: "Pull Request การเริ่มต้นใช้งาน", type: "GitHub ตัวอย่าง" },
  ];
  const found = sampleItems.filter((item) =>
    item.title.toLocaleLowerCase("th").includes(query.toLocaleLowerCase("th")),
  );

  return (
    <>
      <Heading
        eyebrow="ฟีเจอร์ทดลอง"
        title="ค้นหา Workspace"
        text="ค้นหาเฉพาะข้อมูลตัวอย่างในหน้านี้ ยังไม่เชื่อมต่อข้อมูลจริง"
        action={<DemoBadge />}
      />
      <Panel>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ค้นหาข้อมูลตัวอย่าง…"
          aria-label="ค้นหาข้อมูลตัวอย่าง"
        />
        {found.map((item) => (
          <div className="search-row" key={`${item.type}-${item.title}`}>
            <b>{item.title}</b>
            <Badge>{item.type}</Badge>
          </div>
        ))}
        {!found.length && (
          <EmptyState
            title="ไม่พบผลลัพธ์"
            description="ลองเปลี่ยนคำค้นหา"
          />
        )}
      </Panel>
    </>
  );
}

export function Inbox() {
  const [text, setText] = useState("");
  const [items, setItems] = useState<string[]>([]);

  return (
    <>
      <Heading
        eyebrow="ฟีเจอร์ทดลอง"
        title="กล่องรับไอเดีย"
        text="รายการในหน้านี้เก็บไว้ชั่วคราวและจะหายเมื่อรีเฟรชหน้า"
        action={<DemoBadge>เก็บข้อมูลชั่วคราว</DemoBadge>}
      />
      <Card className="capture">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="เขียนไอเดีย ลิงก์ หรือข้อผิดพลาด…"
          aria-label="ข้อความที่ต้องการเก็บ"
        />
        <Button
          variant="primary"
          onClick={() => {
            if (text.trim()) {
              setItems((current) => [text.trim(), ...current]);
              setText("");
            }
          }}
        >
          เก็บไอเดีย
        </Button>
      </Card>
      <Panel>
        {items.map((item, index) => (
          <div className="search-row" key={`${index}-${item}`}>
            <b>{item}</b>
            <Button
              variant="ghost"
              onClick={() =>
                setItems((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              ลบ
            </Button>
          </div>
        ))}
        {!items.length && (
          <EmptyState
            title="ยังไม่มีไอเดีย"
            description="เพิ่มข้อความด้านบนเพื่อทดลองใช้งาน"
          />
        )}
      </Panel>
    </>
  );
}

export function ContextMap() {
  const [active, setActive] = useState("แผนเปิดตัว Beta");
  const sampleNodes = [
    "แผนเปิดตัว Beta",
    "ขั้นตอนเริ่มต้นใช้งาน",
    "Pull Request ตัวอย่าง",
    "Issue ตัวอย่าง",
  ];

  return (
    <>
      <Heading
        eyebrow="ฟีเจอร์ทดลอง"
        title="แผนที่บริบท"
        text="ความสัมพันธ์ด้านล่างเป็นข้อมูลตัวอย่างและยังไม่เชื่อมต่อข้อมูลจริง"
        action={<DemoBadge />}
      />
      <Card className="context-map">
        {sampleNodes.map((node, index) => (
          <div key={node}>
            {index > 0 && <span>เชื่อมกับ</span>}
            <Button
              className={active === node ? "active" : ""}
              onClick={() => setActive(node)}
            >
              {node}
            </Button>
          </div>
        ))}
        <Badge tone="brand">เลือก: {active}</Badge>
      </Card>
    </>
  );
}

export function News() {
  const [filter, setFilter] = useState("ทั้งหมด");
  const [saved, setSaved] = useState<number[]>([]);
  const toast = useToast();
  const items =
    filter === "ทั้งหมด"
      ? newsItems
      : newsItems.filter((item) => item.tag === filter);

  return (
    <>
      <Heading
        eyebrow="ฟีเจอร์ทดลอง"
        title="ข่าวสำหรับนักพัฒนา"
        text="ข่าวและบทสรุปทั้งหมดในหน้านี้เป็นข้อมูลตัวอย่าง"
        action={<DemoBadge />}
      />
      <Tabs
        label="ตัวกรองข่าว"
        items={["ทั้งหมด", "Web", "Security"].map((item) => ({
          value: item,
          label: item,
        }))}
        value={filter}
        onChange={setFilter}
      />
      <div className="news-grid">
        {items.map((item) => (
          <Card as="article" key={item.id}>
            <Badge tone="brand">
              {item.source} · {item.tag}
            </Badge>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <Button
              variant="ghost"
              onClick={() => {
                setSaved((current) => [...new Set([...current, item.id])]);
                toast("บันทึกไว้ในหน้านี้แล้ว");
              }}
            >
              {saved.includes(item.id) ? "บันทึกแล้ว" : "บันทึกชั่วคราว"}
            </Button>
          </Card>
        ))}
      </div>
    </>
  );
}
