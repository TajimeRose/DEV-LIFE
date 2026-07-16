พัฒนาฟีเจอร์ Flowchart สำหรับโปรเจกต์ DEV-LIFE โดยใช้ Next.js, TypeScript, Supabase และ `@xyflow/react`

ฐานข้อมูล Supabase มีตาราง `public.flowcharts` และต้องใช้ชื่อคอลัมน์ให้ตรงตามนี้ทุกจุด ห้ามเปลี่ยนชื่อเอง

```ts
type FlowchartRecord = {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: FlowViewport;
  created_at: string;
  updated_at: string;
};
```

โครงสร้างฐานข้อมูล:

```text
flowcharts
- id
- user_id
- project_id
- name
- description
- nodes
- edges
- viewport
- created_at
- updated_at
```

## เป้าหมาย

สร้างระบบ Flowchart ที่ผู้ใช้ทั่วไปสามารถใช้งานได้ง่าย โดยเมื่อผู้ใช้สร้าง Flowchart ใหม่ ระบบต้องสร้าง Flowchart เริ่มต้นให้อัตโนมัติ ผู้ใช้ไม่ต้องลากสัญลักษณ์เองตั้งแต่เริ่มต้น แต่สามารถแก้ไขข้อความ เพิ่ม ลบ ย้าย และเชื่อมสัญลักษณ์ได้ภายหลัง

Flowchart ใหม่ต้องเริ่มต้นด้วยโครงสร้างพื้นฐานดังนี้:

```text
Start
  ↓
Process
  ↓
Decision
 ├─ Yes → Process
 └─ No  → End
```

## Default Nodes

เมื่อสร้าง Flowchart ใหม่ ให้กำหนดค่า `nodes` เริ่มต้นดังนี้:

```ts
const defaultNodes: FlowNode[] = [
  {
    id: "start-1",
    type: "start",
    position: { x: 400, y: 50 },
    data: {
      label: "Start",
      description: "จุดเริ่มต้นของกระบวนการ"
    }
  },
  {
    id: "process-1",
    type: "process",
    position: { x: 400, y: 200 },
    data: {
      label: "Process",
      description: "แก้ไขข้อความขั้นตอนการทำงาน"
    }
  },
  {
    id: "decision-1",
    type: "decision",
    position: { x: 400, y: 350 },
    data: {
      label: "Decision",
      description: "แก้ไขข้อความเงื่อนไข"
    }
  },
  {
    id: "process-yes-1",
    type: "process",
    position: { x: 200, y: 520 },
    data: {
      label: "Yes Process",
      description: "ขั้นตอนเมื่อเงื่อนไขเป็นจริง"
    }
  },
  {
    id: "end-yes-1",
    type: "end",
    position: { x: 200, y: 700 },
    data: {
      label: "End",
      description: "จุดสิ้นสุดของกระบวนการ"
    }
  },
  {
    id: "end-no-1",
    type: "end",
    position: { x: 600, y: 520 },
    data: {
      label: "End",
      description: "จุดสิ้นสุดเมื่อเงื่อนไขเป็นเท็จ"
    }
  }
];
```

## Default Edges

กำหนด `edges` เริ่มต้นดังนี้:

```ts
const defaultEdges: FlowEdge[] = [
  {
    id: "edge-start-process",
    source: "start-1",
    target: "process-1",
    type: "smoothstep",
    animated: false
  },
  {
    id: "edge-process-decision",
    source: "process-1",
    target: "decision-1",
    type: "smoothstep",
    animated: false
  },
  {
    id: "edge-decision-yes",
    source: "decision-1",
    target: "process-yes-1",
    sourceHandle: "yes",
    type: "smoothstep",
    label: "Yes"
  },
  {
    id: "edge-process-yes-end",
    source: "process-yes-1",
    target: "end-yes-1",
    type: "smoothstep"
  },
  {
    id: "edge-decision-no",
    source: "decision-1",
    target: "end-no-1",
    sourceHandle: "no",
    type: "smoothstep",
    label: "No"
  }
];
```

## TypeScript Types

สร้าง TypeScript types ให้ตรงกับข้อมูลที่บันทึกใน Supabase:

```ts
type FlowNodeType =
  | "start"
  | "end"
  | "process"
  | "decision"
  | "inputOutput"
  | "document"
  | "database"
  | "connector";

type FlowNodeData = {
  label: string;
  description?: string;
};

type FlowNode = {
  id: string;
  type: FlowNodeType;
  position: {
    x: number;
    y: number;
  };
  data: FlowNodeData;
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  label?: string;
  animated?: boolean;
};

type FlowViewport = {
  x: number;
  y: number;
  zoom: number;
};
```

