-- ============================================================================
-- ConstructPro — Seed Data
--
-- Seeds:
--   14 worker accounts (10 Hausa + 4 non-Hausa Nigerian names) directly in
--   Supabase Auth, their profiles, and attendance logs starting 29 Jul 2026.
--   15 Abuja projects (water infrastructure, Wuse/Gwarimpa/Karsana buildings,
--   and federal government contracts) across all 5 project statuses.
--   39 tasks, worker assignments plus random extra assignments for a handful
--   of workers (redrawn on every run), and 29 progress reports attributed to
--   the first existing admin/manager profile (runtime lookup).
--
--   • Emails:        @gmail.com
--   • Password:      ConstructPro123!  (shared by all seed workers)
--   • Attendance:    Wed 2026-07-29 -> Tue 2026-08-25 (weekdays only, ~90% kept)
--   • Check-in:      9:00 - 9:40 AM  (stored as UTC, i.e. 08:00 - 08:40)
--   • Check-out:     5:00 - 6:00 PM  (stored as UTC, i.e. 16:00 - 17:00)
--
-- Times are stored in UTC so they render as the values above for users in
-- Nigeria (UTC+1) via the app's toLocaleTimeString().
--
-- Projects/tasks/assignments/reports use the 1000.../2000... UUID prefix scheme
-- so the cleanup section stays idempotent on re-run.
--
-- NOTE: An admin or manager profile must already exist in the database; seed
-- projects, tasks and reports are attributed to the first one found.
-- ============================================================================

-- -------------------------------
-- 0) SEED WORKERS (edit as needed)
-- -------------------------------
CREATE TEMP TABLE seed_workers (
  email     text PRIMARY KEY,
  full_name text,
  phone     text
);

INSERT INTO seed_workers (email, full_name, phone) VALUES
  -- Hausa names
  ('musa.abdullahi@gmail.com',    'Musa Abdullahi',    '+234 801 234 5601'),
  ('amina.bello@gmail.com',       'Amina Bello',       '+234 702 234 5602'),
  ('ibrahim.sani@gmail.com',      'Ibrahim Sani',      '+234 803 234 5603'),
  ('fatima.yusuf@gmail.com',      'Fatima Yusuf',      '+234 814 234 5604'),
  ('suleiman.adamu@gmail.com',    'Suleiman Adamu',    '+234 915 234 5605'),
  ('hauwa.ibrahim@gmail.com',     'Hauwa Ibrahim',     '+234 706 234 5606'),
  ('aliyu.mohammed@gmail.com',    'Aliyu Mohammed',    '+234 707 234 5607'),
  ('zainab.umar@gmail.com',       'Zainab Umar',       '+234 908 234 5608'),
  ('umar.garba@gmail.com',        'Umar Garba',        '+234 919 234 5609'),
  ('najaatu.khalid@gmail.com',    'Najaatu Khalid',    '+234 810 234 5610'),
  -- Non-Hausa names
  ('chinedu.okafor@gmail.com',    'Chinedu Okafor',    '+234 811 234 5611'),
  ('emeka.obi@gmail.com',         'Emeka Obi',         '+234 812 234 5612'),
  ('funke.adeyemi@gmail.com',     'Funke Adeyemi',     '+234 813 234 5613'),
  ('ngozi.eze@gmail.com',         'Ngozi Eze',         '+234 814 234 5614');

-- -------------------------------
-- 1) CLEANUP (safe on re-run)
-- -------------------------------

-- Seed workers: attendance -> identities -> profiles -> users
DELETE FROM public.attendance_logs
WHERE worker_id IN (
  SELECT id FROM public.profiles
  WHERE email IN (SELECT email FROM seed_workers)
);

DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (SELECT email FROM seed_workers)
);

DELETE FROM public.profiles
WHERE email IN (SELECT email FROM seed_workers);

DELETE FROM auth.users
WHERE email IN (SELECT email FROM seed_workers);

-- Seed projects: assignments -> tasks -> reports -> projects
DELETE FROM public.task_assignments
WHERE task_id IN (
  SELECT id FROM public.tasks
  WHERE id::text LIKE '20000000-0000-4000-8000-0000%'
);

DELETE FROM public.tasks
WHERE id::text LIKE '20000000-0000-4000-8000-0000%';

DELETE FROM public.progress_reports
WHERE project_id IN (
  SELECT id FROM public.projects
  WHERE id::text LIKE '10000000-0000-4000-8000-0000%'
);

DELETE FROM public.projects
WHERE id::text LIKE '10000000-0000-4000-8000-0000%';

-- -------------------------------
-- 1b) SEED MANAGER (attribution)
-- -------------------------------
CREATE TEMP TABLE seed_manager AS
SELECT id
FROM public.profiles
WHERE email = 'mataxzu26@gmail.com'
  AND role IN ('admin', 'manager')
ORDER BY created_at
LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM seed_manager) THEN
    RAISE EXCEPTION 'No admin/manager profile found. Create an admin/manager account first so seed projects and tasks can be attributed.';
  END IF;
END $$;

-- -------------------------------
-- 2) CREATE AUTH USERS
-- -------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  s.email,
  crypt('ConstructPro123!', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object('full_name', s.full_name),
  now(),
  now(),
  '', '', '', ''
FROM seed_workers s;

-- -------------------------------
-- 3) CREATE AUTH IDENTITIES
-- -------------------------------
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.id::text,
  now(), now(), now()
FROM auth.users u
WHERE u.email IN (SELECT email FROM seed_workers);

-- -------------------------------
-- 4) CREATE PROFILES
-- -------------------------------
INSERT INTO public.profiles (id, email, full_name, role, phone)
SELECT
  u.id,
  u.email,
  s.full_name,
  'worker',
  s.phone
FROM auth.users u
JOIN seed_workers s ON s.email = u.email
ON CONFLICT (id) DO UPDATE SET
  email     = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role      = EXCLUDED.role,
  phone     = EXCLUDED.phone;

