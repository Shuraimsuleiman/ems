-- ============================================================================
-- Seed Data for ConstructPro
-- Inserts sample profiles, projects, tasks, assignments, attendance, reports
--
-- NOTE: These profiles reference auth.users UUIDs. Either:
--   1. Create corresponding auth users in Supabase Auth dashboard first
--   2. Or run this as-is for local/dev testing after creating auth users
--      with matching IDs via the Supabase Admin API or SQL editor
-- ============================================================================

-- -------------------------------
-- PROFILES
-- -------------------------------
INSERT INTO profiles (id, email, full_name, role, phone) VALUES
  ('d7a4c8e1-2f5b-4a6c-9d3e-8f2b1c7a0d6e', 'admin@constructpro.com',   'Sarah Chen',        'admin',   '+1-555-0100'),
  ('b3e6f9a2-1c4d-5e7f-8a9b-0c2d3e4f5a6b', 'mgr1@constructpro.com',    'Marcus Johnson',    'manager', '+1-555-0101'),
  ('c8d2e4f6-0a1b-2c3d-4e5f-6a7b8c9d0e1f', 'mgr2@constructpro.com',    'Elena Rodriguez',   'manager', '+1-555-0102'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'worker1@constructpro.com',  'James O''Brien',    'worker',  '+1-555-0103'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'worker2@constructpro.com',  'Aisha Patel',       'worker',  '+1-555-0104'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'worker3@constructpro.com',  'Tommy Nguyen',      'worker',  '+1-555-0105'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'worker4@constructpro.com',  'Fatima Al-Rashid',  'worker',  '+1-555-0106'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'worker5@constructpro.com',  'Derek Washington',  'worker',  '+1-555-0107');

-- -------------------------------
-- PROJECTS
-- -------------------------------
INSERT INTO projects (id, name, description, location, status, start_date, end_date, created_by) VALUES
  ('f6a7b8c9-d0e1-2345-fabc-456789012345',
   'Riverside Tower',
   '24-storey mixed-use residential and commercial tower along the riverfront.',
   '1200 River Rd, Springfield',
   'active',
   '2026-01-15',
   '2027-06-30',
   'd7a4c8e1-2f5b-4a6c-9d3e-8f2b1c7a0d6e'),

  ('a7b8c9d0-e1f2-3456-abcd-567890123456',
   'Oakwood Estate Phase II',
   'Second phase of the Oakwood residential development — 42 townhouses.',
   '350 Oakwood Dr, Springfield',
   'active',
   '2026-03-01',
   '2027-09-15',
   'b3e6f9a2-1c4d-5e7f-8a9b-0c2d3e4f5a6b'),

  ('b8c9d0e1-f2a3-4567-bcde-678901234567',
   'Downtown Transit Hub',
   'New public transit terminal with retail concourse and pedestrian bridge.',
   '500 Main St, Springfield',
   'planning',
   '2026-08-01',
   '2028-12-31',
   'c8d2e4f6-0a1b-2c3d-4e5f-6a7b8c9d0e1f'),

  ('c9d0e1f2-a3b4-5678-cdef-789012345678',
   'Greenway Bridge Repair',
   'Structural repair and seismic retrofit of the Greenway overpass.',
   'Greenway Hwy & 5th Ave, Springfield',
   'active',
   '2026-05-10',
   '2026-11-30',
   'b3e6f9a2-1c4d-5e7f-8a9b-0c2d3e4f5a6b');

