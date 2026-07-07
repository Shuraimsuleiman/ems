# employee-management-system

## Project Brief: Construction Firm Management System

**Project Type:** Full-stack web application
**Purpose:** Internal management software for a construction and engineering firm with two distinct user-facing portals — an Admin/Management side and a Worker side.

---

### Tech Stack

- **Frontend & Backend:** Next.js (App Router)
- **Database & Auth:** Supabase (PostgreSQL + Supabase Auth + Row Level Security)
- **UI:** Tailwind CSS
- **Data Fetching:**
- **State Management:**
- **Hosting:** Vercel

---

### Authentication & Roles

There are three roles: `admin`, `manager`, and `worker`. Auth is handled by Supabase Auth with email/password. Role is stored in a `profiles` table linked to the Supabase `auth.users` table. On login, the user is redirected to their respective portal based on role. Row Level Security (RLS) is enforced at the database level — workers can only access their own data.

---

### Admin/Management Portal

Accessible by users with role `admin` or `manager`. It is a dashboard-style layout with a sidebar navigation. Features include:

- Overview dashboard with summary stats (active projects, task completion rate, attendance overview)
- Project management (create, view, update projects)
- Task management (create tasks, assign to individual workers or groups, set deadlines and priority)
- Worker management (view all workers, invite new workers via email)
- Attendance overview (view attendance logs per worker or per project)
- Progress reports (file and view project progress reports)

---

### Worker Portal

Accessible by users with role `worker`. It is a simple, clean layout optimized for ease of use. Features include:

- Worker dashboard (today's tasks, attendance status)
- View tasks assigned to them (individually or as part of a group)
- Mark task progress/status (e.g. pending, in progress, completed)
- Attendance entry (check-in and check-out per day)
- View personal attendance history
- View personal profile and assignment history

---

### Database Tables (Core)

- `profiles` — extends auth.users, stores role and basic info
- `projects` — construction projects managed by the firm
- `tasks` — tasks tied to a project, with status, priority, and deadline
- `task_assignments` — many-to-many join between tasks and workers
- `attendance_logs` — daily check-in/check-out records per worker
- `progress_reports` — project-level reports filed by managers

---

### Key Constraints

- Free tier only: Supabase free plan, Vercel Hobby plan
- No mobile app — web only, but should be mobile-responsive
- No payment or billing logic
- Keep the codebase modular and role-separation clean

---

## Implementation Phases

### Phase 0: Project Scaffolding
- [x] Initialize Next.js with TypeScript, App Router, Tailwind CSS
- [x] Install dependencies (shadcn/ui, supabase-js, TanStack Query, Zustand, etc.)
- [x] Configure shadcn/ui and add base component library
- [x] Create folder structure (route groups, components, lib, hooks, stores, types, supabase)

### Phase 1: Database & Auth Foundation
- [x] Define database schema (6 tables, enums, indexes, auto-profile trigger)
- [x] Write Row Level Security policies for all tables
- [x] Create seed script with sample data
- [x] Set up Supabase client helpers (browser, server, middleware)
- [x] Create Zustand auth store and React Query provider
- [x] Build login page and auth callback route
- [x] Implement proxy/route protection for role-based access

### Phase 2: Shared Layouts & UI Components
- [x] Build admin/manager layout with collapsible sidebar navigation (desktop + mobile Sheet)
- [x] Build worker layout with minimal top navigation (desktop + mobile Sheet)
- [x] Create shared components (DataTable, StatusBadge, ConfirmDialog, PageHeader, EmptyState, LoadingSpinner, ErrorAlert)

### Phase 3: Admin/Manager Portal
- Dashboard with stat cards (active projects, task completion %, workers count, today's attendance)
- Projects CRUD (data table, create/edit dialog, detail page with linked tasks)
- Tasks management (data table with filters, create/edit form, worker assignment via multi-select)
- Workers page (list, invite via Supabase magic link, view worker detail with assigned tasks & attendance)
- Attendance overview (date range + worker filter, check-in/out times)
- Progress reports (list per project, create report form)

### Phase 4: Worker Portal
- Dashboard (today's assigned tasks, attendance status, quick actions)
- My Tasks (full list with status update — pending → in progress → completed)
- Attendance (check-in/check-out buttons, monthly history table)
- Profile (read-only info, project assignment history)

### Phase 5: Polishing & Deployment
- Mobile responsiveness (sidebar becomes sheet on mobile, responsive tables)
- Error boundaries and loading skeletons for all pages
- Deploy to Vercel with environment variables configured
- Post-deploy end-to-end verification