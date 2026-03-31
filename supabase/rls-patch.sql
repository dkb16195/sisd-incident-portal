-- ============================================================
-- SISD Incident Portal — RLS patch
-- Run in Supabase SQL Editor after schema.sql + fix-trigger-rls.sql
-- ============================================================

-- 1. Allow users to delete their own comments
--    (the schema omitted this, but the app supports it)
CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- 2. Allow users to update their own comments
--    (needed if we ever add edit support; safe to add now)
CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

-- 3. Service role bypass for all tables
--    (admin actions use the service role client)
CREATE POLICY "Service role bypass"
  ON public.students
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role bypass"
  ON public.incidents
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role bypass"
  ON public.incident_students
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role bypass"
  ON public.investigation_checklist
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role bypass"
  ON public.comments
  TO service_role
  USING (true)
  WITH CHECK (true);