-- -------------------------------
-- 5) ATTENDANCE LOGS
--    29 Jul -> 25 Aug 2026 · weekdays only · ~90% attendance
--    check-in 08:00-08:40 UTC · check-out 16:00-17:00 UTC
-- -------------------------------
INSERT INTO public.attendance_logs (worker_id, date, check_in, check_out)
SELECT
  p.id,
  d::date AS date,
  (d::timestamp
     + time '08:00:00'
     + make_interval(mins => floor(random() * 41)::int, secs => floor(random() * 60)::int)
   ) AT TIME ZONE 'UTC' AS check_in,
  (d::timestamp
     + time '16:00:00'
     + make_interval(mins => floor(random() * 61)::int, secs => floor(random() * 60)::int)
   ) AT TIME ZONE 'UTC' AS check_out
FROM public.profiles p
CROSS JOIN generate_series('2026-07-29'::date, '2026-08-25'::date, interval '1 day') AS days(d)
WHERE p.role = 'worker'
  AND p.email IN (SELECT email FROM seed_workers)
  AND EXTRACT(ISODOW FROM d) < 6   -- Mon-Fri only, skip weekends
  AND random() >= 0.10;            -- ~90% attendance, ~10% absent

-- -------------------------------
-- 6) PROJECTS  (15 · all 5 statuses)
-- -------------------------------
INSERT INTO public.projects (id, name, description, location, status, start_date, end_date, created_by, created_at)
SELECT p.id::uuid, p.name, p.description, p.location, p.status::project_status, p.start_date::date, p.end_date::date, m.id, p.created_at::timestamptz
FROM (VALUES
  ('10000000-0000-4000-8000-000000000001', 'Lower Usuma Water Treatment Plant Expansion',
   'Expansion of the Lower Usuma water treatment plant to raise treatment capacity serving the Federal Capital Territory, covering intake, clarification, filtration and new clarifier tanks.',
   'Bwari, Abuja', 'active', '2026-01-10', '2027-06-30', '2025-11-05 10:00:00+00'),
  ('10000000-0000-4000-8000-000000000002', 'FCT District Borehole Drilling Network',
   'Federal and FCT-wide drilling programme to install 12 new boreholes across FCT districts, each with solar pumping and storage, under the FCT Water Board supply enhancement initiative.',
   'Various FCT districts, Abuja', 'planning', '2026-09-01', '2027-12-31', '2026-07-10 09:00:00+00'),
  ('10000000-0000-4000-8000-000000000003', 'Apo Water Treatment Reservoir',
   'Construction of a 5,000 m³ treated-water reservoir at Apo to improve distribution storage for the Apo–Gudu–Wuye corridor.',
   'Apo, Abuja', 'completed', '2025-08-01', '2026-03-31', '2025-06-20 08:30:00+00'),
  ('10000000-0000-4000-8000-000000000004', 'Kubwa Storm Drainage Upgrade',
   'Upgrade of storm drainage channels around Kubwa to mitigate recurring flooding during the wet season; placed on hold and later cancelled due to right-of-way disputes.',
   'Kubwa, Abuja', 'cancelled', '2026-03-01', '2026-09-30', '2026-01-15 11:00:00+00'),
  ('10000000-0000-4000-8000-000000000005', 'Idu Water Pipeline Trunk Extension',
   'Extension of the trunk water pipeline from the Idu treatment works into the Idu industrial area, improving supply reliability to factories and residents.',
   'Idu Industrial Area, Abuja', 'active', '2026-05-15', '2026-11-30', '2026-03-01 09:30:00+00'),
  ('10000000-0000-4000-8000-000000000006', 'Wuse Zone 4 Commercial Plaza',
   'A five-storey commercial plaza in Wuse Zone 4 with retail units, office floors and basement parking.',
   'Wuse Zone 4, Abuja', 'active', '2026-02-15', '2027-08-31', '2025-12-01 10:30:00+00'),
  ('10000000-0000-4000-8000-000000000007', 'Wuse Zone 2 Office Complex',
   'Purpose-built office complex in Wuse Zone 2 for lease to corporate clients, featuring dual-tower layout and landscaped forecourt.',
   'Wuse Zone 2, Abuja', 'planning', '2026-10-01', '2028-03-31', '2026-06-20 12:00:00+00'),
  ('10000000-0000-4000-8000-000000000008', 'Wuse Zone 6 Retail Mall',
   'A two-level retail mall in Wuse Zone 6 anchored by a large supermarket and food court; currently paused pending design revisions.',
   'Wuse Zone 6, Abuja', 'on_hold', '2026-03-01', '2027-06-30', '2026-01-10 09:15:00+00'),
  ('10000000-0000-4000-8000-000000000009', 'Gwarimpa Residential Estate Phase II',
   'Second phase of the Gwarimpa residential estate adding 120 housing units across Blocks A, B and C.',
   'Gwarimpa, Abuja', 'on_hold', '2026-02-01', '2027-05-15', '2025-11-25 08:45:00+00'),
  ('10000000-0000-4000-8000-000000000010', 'Gwarimpa Block E Apartment Flats',
   'Two blocks of four-storey apartment flats (E1 and E2) in the Gwarimpa estate, providing 48 two- and three-bedroom units.',
   'Gwarimpa, Abuja', 'active', '2026-04-01', '2027-03-31', '2026-02-10 10:00:00+00'),
  ('10000000-0000-4000-8000-000000000011', 'Karsana Low-Cost Housing Scheme',
   'Federal-backed low-cost housing scheme in Karsana delivering 250 affordable units with supporting amenities.',
   'Karsana, Abuja', 'planning', '2026-10-15', '2028-06-30', '2026-07-05 09:45:00+00'),
  ('10000000-0000-4000-8000-000000000012', 'Karsana Commercial Hub',
   'Proposed commercial hub in Karsana combining shops, a market hall and office space to serve the growing suburb.',
   'Karsana, Abuja', 'planning', '2027-01-01', '2028-09-30', '2026-07-20 11:30:00+00'),
  ('10000000-0000-4000-8000-000000000013', 'FCT Road Rehabilitation (Federal Ministry of Works)',
   'Rehabilitation of key FCT arterial roads under a Federal Ministry of Works contract, including milling, resurfacing, culvert replacement and signage.',
   'FCT arterial roads, Abuja', 'active', '2026-05-01', '2026-12-31', '2026-03-15 08:00:00+00'),
  ('10000000-0000-4000-8000-000000000014', 'National Assembly Complex Renovation',
   'Comprehensive renovation of the National Assembly complex in the Three Arms Zone, covering the Senate wing, office areas and MEP systems.',
   'Three Arms Zone, Abuja', 'on_hold', '2026-06-01', '2027-04-30', '2026-04-01 13:00:00+00'),
  ('10000000-0000-4000-8000-000000000015', 'Federal Secretariat Annex Construction',
   'Construction of an annex building to the Federal Secretariat, providing additional office accommodation in the Central Area.',
   'Central Area, Abuja', 'completed', '2025-09-15', '2026-05-31', '2025-08-01 09:00:00+00')
) AS p(id, name, description, location, status, start_date, end_date, created_at)
CROSS JOIN seed_manager m;

