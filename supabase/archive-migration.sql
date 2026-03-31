-- ============================================================
-- SISD Incident Portal — Archive column
-- ============================================================

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_incidents_archived_at ON public.incidents(archived_at);
