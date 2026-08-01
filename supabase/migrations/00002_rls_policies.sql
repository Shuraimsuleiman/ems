-- ============================================================================
-- Migration 00002: Additional RLS Policies
--
-- Adds policies the app relies on that were missing from 00001:
--   • Users can insert their own profile (accept-invite fallback).
--   • Admins can update any profile (worker management in the admin portal).
--   • Admins/managers can insert, update and delete attendance logs so they
--     can correct or enter records on a worker's behalf.
--
-- Also hardens the existing "Users can update own profile" policy so a user
-- cannot change their own role (prevents worker -> manager/admin escalation).
--
-- Idempotent: safe to run more than once.
-- ============================================================================

-- -------------------------------
-- PROFILES
-- -------------------------------

DO $$ BEGIN
  CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    USING (public.has_role('admin'))
    WITH CHECK (public.has_role('admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Harden the self-update policy: users may edit their own profile but not
-- their role (role changes go through an admin).
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
      auth.uid() = id
      AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------
-- ATTENDANCE LOGS
-- -------------------------------

DO $$ BEGIN
  CREATE POLICY "Admins and managers can insert attendance"
    ON attendance_logs FOR INSERT
    WITH CHECK (public.is_admin_or_manager());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins and managers can update attendance"
    ON attendance_logs FOR UPDATE
    USING (public.is_admin_or_manager())
    WITH CHECK (public.is_admin_or_manager());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins and managers can delete attendance"
    ON attendance_logs FOR DELETE
    USING (public.is_admin_or_manager());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
