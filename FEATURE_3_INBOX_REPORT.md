# รายงานผลการพัฒนา: ฟีเจอร์ Inbox / Quick Idea Capture (Feature 3)

**วันที่:** 25 สิงหาคม 2026  
**สถานะ:** ✅ เสร็จสมบูรณ์ (Completed)

---

## 📌 สรุปสิ่งที่มีการเปลี่ยนแปลง

ก่อนหน้านี้หน้า `/inbox` (กล่องรับไอเดีย) เป็น Demo Page ที่เก็บข้อมูลไว้ในหน่วยความจำของเบราว์เซอร์เท่านั้น (React state ในหน่วยความจำ) เมื่อผู้ใช้รีเฟรชหน้าต่าง ข้อมูลไอเดียทั้งหมดจะสูญหายทันที

เราได้พัฒนาให้หน้า Inbox ทำงานร่วมกับฐานข้อมูล **Supabase จริง** พร้อมเพิ่มฟังก์ชันในการแปลงไอเดียให้กลายเป็น **งาน (Task)** หรือ **โน้ต (Note)** ได้ในคลิกเดียว

---

## 🛠️ รายละเอียดการพัฒนา

1. **Backend & Server Actions (`src/app/actions/data.ts`)**
   - พัฒนาระบบจัดเก็บไอเดียลงในตาราง `activities` (โดยใช้ `entity_type: "idea"` และ `action: "captured"`):
     - `createIdea(projectId, text)` — บันทึกไอเดียใหม่ลงฐานข้อมูล
     - `getIdeas(projectId)` — ดึงรายการไอเดียทั้งหมดในโปรเจกต์ เรียงจากล่าสุดไปเก่าสุด
     - `deleteIdea(id)` — ลบไอเดียที่ไม่ต้องการ
     - `convertIdeaToTask(ideaId, projectId, text)` — สร้าง Task ใหม่จากข้อความไอเดีย และลบออกจาก Inbox อัตโนมัติ
     - `convertIdeaToNote(ideaId, projectId, text)` — สร้าง Note ใหม่จากข้อความไอเดีย (นำบรรทัดแรกมาเป็นชื่อโน้ต) และลบออกจาก Inbox อัตโนมัติ

2. **UI Component (`ConnectedInbox` ใน `src/components/connected-features.tsx`)**
   - กล่องพิมพ์บันทึกไอเดียด่วนพร้อมปุ่มบันทึก
   - รายการการ์ดไอเดียที่ถูกจัดเก็บ แสดงวันและเวลาที่บันทึก
   - ปุ่มลัดสำหรับการแปลงข้อมูล:
     - 📋 **"แปลงเป็น Task"** — สร้างงานลงใน Checklists/Board ทันที
     - 📝 **"แปลงเป็น Note"** — สร้างโน้ตใหม่ใน Notes Editor ทันที
     - 🗑️ **"ลบ"** — ลบไอเดีย
   - รองรับ **Supabase Realtime** — เมื่อมีการเพิ่มหรือลบไอเดียจากหน้าจออื่น รายการจะอัปเดตแบบอัตโนมัติ

3. **Page Integration & Icons (`src/app/(workspace)/inbox/page.tsx`, `icons.tsx`, `workspace.ts`)**
   - ปรับหน้า `/inbox` ให้โหลดข้อมูลจริงจากฐานข้อมูลตอน Render
   - เพิ่ม SVG Icon `inbox` และเพิ่มเมนู **"กล่องไอเดีย"** ลงใน Sidebar เมนูหลัก

---

## 🚀 สรุปภาพรวมความคืบหน้าของทั้ง 3 ฟีเจอร์

| ฟีเจอร์ | รายละเอียด | สถานะ |
|---|---|---|
| **1. Workspace Search** | ค้นหาจริงจาก Supabase (Tasks, Notes, Flowcharts, Activities) | ✅ เสร็จสมบูรณ์ |
| **2. Task Detail Modal** | ดู/แก้ไขรายละเอียด Task, กำหนดวันส่ง, เชื่อม Git Branch/PR/Commit | ✅ เสร็จสมบูรณ์ |
| **3. Inbox Persistence** | บันทึกไอเดียด่วนลง Database พร้อมปุ่มแปลงเป็น Task หรือ Note | ✅ เสร็จสมบูรณ์ |