-- -------------------------------
-- 7) TASKS  (39 · mixed statuses & priorities)
-- -------------------------------
INSERT INTO public.tasks (id, project_id, title, description, status, priority, deadline, created_by, created_at)
SELECT t.id::uuid, t.project_id::uuid, t.title, t.description, t.status::task_status, t.priority::task_priority, t.deadline::timestamptz, m.id, t.created_at::timestamptz
FROM (VALUES
  -- Lower Usuma Water Treatment Plant Expansion (P1)
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Site clearing and earthworks',
   'Clearing, grubbing and bulk earthworks for the new clarifier area, including access road formation.',
   'completed', 'high', '2026-03-15 12:00:00+00', '2026-01-12 09:00:00+00'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'RCC intake structure construction',
   'Construction of the reinforced concrete intake structure with stop-log gates and screening.',
   'in_progress', 'high', '2026-09-30 12:00:00+00', '2026-03-02 10:00:00+00'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Pipeline trenching — Bwari trunk line',
   'Trench excavation and bedding for the 900 mm trunk main along the Bwari corridor.',
   'pending', 'medium', '2026-11-15 12:00:00+00', '2026-06-08 09:30:00+00'),
  -- FCT District Borehole Drilling Network (P2)
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Hydrogeological survey — 12 FCT districts',
   'Coordinate aquifer mapping and pump tests across the 12 target districts.',
   'pending', 'high', '2026-10-15 12:00:00+00', '2026-07-14 08:30:00+00'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'Borehole rig mobilization',
   'Schedule and mobilize drilling rigs, compressors and casing stock.',
   'pending', 'medium', '2026-12-01 12:00:00+00', '2026-07-14 08:30:00+00'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', 'Permit & approval liaison with FCT Water Board',
   'Progress permit applications and site access approvals with FCT Water Board.',
   'pending', 'low', '2026-11-30 12:00:00+00', '2026-07-14 08:30:00+00'),
  -- Apo Water Treatment Reservoir (P3)
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000003', 'Reservoir concrete works',
   'Mass and reinforced concrete placement for the 5,000 m³ reservoir tank.',
   'completed', 'high', '2025-12-20 12:00:00+00', '2025-08-05 09:00:00+00'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000003', 'Pump station installation',
   'Installation of duty/standby pump sets and control panels at the pump house.',
   'completed', 'high', '2026-02-15 12:00:00+00', '2025-11-10 10:30:00+00'),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000003', 'Commissioning & water quality testing',
   'System commissioning, bacteriological and chemical testing prior to handover.',
   'completed', 'medium', '2026-03-28 12:00:00+00', '2026-01-05 08:00:00+00'),
  -- Kubwa Storm Drainage Upgrade (P4)
  ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000004', 'Drainage route design & modelling',
   'Hydraulic modelling and detailed design of the Kubwa storm drainage channels.',
   'completed', 'medium', '2026-04-30 12:00:00+00', '2026-01-20 09:30:00+00'),
  ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000004', 'Channel excavation — Phase 1',
   'Excavation of the primary drainage channel; not started before cancellation.',
   'pending', 'low', '2026-08-15 12:00:00+00', '2026-03-10 10:00:00+00'),
  -- Idu Water Pipeline Trunk Extension (P5)
  ('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000005', 'Trunk main pipe laying — Idu industrial',
   'Laying of the 600 mm ductile iron trunk main into the Idu industrial area.',
   'in_progress', 'urgent', '2026-08-20 12:00:00+00', '2026-05-18 08:45:00+00'),
  ('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000005', 'Trench backfill & compaction',
   'Backfilling, compaction testing and reinstatement along the laid sections.',
   'pending', 'medium', '2026-09-30 12:00:00+00', '2026-06-15 09:15:00+00'),
  ('20000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000005', 'Pressure testing & chlorination',
   'Hydrostatic pressure testing and chlorination of the completed pipeline.',
   'pending', 'high', '2026-10-15 12:00:00+00', '2026-06-15 09:15:00+00'),
  -- Wuse Zone 4 Commercial Plaza (P6)
  ('20000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000006', 'Foundation — raft pour',
   'Reinforcement, formwork and 1,200 m³ raft foundation pour for the plaza.',
   'in_progress', 'urgent', '2026-08-10 12:00:00+00', '2026-02-20 10:30:00+00'),
  ('20000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000006', 'Steel structural frame — columns',
   'Erection of the structural steel frame and composite deck for floors 1–3.',
   'in_progress', 'high', '2026-10-31 12:00:00+00', '2026-04-05 09:00:00+00'),
  ('20000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000006', 'Facade cladding procurement',
   'Procurement and off-site fabrication of aluminium composite facade panels.',
   'pending', 'medium', '2026-11-15 12:00:00+00', '2026-06-20 11:00:00+00'),
  -- Wuse Zone 2 Office Complex (P7)
  ('20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000007', 'Architectural design & 3D modelling',
   'Complete architectural drawings and 3D visualisations for client approval.',
   'pending', 'high', '2026-12-01 12:00:00+00', '2026-06-25 08:30:00+00'),
  ('20000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000007', 'Soil investigation & geotechnical report',
   'Site boreholes and geotechnical laboratory testing for foundation design.',
   'pending', 'medium', '2027-01-15 12:00:00+00', '2026-06-25 08:30:00+00'),
  -- Wuse Zone 6 Retail Mall (P8)
  ('20000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000008', 'Substructure works — basement',
   'Basement excavation, retaining walls and waterproofing works.',
   'in_progress', 'high', '2026-09-30 12:00:00+00', '2026-03-05 09:30:00+00'),
  ('20000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000008', 'Electrical rough-in — Phase A',
   'Conduits, trunking and first-fix electrical installations for Phase A.',
   'completed', 'medium', '2026-06-30 12:00:00+00', '2026-03-05 09:30:00+00'),
  ('20000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000008', 'Atrium glazing installation',
   'Structural glazing for the central atrium; deferred while project is on hold.',
   'pending', 'low', '2027-02-28 12:00:00+00', '2026-05-15 10:00:00+00'),
  -- Gwarimpa Residential Estate Phase II (P9)
  ('20000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000009', 'Block B foundation works',
   'Pad foundations and ground beams for Block B of the estate.',
   'in_progress', 'high', '2026-09-15 12:00:00+00', '2026-02-05 08:45:00+00'),
  ('20000000-0000-4000-8000-000000000024', '10000000-0000-4000-8000-000000000009', 'Roof framing — Block C',
   'Timber roof framing and sheathing for Block C units.',
   'pending', 'low', '2027-01-31 12:00:00+00', '2026-04-10 09:30:00+00'),
  ('20000000-0000-4000-8000-000000000025', '10000000-0000-4000-8000-000000000009', 'Plumbing rough-in — Block A',
   'First-fix water supply and drainage within Block A units.',
   'completed', 'medium', '2026-07-20 12:00:00+00', '2026-02-05 08:45:00+00'),
  -- Gwarimpa Block E Apartment Flats (P10)
  ('20000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000010', 'Masonry wall construction — Blocks E1/E2',
   'Sandcrete blockwork and lintels for the two apartment blocks.',
   'in_progress', 'high', '2026-09-30 12:00:00+00', '2026-04-10 10:15:00+00'),
  ('20000000-0000-4000-8000-000000000027', '10000000-0000-4000-8000-000000000010', 'Window & door installation',
   'Supply and installation of aluminium windows and panel doors.',
   'pending', 'medium', '2026-10-31 12:00:00+00', '2026-06-01 09:00:00+00'),
  ('20000000-0000-4000-8000-000000000028', '10000000-0000-4000-8000-000000000010', 'Plastering & tiling',
   'Internal plastering and tiling of wet areas across both blocks.',
   'pending', 'medium', '2026-12-15 12:00:00+00', '2026-06-01 09:00:00+00'),
  -- Karsana Low-Cost Housing Scheme (P11)
  ('20000000-0000-4000-8000-000000000029', '10000000-0000-4000-8000-000000000011', 'Land survey & soil testing',
   'Boundary survey, topographical mapping and soil investigation for the scheme.',
   'pending', 'high', '2027-01-31 12:00:00+00', '2026-07-08 08:30:00+00'),
  ('20000000-0000-4000-8000-000000000030', '10000000-0000-4000-8000-000000000011', 'Cost estimation & BOQ',
   'Prepare bill of quantities and cost estimate for the 250-unit scheme.',
   'pending', 'medium', '2027-02-28 12:00:00+00', '2026-07-08 08:30:00+00'),
  -- Karsana Commercial Hub (P12)
  ('20000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000012', 'Concept design & feasibility study',
   'Concept layout and financial feasibility for the commercial hub.',
   'pending', 'high', '2027-03-31 12:00:00+00', '2026-07-22 10:30:00+00'),
  ('20000000-0000-4000-8000-000000000032', '10000000-0000-4000-8000-000000000012', 'Stakeholder engagement — Karsana community',
   'Community engagement sessions and land use consultations in Karsana.',
   'pending', 'low', '2027-02-15 12:00:00+00', '2026-07-22 10:30:00+00'),
  -- FCT Road Rehabilitation (P13)
  ('20000000-0000-4000-8000-000000000033', '10000000-0000-4000-8000-000000000013', 'Asphalt milling — Jabi to Wuse',
   'Milling of failed pavement layers along the Jabi to Wuse corridor.',
   'in_progress', 'urgent', '2026-08-25 12:00:00+00', '2026-05-05 07:30:00+00'),
  ('20000000-0000-4000-8000-000000000034', '10000000-0000-4000-8000-000000000013', 'Drainage culvert replacement',
   'Replacement of collapsed culverts at three critical flood points.',
   'completed', 'high', '2026-07-15 12:00:00+00', '2026-05-05 07:30:00+00'),
  ('20000000-0000-4000-8000-000000000035', '10000000-0000-4000-8000-000000000013', 'Road marking & signage',
   'Thermoplastic road markings and reflective signage installation.',
   'pending', 'low', '2026-11-30 12:00:00+00', '2026-07-01 09:00:00+00'),
  -- National Assembly Complex Renovation (P14)
  ('20000000-0000-4000-8000-000000000036', '10000000-0000-4000-8000-000000000014', 'Asbestos removal — Senate wing',
   'Survey and removal of ACMs in the Senate wing ahead of fit-out.',
   'pending', 'urgent', '2026-12-15 12:00:00+00', '2026-04-05 10:00:00+00'),
  ('20000000-0000-4000-8000-000000000037', '10000000-0000-4000-8000-000000000014', 'HVAC system upgrade',
   'Replacement of chillers and ductwork in the office areas.',
   'pending', 'medium', '2027-03-31 12:00:00+00', '2026-05-15 11:30:00+00'),
  -- Federal Secretariat Annex Construction (P15)
  ('20000000-0000-4000-8000-000000000038', '10000000-0000-4000-8000-000000000015', 'Precast facade installation',
   'Installation of precast concrete facade panels on the annex.',
   'completed', 'high', '2026-02-28 12:00:00+00', '2025-09-20 09:00:00+00'),
  ('20000000-0000-4000-8000-000000000039', '10000000-0000-4000-8000-000000000015', 'MEP fit-out & testing',
   'Mechanical, electrical and plumbing fit-out with final testing and certification.',
   'completed', 'medium', '2026-05-15 12:00:00+00', '2025-12-01 10:30:00+00')
) AS t(id, project_id, title, description, status, priority, deadline, created_at)
CROSS JOIN seed_manager m;

