-- ============================================================
-- SISD Pastoral Tracker — Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Core event log
CREATE TABLE IF NOT EXISTS public.pastoral_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_uid       TEXT UNIQUE NOT NULL,
  student         TEXT NOT NULL,
  name            TEXT NOT NULL,
  form            TEXT NOT NULL,
  subject         TEXT NOT NULL DEFAULT '',
  teacher         TEXT NOT NULL DEFAULT '',
  event_date      DATE NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  grade_code      TEXT NOT NULL,
  event_type      TEXT NOT NULL CHECK (event_type IN ('Intervention','HousePoint','Late','Other')),
  academic_year   TEXT NOT NULL,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by     UUID REFERENCES public.profiles(id),
  upload_batch_id UUID
);

CREATE INDEX IF NOT EXISTS idx_pastoral_events_date       ON public.pastoral_events(event_date);
CREATE INDEX IF NOT EXISTS idx_pastoral_events_grade      ON public.pastoral_events(grade_code);
CREATE INDEX IF NOT EXISTS idx_pastoral_events_type       ON public.pastoral_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pastoral_events_student    ON public.pastoral_events(student);
CREATE INDEX IF NOT EXISTS idx_pastoral_events_year       ON public.pastoral_events(academic_year);
CREATE INDEX IF NOT EXISTS idx_pastoral_events_batch      ON public.pastoral_events(upload_batch_id);

-- 2. Upload batch audit log
CREATE TABLE IF NOT EXISTS public.pastoral_upload_batches (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by        UUID REFERENCES public.profiles(id),
  uploaded_at        TIMESTAMPTZ DEFAULT NOW(),
  filename           TEXT NOT NULL,
  rows_read          INTEGER NOT NULL DEFAULT 0,
  rows_inserted      INTEGER NOT NULL DEFAULT 0,
  rows_duplicate     INTEGER NOT NULL DEFAULT 0,
  rows_failed        INTEGER NOT NULL DEFAULT 0,
  latest_event_date  DATE
);

-- 3. Rule of 25 sent log (one row per send action — full audit trail)
CREATE TABLE IF NOT EXISTS public.pastoral_rule25_sent_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student         TEXT NOT NULL,
  grade_code      TEXT NOT NULL,
  academic_year   TEXT NOT NULL,
  event_type      TEXT NOT NULL CHECK (event_type IN ('Intervention','Late')),
  stage_sent      TEXT NOT NULL,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  sent_by         UUID REFERENCES public.profiles(id),
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_rule25_student ON public.pastoral_rule25_sent_log(student, academic_year, event_type);

-- 4. Editable flag definitions
CREATE TABLE IF NOT EXISTS public.pastoral_flag_definitions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_code      TEXT UNIQUE NOT NULL,
  title          TEXT NOT NULL,
  what_it_means  TEXT NOT NULL DEFAULT '',
  why_it_matters TEXT NOT NULL DEFAULT '',
  suggested_action TEXT NOT NULL DEFAULT '',
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_by     UUID REFERENCES public.profiles(id)
);

-- 5. Seed default flag definitions
INSERT INTO public.pastoral_flag_definitions (flag_code, title, what_it_means, why_it_matters, suggested_action)
VALUES
  ('PosA', 'Quiet Wins',
   'Students who have received no rewards and no interventions in the past 14 days.',
   'These students are flying under the radar — not disruptive, but also not being recognised. They risk disengaging silently.',
   'HRT or GLC to check in briefly. A small personal acknowledgement can make a significant difference to engagement and belonging.'),

  ('PosB', 'Momentum',
   'Students whose house point total in the most recent 7 days is higher than the 7 days before that.',
   'Momentum students are improving their positive engagement week on week. Recognising this improvement reinforces the behaviour.',
   'Acknowledge the improvement verbally or through a positive note home. Share with HRT.'),

  ('PosC', 'Strong Balance',
   'Students with a high ratio of rewards to interventions over the past 14 days (Rewards ÷ (Interventions + 1) ≥ 3).',
   'A strong balance indicates a student who is predominantly positive in their school engagement, even if they occasionally receive interventions.',
   'Consider for positive recognition. These students can often be effective peer role models.'),

  ('NegA', 'Acceleration',
   'Students whose intervention count in the most recent 7 days is at least 2 more than the previous 7 days.',
   'A rapid increase in interventions in a single week is an early warning signal — something may have changed at home or in peer relationships.',
   'GLC to speak with the student this week. Check in with HRT and subject teachers. Contact parents if the pattern continues.'),

  ('NegC', 'No Positives + Interventions',
   'Students who have received zero house points in the past 14 days AND have 2 or more interventions in the past 10 days.',
   'This combination suggests a student who is struggling behaviourally and receiving no positive recognition — a reinforcing negative cycle.',
   'GLC to initiate a pastoral conversation. Consider a monitoring card or a focused conversation with subject teachers about positive catch strategies.'),

  ('NegD', 'Sustained High',
   'Students with 3 or more interventions in the most recent 7 days.',
   'Three or more interventions in one week triggers the After-School Reflection requirement under SISD pastoral policy.',
   'Assign After-School Reflection (Tuesday, 15:45–16:45). Inform parents. Log in iSAMS. Discuss with GLC if this is a recurring pattern.'),

  ('RiskScore', 'Early Support Risk Score',
   'A weighted composite score combining NegA, NegC, and NegD flags. Students are ranked by RiskScore to identify the top 15 most at risk.',
   'Individual flags can miss students who are close to — but not quite at — each threshold. The risk score surfaces students who are consistently borderline across multiple indicators.',
   'Review the top 15 with GLCs in the Friday pastoral meeting. Agree on which students need active monitoring and assign a lead staff member.')
ON CONFLICT (flag_code) DO NOTHING;

-- 6. RLS Policies
ALTER TABLE public.pastoral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_rule25_sent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_flag_definitions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read pastoral data
CREATE POLICY "pastoral_events_read" ON public.pastoral_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pastoral_events_insert" ON public.pastoral_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "pastoral_batches_read" ON public.pastoral_upload_batches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pastoral_batches_insert" ON public.pastoral_upload_batches
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "pastoral_batches_update" ON public.pastoral_upload_batches
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "rule25_read" ON public.pastoral_rule25_sent_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rule25_insert" ON public.pastoral_rule25_sent_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "definitions_read" ON public.pastoral_flag_definitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "definitions_update" ON public.pastoral_flag_definitions
  FOR UPDATE TO authenticated USING (true);
