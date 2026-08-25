export type TemplateData = {
  id: string;
  title: string;
  category: string;
  description: string;
  noteContent: string;
  tasks: Array<{ title: string; priority: string; description?: string }>;
};

export const BUILTIN_TEMPLATES: TemplateData[] = [
  {
    id: "feature-spec",
    title: "Feature Specification (ข้อกำหนดฟีเจอร์)",
    category: "Planning",
    description: "โครงสร้างมาตรฐานสำหรับวางแผน พัฒนา และกำหนดขอบเขตของฟีเจอร์ใหม่",
    noteContent: `# ข้อกำหนดฟีเจอร์ (Feature Specification)

## 1. ปัญหาและที่มา (Problem Statement)
- อธิบายปัญหาที่ผู้ใช้กำลังเผชิญ
- ทำไมเราถึงต้องสร้างฟีเจอร์นี้

## 2. กลุ่มเป้าหมาย (Target Audience)
- ผู้ใช้งานหลักของฟีเจอร์นี้คือใคร

## 3. ขอบเขตและฟังก์ชันการทำงาน (Scope & Requirements)
- [ ] ความสามารถที่ 1
- [ ] ความสามารถที่ 2
- [ ] สิ่งที่ยังไม่ทำในเฟสนี้ (Out of Scope)

## 4. เกณฑ์ความสำเร็จ (Success Metrics)
- ตัวชี้วัดว่าฟีเจอร์นี้ทำงานสำเร็จตามเป้าหมาย
`,
    tasks: [
      { title: "สรุป UI/UX Wireframe และ Flow การใช้งาน", priority: "สำคัญมาก" },
      { title: "ออกแบบ Database Schema และ API Endpoint", priority: "สำคัญ" },
      { title: "พัฒนา Frontend Component และเชื่อมต่อ State", priority: "สำคัญ" },
      { title: "เขียน Unit / Integration Test และทำ QA", priority: "ทั่วไป" },
    ],
  },
  {
    id: "bug-triage",
    title: "Bug Triage & Investigation (ตรวจสอบข้อผิดพลาด)",
    category: "Quality",
    description: "ชุดแบบฟอร์มสืบสวนหาสาเหตุของบั๊ก และขั้นตอนการแก้ไขอย่างเป็นระบบ",
    noteContent: `# บันทึกการตรวจสอบข้อผิดพลาด (Bug Investigation)

## อาการที่พบ (Observed Behavior)
- สิ่งที่เกิดขึ้นจริง:

## สิ่งที่ควรจะเป็น (Expected Behavior)
- พฤติกรรมที่ถูกต้อง:

## วิธีทำซ้ำ (Steps to Reproduce)
1. เข้าไปที่หน้า...
2. คลิกปุ่ม...
3. สังเกตผลลัพธ์...

## สาเหตุหลัก (Root Cause Analysis)
- สาเหตุของปัญหาในเชิงเทคนิค:

## แผนการแก้ไข (Action Plan)
- วิธีแก้ไขและป้องกันไม่ให้เกิดซ้ำ:
`,
    tasks: [
      { title: "จำลองข้อผิดพลาดใน Local Environment", priority: "สำคัญมาก" },
      { title: "ตรวจสอบ Error Log และ Sentry/Supabase Log", priority: "สำคัญ" },
      { title: "เขียน Test Case เพื่อป้องกัน Regression", priority: "สำคัญ" },
      { title: "Deploy Hotfix และตรวจสอบผลบน Production", priority: "สำคัญมาก" },
    ],
  },
  {
    id: "api-design",
    title: "API Design & Contract (การออกแบบ API)",
    category: "Architecture",
    description: "แม่แบบออกแบบสัญญาระหว่าง Frontend และ Backend ให้ทีมเข้าใจตรงกัน",
    noteContent: `# เอกสารการออกแบบ API (API Design Document)

## ภาพรวม (Overview)
- วัตถุประสงค์ของ Endpoint นี้:

## Endpoints

### 1. [POST] /api/v1/...
- **คำอธิบาย:**
- **Request Body (JSON):**
\`\`\`json
{
  "key": "value"
}
\`\`\`
- **Response 200 OK:**
\`\`\`json
{
  "success": true,
  "data": {}
}
\`\`\`
- **Response 400 / 401 / 500:** Error format

## ความปลอดภัยและการจำกัดสิทธิ์ (Security & Auth)
- Role ที่สามารถเรียกใช้งานได้:
- Rate Limit:
`,
    tasks: [
      { title: "สร้าง API Route Handler และ Zod Validation Schema", priority: "สำคัญ" },
      { title: "ตรวจสอบ Authentication และ Authorization Check", priority: "สำคัญมาก" },
      { title: "เชื่อมต่อ Frontend เข้ากับ API", priority: "สำคัญ" },
    ],
  },
  {
    id: "sprint-kickoff",
    title: "Sprint Kickoff (เริ่มรอบการทำงานใหม่)",
    category: "Agile",
    description: "ชุดเตรียมความพร้อมสำหรับ Sprint ตั้งเป้าหมายและจัดลำดับงาน",
    noteContent: `# แผนการทำงาน Sprint (Sprint Planning)

## เป้าหมายของ Sprint (Sprint Goal)
- สิ่งสำคัญที่สุดที่ต้องส่งมอบในรอบนี้:

## สมาชิกในทีมและความรับผิดชอบ
- Frontend Lead:
- Backend / DB:
- QA / Review:

## ข้อตกลงร่วมกัน (Definition of Done)
- [ ] ผ่านการ Review โดยทีมอย่างน้อย 1 คน
- [ ] มีการเขียน Test ครอบคลุม
- [ ] ตรวจสอบการแสดงผลบน Mobile และ Desktop
`,
    tasks: [
      { title: "จัดสรรงานใน Kanban Board", priority: "สำคัญ" },
      { title: "ตรวจสอบ Blocking Issue จาก Sprint ที่แล้ว", priority: "สำคัญมาก" },
      { title: "นัดหมาย Sprint Demo & Retrospective", priority: "ทั่วไป" },
    ],
  },
  {
    id: "pr-checklist",
    title: "Pull Request Checklist (เกณฑ์ตรวจ PR)",
    category: "Engineering",
    description: "รายการตรวจสอบความเรียบร้อยของ Code ก่อน Merge เข้าสู่ Main Branch",
    noteContent: `# รายการตรวจทานโค้ด (Pull Request Review Checklist)

## ก่อนเปิด PR (Self-Review)
- [ ] โค้ดคอมไพล์ผ่านและไม่มี TypeScript Error
- [ ] รัน Linter / Formatting เรียบร้อย
- [ ] ไม่ทิ้ง \`console.log\` หรือ Sensitive Token ค้างไว้

## ด้านความปลอดภัย (Security Checklist)
- [ ] มีการตรวจสอบสิทธิ์การเข้าถึง (Authorization) ที่ Server-side
- [ ] มีการ Validate ข้อมูลนำเข้าด้วย Zod ก่อนประมวลผล
`,
    tasks: [
      { title: "รัน Automated Test Suite ให้ผ่าน 100%", priority: "สำคัญมาก" },
      { title: "ขอ Review จาก Maintainer ของโปรเจกต์", priority: "สำคัญ" },
      { title: "ทดสอบการทำงานบน Staging Environment", priority: "สำคัญ" },
    ],
  },
  {
    id: "release-plan",
    title: "Release & Deployment Plan (แผนการเผยแพร่)",
    category: "DevOps",
    description: "ขั้นตอนการ Deploy ขึ้น Production และแผนรองรับกรณีฉุกเฉิน (Rollback)",
    noteContent: `# แผนการเผยแพร่เวอร์ชันใหม่ (Release Checklist)

## เวอร์ชันและขอบเขต (Release Target)
- Version: v1.0.x
- วันที่เผยแพร่:

## ขั้นตอนก่อน Deploy (Pre-Deployment)
1. Backup ฐานข้อมูล
2. ตรวจสอบ Environment Variables ทั้งหมด

## ขั้นตอนระหว่าง Deploy (Deployment)
1. Trigger Production Build
2. Run Database Migration Scripts

## แผนการกู้คืน (Rollback Plan)
- หากพบปัญหาร้ายแรง ให้ Revert Commit และ Deploy เวอร์ชันก่อนหน้าทันที
`,
    tasks: [
      { title: "สร้าง Database Snapshot ก่อน Migration", priority: "สำคัญมาก" },
      { title: "Deploy ขึ้น Production และตรวจ Smoke Test", priority: "สำคัญมาก" },
      { title: "แจ้งสรุปการ Release ให้ผู้ใช้งานและทีมทราบ", priority: "ทั่วไป" },
    ],
  },
];