-- -------------------------------
-- 8) TASK ASSIGNMENTS
--    Worker ids resolved by email; assigned_by = seed manager.
-- -------------------------------
INSERT INTO public.task_assignments (task_id, worker_id, assigned_by)
SELECT a.task_id::uuid, p.id, m.id
FROM (VALUES
  ('20000000-0000-4000-8000-000000000001', 'musa.abdullahi@gmail.com'),
  ('20000000-0000-4000-8000-000000000001', 'ibrahim.sani@gmail.com'),
  ('20000000-0000-4000-8000-000000000001', 'umar.garba@gmail.com'),
  ('20000000-0000-4000-8000-000000000002', 'amina.bello@gmail.com'),
  ('20000000-0000-4000-8000-000000000002', 'suleiman.adamu@gmail.com'),
  ('20000000-0000-4000-8000-000000000003', 'aliyu.mohammed@gmail.com'),
  ('20000000-0000-4000-8000-000000000003', 'chinedu.okafor@gmail.com'),
  ('20000000-0000-4000-8000-000000000003', 'emeka.obi@gmail.com'),
  ('20000000-0000-4000-8000-000000000004', 'zainab.umar@gmail.com'),
  ('20000000-0000-4000-8000-000000000004', 'ngozi.eze@gmail.com'),
  ('20000000-0000-4000-8000-000000000005', 'hauwa.ibrahim@gmail.com'),
  ('20000000-0000-4000-8000-000000000006', 'funke.adeyemi@gmail.com'),
  ('20000000-0000-4000-8000-000000000007', 'ibrahim.sani@gmail.com'),
  ('20000000-0000-4000-8000-000000000007', 'umar.garba@gmail.com'),
  ('20000000-0000-4000-8000-000000000007', 'musa.abdullahi@gmail.com'),
  ('20000000-0000-4000-8000-000000000008', 'suleiman.adamu@gmail.com'),
  ('20000000-0000-4000-8000-000000000008', 'amina.bello@gmail.com'),
  ('20000000-0000-4000-8000-000000000009', 'najaatu.khalid@gmail.com'),
  ('20000000-0000-4000-8000-000000000009', 'funke.adeyemi@gmail.com'),
  ('20000000-0000-4000-8000-000000000010', 'fatima.yusuf@gmail.com'),
  ('20000000-0000-4000-8000-000000000011', 'emeka.obi@gmail.com'),
  ('20000000-0000-4000-8000-000000000011', 'chinedu.okafor@gmail.com'),
  ('20000000-0000-4000-8000-000000000012', 'aliyu.mohammed@gmail.com'),
  ('20000000-0000-4000-8000-000000000012', 'najaatu.khalid@gmail.com'),
  ('20000000-0000-4000-8000-000000000012', 'ngozi.eze@gmail.com'),
  ('20000000-0000-4000-8000-000000000013', 'ibrahim.sani@gmail.com'),
  ('20000000-0000-4000-8000-000000000013', 'umar.garba@gmail.com'),
  ('20000000-0000-4000-8000-000000000014', 'amina.bello@gmail.com'),
  ('20000000-0000-4000-8000-000000000014', 'zainab.umar@gmail.com'),
  ('20000000-0000-4000-8000-000000000015', 'musa.abdullahi@gmail.com'),
  ('20000000-0000-4000-8000-000000000015', 'suleiman.adamu@gmail.com'),
  ('20000000-0000-4000-8000-000000000015', 'chinedu.okafor@gmail.com'),
  ('20000000-0000-4000-8000-000000000016', 'aliyu.mohammed@gmail.com'),
  ('20000000-0000-4000-8000-000000000016', 'emeka.obi@gmail.com'),
  ('20000000-0000-4000-8000-000000000017', 'funke.adeyemi@gmail.com'),
  ('20000000-0000-4000-8000-000000000017', 'hauwa.ibrahim@gmail.com'),
  ('20000000-0000-4000-8000-000000000018', 'fatima.yusuf@gmail.com'),
  ('20000000-0000-4000-8000-000000000018', 'ngozi.eze@gmail.com'),
  ('20000000-0000-4000-8000-000000000019', 'zainab.umar@gmail.com'),
  ('20000000-0000-4000-8000-000000000019', 'umar.garba@gmail.com'),
  ('20000000-0000-4000-8000-000000000020', 'ibrahim.sani@gmail.com'),
  ('20000000-0000-4000-8000-000000000020', 'musa.abdullahi@gmail.com'),
  ('20000000-0000-4000-8000-000000000020', 'amina.bello@gmail.com'),
  ('20000000-0000-4000-8000-000000000021', 'suleiman.adamu@gmail.com'),
  ('20000000-0000-4000-8000-000000000021', 'chinedu.okafor@gmail.com'),
  ('20000000-0000-4000-8000-000000000022', 'najaatu.khalid@gmail.com'),
  ('20000000-0000-4000-8000-000000000022', 'fatima.yusuf@gmail.com'),
  ('20000000-0000-4000-8000-000000000023', 'aliyu.mohammed@gmail.com'),
  ('20000000-0000-4000-8000-000000000023', 'umar.garba@gmail.com'),
  ('20000000-0000-4000-8000-000000000024', 'emeka.obi@gmail.com'),
  ('20000000-0000-4000-8000-000000000024', 'ibrahim.sani@gmail.com'),
  ('20000000-0000-4000-8000-000000000025', 'funke.adeyemi@gmail.com'),
  ('20000000-0000-4000-8000-000000000025', 'hauwa.ibrahim@gmail.com'),
  ('20000000-0000-4000-8000-000000000026', 'musa.abdullahi@gmail.com'),
  ('20000000-0000-4000-8000-000000000026', 'suleiman.adamu@gmail.com'),
  ('20000000-0000-4000-8000-000000000026', 'ngozi.eze@gmail.com'),
  ('20000000-0000-4000-8000-000000000027', 'chinedu.okafor@gmail.com'),
  ('20000000-0000-4000-8000-000000000027', 'zainab.umar@gmail.com'),
  ('20000000-0000-4000-8000-000000000028', 'amina.bello@gmail.com'),
  ('20000000-0000-4000-8000-000000000028', 'najaatu.khalid@gmail.com'),
  ('20000000-0000-4000-8000-000000000029', 'fatima.yusuf@gmail.com'),
  ('20000000-0000-4000-8000-000000000029', 'umar.garba@gmail.com'),
  ('20000000-0000-4000-8000-000000000030', 'funke.adeyemi@gmail.com'),
  ('20000000-0000-4000-8000-000000000030', 'ngozi.eze@gmail.com'),
  ('20000000-0000-4000-8000-000000000031', 'zainab.umar@gmail.com'),
  ('20000000-0000-4000-8000-000000000031', 'fatima.yusuf@gmail.com'),
  ('20000000-0000-4000-8000-000000000032', 'hauwa.ibrahim@gmail.com'),
  ('20000000-0000-4000-8000-000000000032', 'emeka.obi@gmail.com'),
  ('20000000-0000-4000-8000-000000000033', 'musa.abdullahi@gmail.com'),
  ('20000000-0000-4000-8000-000000000033', 'aliyu.mohammed@gmail.com'),
  ('20000000-0000-4000-8000-000000000033', 'chinedu.okafor@gmail.com'),
  ('20000000-0000-4000-8000-000000000034', 'ibrahim.sani@gmail.com'),
  ('20000000-0000-4000-8000-000000000034', 'suleiman.adamu@gmail.com'),
  ('20000000-0000-4000-8000-000000000035', 'najaatu.khalid@gmail.com'),
  ('20000000-0000-4000-8000-000000000035', 'emeka.obi@gmail.com'),
  ('20000000-0000-4000-8000-000000000036', 'umar.garba@gmail.com'),
  ('20000000-0000-4000-8000-000000000036', 'amina.bello@gmail.com'),
  ('20000000-0000-4000-8000-000000000037', 'funke.adeyemi@gmail.com'),
  ('20000000-0000-4000-8000-000000000037', 'zainab.umar@gmail.com'),
  ('20000000-0000-4000-8000-000000000038', 'ibrahim.sani@gmail.com'),
  ('20000000-0000-4000-8000-000000000038', 'ngozi.eze@gmail.com'),
  ('20000000-0000-4000-8000-000000000039', 'aliyu.mohammed@gmail.com'),
  ('20000000-0000-4000-8000-000000000039', 'chinedu.okafor@gmail.com'),
  ('20000000-0000-4000-8000-000000000039', 'hauwa.ibrahim@gmail.com')
) AS a(task_id, worker_email)
JOIN public.profiles p ON p.email = a.worker_email
CROSS JOIN seed_manager m;

