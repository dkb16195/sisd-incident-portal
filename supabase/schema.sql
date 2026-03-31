-- ============================================================
-- SISD Incident Portal — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('glc', 'deputy_head', 'admin');

CREATE TYPE incident_type AS ENUM (
  'bullying',
  'physical_altercation',
  'verbal_misconduct',
  'peer_conflict',
  'social_media',
  'theft',
  'property_damage',
  'safeguarding',
  'other'
);

CREATE TYPE incident_status AS ENUM ('open', 'in_progress', 'resolved', 'referred');

CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE student_role AS ENUM ('involved', 'victim', 'perpetrator', 'witness');

-- ============================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'glc',
  grade       TEXT,  -- only set for GLC role, e.g. "Grade 6"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatically create a profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'glc')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STUDENTS TABLE
-- ============================================================

CREATE TABLE public.students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT NOT NULL,
  grade       TEXT NOT NULL,
  year_group  TEXT NOT NULL,
  student_id  TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INCIDENTS TABLE
-- ============================================================

CREATE TABLE public.incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  incident_type   incident_type NOT NULL,
  description     TEXT NOT NULL,
  incident_date   DATE NOT NULL,
  incident_time   TIME,
  location        TEXT NOT NULL,
  grade           TEXT NOT NULL,
  status          incident_status NOT NULL DEFAULT 'open',
  severity        incident_severity NOT NULL DEFAULT 'medium',
  logged_by       UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to     UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- INCIDENT_STUDENTS (join table)
-- ============================================================

CREATE TABLE public.incident_students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  role        student_role NOT NULL DEFAULT 'involved',
  UNIQUE (incident_id, student_id)
);

-- ============================================================
-- INVESTIGATION_CHECKLIST TABLE
-- ============================================================

CREATE TABLE public.investigation_checklist (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id                 UUID NOT NULL UNIQUE REFERENCES public.incidents(id) ON DELETE CASCADE,

  statements_taken            BOOLEAN NOT NULL DEFAULT FALSE,
  statements_taken_date       DATE,
  statements_taken_notes      TEXT,

  parents_contacted           BOOLEAN NOT NULL DEFAULT FALSE,
  parents_contacted_date      DATE,
  parents_contacted_notes     TEXT,

  referred_to_deputy          BOOLEAN NOT NULL DEFAULT FALSE,
  referred_to_deputy_date     DATE,
  referred_to_deputy_notes    TEXT,

  sanctions_applied           BOOLEAN NOT NULL DEFAULT FALSE,
  sanctions_applied_date      DATE,
  sanctions_applied_notes     TEXT,

  follow_up_scheduled         BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_scheduled_date    DATE,
  follow_up_scheduled_notes   TEXT
);

-- Auto-create checklist row when incident is created
CREATE OR REPLACE FUNCTION public.create_checklist_for_incident()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.investigation_checklist (incident_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_incident_created
  AFTER INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.create_checklist_for_incident();

-- ============================================================
-- COMMENTS TABLE
-- ============================================================

CREATE TABLE public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments              ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to get current user's grade
CREATE OR REPLACE FUNCTION public.current_user_grade()
RETURNS TEXT AS $$
  SELECT grade FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------- PROFILES ----------
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

-- ---------- STUDENTS ----------
CREATE POLICY "GLC can view own grade students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('deputy_head', 'admin')
    OR grade = public.current_user_grade()
  );

CREATE POLICY "Admin can insert students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "Admin can update students"
  ON public.students FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- ---------- INCIDENTS ----------
CREATE POLICY "GLC can view own grade incidents"
  ON public.incidents FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('deputy_head', 'admin')
    OR grade = public.current_user_grade()
  );

CREATE POLICY "GLC can insert incidents in own grade"
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('deputy_head', 'admin')
    OR grade = public.current_user_grade()
  );

CREATE POLICY "GLC can update own grade incidents"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() IN ('deputy_head', 'admin')
    OR grade = public.current_user_grade()
  );

-- ---------- INCIDENT_STUDENTS ----------
CREATE POLICY "Incident students follow incident access"
  ON public.incident_students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (
        public.current_user_role() IN ('deputy_head', 'admin')
        OR i.grade = public.current_user_grade()
      )
    )
  );

CREATE POLICY "Can insert incident students for accessible incidents"
  ON public.incident_students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (
        public.current_user_role() IN ('deputy_head', 'admin')
        OR i.grade = public.current_user_grade()
      )
    )
  );

CREATE POLICY "Can update incident students for accessible incidents"
  ON public.incident_students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (
        public.current_user_role() IN ('deputy_head', 'admin')
        OR i.grade = public.current_user_grade()
      )
    )
  );

CREATE POLICY "Can delete incident students for accessible incidents"
  ON public.incident_students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (
        public.current_user_role() IN ('deputy_head', 'admin')
        OR i.grade = public.current_user_grade()
      )
    )
  );

-- ---------- INVESTIGATION CHECKLIST ----------
CREATE POLICY "Checklist follows incident access"
  ON public.investigation_checklist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (
        public.current_user_role() IN ('deputy_head', 'admin')
        OR i.grade = public.current_user_grade()
      )
    )
  );

CREATE POLICY "Can update checklist for accessible incidents"
  ON public.investigation_checklist FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (
        public.current_user_role() IN ('deputy_head', 'admin')
        OR i.grade = public.current_user_grade()
      )
    )
  );

CREATE POLICY "System can insert checklist rows"
  ON public.investigation_checklist FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- ---------- COMMENTS ----------
CREATE POLICY "Comments follow incident access"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (
        public.current_user_role() IN ('deputy_head', 'admin')
        OR i.grade = public.current_user_grade()
      )
    )
  );

CREATE POLICY "Authenticated users can post comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
      AND (
        public.current_user_role() IN ('deputy_head', 'admin')
        OR i.grade = public.current_user_grade()
      )
    )
  );

-- No DELETE policy on comments (audit trail)

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX idx_incidents_grade        ON public.incidents(grade);
CREATE INDEX idx_incidents_status       ON public.incidents(status);
CREATE INDEX idx_incidents_logged_by    ON public.incidents(logged_by);
CREATE INDEX idx_incidents_created_at   ON public.incidents(created_at DESC);
CREATE INDEX idx_incident_students_incident ON public.incident_students(incident_id);
CREATE INDEX idx_incident_students_student  ON public.incident_students(student_id);
CREATE INDEX idx_comments_incident      ON public.comments(incident_id);
CREATE INDEX idx_students_grade         ON public.students(grade);
CREATE INDEX idx_students_student_id    ON public.students(student_id);
