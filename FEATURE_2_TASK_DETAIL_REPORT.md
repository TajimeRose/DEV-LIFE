# รายงานผลการพัฒนา: ฟีเจอร์ Task Detail Modal / Panel (Feature 2)

**วันที่:** 25 สิงหาคม 2026  
**สถานะ:** ✅ เสร็จสมบูรณ์ (Completed)

---

## 📌 สรุปสิ่งที่มีการเปลี่ยนแปลง

ก่อนหน้านี้ ตาราง `tasks` ในฐานข้อมูล Supabase มีการออกแบบคอลัมน์ไว้รองรับข้อมูลอย่างครบถ้วน เช่น `description`, `due_date`, `branch_name`, `linked_commit_sha`, `linked_pull_request_number` แต่บน UI แสดงเฉพาะชื่องานและระดับความสำคัญเท่านั้น และยังไม่มีหน้าต่างสำหรับเปิดดูหรือแก้ไขข้อมูลเชิงลึก

เราได้สร้าง **Task Detail Modal / Panel** เพื่อเปิดให้ผู้ใช้สามารถดูและจัดการข้อมูลเหล่านี้ได้อย่างเต็มรูปแบบ

---

## 🛠️ รายละเอียดการพัฒนา

1. **Validation Schema & Action (`src/app/actions/data.ts`)**
   - อัปเดต `taskInput` Zod schema ให้รองรับ Field เพิ่มเติม:
     - `description` (รายละเอียดงาน)
     - `due_date` (วันกำหนดส่ง)
     - `branch_name` (ชื่อ Git Branch ที่เกี่ยวข้อง)
     - `linked_commit_sha` (Git Commit SHA)
     - `linked_pull_request_number` (หมายเลข Pull Request บน GitHub)
   - ส่งออก `deleteTask` ให้คอมโพเนนต์สามารถเรียกใช้งานเพื่อลบ Task ที่ไม่ต้องการได้

2. **Task Detail Modal Component (`src/components/connected-features.tsx`)**
   - สร้างคอมโพเนนต์ `TaskDetailModal`:
     - ฟอร์มแก้ไขชื่องานและรายละเอียดงาน (Textarea)
     - เลือกสถานะ (รอทำ / กำลังทำ / ตรวจสอบ / เสร็จแล้ว)
     - เลือกระดับความสำคัญ (ทั่วไป / สำคัญ / สำคัญมาก)
     - กำหนดวันส่ง (Date Picker)
     - กล่องเชื่อมโยง Git/GitHub: ระบุ Branch, Commit SHA และ PR Number
     - ปุ่มลบงาน (Delete Task) พร้อมระบบยืนยันความปลอดภัยก่อนลบ
     - ป้องกันการบันทึกระหว่างรอการประมวลผล (Loading State)

3. **Checklist View Integration (`ConnectedTasks`)**
   - คลิกที่ชื่องาน หรือคลิกปุ่ม **"แก้ไข"** ด้านขวา เพื่อเปิด Task Detail Modal
   - แสดง Badge และไอคอนบอกข้อมูลสำคัญเพิ่มเติมใต้ชื่องาน เช่น:
     - 📅 กำหนดส่ง (`due_date`)
     - 🌿 กิ่ง Git (`branch_name`)
     - 🔀 หมายเลข Pull Request (`linked_pull_request_number`)

4. **Kanban Board Integration (`ConnectedBoard`)**
   - คลิกที่การ์ดใน Kanban Board เพื่อเปิด Task Detail Modal ได้ทันที
   - แสดงข้อมูลวันกำหนดส่ง, Branch และ PR บนตัวการ์ดในบอร์ด
   - อัปเดตสถานะแบบ Real-time ร่วมกับ Supabase Realtime

---

## 🚀 แผนการพัฒนาถัดไปที่แนะนำ

- **ฟีเจอร์ 3:** **Inbox / Idea Capture Persistence** — เชื่อมโยงระบบบันทึกไอเดีย/ความคิดด่วนลงฐานข้อมูลจริง แทนที่จะเก็บไว้แค่ใน Local Storage หรือ Memory
