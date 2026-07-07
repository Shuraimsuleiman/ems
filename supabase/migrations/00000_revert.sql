-- ============================================================================
-- Migration 00000: Revert All
-- Cleans up everything created by the combined migration.
-- Uses CASCADE so order doesn't matter — tables auto-remove policies,
-- triggers, and indexes. Enums and functions dropped after.
-- ============================================================================

DROP TABLE IF EXISTS progress_reports CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.is_admin_or_manager();
DROP FUNCTION IF EXISTS public.has_role(user_role);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at();

DROP TYPE IF EXISTS project_status;
DROP TYPE IF EXISTS task_priority;
DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS user_role;
