# DEV-LIFE — All-in-One Developer Workspace

[![Live Demo](https://img.shields.io/badge/Demo-dev--life--five.vercel.app-blue?style=flat&logo=vercel)](https://dev-life-five.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E%20Tests-2EAD33?style=flat&logo=playwright)](https://playwright.dev/)

**DEV-LIFE** is a comprehensive, full-stack developer workspace built to consolidate project management, task tracking, interactive flowchart diagramming, developer documentation, and GitHub repository timelines into a single unified platform.

---

## Learning & Exploration Objectives

This project was conceived and developed during my 1st year at Bangkok University as a hands-on learning laboratory to master modern full-stack web engineering, specifically focusing on:

1. **Next.js (App Router) as a Full-Stack Monolith:**
   - Leveraging Next.js for both the **Frontend** (Server Components, Client Components, React 19) and the **Backend** (Server Actions, Route Handlers, and session proxies).
   - Mastering nested layouts, route grouping, streaming, and server-side data fetching patterns.
2. **Supabase (BaaS & Relational Database):**
   - Practical integration of **Supabase** for PostgreSQL database management.
   - Implementing secure authentication flows (Email/Password & GitHub OAuth) using `@supabase/ssr` with cookie-based session management across client and server boundaries.
3. **Vercel Deployment & Cloud Workflows:**
   - Deploying, configuring environment variables, and automating continuous integration pipelines directly to **Vercel**.
   - Optimizing edge delivery, asset compression, and production build performance.
4. **End-to-End Testing & Code Quality:**
   - Writing automated integration and E2E test suites using **Playwright** to guarantee regression-free feature delivery.

---

## Key Features & Capabilities

### 1.Project Dashboard & Multi-Workspace Navigation
- Centralized overview of active developer projects, deadlines, and key milestones.
- Seamless workspace switching and role-aware project navigation.

### 2.Kanban Task Board & Checklists
- Visual drag-and-drop task tracking across custom status columns (*To Do*, *In Progress*, *Done*).
- Granular task details including priorities, tags, sub-task checklists, and progress indicators.

### 3.Interactive Flowchart Canvas (`@xyflow/react`)
- Embedded infinite canvas editor powered by **React Flow** for mapping system architectures, user flows, and database ER diagrams.
- Node connection logic, state persistence, and schema verification backed by **Zod**.

### 4. Context Map
- Visual topological map connecting tasks, notes, components, and project dependencies to maintain architectural clarity across complex codebases.

### 5. GitHub Timeline & Activity Sync
- Integration with the GitHub API and webhooks to display repository commit histories, issue trackers, and pull request activity streams directly inside the project workspace.

### 6. Developer Notes & Documentation
- Built-in note-taking workspace for drafting technical specifications, architectural decision records (ADRs), and meeting summaries.

### 7. Centralized Inbox & Alerts
- Notification hub tracking real-time updates, task assignments, status transitions, and team invitations.

### 8. Reusable Templates
- Pre-configured scaffolding templates for recurring developer workflows, standard project structures, and sprint checklists.

### 9. AI-Assisted Developer Utilities
- Integrated AI helper modules tailored for developer productivity, task breakdown assistance, and technical summarization.

### 10. Global Search
- Fast instant search indexed across all projects, boards, notes, and repositories within the authenticated workspace.

---

## Architecture & Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide Icons, Swiss CSS |
| **Interactive Canvas** | `@xyflow/react` (React Flow) |
| **Backend & APIs** | Next.js Server Actions, Route Handlers, TypeScript, Zod Schema Validation |
| **Database & Auth** | Supabase (PostgreSQL), `@supabase/ssr`, `@supabase/supabase-js`, GitHub OAuth |
| **Testing** | Playwright (E2E & UI Test Runner), Node.js Test Runner |
| **Hosting & CI/CD** | Vercel (Production Platform), Git / GitHub |

---

## Getting Started

### Prerequisites
- **Node.js:** `>= 20.0.0` (Recommended: Node 22+)
- **npm:** `>= 10.0.0` or **bun**
- A free [Supabase](https://supabase.com) account and project.

### 1. Clone the Repository
```bash
git clone https://github.com/TajimeRose/DEV-LIFE.git
cd DEV-LIFE
```

### 2. Configure Environment Variables
Inside the `Frontend/` directory, create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install Dependencies & Run Locally
```bash
cd Frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🧪 Testing

Run automated unit and integration tests:
```bash
cd Frontend

# Run unit tests
npm test

# Run Playwright End-to-End tests
npm run test:e2e

# Run Playwright with interactive UI
npm run test:e2e:ui
```

---

## Deployment to Vercel

The application is optimized for zero-config deployment on Vercel:

1. Push your changes to GitHub.
2. Import the repository into the **Vercel Dashboard**.
3. Set the **Root Directory** to `Frontend`.
4. Configure the environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
5. Deploy!

Live production preview: [https://dev-life-five.vercel.app](https://dev-life-five.vercel.app)

---

## Author

**Wongsathon Witthayakhom (TajimeRose)**
- GitHub: [@TajimeRose](https://github.com/TajimeRose)
- Portfolio: [tajimerose-profile.vercel.app](https://tajimerose-profile.vercel.app)
- Email: wongsathon.witt@gmail.com