-- -------------------------------
-- 8b) RANDOM EXTRA ASSIGNMENTS
--     8 randomly chosen seed workers get up to 2 additional open tasks each.
--     Drawn at random on every run; the UNIQUE (task_id, worker_id) constraint
--     plus cleanup make re-runs safe.
-- -------------------------------
WITH extra_workers AS (
  SELECT id
  FROM public.profiles
  WHERE role = 'worker'
    AND email IN (SELECT email FROM seed_workers)
  ORDER BY random()
  LIMIT 8
),
candidates AS (
  SELECT
    t.id AS task_id,
    w.id AS worker_id,
    row_number() OVER (PARTITION BY w.id ORDER BY random()) AS rn
  FROM public.tasks t
  JOIN extra_workers w ON true
  WHERE t.id::text LIKE '20000000-0000-4000-8000-0000%'
    AND t.status <> 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM public.task_assignments ta
      WHERE ta.task_id = t.id
        AND ta.worker_id = w.id
    )
)
INSERT INTO public.task_assignments (task_id, worker_id, assigned_by)
SELECT c.task_id, c.worker_id, m.id
FROM candidates c
CROSS JOIN seed_manager m
WHERE c.rn <= 2
ON CONFLICT (task_id, worker_id) DO NOTHING;

-- -------------------------------
-- 9) PROGRESS REPORTS  (21)
-- -------------------------------
INSERT INTO public.progress_reports (project_id, title, content, created_by, created_at)
SELECT r.project_id::uuid, r.title, r.content, m.id, r.created_at::timestamptz
FROM (VALUES
  ('10000000-0000-4000-8000-000000000001', 'Lower Usuma — Month 6 Progress',
   'Earthworks for the new clarifier area are complete and the reinforced concrete intake structure is at approximately 60% completion. Concrete supply has stabilised after securing a second batch plant. We remain on track for the September structural milestone, though coarse aggregate deliveries from Kubwa continue to be a constraint.',
   '2026-06-20 09:30:00+00'),
  ('10000000-0000-4000-8000-000000000001', 'Lower Usuma — Works Update (July)',
   'Intake formwork and stop-log seating progressed well this month despite two rainy days. Quality assurance samples for the 35 MPa mix returned acceptable compressive strengths at 28 days. Pipeline trenching mobilisation is underway ahead of the planned August start.',
   '2026-07-25 09:00:00+00'),
  ('10000000-0000-4000-8000-000000000002', 'Borehole Network — Pre-Procurement Brief',
   'Procurement for the drilling subcontract is being finalised, with three contractors shortlisted. The hydrogeological survey scope for 12 districts is confirmed and will kick off in October. FCT Water Board liaison has been opened for permit processing.',
   '2026-07-10 10:15:00+00'),
  ('10000000-0000-4000-8000-000000000005', 'Idu Trunk Main — Pipe Laying Update',
   'Approximately 2.1 km of the 600 mm trunk main has been laid to date, with the Idu industrial spur now crossing the main access road. Jointing and pressure testing of completed sections passed first inspection. Right-of-way clearances for the final stretch are being processed.',
   '2026-07-08 14:00:00+00'),
  ('10000000-0000-4000-8000-000000000005', 'Idu Trunk Main — Progress Snapshot',
   'Pipe laying reached 2.9 km this week. The utility relocation for an overhead HV line near the ring road is complete, clearing the way for the remaining 600 m. Backfill and compaction crews have been mobilised behind the laying crew.',
   '2026-07-29 11:30:00+00'),
  ('10000000-0000-4000-8000-000000000006', 'Wuse Plaza — Foundation Milestone',
   'Reinforcement fixing for the raft is 85% complete and the pour is scheduled for mid-August pending formwork certification. Concrete volume for the raft is estimated at 1,200 m³, supplied by two pumping crews. Steel frame fabrication continues off-site.',
   '2026-07-02 09:45:00+00'),
  ('10000000-0000-4000-8000-000000000006', 'Wuse Plaza — Weekly Site Report',
   'Raft pour sequencing has been agreed with the ready-mix supplier to avoid cold joints. Column starter bars are being set to the frame grid. Facade cladding procurement is finalised; delivery is expected in November.',
   '2026-07-28 16:20:00+00'),
  ('10000000-0000-4000-8000-000000000007', 'Wuse Zone 2 — Design Kickoff',
   'Architectural design commenced with the client''s space brief confirming 14,000 m² of lettable office space. The 3D visualisation package is due by December. Geotechnical investigation tender is being prepared.',
   '2026-07-15 10:00:00+00'),
  ('10000000-0000-4000-8000-000000000008', 'Wuse Zone 6 — Substructure Status',
   'Basement excavation reached full depth and retaining wall concrete is in progress. The project is under a structured hold pending design revisions to the atrium. Electrical rough-in for Phase A is complete and preserved for continuity.',
   '2026-07-18 13:15:00+00'),
  ('10000000-0000-4000-8000-000000000008', 'Wuse Zone 6 — Hold Review',
   'Works remain paused pending the client''s decision on atrium glazing specification. A revision meeting is scheduled with the design consultant for early August. Site protection and dewatering are being maintained during the hold.',
   '2026-06-25 09:30:00+00'),
  ('10000000-0000-4000-8000-000000000009', 'Gwarimpa Phase II — Block B Foundation',
   'Pad foundations and ground beams for Block B are 70% complete. Concrete cubes averaged 31 MPa at 28 days, meeting spec. The project is on hold at the client''s request pending a funding review, with Block A plumbing already finished.',
   '2026-06-30 12:00:00+00'),
  ('10000000-0000-4000-8000-000000000009', 'Gwarimpa Phase II — Resumption Plan',
   'Prepared a phased resumption plan covering Block B foundation completion and Block C roof framing. Materials pricing for timber and reinforcement has been refreshed for validity of 60 days. Awaiting client go-ahead.',
   '2026-07-22 10:45:00+00'),
  ('10000000-0000-4000-8000-000000000010', 'Block E Flats — Masonry Progress',
   'Blockwork for Block E1 is complete to second-floor level; E2 is proceeding at 40%. Reinforcement for ring beams is on site. Labour productivity is strong, though brick delivery lead times need monitoring.',
   '2026-07-05 09:00:00+00'),
  ('10000000-0000-4000-8000-000000000010', 'Block E Flats — Weekly Update',
   'E1 lintels set across all floors and E2 masonry reached first-floor level. Window procurement order placed with a local fabricator. Tiling and plastering crews will mobilise as each block completes blockwork.',
   '2026-07-27 15:30:00+00'),
  ('10000000-0000-4000-8000-000000000011', 'Karsana Housing — Site Readiness Assessment',
   'Preliminary site walkover confirms suitable ground conditions for the 250-unit scheme. Land survey and soil testing are being tendered, with mobilisation planned for October. Community liaison has been positive.',
   '2026-07-12 11:00:00+00'),
  ('10000000-0000-4000-8000-000000000012', 'Karsana Commercial Hub — Feasibility Note',
   'Initial feasibility indicates strong demand for retail and market space in Karsana given the suburb''s growth. Land documentation is being verified before survey works. Concept design will commence once the feasibility study is signed off.',
   '2026-07-19 09:20:00+00'),
  ('10000000-0000-4000-8000-000000000013', 'FCT Road Rehab — Milling Works Update',
   'Milling along the Jabi to Wuse corridor is 55% complete. Two culvert replacements were finished ahead of the rains. The resurfacing contract for the milled sections is being mobilised.',
   '2026-07-06 08:45:00+00'),
  ('10000000-0000-4000-8000-000000000013', 'FCT Road Rehab — Monthly Report',
   'The corridor is 70% milled with resurfacing starting on the Jabi end. Remaining culvert works are complete. Road markings and signage are scheduled for November after the asphalt course is finished.',
   '2026-07-30 14:30:00+00'),
  ('10000000-0000-4000-8000-000000000014', 'National Assembly — Renovation Status',
   'Renovation works in the Senate wing are paused pending asbestos survey results; a specialist contractor has been engaged. HVAC replacement design is complete. A resumption date will be confirmed once removal is scheduled.',
   '2026-07-21 10:30:00+00'),
  ('10000000-0000-4000-8000-000000000015', 'Fed Secretariat Annex — Completion Report',
   'The annex was handed over ahead of the revised programme. Precast facade installation and MEP fit-out passed all inspections, and the building was certified for occupancy. Final snag list is closed out.',
   '2026-05-30 09:00:00+00'),
  ('10000000-0000-4000-8000-000000000015', 'Fed Secretariat Annex — Handover Summary',
   'Post-handover support is underway with the facility management team. Defects liability period runs for twelve months. Documentation and as-built drawings have been delivered to the client.',
   '2026-06-15 11:45:00+00')
) AS r(project_id, title, content, created_at)
CROSS JOIN seed_manager m;