-- -------------------------------
-- TASKS
-- -------------------------------
INSERT INTO tasks (id, project_id, title, description, status, priority, deadline, created_by) VALUES
  ('d0e1f2a3-b4c5-6789-defa-890123456789', 'f6a7b8c9-d0e1-2345-fabc-456789012345',
   'Foundation excavation',        'Excavate and prepare foundation pit for Riverside Tower.',                     'in_progress', 'high',   '2026-07-15 17:00:00+00', 'd7a4c8e1-2f5b-4a6c-9d3e-8f2b1c7a0d6e'),
  ('e1f2a3b4-c5d6-7890-efab-901234567890', 'f6a7b8c9-d0e1-2345-fabc-456789012345',
   'Steel reinforcement procurement', 'Order and deliver rebar for concrete pours.',                               'pending',     'urgent', '2026-06-20 17:00:00+00', 'b3e6f9a2-1c4d-5e7f-8a9b-0c2d3e4f5a6b'),
  ('f2a3b4c5-d6e7-8901-fabc-012345678901', 'f6a7b8c9-d0e1-2345-fabc-456789012345',
   'Concrete pour — mat foundation', 'Schedule and execute continuous mat foundation pour.',                        'pending',     'high',   '2026-07-30 17:00:00+00', 'd7a4c8e1-2f5b-4a6c-9d3e-8f2b1c7a0d6e'),

  ('a3b4c5d6-e7f8-9012-abcd-123456789012', 'a7b8c9d0-e1f2-3456-abcd-567890123456',
   'Site grading and preparation',   'Grade lots 1–20 and install temporary drainage.',                             'completed',   'high',   '2026-04-30 17:00:00+00', 'b3e6f9a2-1c4d-5e7f-8a9b-0c2d3e4f5a6b'),
  ('b4c5d6e7-f8a9-0123-bcde-234567890123', 'a7b8c9d0-e1f2-3456-abcd-567890123456',
   'Foundation — townhouses 1-10',   'Pour strip footings and stem walls for first 10 units.',                     'in_progress', 'high',   '2026-07-01 17:00:00+00', 'c8d2e4f6-0a1b-2c3d-4e5f-6a7b8c9d0e1f'),
  ('c5d6e7f8-a9b0-1234-cdef-345678901234', 'a7b8c9d0-e1f2-3456-abcd-567890123456',
   'Framing — townhouses 1-5',       'Rough framing for first 5 townhouses.',                                     'pending',     'medium', '2026-07-20 17:00:00+00', 'b3e6f9a2-1c4d-5e7f-8a9b-0c2d3e4f5a6b'),

  ('d6e7f8a9-b0c1-2345-defa-456789012345', 'c9d0e1f2-a3b4-5678-cdef-789012345678',
   'Crack injection — pier 3',       'Inject epoxy into structural cracks on pier 3.',                             'in_progress', 'urgent', '2026-06-25 17:00:00+00', 'd7a4c8e1-2f5b-4a6c-9d3e-8f2b1c7a0d6e'),
  ('e7f8a9b0-c1d2-3456-efab-567890123456', 'c9d0e1f2-a3b4-5678-cdef-789012345678',
   'Seismic bearing installation',   'Install base isolation bearings on all abutments.',                          'pending',     'high',   '2026-08-15 17:00:00+00', 'c8d2e4f6-0a1b-2c3d-4e5f-6a7b8c9d0e1f'),

  ('f8a9b0c1-d2e3-4567-fabc-678901234567', 'b8c9d0e1-f2a3-4567-bcde-678901234567',
   'Traffic study and impact report', 'Complete city-required traffic impact analysis for transit hub.',            'completed',   'medium', '2026-09-01 17:00:00+00', 'c8d2e4f6-0a1b-2c3d-4e5f-6a7b8c9d0e1f'),
  ('a9b0c1d2-e3f4-5678-abcd-789012345678', 'b8c9d0e1-f2a3-4567-bcde-678901234567',
   'Geotechnical survey',            'Soil boring, bearing capacity testing, and report.',                          'completed',   'medium', '2026-10-01 17:00:00+00', 'c8d2e4f6-0a1b-2c3d-4e5f-6a7b8c9d0e1f');

-- -------------------------------
-- TASK ASSIGNMENTS
-- -------------------------------
INSERT INTO task_assignments (task_id, worker_id, assigned_by) VALUES
  -- Riverside Tower: foundation excavation -> James, Aisha, Tommy
  ('d0e1f2a3-b4c5-6789-defa-890123456789', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'd7a4c8e1-2f5b-4a6c-9d3e-8f2b1c7a0d6e'),
  ('d0e1f2a3-b4c5-6789-defa-890123456789', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'd7a4c8e1-2f5b-4a6c-9d3e-8f2b1c7a0d6e'),
  ('d0e1f2a3-b4c5-6789-defa-890123456789', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'd7a4c8e1-2f5b-4a6c-9d3e-8f2b1c7a0d6e'),
  -- Steel reinforcement procurement -> Derek
  ('e1f2a3b4-c5d6-7890-efab-901234567890', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'b3e6f9a2-1c4d-5e7f-8a9b-0c2d3e4f5a6b'),

  -- Oakwood: site grading was assigned to James, Aisha
  ('a3b4c5d6-e7f8-9012-abcd-123456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b3e6f9a2-1c4d-5e7f-8a9b-0c2d3e4f5a6b'),
  ('a3b4c5d6-e7f8-9012-abcd-123456789012', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'b3e6f9a2-1c4d-5e7f-8a9b-0c2d3e4f5a6b'),
  -- Foundation townhouses 1-10 -> Tommy, Fatima
  ('b4c5d6e7-f8a9-0123-bcde-234567890123', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'c8d2e4f6-0a1b-2c3d-4e5f-6a7b8c9d0e1f'),
  ('b4c5d6e7-f8a9-0123-bcde-234567890123', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'c8d2e4f6-0a1b-2c3d-4e5f-6a7b8c9d0e1f'),

  -- Greenway: crack injection -> James, Tommy
  ('d6e7f8a9-b0c1-2345-defa-456789012345', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'd7a4c8e1-2f5b-4a6c-9d3e-8f2b1c7a0d6e'),
  ('d6e7f8a9-b0c1-2345-defa-456789012345', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'd7a4c8e1-2f5b-4a6c-9d3e-8f2b1c7a0d6e');