## สัญลักษณ์พื้นฐาน

สร้าง Custom Nodes ตามหลัก Flowchart มาตรฐาน:

1. `start`

   * รูปวงรีหรือสี่เหลี่ยมขอบมน
   * ใช้สำหรับเริ่มต้นกระบวนการ
   * ข้อความเริ่มต้น `Start`

2. `end`

   * รูปวงรีหรือสี่เหลี่ยมขอบมน
   * ใช้สำหรับจบกระบวนการ
   * ข้อความเริ่มต้น `End`

3. `process`

   * รูปสี่เหลี่ยมผืนผ้า
   * ใช้แสดงขั้นตอนการทำงาน
   * ข้อความเริ่มต้น `Process`

4. `decision`

   * รูปสี่เหลี่ยมข้าวหลามตัด
   * ใช้แสดงเงื่อนไข
   * ต้องมีทางออก `Yes` และ `No`

5. `inputOutput`

   * รูปสี่เหลี่ยมด้านขนาน
   * ใช้แสดงข้อมูลเข้าและข้อมูลออก

6. `document`

   * รูปเอกสารที่ด้านล่างเป็นเส้นโค้ง

7. `database`

   * รูปทรงกระบอก
   * ใช้แสดงฐานข้อมูล

8. `connector`

   * รูปวงกลม
   * ใช้เชื่อม Flowchart ที่อยู่ห่างกัน

## การสร้าง Flowchart ใหม่

เมื่อผู้ใช้กดปุ่ม `สร้าง Flowchart` ให้เปิด Modal โดยมีข้อมูล:

```ts
type CreateFlowchartInput = {
  name: string;
  description: string;
  project_id: string;
};
```

เมื่อผู้ใช้ยืนยัน ให้ดึงผู้ใช้จาก Supabase Auth:

```ts
const {
  data: { user }
} = await supabase.auth.getUser();
```

จากนั้นบันทึกข้อมูลลงตาราง `flowcharts` โดยใช้ชื่อคอลัมน์ตรงตามฐานข้อมูล:

```ts
const newFlowchart = {
  user_id: user.id,
  project_id: projectId,
  name: flowchartName,
  description: flowchartDescription || null,
  nodes: defaultNodes,
  edges: defaultEdges,
  viewport: {
    x: 0,
    y: 0,
    zoom: 1
  }
};
```

ใช้คำสั่ง:

```ts
const { data, error } = await supabase
  .from("flowcharts")
  .insert(newFlowchart)
  .select()
  .single();
```

ห้ามใช้ชื่ออื่น เช่น:

```text
flowchartName
flowchartNodes
flowchartEdges
ownerId
projectId
```

ใน object ที่ส่งเข้า Supabase ต้องใช้:

```text
name
nodes
edges
user_id
project_id
description
viewport
```

## หน้ารายการ Flowchart

สร้างหน้ารายการ Flowchart ภายในแต่ละโปรเจกต์ โดย query ด้วย:

```ts
const { data, error } = await supabase
  .from("flowcharts")
  .select("*")
  .eq("project_id", projectId)
  .order("updated_at", { ascending: false });
```

ในแต่ละการ์ดให้แสดง:

* `name`
* `description`
* วันที่แก้ไขล่าสุดจาก `updated_at`
* จำนวน Node จาก `nodes.length`
* ปุ่มเปิด
* ปุ่มเปลี่ยนชื่อ
* ปุ่มทำสำเนา
* ปุ่มลบ

## หน้า Flowchart Editor

สร้างหน้าตาม route:

```text
/projects/[projectId]/flowcharts/[flowchartId]
```

โหลดข้อมูลด้วย:

```ts
const { data, error } = await supabase
  .from("flowcharts")
  .select("*")
  .eq("id", flowchartId)
  .eq("project_id", projectId)
  .single();
```

นำข้อมูลมาใช้ตรงชื่อ:

```ts
setNodes(data.nodes ?? []);
setEdges(data.edges ?? []);
setViewport(data.viewport ?? { x: 0, y: 0, zoom: 1 });
```

## การแก้ไขข้อความ

ผู้ใช้ต้องสามารถแก้ข้อความใน Node ได้ง่าย โดย:

* ดับเบิลคลิก Node เพื่อแก้ข้อความ
* หรือคลิก Node แล้วแก้ใน Properties Panel ด้านขวา
* กด Enter เพื่อบันทึก
* กด Escape เพื่อยกเลิก
* ต้องอัปเดตเฉพาะ `data.label`
* ห้ามเปลี่ยน `id`, `type` หรือ `position` โดยไม่จำเป็น