-- -------------------------------
-- 9b) AUGUST PROGRESS REPORTS  (8)
--     Continue the July storylines into late August.
-- -------------------------------
INSERT INTO public.progress_reports (project_id, title, content, created_by, created_at)
SELECT r.project_id::uuid, r.title, r.content, m.id, r.created_at::timestamptz
FROM (VALUES
  ('10000000-0000-4000-8000-000000000002', 'Borehole Network — Drilling Subcontract Award',
   'The drilling subcontract has been awarded to the second-ranked bidder after commercial clarifications. Rig mobilisation is scheduled for September ahead of the hydrogeological survey. Solar pumping and storage specifications have been aligned with FCT Water Board requirements to smooth permit approval.',
   '2026-08-05 10:30:00+00'),
  ('10000000-0000-4000-8000-000000000011', 'Karsana Housing — Survey Tender Award',
   'A licensed survey firm has been engaged for boundary demarcation and topographical mapping of the 250-unit site. Soil investigation boreholes will follow immediately after demarcation. Community liaison remains constructive, with access routes agreed through the district head''s office.',
   '2026-08-06 09:15:00+00'),
  ('10000000-0000-4000-8000-000000000001', 'Lower Usuma — Intake Milestone Reached',
   'The reinforced concrete intake structure has passed 75% completion following practical completion of the stop-log bay pours. Formwork for the screening chamber is being fixed, and the second batch plant keeps concrete supply steady. Pipeline trenching crews are expected on site within two weeks.',
   '2026-08-07 11:45:00+00'),
  ('10000000-0000-4000-8000-000000000005', 'Idu Trunk Main — Final Stretch Resumed',
   'With the overhead HV line relocation complete, pipe laying has resumed on the final 600 m stretch near the ring road. Two laying gangs are working opposing heads to compress the programme, with jointing crews closing up behind them. Pressure testing of the new sections follows once tie-in welds are inspected.',
   '2026-08-12 10:00:00+00'),
  ('10000000-0000-4000-8000-000000000006', 'Wuse Plaza — Raft Pour Completed',
   'The 1,200 m³ raft foundation pour was completed over three consecutive nights using two pumping crews, avoiding cold joints as sequenced with the ready-mix supplier. Cube samples returned satisfactory early strengths. Frame erection steel for floors 1–3 is arriving and the steel crew mobilises next week.',
   '2026-08-14 15:40:00+00'),
  ('10000000-0000-4000-8000-000000000010', 'Block E Flats — Masonry at Roof Level',
   'Blockwork on Block E1 has reached roof level and E2 is at third-floor level. Ring beam reinforcement is being fixed on E1 while scaffold is repositioned. Internal plastering crews have mobilised on E1 ground floor so finishing tracks structure floor-by-floor behind the blockwork.',
   '2026-08-18 09:30:00+00'),
  ('10000000-0000-4000-8000-000000000013', 'FCT Road Rehab — Resurfacing Underway',
   'Milling along the Jabi to Wuse corridor is complete, with resurfacing advancing from the Jabi end at roughly 800 m per night under the night-work window. Base repairs over the replaced culverts have passed density testing. Line marking crews follow once the final asphalt course is placed.',
   '2026-08-20 14:15:00+00'),
  ('10000000-0000-4000-8000-000000000001', 'Lower Usuma — Trenching Commences',
   'Trench excavation on the Bwari trunk line has commenced from the intake manifold, with 300 m opened and bedded to specification. Rock notice areas flagged during the survey are being worked with hydraulic breakers on night shifts to protect daytime concrete operations.',
   '2026-08-24 09:50:00+00')
) AS r(project_id, title, content, created_at)
CROSS JOIN seed_manager m;

