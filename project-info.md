# DEV-LIFE

**DEV-LIFE** เป็นแพลตฟอร์มพื้นที่ทำงานสำหรับนักพัฒนา (Developer Workspace) ที่รวมเครื่องมือการจัดการโปรเจกต์ งาน เอกสาร และการเชื่อมต่อกับ GitHub ไว้ในที่เดียว

---

## 1. จุดประสงค์ (Purpose)
เพื่อสร้างระบบศูนย์กลางในการบริหารจัดการโปรเจกต์และติดตามสถานะงานสำหรับนักพัฒนา โดยรวมความสามารถของระบบเอกสาร (Notion-style), การจัดการงาน (Jira-style), บอร์ดจำลองสถานะงาน, การออกแบบไดอะแกรม/โฟลวชาร์ต และการดึงข้อมูลจากระบบควบคุมเวอร์ชัน (GitHub Repository Timeline) มาอยู่บนหน้าจอเดียว เพื่อช่วยเพิ่มประสิทธิภาพ ลดการสลับหน้าต่างทำงาน และทำความเข้าใจภาพรวมของโปรเจกต์ได้ดีขึ้น
op
---

## 2. ระบบ (System Architecture)
- **Frontend**: Next.js App Router (React 19, Tailwind CSS 4)
- **Backend & Database**: Supabase (PostgreSQL, Supabase Auth สำหรับการลงทะเบียนและเข้าสู่ระบบด้วยสิทธิ์ผู้ใช้/สมาชิกโปรเจกต์)
- **GitHub Integration**: เชื่อมต่อกับ GitHub REST API (มีระบบเข้ารหัส Token ปลอดภัยด้วย AES-GCM ฝั่ง Server)
- **State & Flowchart**: ใช้ `@xyflow/react` สำหรับสร้างและจัดการแผนภาพแบบโต้ตอบ (Interactive Flowchart)
- **Data Safety**: ระบบการจัดการสิทธิ์การเข้าถึงข้อมูลโปรเจกต์ (Project Owner และ Project Members) พร้อมระบบบันทึกเวอร์ชันย้อนหลัง (Versions) และบันทึกกิจกรรม (Activities/Audit Logs)

---

## 3. ฟังก์ชันหลัก (Core Features)
- **Workspace & Project Management**: ระบบเลือกโปรเจกต์ที่ใช้งานอยู่ (Active Project) และการกำหนดสิทธิ์สมาชิก (Owner & Members)
- **Task Management (Jira style)**: สร้าง แก้ไข และติดตามสถานะของงานภายในโปรเจกต์
- **Board View**: แสดงรายการงานและสถานะในรูปแบบคอลัมน์บอร์ดเพื่อจัดระเบียบการทำงานอย่างเป็นระบบ
- **Notion-style Notes**: เขียนและบันทึกเอกสารประกอบโปรเจกต์ โดยรองรับการจัดการประวัติการแก้ไข (Versions)
- **Interactive Flowcharts**: ตัวช่วยสร้างไดอะแกรมและแผนผังความคิด (Flowchart Editor) ที่สามารถลากเส้นเชื่อมโยงบล็อกเงื่อนไข ตัดสินใจ (Decision Box) และบันทึกค่าลงฐานข้อมูลอัตโนมัติ
- **GitHub Timeline & Synchronization**: ระบบซิงก์ข้อมูลคอมมิต (Commits), กิ่งพัฒนา (Branches), รายการดึงโค้ด (Pull Requests) และบทวิจารณ์ (PR Reviews) จาก GitHub มาแสดงผลบนไทม์ไลน์ในโปรเจกต์อย่างรวดเร็วโดยไม่ต้องดึงใหม่ทุกครั้ง