-- -------------------------------
-- ATTENDANCE LOGS (last 7 days)
-- -------------------------------
INSERT INTO attendance_logs (worker_id, date, check_in, check_out) VALUES
  -- James O'Brien
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-06-05', '2026-06-05 07:00:00+00', '2026-06-05 16:30:00+00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-06-08', '2026-06-08 06:45:00+00', '2026-06-08 17:00:00+00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-06-09', '2026-06-09 07:15:00+00', '2026-06-09 16:45:00+00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-06-10', '2026-06-10 06:55:00+00', '2026-06-10 17:15:00+00'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '2026-06-11', '2026-06-11 07:05:00+00', NULL),

  -- Aisha Patel
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '2026-06-05', '2026-06-05 06:50:00+00', '2026-06-05 16:00:00+00'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '2026-06-08', '2026-06-08 07:10:00+00', '2026-06-08 17:00:00+00'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '2026-06-09', '2026-06-09 07:00:00+00', '2026-06-09 16:30:00+00'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '2026-06-10', '2026-06-10 06:45:00+00', '2026-06-10 17:00:00+00'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', '2026-06-11', '2026-06-11 07:00:00+00', '2026-06-11 15:45:00+00'),

  -- Tommy Nguyen
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '2026-06-05', '2026-06-05 07:30:00+00', '2026-06-05 17:00:00+00'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '2026-06-08', '2026-06-08 07:15:00+00', '2026-06-08 16:45:00+00'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '2026-06-09', NULL, NULL),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '2026-06-10', '2026-06-10 06:50:00+00', '2026-06-10 17:30:00+00'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '2026-06-11', '2026-06-11 07:20:00+00', NULL),

  -- Fatima Al-Rashid
  ('d4e5f6a7-b8c9-0123-defa-234567890123', '2026-06-05', '2026-06-05 07:05:00+00', '2026-06-05 16:15:00+00'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', '2026-06-08', '2026-06-08 06:55:00+00', '2026-06-08 17:00:00+00'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', '2026-06-09', '2026-06-09 07:10:00+00', '2026-06-09 16:50:00+00'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', '2026-06-10', '2026-06-10 06:40:00+00', '2026-06-10 17:10:00+00'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', '2026-06-11', '2026-06-11 07:00:00+00', NULL),

  -- Derek Washington
  ('e5f6a7b8-c9d0-1234-efab-345678901234', '2026-06-08', '2026-06-08 07:30:00+00', '2026-06-08 16:00:00+00'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', '2026-06-09', '2026-06-09 07:45:00+00', '2026-06-09 17:00:00+00'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', '2026-06-10', '2026-06-10 07:00:00+00', '2026-06-10 16:30:00+00'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', '2026-06-11', '2026-06-11 07:10:00+00', NULL);

-- -------------------------------
-- PROGRESS REPORTS
-- -------------------------------
INSERT INTO progress_reports (project_id, title, content, created_by) VALUES
  ('f6a7b8c9-d0e1-2345-fabc-456789012345',
   'Riverside Tower — Month 5 Progress',
   'Excavation is 65% complete. Steel rebar delivery is scheduled for next week. We are on track for the mat foundation pour in late July. No major issues to report beyond minor weather delays (3 days lost in May).',
   'b3e6f9a2-1c4d-5e7f-8a9b-0c2d3e4f5a6b'),

  ('a7b8c9d0-e1f2-3456-abcd-567890123456',
   'Oakwood Phase II — Site Prep Complete',
   'Site grading and drainage installation is finished for all 42 lots. Foundation work begins this week on townhouses 1-10. All permits are in order. Budget is within 2% of estimate.',
   'c8d2e4f6-0a1b-2c3d-4e5f-6a7b8c9d0e1f'),

  ('c9d0e1f2-a3b4-5678-cdef-789012345678',
   'Greenway Bridge — Urgent Repair Status',
   'Crack injection on pier 3 is underway. Seismic bearings have been ordered with 6-week lead time. Pier 1 and 2 inspections are scheduled for next week. The bridge will need partial lane closures during bearing installation.',
   'b3e6f9a2-1c4d-5e7f-8a9b-0c2d3e4f5a6b');