ตัวอย่าง:

```ts
const updateNodeLabel = (nodeId: string, label: string) => {
  setNodes((currentNodes) =>
    currentNodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              label
            }
          }
        : node
    )
  );
};
```

## Toolbar

สร้าง Toolbar สำหรับเพิ่มสัญลักษณ์ใหม่ โดยมี:

* Start
* End
* Process
* Decision
* Input / Output
* Document
* Database
* Connector

เมื่อเพิ่ม Node ให้สร้าง `id` ที่ไม่ซ้ำ เช่น:

```ts
const nodeId = `${nodeType}-${crypto.randomUUID()}`;
```

และใช้ค่าเริ่มต้นตาม type:

```ts
const defaultLabels: Record<FlowNodeType, string> = {
  start: "Start",
  end: "End",
  process: "Process",
  decision: "Decision",
  inputOutput: "Input / Output",
  document: "Document",
  database: "Database",
  connector: "Connector"
};
```

## การเชื่อม Node

ผู้ใช้ต้องสามารถลากเส้นเชื่อมระหว่าง Node ได้

ใช้:

```ts
const onConnect = useCallback(
  (connection: Connection) => {
    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          id: `edge-${crypto.randomUUID()}`,
          type: "smoothstep"
        },
        currentEdges
      )
    );
  },
  []
);
```

Decision Node ต้องมี Handle อย่างน้อย 2 จุด:

```text
Yes
No
```

และแสดงข้อความกำกับเส้นได้

## การบันทึกข้อมูล

ให้มีสถานะ:

```ts
type SaveStatus = "saved" | "saving" | "unsaved" | "error";
```

ตัวแปรหลัก:

```ts
const [nodes, setNodes] = useState<FlowNode[]>([]);
const [edges, setEdges] = useState<FlowEdge[]>([]);
const [viewport, setViewport] = useState<FlowViewport>({
  x: 0,
  y: 0,
  zoom: 1
});
const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
```

บันทึกกลับ Supabase ด้วย:

```ts
const { error } = await supabase
  .from("flowcharts")
  .update({
    name,
    description,
    nodes,
    edges,
    viewport,
    updated_at: new Date().toISOString()
  })
  .eq("id", flowchartId)
  .eq("user_id", user.id);
```

ให้รองรับ:

* ปุ่ม Save
* Auto-save หลังหยุดแก้ไขประมาณ 800–1200 milliseconds
* แสดงสถานะ `กำลังบันทึก`
* แสดงสถานะ `บันทึกแล้ว`
* แสดงสถานะ `ยังไม่ได้บันทึก`
* แสดง error ถ้าบันทึกไม่สำเร็จ

ต้องป้องกันการยิง update ทุกครั้งที่ผู้ใช้กำลังลาก Node โดยใช้ debounce

## Keyboard Shortcuts

รองรับ:

```text
Delete / Backspace = ลบ Node หรือ Edge ที่เลือก
Ctrl + S = บันทึก
Ctrl + Z = Undo
Ctrl + Shift + Z = Redo
Ctrl + D = ทำสำเนา Node
Escape = ยกเลิกการเลือกหรือปิดโหมดแก้ไข
```

ก่อนลบ Node สำคัญให้มี confirmation โดยเฉพาะ `start` และ `end`

## UX ที่ต้องการ

ออกแบบให้ใช้งานง่ายสำหรับผู้ใช้ที่ไม่เคยทำ Flowchart:

* เปิดมาเห็น Flowchart ตัวอย่างทันที
* ผู้ใช้สามารถแก้เพียงข้อความในแต่ละกล่องได้
* มี Tooltip อธิบายความหมายของแต่ละสัญลักษณ์
* มี Empty State ที่เข้าใจง่าย
* มีปุ่ม `รีเซ็ตเป็น Flowchart เริ่มต้น`
* มีปุ่ม `จัดเรียงอัตโนมัติ`
* มี MiniMap
* มี Controls สำหรับ Zoom
* มี Background Grid
* มี Fit View
* Properties Panel อยู่ด้านขวา
* Toolbar อยู่ด้านซ้ายหรือด้านบน
* Canvas ต้องเต็มพื้นที่และ responsive
* รองรับ Dark Mode
* ห้ามใช้สีที่ฉูดฉาดเกินไป
* UI ต้องสอดคล้องกับดีไซน์เดิมของ DEV-LIFE

## Auto Layout

เพิ่มปุ่ม `จัดเรียงอัตโนมัติ` เพื่อจัด Node จากบนลงล่าง โดยสามารถใช้ `dagre` หรือระบบคำนวณตำแหน่งเอง

