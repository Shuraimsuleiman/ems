-- ============================================================================
-- Migration 00001: Initial Schema
-- Creates enums, tables, indexes, and triggers for ConstructPro
-- ============================================================================

-- -------------------------------
-- 1. ENUMS (idempotent via DO blocks for PG < 16 compat)
-- -------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'worker');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------
-- 2. TABLES
-- -------------------------------

-- Profiles: extends Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'worker',
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects: construction projects managed by the firm
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  status      project_status NOT NULL DEFAULT 'planning',
  start_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date    DATE,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks: tasks tied to a project
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      task_status NOT NULL DEFAULT 'pending',
  priority    task_priority NOT NULL DEFAULT 'medium',
  deadline    TIMESTAMPTZ,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task assignments: many-to-many join between tasks and workers
CREATE TABLE IF NOT EXISTS task_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, worker_id)
);

-- Attendance logs: daily check-in/check-out records per worker
CREATE TABLE IF NOT EXISTS attendance_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in   TIMESTAMPTZ,
  check_out  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_id, date)
);

-- Progress reports: project-level reports filed by managers
CREATE TABLE IF NOT EXISTS progress_reports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------
-- 3. INDEXES
-- -------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_worker_id ON task_assignments(worker_id);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_worker_id ON attendance_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_worker_date ON attendance_logs(worker_id, date);

CREATE INDEX IF NOT EXISTS idx_progress_reports_project_id ON progress_reports(project_id);

-- -------------------------------
-- 4. TRIGGERS
-- -------------------------------

-- Function: auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::public.user_role,
      'worker'::public.user_role
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger: run after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function: update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers: auto-update updated_at on all tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_attendance_logs_updated_at ON attendance_logs;
CREATE TRIGGER update_attendance_logs_updated_at
  BEFORE UPDATE ON attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_progress_reports_updated_at ON progress_reports;
CREATE TRIGGER update_progress_reports_updated_at
  BEFORE UPDATE ON progress_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

-- -------------------------------
-- Helper functions
-- -------------------------------

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin'::public.user_role, 'manager'::public.user_role)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role public.user_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = required_role
  );
END;
$$;

-- -------------------------------
-- PROFILES
-- -------------------------------
DO $$ BEGIN
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);
  CREATE POLICY "Admins and managers can read all profiles"
    ON profiles FOR SELECT
    USING (public.is_admin_or_manager());
  CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  CREATE POLICY "Admins can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (public.has_role('admin'));
  CREATE POLICY "Admins can delete profiles"
    ON profiles FOR DELETE
    USING (public.has_role('admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------
-- PROJECTS
-- -------------------------------
DO $$ BEGIN
  ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins and managers can insert projects"
    ON projects FOR INSERT
    WITH CHECK (public.is_admin_or_manager());
  CREATE POLICY "Admins and managers can read all projects"
    ON projects FOR SELECT
    USING (public.is_admin_or_manager());
  CREATE POLICY "Workers can read assigned projects"
    ON projects FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN task_assignments ta ON ta.task_id = t.id
        WHERE t.project_id = projects.id
          AND ta.worker_id = auth.uid()
      )
    );
  CREATE POLICY "Admins and managers can update projects"
    ON projects FOR UPDATE
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());
  CREATE POLICY "Admins and managers can delete projects"
    ON projects FOR DELETE
    USING (public.is_admin_or_manager());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------
-- TASKS
-- -------------------------------
DO $$ BEGIN
  ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins and managers can insert tasks"
    ON tasks FOR INSERT
    WITH CHECK (public.is_admin_or_manager());
  CREATE POLICY "Admins and managers can read all tasks"
    ON tasks FOR SELECT
    USING (public.is_admin_or_manager());
  CREATE POLICY "Workers can read assigned tasks"
    ON tasks FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM task_assignments
        WHERE task_assignments.task_id = tasks.id
          AND task_assignments.worker_id = auth.uid()
      )
    );
  CREATE POLICY "Admins and managers can update tasks"
    ON tasks FOR UPDATE
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());
  CREATE POLICY "Workers can update assigned task status"
    ON tasks FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM task_assignments
        WHERE task_assignments.task_id = tasks.id
          AND task_assignments.worker_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM task_assignments
        WHERE task_assignments.task_id = tasks.id
          AND task_assignments.worker_id = auth.uid()
      )
    );
  CREATE POLICY "Admins and managers can delete tasks"
    ON tasks FOR DELETE
    USING (public.is_admin_or_manager());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------
-- TASK ASSIGNMENTS
-- -------------------------------
DO $$ BEGIN
  ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins and managers can insert task assignments"
    ON task_assignments FOR INSERT
    WITH CHECK (public.is_admin_or_manager());
  CREATE POLICY "Admins and managers can read all task assignments"
    ON task_assignments FOR SELECT
    USING (public.is_admin_or_manager());
  CREATE POLICY "Workers can read own task assignments"
    ON task_assignments FOR SELECT
    USING (worker_id = auth.uid());
  CREATE POLICY "Admins and managers can delete task assignments"
    ON task_assignments FOR DELETE
    USING (public.is_admin_or_manager());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------
-- ATTENDANCE LOGS
-- -------------------------------
DO $$ BEGIN
  ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Workers can insert own attendance"
    ON attendance_logs FOR INSERT
    WITH CHECK (worker_id = auth.uid());
  CREATE POLICY "Workers can read own attendance"
    ON attendance_logs FOR SELECT
    USING (worker_id = auth.uid());
  CREATE POLICY "Workers can update own attendance"
    ON attendance_logs FOR UPDATE
    USING (worker_id = auth.uid())
    WITH CHECK (worker_id = auth.uid());
  CREATE POLICY "Admins and managers can read all attendance"
    ON attendance_logs FOR SELECT
    USING (public.is_admin_or_manager());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------
-- PROGRESS REPORTS
-- -------------------------------
DO $$ BEGIN
  ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins and managers can insert progress reports"
    ON progress_reports FOR INSERT
    WITH CHECK (public.is_admin_or_manager());
  CREATE POLICY "Admins and managers can read all progress reports"
    ON progress_reports FOR SELECT
    USING (public.is_admin_or_manager());
  CREATE POLICY "Workers can read progress reports on assigned projects"
    ON progress_reports FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN task_assignments ta ON ta.task_id = t.id
        WHERE t.project_id = progress_reports.project_id
          AND ta.worker_id = auth.uid()
      )
    );
  CREATE POLICY "Admins and managers can update progress reports"
    ON progress_reports FOR UPDATE
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());
  CREATE POLICY "Admins and managers can delete progress reports"
    ON progress_reports FOR DELETE
    USING (public.is_admin_or_manager());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