-- -------------------------------
-- 10) VERIFICATION
--     Displays stored UTC times plus the times as Nigeria (UTC+1) sees them,
--     and counts of every seeded entity.
-- -------------------------------
SELECT
  p.full_name,
  a.date,
  a.check_in        AS check_in_utc,
  a.check_out       AS check_out_utc,
  (a.check_in  + interval '1 hour')::time AS check_in_display_nga,
  (a.check_out + interval '1 hour')::time AS check_out_display_nga
FROM public.attendance_logs a
JOIN public.profiles p ON p.id = a.worker_id
WHERE p.email IN (SELECT email FROM seed_workers)
ORDER BY p.full_name, a.date;

SELECT
  (SELECT count(*) FROM public.profiles WHERE email IN (SELECT email FROM seed_workers))                                                                          AS seed_workers,
  (SELECT count(*) FROM public.projects WHERE id::text LIKE '10000000-0000-4000-8000-0000%')                                                                       AS seed_projects,
  (SELECT count(*) FROM public.tasks WHERE id::text LIKE '20000000-0000-4000-8000-0000%')                                                                           AS seed_tasks,
  (SELECT count(*) FROM public.task_assignments ta JOIN public.tasks t ON t.id = ta.task_id WHERE t.id::text LIKE '20000000-0000-4000-8000-0000%')                   AS seed_assignments,
  (SELECT count(*) FROM public.progress_reports WHERE project_id::text LIKE '10000000-0000-4000-8000-0000%')                                                        AS seed_reports,
  (SELECT count(*) FROM public.attendance_logs a JOIN public.profiles p ON p.id = a.worker_id WHERE p.email IN (SELECT email FROM seed_workers))                      AS attendance_logs;

DROP TABLE IF EXISTS seed_workers;
DROP TABLE IF EXISTS seed_manager;