หากใช้ dagre ให้ติดตั้ง:

```bash
npm install @dagrejs/dagre
```

ห้ามเปลี่ยน `id`, `data`, `source` หรือ `target` ระหว่างจัด layout ให้เปลี่ยนเฉพาะ `position`

## Reset Default Flowchart

สร้างฟังก์ชัน:

```ts
const resetToDefaultFlowchart = () => {
  setNodes(defaultNodes);
  setEdges(defaultEdges);
  setViewport({
    x: 0,
    y: 0,
    zoom: 1
  });
  setSaveStatus("unsaved");
};
```

ก่อนรีเซ็ตต้องแสดง Dialog เตือนว่าข้อมูลปัจจุบันจะถูกแทนที่

## Activity Log

หลังสร้าง Flowchart ให้เพิ่มข้อมูลลงตาราง `activities` ด้วยชื่อคอลัมน์เดิมของระบบ:

```ts
await supabase.from("activities").insert({
  user_id: user.id,
  project_id: projectId,
  action: "created",
  entity_type: "flowchart",
  entity_id: createdFlowchart.id,
  metadata: {
    name: createdFlowchart.name
  }
});
```

หลังแก้ไข ไม่ต้องเพิ่ม activity ทุกครั้งที่ลาก Node เพราะจะสร้างข้อมูลมากเกินไป ให้เพิ่ม activity เฉพาะเหตุการณ์สำคัญ เช่น:

* สร้าง Flowchart
* เปลี่ยนชื่อ
* ทำสำเนา
* ลบ
* รีเซ็ต Flowchart

## ความปลอดภัย

* ตรวจสอบ Supabase Auth ก่อนอ่านหรือบันทึกข้อมูล
* ห้ามใช้ Service Role Key บน Frontend
* ใช้ RLS ที่มีอยู่ใน Supabase
* ทุก update และ delete ต้องตรวจสอบ `user_id`
* ทุก query ต้องผูกกับ `project_id` หรือ `id` ที่ถูกต้อง
* ห้ามเชื่อถือ `user_id` ที่รับมาจาก URL หรือ Form
* ต้องใช้ `user.id` จาก Supabase Auth เท่านั้น

## สิ่งที่ต้องส่งมอบ

สร้างโค้ดที่ใช้งานได้จริงและแยกไฟล์เป็นระบบ เช่น:

```text
components/flowchart/
  FlowchartEditor.tsx
  FlowchartToolbar.tsx
  FlowchartPropertiesPanel.tsx
  FlowchartSaveStatus.tsx
  nodes/
    StartNode.tsx
    EndNode.tsx
    ProcessNode.tsx
    DecisionNode.tsx
    InputOutputNode.tsx
    DocumentNode.tsx
    DatabaseNode.tsx
    ConnectorNode.tsx

lib/flowchart/
  default-flowchart.ts
  flowchart-types.ts
  flowchart-layout.ts
  flowchart-service.ts

app/projects/[projectId]/flowcharts/
  page.tsx
  new/page.tsx
  [flowchartId]/page.tsx
```

ตรวจสอบโครงสร้างโปรเจกต์เดิมก่อนสร้างไฟล์ ห้ามสร้างระบบซ้ำกับ component หรือ Supabase client ที่มีอยู่แล้ว

ใช้ Supabase client ตัวเดิมของโปรเจกต์ และรักษารูปแบบ UI, naming convention, import alias และโครงสร้าง folder เดิม

ก่อนแก้ไข ให้ตรวจสอบโค้ดทั้งโปรเจกต์ว่า:

1. Supabase client อยู่ไฟล์ใด
2. ระบบ Auth ใช้วิธีใด
3. Route ของหน้า Project ใช้รูปแบบใด
4. Component UI เดิมมี Button, Dialog, Input, Textarea, Toast และ Card หรือไม่
5. ระบบ Activity มี service หรือ helper เดิมหรือไม่
6. โปรเจกต์ใช้ App Router หรือ Pages Router
7. มีระบบ Dark Mode อยู่แล้วหรือไม่

หลังตรวจสอบแล้วจึงลงมือแก้ไขให้เข้ากับระบบเดิม ห้ามเขียนโค้ดตัวอย่างลอย ๆ และห้ามสร้าง mock data

หลังทำเสร็จให้สรุป:

* ไฟล์ที่สร้าง
* ไฟล์ที่แก้ไข
* package ที่ติดตั้ง
* database fields ที่ใช้งาน
* route ที่เพิ่ม
* วิธีทดสอบสร้าง แก้ไข บันทึก และลบ Flowchart
* ปัญหาหรือข้อจำกัดที่ยังเหลือ
