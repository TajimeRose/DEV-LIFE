# DEV-LIFE — Claude Code Operating Guide

## Core Architecture & Commands
- **Root Directory for Code:** `Frontend/` (Next.js 16 App Router, React 19, Supabase, Tailwind CSS 4, Zod).
- **Commands (Run inside `Frontend/`):**
  - Dev server: `npm run dev`
  - Build check: `npm run build`
  - Type check: `npx tsc --noEmit`
  - Linter: `npm run lint`
  - Unit tests: `npm test`
  - E2E tests: `npm run test:e2e`
- **Reference Doc:** Detailed rules and architecture are documented in `AGENTS.md`.

---

## ⚡ 9router & AI Stability Rules (MANDATORY)

To prevent LLM token truncation, proxy timeouts, and context corruption through the 9router local gateway:

1. **Decompose First (แยกย่อยงานก่อนทำเสมอ):**
   - Before writing or editing code, analyze the request and write an explicit, numbered checklist of atomic steps.
   - 1 atomic step = 1 targeted file edit/function + 1 verification check.

2. **Execute Strictly One Step Per Turn (ทำทีละ 1 ขั้นตอนเท่านั้น):**
   - NEVER generate massive multi-file code blocks or rewrite whole files in a single turn.
   - Complete one step from the checklist, show the concise change, verify, and only then proceed to the next.

3. **Verify Immediately (ตรวจผลทันทีหลังทำแต่ละข้อ):**
   - Run `npx tsc --noEmit`, `npm run lint`, or targeted tests (`node --test ...`) after each code change.
   - If an error occurs, resolve it before moving to the next checklist item.

4. **Minimal & Clean Diffs:**
   - Edit only lines required for the specific task.
   - Do not reformat untouched code or add unrequested abstractions.

---

## 🤖 Available Specialized Subagents

Invoke subagents as needed for focused workflows:
- `@programmer`: Senior Programmer for core logic, TypeScript, Next.js App Router, Supabase, and Server Actions.
- `@uxui`: Senior UX/UI Designer for Tailwind CSS 4 styling, React 19 component design, responsiveness, and polished user experience.
- `@tester-reviewer`: QA Tester & Code Reviewer for unit/E2E test creation, diff security review, and edge case audits.
